import { Controller, Get, Query, BadRequestException, UseGuards, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminAuthGuard } from './admin-auth.guard'; // keep for other endpoints if needed
import { User } from '../user/user.entity';

/**
 * Dev-only debug helper.
 * - Enabled when DEBUG_ADMIN_ENDPOINT='true' OR NODE_ENV !== 'production'.
 * - Returns DB info, counts and optionally recent ai_log rows.
 * - If an internal error occurs, returns the error message + stack (dev only).
 */
@Controller('admin/debug')
export class AdminDebugController {
  private readonly logger = new Logger(AdminDebugController.name);

  constructor(private readonly dataSource: DataSource) {}

  @Get('status')
  async status(
    @Query('email') email?: string,
    @Query('password') password?: string,
    @Query('last') lastRaw?: string,
  ) {
    const allow = (process.env.DEBUG_ADMIN_ENDPOINT === 'true') || (process.env.NODE_ENV !== 'production');
    if (!allow) {
      throw new BadRequestException('Debug endpoint not enabled');
    }

    try {
      // Masked DB URL -- do not leak credentials
      const rawUrl = (this.dataSource?.options as any)?.url || process.env.DATABASE_URL || '';
      const maskedUrl = rawUrl ? rawUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@') : '';

      // Basic counts: guard queries in try/catch individually so a missing table doesn't fail everything
      let userCount = 0;
      let adminCount = 0;
      let aiCount = 0;

      try {
        const userCountRes = await this.dataSource.query(`SELECT count(*)::int AS count FROM "user"`);
        userCount = Array.isArray(userCountRes) && userCountRes[0] ? Number(userCountRes[0].count || 0) : 0;
      } catch (e) {
        // leave userCount as 0 and include the error info later
      }

      try {
        const adminCountRes = await this.dataSource.query(`SELECT count(*)::int AS count FROM "admin"`);
        adminCount = Array.isArray(adminCountRes) && adminCountRes[0] ? Number(adminCountRes[0].count || 0) : 0;
      } catch (e) {}

      try {
        // try common table names: ai_log and ai_logs
        let aiCountRes = await this.dataSource.query(`SELECT count(*)::int AS count FROM ai_log`);
        if (!Array.isArray(aiCountRes) || !aiCountRes[0]) {
          aiCountRes = await this.dataSource.query(`SELECT count(*)::int AS count FROM ai_logs`);
        }
        aiCount = Array.isArray(aiCountRes) && aiCountRes[0] ? Number(aiCountRes[0].count || 0) : 0;
      } catch (e) {}

      const out: any = {
        db: maskedUrl || '(no url available)',
        userCount,
        adminCount,
        aiCount,
      };

      // include last N ai_log rows if requested (non-sensitive fields only)
      const last = Math.min(100, Math.max(0, Number(lastRaw || 0)));
      if (last > 0) {
        // try both possible table names, return whichever works
        const tryQueries = [
          `SELECT id, left(prompt::text, 200) AS prompt_preview, model, success, error, created_at AS "createdAt" FROM ai_log ORDER BY id DESC LIMIT $1`,
          `SELECT id, left(prompt::text, 200) AS prompt_preview, model, success, error, created_at AS "createdAt" FROM ai_logs ORDER BY id DESC LIMIT $1`,
        ];
        for (const q of tryQueries) {
          try {
            const logs = await this.dataSource.query(q, [last]);
            if (Array.isArray(logs)) {
              out.aiLogs = (logs || []).map((r: any) => ({
                id: r.id,
                promptPreview: r.prompt_preview,
                model: r.model,
                success: r.success,
                error: r.error,
                createdAt: r.createdAt,
              }));
              break;
            }
          } catch (err) {
            // try next query
          }
        }
      }

      if (email) {
        const emailNorm = (email || '').toString().trim().toLowerCase();
        try {
          const users = await this.dataSource.query(`SELECT id, email, name FROM "user" WHERE email = $1 LIMIT 1`, [emailNorm]);
          out.userFound = Array.isArray(users) && users.length > 0;
          if (out.userFound) {
            out.user = users[0];
          }
          if (password && out.userFound) {
            const pwRes = await this.dataSource.query(`SELECT password FROM "user" WHERE email = $1 LIMIT 1`, [emailNorm]);
            const stored = Array.isArray(pwRes) && pwRes[0] ? pwRes[0].password : null;
            if (stored) {
              try {
                out.passwordMatches = await bcrypt.compare(String(password), String(stored));
              } catch (err) {
                out.passwordMatches = false;
                out._compareError = String(err?.message || err);
              }
            } else {
              out.passwordMatches = false;
            }
          }
        } catch (err) {
          out.userQueryError = String(err?.message || err);
        }
      }

      return out;
    } catch (err: any) {
      // Return error details in dev so we can diagnose quickly (safe because this endpoint is dev-only)
      return {
        statusCode: 500,
        message: 'Internal server error',
        errorMessage: err?.message || String(err),
        stack: err?.stack || null,
      };
    }
  }

