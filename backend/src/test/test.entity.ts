import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type TestStatus = 'started' | 'completed';

@Entity()
export class TestAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  title: string;

  // questions: stored as JSON array of question objects (with tags)
  @Column('json')
  questions: any[];

  // answers: map of questionId -> answer provided by user
  @Column('json')
  answers: Record<string, any>;

  @Column({ default: 0 })
  score: number;

  @Column({ type: 'timestamp', nullable: true })
  takenAt: Date;

  // NEW: status indicates lifecycle, started or completed
  @Column({ type: 'varchar', length: 20, default: 'started' })
  status: TestStatus;

  @CreateDateColumn()
  createdAt: Date;
}