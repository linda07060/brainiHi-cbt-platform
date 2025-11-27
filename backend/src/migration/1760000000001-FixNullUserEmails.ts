import { MigrationInterface, QueryRunner } from "typeorm";

export class FixNullUserEmails1760000000001 implements MigrationInterface {
  name = 'FixNullUserEmails1760000000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Set placeholder email values for any NULL emails (id included so it's unique).
    await queryRunner.query(`
      UPDATE "user"
      SET email = ('missing_email_' || id || '@local.invalid')
      WHERE email IS NULL;
    `);

    // 2) Enforce NOT NULL constraint on email column
    await queryRunner.query(`
      ALTER TABLE "user"
      ALTER COLUMN "email" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: remove NOT NULL constraint and restore placeholder emails back to NULL
    await queryRunner.query(`
      ALTER TABLE "user"
      ALTER COLUMN "email" DROP NOT NULL;
    `);

    await queryRunner.query(`
      UPDATE "user"
      SET email = NULL
      WHERE email LIKE 'missing_email_%@local.invalid';
    `);
  }
}