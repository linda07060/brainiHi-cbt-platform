import { Injectable, CanActivate, ExecutionContext, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { SettingsService } from '../../modules/settings/settings.service';
import { JwtService } from '@nestjs/jwt';

/**
 * MaintenanceGuard
 *
 * - When settings.maintenance.enabled === true:
 *   - Allows /admin/* routes (admin console + admin APIs) so admins can turn maintenance off.
 *   - Allows safe public GETs (e.g. GET /settings and GET /admin/settings/health).
 *   - Blocks mutating or sensitive endpoints (POST/PUT/PATCH/DELETE and login/register) with a 503.
 * - Fail-open: if settings cannot be read, guard permits requests (avoids accidental downtime).
 */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly jwtService: JwtService, // used to validate admin token if provided
  ) {}

  private async isAdminFromToken(req: Request): Promise<boolean> {
    try {
      const auth = (req.headers['authorization'] as string) || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      if (!token) return false;

      // Try admin secret first (admin tokens normally signed with ADMIN_JWT_SECRET).
      const adminSecret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
      try {
        const payload = this.jwtService.verify(token, { secret: adminSecret });
        return !!(payload && (payload.role === 'admin' || payload.isAdmin === true || payload.admin === true));
      } catch {
        // fallback to default JWT_SECRET if different
        try {
          const fallbackSecret = process.env.JWT_SECRET;
          const payload2 = this.jwtService.verify(token, { secret: fallbackSecret });
          return !!(payload2 && (payload2.role === 'admin' || payload2.isAdmin === true || payload2.admin === true));
        } catch {
          return false;
        }
      }
    } catch {
      return false;
    }
  }

  private isAdminPath(req: Request): boolean {
    return /^\/admin(\/|$)/i.test(req.path);
  }

  private isPublicSettingsPath(req: Request): boolean {
    // allow public settings read and the settings health endpoint
    return /^\/settings(\/|$)/i.test(req.path) || /^\/admin\/settings\/health$/i.test(req.path);
  }

  private isSafeGet(req: Request): boolean {
    return req.method === 'GET';
  }

  private isSensitivePath(req: Request): boolean {
    const path = (req.path || '').toLowerCase();
    // login / register endpoints commonly block during maintenance
    return path.startsWith('/auth/login') || path.startsWith('/auth/register') || path.startsWith('/api/auth/login') || path.startsWith('/api/auth/register');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    // Always allow admin paths to proceed (admins must be able to toggle maintenance)
    if (this.isAdminPath(req)) return true;

    // Try reading settings; fail-open if read fails.
    let settings: any = null;
    try {
      settings = await this.settingsService.getSettings();
    } catch {
      // allow through if settings cannot be read
      return true;
    }

    const enabled = !!settings?.maintenance?.enabled;
    const message = settings?.maintenance?.message ?? 'Site is under maintenance. Please check back later.';

    if (!enabled) return true;

    // When maintenance ON:
    // - Allow public GETs to show banner / marketing pages (except sensitive GETs if needed).
    // - Allow GET /settings and GET /admin/settings/health.
    // - Deny sensitive endpoints (login/register) and all mutating HTTP methods (POST/PUT/PATCH/DELETE).
    if (this.isPublicSettingsPath(req) || (this.isSafeGet(req) && !this.isSensitivePath(req))) {
      return true;
    }

    // Allow through if bearer token indicates admin (even when path not /admin)
    if (await this.isAdminFromToken(req)) {
      return true;
    }

    // Otherwise block the request and return maintenance response.
    const accept = (req.headers['accept'] || '') as string;
    if (accept.includes('text/html')) {
      // HTML response: friendly maintenance page
      res.status(HttpStatus.SERVICE_UNAVAILABLE).send(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8"/>
            <meta name="viewport" content="width=device-width,initial-scale=1"/>
            <title>Maintenance</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; background:#f5f7fa; color:#222; }
              .card { background:white; padding:28px; border-radius:8px; box-shadow:0 6px 20px rgba(0,0,0,0.08); max-width:720px; }
              h1 { margin:0 0 8px 0; font-size:20px; color:#861f41; }
              p { margin:0; color:#333; }
              footer { margin-top:14px; font-size:12px; color:#666; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Site temporarily unavailable</h1>
              <p>${String(message)}</p>
              <footer>Administrator access remains available at /admin</footer>
            </div>
          </body>
        </html>
      `);
      return false;
    }

    // API request -> JSON 503
    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message,
      maintenance: true,
    });
    return false;
  }
}