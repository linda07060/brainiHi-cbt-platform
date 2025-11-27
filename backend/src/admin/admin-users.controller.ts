import { Controller, Get, Req, UseGuards, Post, Body, Param } from '@nestjs/common';
import { Request } from 'express';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminUsersService } from './admin-users.service';

@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly svc: AdminUsersService) {}

  /**
   * Guarded endpoint used by the admin UI for activity lookups (existing).
   * (existing activity methods remain unchanged)
   */
  @UseGuards(AdminAuthGuard)
  @Get('activity')
  async getActivity(@Req() req: Request) {
    try {
      const rawUrl = (req as any).originalUrl || req.url || '';
      console.info('[admin/users/activity] rawUrl=', rawUrl, ' authHeaderPresent=', !!req.headers.authorization);

      const qIndex = rawUrl.indexOf('?');
      const qs = qIndex >= 0 ? rawUrl.slice(qIndex + 1) : '';
      const params = new URLSearchParams(qs);

      const emailRaw = params.get('email') ?? undefined;
      const userIdRaw = params.get('user_id') ?? params.get('userid') ?? params.get('id') ?? undefined;

      const email = emailRaw ? String(emailRaw).trim() : undefined;
      const userId = userIdRaw && userIdRaw !== '' && !Number.isNaN(Number(userIdRaw)) ? Number(userIdRaw) : undefined;

      if (!email && !userId) {
        return [];
      }
      if (userId) {
        return this.svc.getActivityByUserId(userId);
      }
      return this.svc.getActivityByEmail(email!);
    } catch (err) {
      console.error('[admin/users/activity] unexpected error', err);
      return [];
    }
  }

  @Get('activity-debug')
  async getActivityDebug(@Req() req: Request) {
    try {
      const rawUrl = (req as any).originalUrl || req.url || '';
      console.info('[admin/users/activity-debug] rawUrl=', rawUrl);

      const qIndex = rawUrl.indexOf('?');
      const qs = qIndex >= 0 ? rawUrl.slice(qIndex + 1) : '';
      const params = new URLSearchParams(qs);

      const emailRaw = params.get('email') ?? undefined;
      const userIdRaw = params.get('user_id') ?? params.get('userid') ?? params.get('id') ?? undefined;

      const email = emailRaw ? String(emailRaw).trim() : undefined;
      const userId = userIdRaw && userIdRaw !== '' && !Number.isNaN(Number(userIdRaw)) ? Number(userIdRaw) : undefined;

      if (!email && !userId) {
        return { ok: true, debug: 'no query provided', rows: [] };
      }
      if (userId) {
        const rows = await this.svc.getActivityByUserId(userId);
        return { ok: true, by: 'userId', userId, count: Array.isArray(rows) ? rows.length : 0, rows };
      }
      const rows = await this.svc.getActivityByEmail(email!);
      return { ok: true, by: 'email', email, count: Array.isArray(rows) ? rows.length : 0, rows };
    } catch (err) {
      console.error('[admin/users/activity-debug] unexpected error', err);
      return { ok: false, error: 'internal' };
    }
  }

  @UseGuards(AdminAuthGuard)
  @Get('activity-raw')
  async getActivityRaw(@Req() req: Request) {
    try {
      const rawUrl = (req as any).originalUrl || req.url || '';
      console.info('[admin/users/activity-raw] rawUrl=', rawUrl, ' authHeaderPresent=', !!req.headers.authorization);

      const qIndex = rawUrl.indexOf('?');
      const qs = qIndex >= 0 ? rawUrl.slice(qIndex + 1) : '';
      const params = new URLSearchParams(qs);

      const emailRaw = params.get('email') ?? undefined;
      const userIdRaw = params.get('user_id') ?? params.get('userid') ?? params.get('id') ?? undefined;

      const email = emailRaw ? String(emailRaw).trim() : undefined;
      const userId = userIdRaw && userIdRaw !== '' && !Number.isNaN(Number(userIdRaw)) ? Number(userIdRaw) : undefined;

      if (!email && !userId) {
        return [];
      }
      if (userId) {
        return this.svc.getActivityByUserId(userId);
      }
      return this.svc.getActivityByEmail(email!);
    } catch (err) {
      console.error('[admin/users/activity-raw] unexpected error', err);
      return [];
    }
  }

  @UseGuards(AdminAuthGuard)
  @Post('activity-post')
  async postActivity(@Body() body: { user_id?: number; email?: string }) {
    try {
      const { user_id, email } = body || {};
      if (!user_id && !email) return { rows: [] };

      if (user_id) {
        const rows = await this.svc.getActivityByUserId(Number(user_id));
        return { rows: rows ?? [] };
      }
      const rows = await this.svc.getActivityByEmail(String(email).trim());
      return { rows: rows ?? [] };
    } catch (err) {
      console.error('[admin/users/activity-post] unexpected error', err);
      return { rows: [] };
    }
  }

  // --------------------------------------------------------------------
  // New admin actions: reset-passphrase and reset-security
  // --------------------------------------------------------------------

  /**
   * POST /admin/users/:id/reset-passphrase
   */
  @Post(':id/reset-passphrase')
  @UseGuards(AdminAuthGuard)
  async resetPassphrase(@Param('id') id: string, @Req() req: Request, @Body() body: { reason?: string }) {
    const adminUser = (req as any).user;
    const ip = req.ip;
    return this.svc.resetPassphrase(adminUser, id, { reason: body?.reason, ip });
  }

  /**
   * POST /admin/users/:id/reset-security
   */
  @Post(':id/reset-security')
  @UseGuards(AdminAuthGuard)
  async resetSecurity(@Param('id') id: string, @Req() req: Request, @Body() body: { reason?: string }) {
    const adminUser = (req as any).user;
    const ip = req.ip;
    return this.svc.resetSecurity(adminUser, id, { reason: body?.reason, ip });
  }
}