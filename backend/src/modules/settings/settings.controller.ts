import { Controller, Get, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AdminAuthGuard } from '../../admin/admin-auth.guard';

/**
 * Admin-only settings endpoints.
 * GET  /admin/settings        -> returns stored settings JSON (or null if none)
 * POST /admin/settings        -> accepts JSON body and persists it
 * GET  /admin/settings/health -> lightweight health check (DB connectivity)
 *
 * The endpoints are intentionally minimal and admin-guarded.
 */
@Controller('admin/settings')
@UseGuards(AdminAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings() {
    const s = await this.settingsService.getSettings();
    return { ok: true, settings: s ?? null };
  }

  @Post()
  async saveSettings(@Body() body: any) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Invalid settings payload');
    }
    // Persist the body as-is and return the parsed object as authoritative saved state.
    const saved = await this.settingsService.saveSettings(body);
    return { ok: true, saved };
  }

  /**
   * Lightweight health endpoint for client-side checks.
   * Example response: { ok: true, server: 'ok', db: true, timestamp: '...' }
   *
   * Protected by AdminAuthGuard like other admin routes. The admin UI should call this
   * to determine whether the server and DB appear reachable and show clearer messaging.
   */
  @Get('health')
  async health() {
    const result = await this.settingsService.healthCheck();
    return {
      ok: true,
      server: 'ok',
      db: !!result.db,
      timestamp: new Date().toISOString(),
    };
  }
}