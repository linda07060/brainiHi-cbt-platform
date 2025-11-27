import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../user/user.entity';
import { revokeSessionsForUser, createAuditEntry, sendUserNotification } from './admin-helpers';

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(private readonly ds: DataSource) {}

  async getActivityByEmail(email?: string) {
    if (!email) return [];
    try {
      const rows = await this.ds.query(
        `SELECT id, user_id, email, ip, user_agent, created_at
         FROM user_login_activity
         WHERE email = $1
         ORDER BY created_at DESC
         LIMIT 200`,
        [email],
      );
      return rows;
    } catch (err) {
      this.logger.error('[AdminUsersService.getActivityByEmail] error', err);
      return [];
    }
  }

  async getActivityByUserId(userId?: number) {
    if (!userId) return [];
    try {
      const rows = await this.ds.query(
        `SELECT id, user_id, email, ip, user_agent, created_at
         FROM user_login_activity
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 200`,
        [userId],
      );
      return rows;
    } catch (err) {
      this.logger.error('[AdminUsersService.getActivityByUserId] error', err);
      return [];
    }
  }

  // --------------------------------------------------------------------
  // Admin actions: reset passphrase and reset security (defensive)
  // --------------------------------------------------------------------

  private sanitizeUser(raw: any) {
    if (!raw) return null;
    const copy = { ...raw };

    // Remove common sensitive fields if present
    delete copy.password;
    delete copy.password_hash;
    delete copy.two_factor_secret;
    delete (copy as any).twoFactorSecret;
    delete (copy as any).two_factor_secret;
    delete copy.security_answers_hash;
    delete copy.securityAnswersHash;
    delete copy.refresh_token;
    delete (copy as any).refreshToken;

    // Normalize any recovery passphrase hash column names so admin UI can expect a single property.
    const candidate =
      raw?.recoveryPassphraseHash ??
      raw?.recovery_passphrase_hash ??
      raw?.recovery_hash ??
      null;

    (copy as any).recoveryPassphraseHash = candidate ?? null;

    return copy;
  }

  /**
   * hasColumn(manager, columnName)
   * - manager is expected to be a query-capable object (queryRunner.manager or this.ds.manager).
   * - returns true if a column with the (case-insensitive) name exists on the user table.
   */
  private async hasColumn(manager: any, columnName: string): Promise<boolean> {
    try {
      const rows = await manager.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND lower(column_name) = $1 LIMIT 1`,
        [columnName.toLowerCase()],
      );
      return Array.isArray(rows) && rows.length > 0;
    } catch (err) {
      this.logger.warn('hasColumn check failed for ' + columnName, err as any);
      return false;
    }
  }

  /**
   * getUserForAdmin
   */
  public async getUserForAdmin(targetUserId: number | string) {
    const id = Number(targetUserId);
    if (Number.isNaN(id) || id <= 0) throw new NotFoundException('Invalid user id');

    try {
      const sql = `
        SELECT
          id,
          email,
          name,
          plan,
          phone,
          created_at,
          updated_at,
          user_uid,
          "recoveryPassphraseHash" as "recoveryPassphraseHash",
          recovery_passphrase_hash as recovery_passphrase_hash,
          recovery_hash as recovery_hash,
          require_security_setup,
          require_passphrase_setup,
          securityConfigured,
          security_configured
        FROM "user"
        WHERE id = $1
        LIMIT 1
      `;
      const rows = await this.ds.query(sql, [id]);
      const raw = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

      if (!raw) {
        const repoRow = await this.ds.getRepository(User).findOne({ where: { id } } as any);
        if (!repoRow) throw new NotFoundException('User not found');
        return this.sanitizeUser(repoRow);
      }

      return this.sanitizeUser(raw);
    } catch (err) {
      this.logger.error('[AdminUsersService.getUserForAdmin] error', err);
      throw err;
    }
  }

  /**
   * resetPassphrase
   * - Only sets passphrase-related require flags.
   * - Performs per-column deterministic updates (checks column existence before updating).
   *
   * NOTE: This function intentionally does NOT touch security_configured / securityConfigured.
   * Resetting a passphrase should not clear whether the user's security questions are configured.
   */
  public async resetPassphrase(adminUser: any, targetUserId: number | string, opts?: { reason?: string; ip?: string }) {
    const id = Number(targetUserId);
    const queryRunner = this.ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const userRepo = queryRunner.manager.getRepository(User);
      const user = await userRepo.findOne({ where: { id } } as any);
      if (!user) throw new NotFoundException('User not found');

      // detect schema columns
      const hasRecovery = await this.hasColumn(queryRunner.manager, 'recoveryPassphraseHash');
      const hasPassphrase = await this.hasColumn(queryRunner.manager, 'passphrase');
      const hasRequireFlag = await this.hasColumn(queryRunner.manager, 'require_security_setup');
      const hasRequirePassphrase = await this.hasColumn(queryRunner.manager, 'require_passphrase_setup');
      const hasUpdatedAt = await this.hasColumn(queryRunner.manager, 'updated_at');
      const hasUpdatedAtCamel = await this.hasColumn(queryRunner.manager, 'updatedAt');

      // Build an UPDATE that only touches existing columns (avoid referencing missing ones)
      if (hasRecovery || hasPassphrase || hasRequireFlag || hasRequirePassphrase || hasUpdatedAt || hasUpdatedAtCamel) {
        const setParts: string[] = [];
        const params: any[] = [];
        let idx = 1;

        if (hasRecovery) setParts.push(`"recoveryPassphraseHash" = NULL`);
        else if (hasPassphrase) setParts.push(`passphrase = NULL`);

        // Only ensure a passphrase-related require flag is set (not both)
        if (hasRequirePassphrase) {
          setParts.push(`require_passphrase_setup = TRUE`);
        } else if (hasRequireFlag) {
          // fallback to require_security_setup if no dedicated passphrase flag exists
          setParts.push(`require_security_setup = TRUE`);
        }

        if (hasUpdatedAt) setParts.push(`updated_at = now()`);
        else if (hasUpdatedAtCamel) setParts.push(`"updatedAt" = now()`);

        this.logger.debug('resetPassphrase update setParts=' + JSON.stringify(setParts));

        if (setParts.length > 0) {
          const sql = `UPDATE "user" SET ${setParts.join(', ')} WHERE id = $${idx}`;
          params.push(id);
          this.logger.debug('Executing SQL', sql, params);
          await queryRunner.manager.query(sql, params);
        } else {
          try {
            const upd: any = { updatedAt: new Date(), updated_at: new Date() };
            if (hasRequirePassphrase) upd.require_passphrase_setup = true;
            else if (hasRequireFlag) upd.require_security_setup = true;
            this.logger.debug('Fallback userRepo.update', upd);
            await userRepo.update(id, upd as any);
          } catch (err) {
            this.logger.warn('Fallback update failed', err as any);
          }
        }
      } else {
        try {
          await userRepo.update(id, {
            require_security_setup: true,
            updatedAt: new Date(),
            updated_at: new Date(),
          } as any);
        } catch (err) {
          this.logger.warn('Repository update failed', err as any);
        }
      }

      // Revoke sessions / tokens (use transaction manager)
      try {
        await revokeSessionsForUser(this.ds, queryRunner.manager, id);
      } catch (err) {
        this.logger.warn('revokeSessionsForUser failed (non-fatal)', err as any);
      }

      // Commit & release transaction BEFORE doing final deterministic updates
      await queryRunner.commitTransaction();
      await queryRunner.release();

      // DETERMINISTIC FINAL UPDATES (OUT-OF-TRANSACTION)
      // Update each relevant variant individually, only if the column exists.
      try {
        const mgr = this.ds.manager;
        // Passphrase-related variants only
        if (await this.hasColumn(mgr, 'require_passphrase_setup')) {
          await mgr.query(`UPDATE "user" SET require_passphrase_setup = TRUE WHERE id = $1`, [id]);
        }
        if (await this.hasColumn(mgr, 'requirePassphraseSetup')) {
          await mgr.query(`UPDATE "user" SET "requirePassphraseSetup" = TRUE WHERE id = $1`, [id]);
        }
        // Intentionally DO NOT modify security_configured / securityConfigured here.
      } catch (err) {
        this.logger.warn('final deterministic updates failed during resetPassphrase', (err as any)?.message ?? err);
      }

      // Audit entry (non-fatal)
      try {
        await createAuditEntry(this.ds, this.ds.manager, {
          adminId: adminUser?.id ?? adminUser?.userId ?? null,
          targetUserId: id,
          action: 'reset_passphrase',
          ip: opts?.ip,
          meta: { reason: opts?.reason ?? null },
        });
      } catch (err) {
        this.logger.warn('createAuditEntry failed, falling back to console log', err as any);
        this.logger.debug('AUDIT FALLBACK', {
          adminId: adminUser?.id ?? null,
          targetUserId: id,
          action: 'reset_passphrase',
          ip: opts?.ip,
          meta: { reason: opts?.reason ?? null },
          when: new Date().toISOString(),
        });
      }

      // Read back authoritative user and return sanitized
      const updatedUser = await this.ds.getRepository(User).findOne({ where: { id } } as any);
      const sanitized = this.sanitizeUser(updatedUser);

      // Notify user (best-effort)
      (async () => {
        try {
          const u = await this.ds.getRepository(User).findOne({ where: { id } } as any);
          if (u?.email) {
            await sendUserNotification({
              to: u.email,
              subject: 'Your recovery passphrase has been reset by an administrator',
              body: `An administrator has cleared your recovery passphrase. You will be required to set a new recovery passphrase on your next login.`,
            });
          }
        } catch (err) {
          this.logger.error('resetPassphrase: notification error', err as any);
        }
      })();

      this.logger.debug('resetPassphrase completed for user ' + id);
      return { message: 'Passphrase cleared; user must set a new passphrase on next login.', user: sanitized };
    } catch (err) {
      try {
        await queryRunner.rollbackTransaction();
      } catch (rbErr) {
        this.logger.warn('rollback failed', rbErr as any);
      }
      throw err;
    } finally {
      try {
        if (queryRunner.isReleased === false) await queryRunner.release();
      } catch {}
    }
  }

  /**
   * resetSecurity
   * - Only sets security-related require flags.
   * - Deterministic final updates set security variants only.
   */
  public async resetSecurity(adminUser: any, targetUserId: number | string, opts?: { reason?: string; ip?: string }) {
    const id = Number(targetUserId);
    const queryRunner = this.ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const userRepo = queryRunner.manager.getRepository(User);
      const user = await userRepo.findOne({ where: { id } } as any);
      if (!user) throw new NotFoundException('User not found');

      // Delete rows from user_security_answer (defensive)
      try {
        await queryRunner.manager.query(`DELETE FROM user_security_answer WHERE "userId" = $1`, [id]);
      } catch (err) {
        try {
          await queryRunner.manager.query(`DELETE FROM user_security_answers WHERE "userId" = $1`, [id]);
        } catch {
          // ignore if table not present
        }
      }

      const hasRecovery = await this.hasColumn(queryRunner.manager, 'recoveryPassphraseHash');
      const hasPassphrase = await this.hasColumn(queryRunner.manager, 'passphrase');
      const hasSecurityConfigured = await this.hasColumn(queryRunner.manager, 'securityConfigured');
      const hasRequireFlag = await this.hasColumn(queryRunner.manager, 'require_security_setup');
      const hasRequirePassphrase = await this.hasColumn(queryRunner.manager, 'require_passphrase_setup');

      if (hasRecovery || hasPassphrase || hasSecurityConfigured || hasRequireFlag || hasRequirePassphrase) {
        const setParts: string[] = [];
        const params: any[] = [];
        let idx = 1;

        if (hasRecovery) setParts.push(`"recoveryPassphraseHash" = NULL`);
        else if (hasPassphrase) setParts.push(`passphrase = NULL`);

        if (hasSecurityConfigured) setParts.push(`"securityConfigured" = FALSE`);
        if (hasRequireFlag) setParts.push(`require_security_setup = TRUE`);
        // Do not set passphrase require flag here unless schema requires it and admin intentionally requested.
        if (hasRequirePassphrase) {
          // keep passphrase flag untouched for resetSecurity
        } else if (!hasRequireFlag && !hasRequirePassphrase) {
          // fallback, ensure at least security require is set
          setParts.push(`require_security_setup = TRUE`);
        }

        const hasUpdatedAt2 = await this.hasColumn(queryRunner.manager, 'updated_at');
        const hasUpdatedAtCamel2 = await this.hasColumn(queryRunner.manager, 'updatedAt');
        if (hasUpdatedAt2) setParts.push(`updated_at = now()`);
        else if (hasUpdatedAtCamel2) setParts.push(`"updatedAt" = now()`);

        this.logger.debug('resetSecurity update setParts=' + JSON.stringify(setParts));

        if (setParts.length > 0) {
          const sql = `UPDATE "user" SET ${setParts.join(', ')} WHERE id = $${idx}`;
          params.push(id);
          this.logger.debug('Executing SQL', sql, params);
          await queryRunner.manager.query(sql, params);
        }
      } else {
        try {
          await userRepo.update(id, {
            securityConfigured: false,
            require_security_setup: true,
            updatedAt: new Date(),
            updated_at: new Date(),
          } as any);
        } catch (err) {
          this.logger.warn('fallback update failed', err as any);
        }
      }

      try {
        await revokeSessionsForUser(this.ds, queryRunner.manager, id);
      } catch (err) {
        this.logger.warn('revokeSessionsForUser failed (non-fatal)', err as any);
      }

      await queryRunner.commitTransaction();
      await queryRunner.release();

      // Deterministic final updates (security variants only)
      try {
        const mgr = this.ds.manager;
        if (await this.hasColumn(mgr, 'require_security_setup')) {
          await mgr.query(`UPDATE "user" SET require_security_setup = TRUE WHERE id = $1`, [id]);
        }
        if (await this.hasColumn(mgr, 'requireSecuritySetup')) {
          await mgr.query(`UPDATE "user" SET "requireSecuritySetup" = TRUE WHERE id = $1`, [id]);
        }
        if (await this.hasColumn(mgr, 'security_configured')) {
          await mgr.query(`UPDATE "user" SET security_configured = FALSE WHERE id = $1`, [id]);
        }
        if (await this.hasColumn(mgr, 'securityConfigured')) {
          await mgr.query(`UPDATE "user" SET "securityConfigured" = FALSE WHERE id = $1`, [id]);
        }
      } catch (err) {
        this.logger.warn('final deterministic updates failed during resetSecurity', (err as any)?.message ?? err);
      }

      // Audit entry (non-fatal)
      try {
        await createAuditEntry(this.ds, this.ds.manager, {
          adminId: adminUser?.id ?? adminUser?.userId ?? null,
          targetUserId: id,
          action: 'reset_security',
          ip: opts?.ip,
          meta: { reason: opts?.reason ?? null },
        });
      } catch (err) {
        this.logger.warn('createAuditEntry failed, falling back to console log', err as any);
        this.logger.debug('AUDIT FALLBACK', {
          adminId: adminUser?.id ?? null,
          targetUserId: id,
          action: 'reset_security',
          ip: opts?.ip,
          meta: { reason: opts?.reason ?? null },
          when: new Date().toISOString(),
        });
      }

      const updatedUser2 = await this.ds.getRepository(User).findOne({ where: { id } } as any);
      const sanitized2 = this.sanitizeUser(updatedUser2);

      // async notify
      (async () => {
        try {
          const u = await this.ds.getRepository(User).findOne({ where: { id } } as any);
          if (u?.email) {
            await sendUserNotification({
              to: u.email,
              subject: 'Your security settings were reset by an administrator',
              body: `An administrator cleared your security questions and recovery passphrase. You will be required to set new security questions and a passphrase on your next login.`,
            });
          }
        } catch (err) {
          this.logger.error('resetSecurity: notification error', err as any);
        }
      })();

      this.logger.debug('resetSecurity completed for user ' + id);
      return { message: 'Security data reset; user must reconfigure security on next login.', user: sanitized2 };
    } catch (err) {
      try {
        await queryRunner.rollbackTransaction();
      } catch (rbErr) {
        this.logger.warn('rollback failed', rbErr as any);
      }
      throw err;
    } finally {
      try {
        if (queryRunner.isReleased === false) await queryRunner.release();
      } catch {}
    }
  }
}