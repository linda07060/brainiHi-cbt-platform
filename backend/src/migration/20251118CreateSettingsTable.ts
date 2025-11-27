import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSettingsTable20251118 implements MigrationInterface {
  name = 'CreateSettingsTable20251118';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "key" VARCHAR(128) PRIMARY KEY,
        "value" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_settings_updated_at" ON "settings" ("updatedAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_settings_updated_at";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "settings";`);
  }
}