import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Setting } from './settings.entity';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private repoErrorLogged = false;
  private readonly KEY = 'settings';

  constructor(
    @InjectRepository(Setting)
    private readonly settingRepo: Repository<Setting>,
    private readonly dataSource: DataSource, // fallback raw SQL
  ) {}

  async getSettings(): Promise<any | null> {
    // Try repository-based read first (typical)
    try {
      const row = await this.settingRepo.findOne({ where: { key: this.KEY } });
      if (!row || !row.value) return null;
      try {
        return JSON.parse(row.value);
      } catch (err) {
        this.logger.warn('SettingsService: failed to parse settings.value JSON via repo; returning null.');
        return null;
      }
    } catch (repoErr) {
      // Log once to avoid noisy repetitive warnings
      if (!this.repoErrorLogged) {
        this.logger.debug('SettingsService.getSettings() Query failed via repository — falling back to raw SQL.', repoErr as any);
        this.repoErrorLogged = true;
      } else {
        // quieter logging for later failures
        this.logger.verbose('SettingsService: repository read failed; using raw SQL fallback.');
      }
    }

    // Fallback: raw SQL read. This avoids any TypeORM/Entity mapping issues.
    try {
      const rows: Array<{ value: string }> = await this.dataSource.query(
        `SELECT value FROM settings WHERE key = $1 LIMIT 1`,
        [this.KEY],
      );
      const found = rows?.[0]?.value;
      if (!found) return null;
      try {
        return JSON.parse(found);
      } catch (parseErr) {
        this.logger.warn('SettingsService: failed to parse settings.value JSON from raw SQL; returning null.');
        return null;
      }
    } catch (sqlErr) {
      this.logger.warn('SettingsService.getSettings() raw SQL query failed; returning null.');
      return null;
    }
  }

  /**
   * Save settings and return the authoritative parsed object.
   * Accepts either an object or a JSON string. Uses repo save first,
   * then falls back to raw SQL upsert on failure.
   */
  async saveSettings(obj: any) {
    const value = typeof obj === 'string' ? obj : JSON.stringify(obj);

    // try repo save first
    try {
      // Build a plain partial object and save it. Keep typing loose for compatibility.
      const rec: Partial<Setting> = {
        key: this.KEY,
        value,
      };

      // Save may return the saved entity or an array; we normalize below.
      const savedRaw = await this.settingRepo.save(rec as any);

      // Normalize savedRaw to a single Setting entity so TS knows .value exists.
      const savedEntity: Setting | undefined = Array.isArray(savedRaw) ? (savedRaw[0] as Setting) : (savedRaw as Setting);

      try {
        return savedEntity && savedEntity.value ? JSON.parse(savedEntity.value) : null;
      } catch {
        // If parsing fails, return the raw string as a fallback (very unlikely)
        return savedEntity?.value ?? null;
      }
    } catch (repoErr) {
      this.logger.debug('SettingsService.saveSettings() repository save failed — falling back to raw SQL upsert.');
    }

    // Fallback upsert using Postgres ON CONFLICT.
    try {
      await this.dataSource.query(
        `INSERT INTO settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [this.KEY, value],
      );
      // Return the parsed object as authoritative
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (sqlErr) {
      this.logger.error('SettingsService.saveSettings() raw SQL upsert failed', sqlErr as any);
      throw sqlErr;
    }
  }

  /**
   * Lightweight health check used by the admin UI to determine server/db availability.
   * Returns { db: true } when a simple DB query succeeds, otherwise { db: false }.
   */
  async healthCheck(): Promise<{ db: boolean }> {
    try {
      // Simple DB ping
      await this.dataSource.query('SELECT 1');
      return { db: true };
    } catch (err) {
      this.logger.warn('SettingsService.healthCheck() DB ping failed', err as any);
      return { db: false };
    }
  }
}