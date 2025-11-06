import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'ai_logs' })
export class AiLog {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Index()
  @Column({ type: 'int', nullable: true })
  userId?: number | null;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ type: 'json', nullable: true })
  params?: any | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  model?: string | null;

  @Column({ type: 'json', nullable: true })
  response?: any | null;

  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  error?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}