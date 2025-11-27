import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserLoginActivity1699980000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_login_activity (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER,
        email TEXT,
        ip TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_login_activity_user_id ON user_login_activity(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_login_activity_email ON user_login_activity(email);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_login_activity_email;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_login_activity_user_id;`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_login_activity;`);
  }
}