import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Request } from 'express';

/**
 * EnforceResetGuard
 * - Can be used globally or per-controller.
 * - If req.user is present (set by JwtAuthGuard) it will query DB to read require flags.
 * - If either require flag is set, it returns a 403 with structured info so frontend can redirect.
 *
 * Notes:
 * - This guard is intentionally tolerant: if DB lookup fails it will allow the request (fail-open)
 *   to avoid accidental lockouts. Change to fail-closed if you prefer stronger protection.
 * - Allowed paths listed below will be permitted even when flags are set (so user can complete setup).
 */
@Injectable()
export class EnforceResetGuard implements CanActivate {
  private readonly logger = new Logger(EnforceResetGuard.name);

  constructor(private readonly ds: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const userPayload: any = (req as any).user ?? null;

    // If not authenticated (no user attached), let other guards handle it
    if (!userPayload || !userPayload.sub) return true;

    // Allow these endpoints so user can complete setup flows
    const allowedPrefixes = [
      '/auth/setup-passphrase',
      '/auth/setup-security',
      '/auth/logout',
      '/auth/change-password',
      // keep admin routes accessible to admin users (they use AdminAuthGuard)
      '/admin',
    ];

    // Allow OPTIONS and public endpoints
    if (req.method === 'OPTIONS') return true;

    // Allow allowed prefixes to proceed (so setup endpoints are not blocked)
    try {
      if (allowedPrefixes.some((p) => req.path.startsWith(p))) {
        return true;
      }
    } catch {
      // continue
    }

    try {
      const id = Number(userPayload.sub);
      if (!Number.isFinite(id) || id <= 0) return true;

      // Query minimal set of columns so it works across variants of your schema
      const sql = `
        SELECT
          require_passphrase_setup,
          require_security_setup,
          requirePassphraseSetup,
          requireSecuritySetup,
          securityConfigured,
          security_configured
        FROM "user"
        WHERE id = $1
        LIMIT 1
      `;
      const rows: any[] = await this.ds.query(sql, [id]);
      const src = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

      const requirePass = !!(src?.require_passphrase_setup ?? src?.requirePassphraseSetup ?? false);
      const requireSec = !!(src?.require_security_setup ?? src?.requireSecuritySetup ?? false);
      const securityConfigured = src ? !!(src.securityConfigured ?? src.security_configured ?? false) : undefined;

      // Determine requirement similar to frontend tolerant rules
      const needSecurity = requireSec || (securityConfigured === false);
      const needPassphrase = requirePass;

      if (needSecurity || needPassphrase) {
        // Throw 403 with structured detail for frontend to act on
        throw new ForbiddenException({
          message: 'Account requires passphrase/security setup',
          requireSecuritySetup: needSecurity,
          requirePassphraseSetup: needPassphrase,
        });
      }

      return true;
    } catch (err) {
      // If we explicitly threw ForbiddenException above, rethrow so Nest returns 403 with detail
      if (err instanceof ForbiddenException) throw err;

      // On DB or unexpected errors: log and allow the request (fail-open).
      this.logger.warn('EnforceResetGuard encountered an error; allowing request (fail-open).', err as any);
      return true;
    }
  }
}