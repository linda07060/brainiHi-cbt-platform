import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity()
export class AiUsage {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  userId: number;

  // Date string for daily tests counter (YYYY-MM-DD)
  @Column({ nullable: true })
  testsTodayDate: string | null;

  @Column({ type: 'int', default: 0 })
  testsTodayCount: number;

  // Month string for explanations usage (YYYY-MM)
  @Column({ nullable: true })
  explanationsMonth: string | null;

  @Column({ type: 'int', default: 0 })
  explanationsCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}