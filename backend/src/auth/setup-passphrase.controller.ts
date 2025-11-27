import { Controller, Post, Body, UseGuards, Req, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { User } from '../user/user.entity';
import { sendUserNotification } from '../admin/admin-helpers';

type BodyShape = { passphrase?: string };

@Controller('auth')
export class SetupPassphraseController {
  private readonly logger = new Logger(SetupPassphraseController.name);

  constructor(private readonly ds: DataSource, private readonly config: ConfigService) {}

  private securitySecret(): string {
    const s = this.config.get<string>('SECURITY_SECRET') ?? process.env.SECURITY_SECRET;
    if (!s) {
      this.logger.error('SECURITY_SECRET is not configured');
      throw new Error('SECURITY_SECRET not configured');
    }
    return s;
  }

  private hashPassphrase(value: string) {
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

  /**
   * Flexible hasColumn helper.
   * Usage:
   *   await this.hasColumn('columnName')              // uses this.ds.query
   *   await this.hasColumn(manager, 'columnName')     // uses provided manager.query
   */
  private async hasColumn(managerOrName: any, maybeName?: string): Promise<boolean> {
    let manager: any;
    let columnName: string;

    if (typeof managerOrName === 'string') {
      manager = this.ds;
      columnName = managerOrName;
    } else {
      manager = managerOrName;
      columnName = String(maybeName);
    }

    try {
      const qFn = manager && typeof manager.query === 'function' ? manager.query.bind(manager) : this.ds.query.bind(this.ds);
      const rows = await qFn(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND lower(column_name) = $1 LIMIT 1`,
        [columnName.toLowerCase()],
      );
      return Array.isArray(rows) && rows.length > 0;
    } catch (err) {
      this.logger.warn(`hasColumn check failed for ${columnName}: ${(err as any)?.message ?? err}`);
      return false;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('setup-passphrase')
  async setupPassphrase(@Req() req: Request, @Body() body: BodyShape) {
    const userPayload = (req as any).user as any;
    const userId =
      userPayload?.id ?? userPayload?.sub ?? userPayload?.user_id ?? userPayload?.userUid ?? userPayload?.user_uid ?? null;
    if (!userPayload || !userId) throw new UnauthorizedException('Authenticated user required');

    const passphrase = (body && body.passphrase) ? String(body.passphrase).trim() : '';
    if (!passphrase || passphrase.length < 4) throw new BadRequestException('Passphrase must be at least 4 characters');

    const hashed = this.hashPassphrase(passphrase);
    const repo = this.ds.getRepository(User);

    try {
      // Detect columns (manager-less checks)
      const hasRecovery = await this.hasColumn('recoveryPassphraseHash');
      const hasPassphrase = await this.hasColumn('passphrase');
      const hasRequirePassphrase = await this.hasColumn('require_passphrase_setup');
      const hasUpdatedAt = (await this.hasColumn('updated_at')) || (await this.hasColumn('updatedAt'));

      // Primary write: prefer existing recoveryPassphraseHash (camelCase), then passphrase, else fallback repo.update
      if (hasRecovery) {
        // Use explicit quoted camelCase name
        await this.ds.query(`UPDATE "user" SET "recoveryPassphraseHash" = $1 WHERE id = $2`, [hashed, userId]);
      } else if (hasPassphrase) {
        await this.ds.query(`UPDATE "user" SET passphrase = $1 WHERE id = $2`, [hashed, userId]);
      } else {
        // No dedicated passphrase column — best-effort fallback: update passphrase-related flag only and return
        await repo.update(userId, {
          require_passphrase_setup: false,
          updatedAt: new Date(),
          updated_at: new Date(),
        } as any);
      }

      // Deterministic final updates: check for each passphrase-related column before updating.
      // IMPORTANT: Only touch passphrase-related flags here. Do NOT touch security flags or securityConfigured.
      const mgr = this.ds.manager;

      if (await this.hasColumn(mgr, 'require_passphrase_setup')) {
        try { await mgr.query(`UPDATE "user" SET require_passphrase_setup = FALSE WHERE id = $1`, [userId]); } catch {}
      }

      if (await this.hasColumn(mgr, 'requirePassphraseSetup')) {
        try { await mgr.query(`UPDATE "user" SET "requirePassphraseSetup" = FALSE WHERE id = $1`, [userId]); } catch {}
      }

      // Read authoritative user row and return (include both variants so frontend can normalize)
      const rows: any[] = await this.ds.query(
        `SELECT id, email, name,
                require_passphrase_setup, require_security_setup,
                "requirePassphraseSetup", "requireSecuritySetup",
                "securityConfigured", security_configured,
                "recoveryPassphraseHash", user_uid, created_at
         FROM "user"
         WHERE id = $1
         LIMIT 1`,
        [userId],
      );
      const fresh = Array.isArray(rows) && rows.length ? rows[0] : null;
      const sanitized = this.sanitizeUser(fresh);

      // Best-effort: If the user already has security answers recorded and the server does NOT currently
      // require security setup for this user, ensure security_configured is set to true.
      // This avoids marking configured=true when an admin explicitly required security (admin reset both).
      (async () => {
        try {
          const localMgr = this.ds.manager;
          let hasAnswers = false;

          // Check first candidate table: user_security_answer (camelCase userId)
          try {
            const t = await localMgr.query(`SELECT 1 FROM information_schema.tables WHERE table_name = $1 LIMIT 1`, ['user_security_answer']);
            if (Array.isArray(t) && t.length > 0) {
              const r = await localMgr.query(`SELECT 1 FROM user_security_answer WHERE "userId" = $1 LIMIT 1`, [userId]);
              if (Array.isArray(r) && r.length > 0) hasAnswers = true;
            }
          } catch (e) {
            // ignore and continue
          }

          // Check alternate candidate table: user_security_answers
          try {
            const t2 = await localMgr.query(`SELECT 1 FROM information_schema.tables WHERE table_name = $1 LIMIT 1`, ['user_security_answers']);
            if (Array.isArray(t2) && t2.length > 0) {
              const r2 = await localMgr.query(`SELECT 1 FROM user_security_answers WHERE "userId" = $1 LIMIT 1`, [userId]);
              if (Array.isArray(r2) && r2.length > 0) hasAnswers = true;
            }
          } catch (e) {
            // ignore and continue
          }

          // Check for a summary hash stored on the user row in either naming variant (defensive).
          if (!hasAnswers) {
            try {
              if (await this.hasColumn(localMgr, 'security_answers_hash')) {
                const hh = await localMgr.query(`SELECT security_answers_hash FROM "user" WHERE id = $1 LIMIT 1`, [userId]);
                if (Array.isArray(hh) && hh.length > 0 && hh[0].security_answers_hash) hasAnswers = true;
              }
            } catch {}
            try {
              if (!hasAnswers && await this.hasColumn(localMgr, 'securityAnswersHash')) {
                const hh2 = await localMgr.query(`SELECT "securityAnswersHash" FROM "user" WHERE id = $1 LIMIT 1`, [userId]);
                if (Array.isArray(hh2) && hh2.length > 0 && hh2[0].securityAnswersHash) hasAnswers = true;
              }
            } catch {}
          }

          // Only set configured = true if:
          //  - we found evidence of answers (hasAnswers)
          //  - AND the authoritative fresh row does NOT indicate require_security_setup (admin did not request security)
          const requireSecurityFlag = !!(fresh?.require_security_setup ?? fresh?.requireSecuritySetup ?? false);
          if (hasAnswers && !requireSecurityFlag) {
            try {
              if (await this.hasColumn(localMgr, 'security_configured')) {
                await localMgr.query(`UPDATE "user" SET security_configured = TRUE WHERE id = $1`, [userId]);
              }
            } catch (e) {
              // ignore
            }
            try {
              if (await this.hasColumn(localMgr, 'securityConfigured')) {
                await localMgr.query(`UPDATE "user" SET "securityConfigured" = TRUE WHERE id = $1`, [userId]);
              }
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          this.logger.debug('post-setup-passphrase: security-configured check failed (non-fatal)', (e as any)?.message ?? e);
        }
      })();

      // Best-effort audit + notify (non-fatal)
      try {
        await this.ds.manager.query(
          `INSERT INTO admin_audit (admin_id, target_user_id, action, ip, meta, created_at) VALUES ($1,$2,$3,$4,$5,now())`,
          [null, userId, 'setup_passphrase', (req as any).ip ?? null, null],
        );
      } catch (e) {
        this.logger.debug('audit insert skipped', (e as any)?.message ?? e);
      }
      (async () => {
        try {
          if (fresh?.email) {
            await sendUserNotification({
              to: fresh.email,
              subject: 'Recovery passphrase saved',
              body: `Your recovery passphrase was set successfully.`,
            });
          }
        } catch (e) {
          this.logger.debug('notification error', (e as any)?.message ?? e);
        }
      })();

      return { message: 'Passphrase saved', user: sanitized };
    } catch (err) {
      // Log full error once and return a safe client message
      this.logger.error('Failed to save passphrase', (err as any)?.message ?? err);
      throw new BadRequestException('Unable to save passphrase');
    }
  }
}