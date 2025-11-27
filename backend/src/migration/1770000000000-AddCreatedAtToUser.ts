import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedAtToUser1770000000000 implements MigrationInterface {
  name = 'AddCreatedAtToUser1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Add created_at with default now() (safe if column already exists)
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now();
    `);

    // 2) Backfill any existing NULLs (defensive)
    await queryRunner.query(`
      UPDATE "user"
      SET "created_at" = now()
      WHERE "created_at" IS NULL;
    `);

    // 3) Make column NOT NULL so code can assume it exists
    await queryRunner.query(`
      ALTER TABLE "user"
      ALTER COLUMN "created_at" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user" DROP COLUMN IF EXISTS "created_at";
    `);
  }
}