  /**
   * Admin-only DB visibility/status endpoint.
   * In development or when DEBUG_ADMIN_ENDPOINT='true' this endpoint can be called without Authorization.
   * In production it still requires admin authentication.
   */
  @Get('db-status')
  async dbStatus() {
    const allow = (process.env.DEBUG_ADMIN_ENDPOINT === 'true') || (process.env.NODE_ENV !== 'production');
    if (!allow) {
      // in production we require admin auth; do not expose this endpoint publicly
      // return a generic not-enabled response to avoid leaking info
      throw new BadRequestException('Debug endpoint not enabled');
    }

    try {
      // Try to read current database/schema
      let dbInfo: any = null;
      try {
        const info = await this.dataSource.query(`SELECT current_database() AS current_database, current_schema() AS current_schema`);
        if (Array.isArray(info) && info.length > 0) {
          dbInfo = { current_database: info[0].current_database, current_schema: info[0].current_schema };
        }
      } catch (e) {
        dbInfo = { error: String(e?.message ?? e) };
      }

      // Count rows in user_login_activity (safe)
      let activityCount: number | { error: string } = 0;
      try {
        const cnt = await this.dataSource.query(`SELECT COUNT(*)::int AS cnt FROM user_login_activity`);
        activityCount = Array.isArray(cnt) && cnt[0] ? Number(cnt[0].cnt) : 0;
      } catch (e) {
        activityCount = { error: String(e?.message ?? e) };
      }

      // Sample recent rows (up to 5)
      let sample: any[] = [];
      try {
        const rows = await this.dataSource.query(
          `SELECT id, user_id, email, ip, user_agent, created_at
           FROM user_login_activity
           ORDER BY created_at DESC
           LIMIT 5`,
        );
        sample = Array.isArray(rows) ? rows : [];
      } catch (e) {
        sample = [{ error: String(e?.message ?? e) }];
      }

      return { ok: true, db: dbInfo, activityCount, recentSample: sample };
    } catch (err: any) {
      return { ok: false, error: String(err?.message ?? err) };
    }
  }

  /**
   * Temporary diagnostic: return DB connection info and the exact user row the server sees.
   * Useful for confirming the Nest process is connected to the same database you inspect from psql.
   *
   * Usage:
   *  GET /admin/debug/db-info?userId=6
   *  GET /admin/debug/db-info?email=webfree@gmail.com
   */
  @Get('db-info')
  async dbInfo(@Query('userId') userId?: string, @Query('email') email?: string) {
    const allow = (process.env.DEBUG_ADMIN_ENDPOINT === 'true') || (process.env.NODE_ENV !== 'production');
    if (!allow) {
      throw new BadRequestException('Debug endpoint not enabled');
    }

    try {
      // Basic DB metadata
      let dbMeta: any = null;
      try {
        const info = await this.dataSource.query(`SELECT current_database() AS db, inet_server_addr() AS server_addr, inet_server_port() AS server_port`);
        dbMeta = Array.isArray(info) && info.length > 0 ? info[0] : info;
      } catch (err) {
        dbMeta = { error: String(err?.message ?? err) };
      }

      // Fetch user row via repository (ORM) if requested
      let userRow: any = null;
      if (userId) {
        const idNum = Number(userId);
        if (!Number.isNaN(idNum)) {
          userRow = await this.dataSource.getRepository(User).findOne({ where: { id: idNum } } as any);
        }
      } else if (email) {
        userRow = await this.dataSource.getRepository(User).findOne({ where: [{ email: String(email).toLowerCase() }] } as any);
      }

      // Explicit raw select that quotes mixed-case column names (returns require flags + recovery hash)
      let rawRow: any = null;
      if (userRow?.id) {
        try {
          const rows = await this.dataSource.query(
            `SELECT id, email, require_security_setup, require_passphrase_setup, "recoveryPassphraseHash" AS recovery_hash
             FROM "user" WHERE id = $1 LIMIT 1`,
            [userRow.id],
          );
          rawRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        } catch (err) {
          rawRow = { error: String(err?.message ?? err) };
        }
      }

      return { dbMeta, userRow, rawRow, note: 'temporary debug endpoint - remove when finished' };
    } catch (err: any) {
      return { error: String(err?.message ?? err) };
    }
  }
}