import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompatibilityColumns20251122 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "requirePassphraseSetup" boolean DEFAULT FALSE;
    `);
    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "requireSecuritySetup" boolean DEFAULT FALSE;
    `);
    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "securityConfigured" boolean DEFAULT FALSE;
    `);
    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS passphrase character varying;
    `);

    // Backfill camelCase flags from snake_case
    await queryRunner.query(`
      UPDATE "user"
      SET "requirePassphraseSetup" = TRUE
      WHERE COALESCE("requirePassphraseSetup", FALSE) = FALSE
        AND COALESCE(require_passphrase_setup, FALSE) = TRUE;
    `);

    await queryRunner.query(`
      UPDATE "user"
      SET "requireSecuritySetup" = TRUE
      WHERE COALESCE("requireSecuritySetup", FALSE) = FALSE
        AND COALESCE(require_security_setup, FALSE) = TRUE;
    `);

    await queryRunner.query(`
      UPDATE "user"
      SET "securityConfigured" = TRUE
      WHERE COALESCE("securityConfigured", FALSE) = FALSE
        AND COALESCE(security_configured, FALSE) = TRUE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert shim: drop columns if you are sure no running process needs them.
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "requirePassphraseSetup";`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "requireSecuritySetup";`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "securityConfigured";`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS passphrase;`);
  }
}