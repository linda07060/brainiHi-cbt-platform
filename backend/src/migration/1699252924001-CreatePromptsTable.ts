import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePromptsTable1699252924001 implements MigrationInterface {
  name = 'CreatePromptsTable1699252924001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_prompts (
        id bigserial PRIMARY KEY,
        key varchar(128) NOT NULL UNIQUE,
        template text NOT NULL,
        description text NULL,
        metadata jsonb NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ai_prompts;`);
  }
}