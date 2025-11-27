import { Controller, Post, Body, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { SettingsService } from '../../modules/settings/settings.service';

@Controller('admin')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Optional: GET to return current settings (used by admin UI if you want to read fresh from server)
  @Get('settings')
  async getSettings() {
    const s = await this.settingsService.getSettings();
    return { settings: s ?? null };
  }

  // Persist full settings object. Expects the same shape the admin UI posts.
  @Post('settings')
  @HttpCode(HttpStatus.OK)
  async saveSettings(@Body() payload: any) {
    // Save via SettingsService.saveSettings() which performs a repo save or SQL upsert fallback
    // Accept both object and string payloads; saveSettings will JSON.stringify if needed.
    const saved = await this.settingsService.saveSettings(payload);
    // Return saved object so frontend can refresh authoritative state if desired
    return { ok: true, saved };
  }
}