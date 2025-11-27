import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRequireSecuritySetup20251120 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column if not present, normalize existing rows and set NOT NULL
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS require_security_setup boolean DEFAULT FALSE;
    `);

    await queryRunner.query(`
      UPDATE "user" SET require_security_setup = FALSE WHERE require_security_setup IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "user" ALTER COLUMN require_security_setup SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user" DROP COLUMN IF EXISTS require_security_setup;
    `);
  }
}