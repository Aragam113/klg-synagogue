import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RequestEntity } from './request.entity';

/** Напоминание о йорцайте, созданное из заявки на молитву. */
@Entity('yahrzeit_reminders')
export class YahrzeitReminderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_yahrzeit_reminders_request_id')
  @Column({ name: 'request_id', type: 'uuid' })
  requestId: string;

  @ManyToOne(() => RequestEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'request_id',
    foreignKeyConstraintName: 'FK_yahrzeit_reminders_request',
  })
  request?: RequestEntity;

  @Column({ name: 'deceased_name', type: 'varchar', length: 200 })
  deceasedName: string;

  @Column({ name: 'father_name', type: 'varchar', length: 200, nullable: true })
  fatherName: string | null;

  /** YYYY-MM-DD (григорианская дата смерти). */
  @Column({ name: 'death_date', type: 'date' })
  deathDate: string;

  /** Еврейская дата смерти — заполняет сервис через CalendarService (необязательно). */
  @Column({ name: 'hebrew_day', type: 'int', nullable: true })
  hebrewDay: number | null;

  @Column({ name: 'hebrew_month', type: 'varchar', length: 30, nullable: true })
  hebrewMonth: string | null;

  @Column({ type: 'varchar', length: 254, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ name: 'by_email', type: 'boolean', default: false })
  byEmail: boolean;

  @Column({ name: 'by_phone', type: 'boolean', default: false })
  byPhone: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
