import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { User } from '../user/user.entity';
import { createAuditEntry, sendUserNotification } from '../admin/admin-helpers';

type QA = { questionKey: string; answer: string };

@Injectable()
export class SetupSecurityService {
  private readonly logger = new Logger(SetupSecurityService.name);

  constructor(private readonly ds: DataSource, private readonly config: ConfigService) {}

  private securitySecret(): string {
    const s = this.config.get<string>('SECURITY_SECRET') ?? process.env.SECURITY_SECRET;
    if (!s) {
      this.logger.error('SECURITY_SECRET is not configured');
      throw new Error('SECURITY_SECRET not configured');
    }
    return s;
  }

  private hashAnswer(value: string) {
    return crypto.createHmac('sha256', this.securitySecret()).update((value || '').trim()).digest('hex');
  }

  private sanitizeUser(u: any) {
    if (!u) return null;
    const copy = { ...u };
    delete copy.password;
    delete copy.password_hash;
    delete copy.two_factor_secret;
    delete (copy as any).twoFactorSecret;
    delete (copy as any).two_factor_secret;
    delete copy.security_answers_hash;
    delete copy.refresh_token;
    delete (copy as any).refreshToken;
    return copy;
  }

  private async findColumnName(managerQuery: (q: string, p?: any[]) => Promise<any[]>, table: string, candidateLowerNames: string[]) {
    // returns actual column_name (as stored) for the first candidate that exists, or null
    for (const candidate of candidateLowerNames) {
      try {
        const rows: any[] = await managerQuery(
          `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND lower(column_name) = $2 LIMIT 1`,
          [table, candidate.toLowerCase()],
        );
        if (Array.isArray(rows) && rows.length) {
          return rows[0].column_name as string;
        }
      } catch {
        // ignore and continue
      }
    }
    return null;
  }

