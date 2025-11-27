import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRequirePassphraseSetup20251120 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column if not present, normalize existing rows and set NOT NULL
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS require_passphrase_setup boolean DEFAULT FALSE;
    `);

    await queryRunner.query(`
      UPDATE "user" SET require_passphrase_setup = FALSE WHERE require_passphrase_setup IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "user" ALTER COLUMN require_passphrase_setup SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user" DROP COLUMN IF EXISTS require_passphrase_setup;
    `);
  }
}