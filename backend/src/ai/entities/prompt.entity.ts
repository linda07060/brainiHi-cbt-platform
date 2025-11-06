import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'ai_prompts' })
export class AiPrompt {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128 })
  key: string;

  @Column({ type: 'text' })
  template: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  // optional metadata (json) e.g. default params, temperature, model
  @Column({ type: 'json', nullable: true })
  metadata?: any | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}