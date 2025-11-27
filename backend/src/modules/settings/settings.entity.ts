import { Entity, Column, PrimaryColumn } from 'typeorm';

/**
 * Simple mapping for the settings key/value table.
 * Table columns:
 *  - key VARCHAR(128) PRIMARY KEY
 *  - value TEXT NOT NULL (JSON string)
 *
 * NOTE: removed createdAt/updatedAt columns because your DB table does not include them.
 * If you later add timestamp columns to the DB, re-introduce them here (or add TypeORM migration).
 */
@Entity({ name: 'settings' })
export class Setting {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  key!: string;

  @Column({ type: 'text' })
  value!: string;
}