  /**
   * Persist the provided security answers for a user.
   *
   * Strategy:
   *  - Use a transaction to attempt to persist answers (preferred tables).
   *  - Detect the actual column names in the answers table and use those when inserting.
   *  - If insert into candidate tables fails, do NOT abort whole operation; continue and run a deterministic final update.
   *  - After commit/rollback run a deterministic out-of-transaction UPDATE that clears security-related variants and sets securityConfigured.
   *  - Finally SELECT and return the fresh user row (authoritative).
   */
  public async saveSecurityAnswers(adminUser: any | null, userId: number | string, answers: QA[], opts?: { ip?: string; reason?: string }) {
    const id = Number(userId);
    if (!id || !Array.isArray(answers) || answers.length === 0) {
      throw new Error('Invalid inputs to saveSecurityAnswers');
    }

    const queryRunner = this.ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hashedRows = answers.map((a) => ({
        question_key: String((a.questionKey ?? '').trim()),
        answer_hash: this.hashAnswer(String(a.answer ?? '')),
      }));

      // Candidate tables and candidate column names for each logical column
      const candidateTables = ['user_security_answer', 'user_security_answers'];

      let wroteRows = false;

      for (const table of candidateTables) {
        try {
          // Check if table exists
          const tableExists = Array.isArray(await queryRunner.manager.query(
            `SELECT 1 FROM information_schema.tables WHERE table_name = $1 LIMIT 1`, [table]
          )) && (await queryRunner.manager.query(
            `SELECT 1 FROM information_schema.tables WHERE table_name = $1 LIMIT 1`, [table]
          )).length > 0;

          if (!tableExists) continue;

          // Detect actual column names in this table
          const userCol = await this.findColumnName(queryRunner.manager.query.bind(queryRunner.manager), table, ['user_id', 'userid', 'userId']);
          const questionCol = await this.findColumnName(queryRunner.manager.query.bind(queryRunner.manager), table, ['question_key', 'questionkey', 'questionKey']);
          const answerCol = await this.findColumnName(queryRunner.manager.query.bind(queryRunner.manager), table, ['answer_hash', 'answerhash', 'answerHash']);
          // created_at detection optional (we'll use created_at if present, else omit)
          const createdAtCol = await this.findColumnName(queryRunner.manager.query.bind(queryRunner.manager), table, ['created_at', 'createdat', 'createdAt']);

          if (!userCol || !questionCol || !answerCol) {
            // table present but columns not matching our candidates; skip this table
            this.logger.debug(`table ${table} exists but missing expected columns; userCol=${userCol}, questionCol=${questionCol}, answerCol=${answerCol}`);
            continue;
          }

          // Try delete existing rows for this user (best-effort)
          try {
            const deleteSql = `DELETE FROM ${table} WHERE "${userCol}" = $1`;
            await queryRunner.manager.query(deleteSql, [id]);
          } catch (delErr) {
            // ignore
            this.logger.debug(`delete from ${table} failed for user ${id}: ${(delErr as any)?.message ?? delErr}`);
          }

          // Insert rows using detected column names (use quoted identifiers)
          let insertOk = true;
          for (const r of hashedRows) {
            try {
              const cols = [`"${userCol}"`, `"${questionCol}"`, `"${answerCol}"`];
              if (createdAtCol) cols.push(`"${createdAtCol}"`);
              const placeholders = createdAtCol ? '$1,$2,$3,now()' : '$1,$2,$3';
              const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`;
              // If we used now() for created_at then placeholders still map to first 3 params
              await queryRunner.manager.query(sql, [id, r.question_key, r.answer_hash]);
            } catch (insErr) {
              insertOk = false;
              this.logger.warn(`insert into ${table} failed for user ${id} — ${(insErr as any)?.message ?? insErr}`);
              break;
            }
          }

          if (insertOk) {
            wroteRows = true;
            break;
          }
          // otherwise try next candidate table
        } catch (tErr) {
          this.logger.warn(`attempt to use table ${table} failed for user ${id}: ${(tErr as any)?.message ?? tErr}`);
          continue;
        }
      } // end for tables

      // Fallback: if we couldn't write table rows, attempt to store a summary hash in user row
      if (!wroteRows) {
        try {
          const summaryHash = crypto.createHmac('sha256', this.securitySecret())
            .update(JSON.stringify(hashedRows.map((r) => `${r.question_key}:${r.answer_hash}`)))
            .digest('hex');
          try {
            await queryRunner.manager.query(`UPDATE "user" SET security_answers_hash = $1 WHERE id = $2`, [summaryHash, id]);
            wroteRows = true;
          } catch (colErr) {
            this.logger.warn('writing security_answers_hash failed (column may be absent)', (colErr as any)?.message ?? colErr);
          }
        } catch (e) {
          this.logger.warn('failed to compute/store summaryHash for security answers', e as any);
        }
      }

      // Best-effort: try to update security-related flag(s) inside the transaction
      try {
        await queryRunner.manager.query(
          `UPDATE "user" SET require_security_setup = FALSE, security_configured = TRUE WHERE id = $1`,
          [id],
        );
      } catch (uerr) {
        this.logger.debug('transaction-update-user security flags failed or columns absent; will perform deterministic final update after commit', (uerr as any)?.message ?? uerr);
      }

      // Attempt to create an audit entry inside the transaction (best-effort)
      try {
        await createAuditEntry(this.ds, queryRunner.manager, {
          adminId: adminUser?.id ?? null,
          targetUserId: id,
          action: 'setup_security_answers',
          ip: opts?.ip ?? null,
          meta: { byAdmin: !!adminUser, note: opts?.reason ?? null },
        } as any);
      } catch (auditErr) {
        this.logger.warn('createAuditEntry inside transaction failed (will fallback after):', (auditErr as any)?.message ?? auditErr);
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      try { await queryRunner.rollbackTransaction(); } catch (_) {}
      this.logger.error('saveSecurityAnswers transaction failed', (err as any)?.message ?? err);
    } finally {
      try { await queryRunner.release(); } catch (_) {}
    }

    // Deterministic final out-of-transaction update: clear only security naming variants and set configured flag.
    try {
      await this.ds.manager.query(
        `UPDATE "user" SET
           require_security_setup = FALSE,
           "requireSecuritySetup" = FALSE,
           "securityConfigured" = TRUE,
           security_configured = TRUE
         WHERE id = $1`,
        [id],
      );
    } catch (e) {
      this.logger.warn('final deterministic update to clear security require flags failed: ' + ((e as any)?.message ?? e));
    }

    // Async: create audit entry and send notification (best-effort)
    try {
      await createAuditEntry(this.ds, this.ds.manager, {
        adminId: adminUser?.id ?? null,
        targetUserId: id,
        action: 'setup_security_answers',
        ip: opts?.ip ?? null,
        meta: { byAdmin: !!adminUser, note: opts?.reason ?? null },
      } as any);
    } catch (err) {
      this.logger.warn('createAuditEntry failed (fallback to console)', (err as any)?.message ?? err);
      this.logger.debug('AUDIT FALLBACK', {
        adminId: adminUser?.id ?? null,
        targetUserId: id,
        action: 'setup_security_answers',
        ip: opts?.ip ?? null,
        meta: { byAdmin: !!adminUser, note: opts?.reason ?? null },
        when: new Date().toISOString(),
      });
    }

    // Fetch and return authoritative, sanitized user
    try {
      const rows = await this.ds.query(
        `SELECT id, email, name,
                require_passphrase_setup, require_security_setup,
                "requirePassphraseSetup", "requireSecuritySetup",
                "securityConfigured", security_configured,
                "recoveryPassphraseHash", passphrase, user_uid, created_at
         FROM "user"
         WHERE id = $1
         LIMIT 1`,
        [id],
      );
      const fresh = Array.isArray(rows) && rows.length ? rows[0] : null;
      const sanitized = this.sanitizeUser(fresh);
      (async () => {
        try {
          const u = await this.ds.getRepository(User).findOne({ where: { id } } as any);
          if (u?.email) {
            await sendUserNotification({
              to: u.email,
              subject: 'Security questions saved',
              body: `Your security questions were updated successfully.`,
            });
          }
        } catch (e) {
          this.logger.warn('notification error after saving security answers', e as any);
        }
      })();
      return sanitized;
    } catch (finalErr) {
      this.logger.warn('failed to read back user after setup', (finalErr as any)?.message ?? finalErr);
      return null;
    }
  }
}