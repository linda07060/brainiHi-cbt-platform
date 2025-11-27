import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';

/**
 * PublicSettingsController
 * - Exposes GET /settings for the public frontend to read site/app basics.
 * - Returns only non-sensitive fields from stored settings.
 */
@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getPublicSettings() {
    const s = await this.settingsService.getSettings();
    // Pick safe fields only (avoid returning secrets)
    const safe = {
      siteTitle: s?.siteTitle ?? null,
      siteDescription: s?.siteDescription ?? null,
      footerHtml: s?.footerHtml ?? null,
      logoDataUrl: s?.logoDataUrl ?? null,
      brandColor: s?.brandColor ?? null,
      accentColor: s?.accentColor ?? null,
      maintenance: s?.maintenance ?? { enabled: false, message: '' },
      limits: s?.limits ?? null,
      logging: s?.logging ?? null,
      // Public-facing fields required by the frontend:
      announcement: s?.announcement ?? { enabled: false, html: '' },
      support: s?.support ?? { email: '', phone: '', url: '' },
    };
    return { ok: true, settings: safe };
  }
}