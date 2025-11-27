import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCreatedAtToUser1700490000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column if not exists, set default to now()
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    `);

    // Populate existing NULLs (if any)
    await queryRunner.query(`
      UPDATE "user" SET created_at = now() WHERE created_at IS NULL;
    `);

    // Create index (optional)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_created_at ON "user"(created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_created_at;`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS created_at;`);
  }
}