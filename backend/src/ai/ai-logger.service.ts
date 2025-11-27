import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiLog } from './entities/ai-log.entity';
import { SettingsService } from '../modules/settings/settings.service';

@Injectable()
export class AiLoggerService {
  private readonly logger = new Logger(AiLoggerService.name);

  constructor(
    @InjectRepository(AiLog)
    private readonly logRepo: Repository<AiLog>,
    private readonly settingsService: SettingsService,
  ) {}

  // Try to coerce many SDK response shapes into a plain JSON object that
  // includes provider usage when present.
  private normalizeResponse(resp: any): any {
    if (resp == null) return null;

    try {
      // If it's an object with a .toJSON() method (some SDK responses), call it.
      if (typeof resp?.toJSON === 'function') {
        try {
          const json = resp.toJSON();
          if (json != null) resp = json;
        } catch {
          // ignore and continue with original resp
        }
      }

      // Axios-like / fetch-like responses often put payload in `.data`
      if (resp && typeof resp === 'object' && 'data' in resp && resp.data != null) {
        resp = resp.data;
      }

      // Some SDKs return a top-level `response` wrapper, handle common names
      if (resp && typeof resp === 'object' && 'response' in resp && resp.response != null) {
        resp = resp.response;
      }

      // If the response is a string that contains JSON, try to parse it
      if (typeof resp === 'string') {
        try {
          return JSON.parse(resp);
        } catch {
          return resp;
        }
      }

      // Ensure that usage is available at resp.usage when it exists in choices[0]
      if (resp && typeof resp === 'object') {
        if (!resp.usage && Array.isArray(resp.choices) && resp.choices[0]?.usage) {
          resp.usage = resp.choices[0].usage;
        }
        // Some providers store total tokens at resp.total_tokens
        if (!resp.usage && typeof resp.total_tokens !== 'undefined') {
          resp.usage = resp.usage || {};
          if (typeof resp.total_tokens === 'number' || /^\d+$/.test(String(resp.total_tokens))) {
            resp.usage.total_tokens = Number(resp.total_tokens);
          }
        }
      }

      return resp;
    } catch (err) {
      // If normalization fails, return a small diagnostic object instead of crashing.
      return { _normalizeError: String(err), raw: typeof resp === 'object' ? resp : String(resp) };
    }
  }

  /**
   * Log an AI interaction.
   * - Normalizes common SDK response shapes so admin stats can find usage.total_tokens.
   * - Preserves existing behavior: never throws; logs failures.
   */
  async log(entry: {
    userId?: number | null;
    prompt: string;
    params?: any;
    model?: string;
    response?: any;
    success?: boolean;
    error?: string | null;
  }) {
    try {
      let settingsRaw: any = null;
      try {
        settingsRaw = await this.settingsService.getSettings();
      } catch (err) {
        this.logger.warn('SettingsService.getSettings() failed — proceeding with logging enabled by default.', err as any);
        settingsRaw = null;
      }

      // Normalize possible shapes for settings (string, object, wrapper)
      let settingsObj: any = null;
      try {
        if (!settingsRaw) {
          settingsObj = null;
        } else if (typeof settingsRaw === 'string') {
          settingsObj = JSON.parse(settingsRaw);
        } else if (typeof settingsRaw === 'object' && settingsRaw.value && typeof settingsRaw.value === 'string') {
          settingsObj = JSON.parse(settingsRaw.value);
        } else {
          settingsObj = settingsRaw;
        }
      } catch (err) {
        this.logger.warn('Unable to parse settings JSON; proceeding with logging enabled by default.', err as any);
        settingsObj = null;
      }

      const shouldLog = settingsObj?.logging?.enableAiLogs ?? true;

      if (!shouldLog) {
        this.logger.debug('AI logging disabled by admin settings (logging.enableAiLogs = false). Skipping persist of AiLog.');
        return null;
      }

      // Normalize response so it stores meaningful provider data (including usage)
      const normalizedResponse = this.normalizeResponse(entry.response);

      // Debug-log token count if found (safe, does not leak secrets)
      try {
        const tokenCount =
          normalizedResponse?.usage?.total_tokens ??
          normalizedResponse?.choices?.[0]?.usage?.total_tokens ??
          normalizedResponse?.total_tokens;
        if (tokenCount != null) {
          this.logger.debug(`AI log: found usage.total_tokens=${tokenCount}`);
        }
      } catch {
        /* ignore */
      }

      const rec = this.logRepo.create({
        userId: entry.userId ?? null,
        prompt: entry.prompt,
        params: entry.params ?? null,
        model: entry.model ?? null,
        response: normalizedResponse ?? null,
        success: entry.success ?? true,
        error: entry.error ?? null,
      });

      const saved = await this.logRepo.save(rec);
      this.logger.debug(`AI log persisted (id=${saved.id})`);
      return saved;
    } catch (err) {
      // Never throw from logging — but log the failure so we can diagnose.
      this.logger.error('Failed to persist AI log (error). Logging skipped for this entry.', err as any);
      return null;
    }
  }
}