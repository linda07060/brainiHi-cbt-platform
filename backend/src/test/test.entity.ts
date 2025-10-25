import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class TestAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  title: string;

  @Column('json')
  questions: any;

  @Column('json')
  answers: any;

  @Column()
  score: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  takenAt: Date;
}