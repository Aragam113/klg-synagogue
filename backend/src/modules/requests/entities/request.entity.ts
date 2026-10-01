import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type RequestType =
  | 'prayer'
  | 'excursion'
  | 'appointment'
  | 'rabbi_question'
  | 'help'
  | 'volunteer';
export type RequestStatus = 'new' | 'in_progress' | 'done' | 'rejected';

/** Заявка любой формы; поля, специфичные для типа, — в payload. */
@Entity('requests')
@Check(
  'CHK_requests_type',
  `type IN ('prayer', 'excursion', 'appointment', 'rabbi_question', 'help', 'volunteer')`
)
@Check(
  'CHK_requests_status',
  `status IN ('new', 'in_progress', 'done', 'rejected')`
)
@Index('IDX_requests_type_status', ['type', 'status'])
export class RequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30 })
  type: RequestType;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload: Record<string, unknown>;

  @Column({ name: 'contact_name', type: 'varchar', length: 200 })
  contactName: string;

  @Column({
    name: 'contact_phone',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  contactPhone: string | null;

  @Column({
    name: 'contact_email',
    type: 'varchar',
    length: 254,
    nullable: true,
  })
  contactEmail: string | null;

  @Column({ type: 'varchar', length: 20, default: 'new' })
  status: RequestStatus;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote: string | null;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 100,
    nullable: true,
    unique: true,
  })
  idempotencyKey: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
