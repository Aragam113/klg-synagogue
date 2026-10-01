import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { EventEntity } from '@modules/content/entities/event.entity';
import { PaymentEntity } from '@modules/payments/entities/payment.entity';

export type RegistrationStatus = 'new' | 'confirmed' | 'canceled';

@Entity('event_registrations')
@Check('CHK_event_registrations_seats', `seats > 0`)
@Check(
  'CHK_event_registrations_status',
  `status IN ('new', 'confirmed', 'canceled')`
)
export class EventRegistrationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_event_registrations_event_id')
  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @ManyToOne(() => EventEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'event_id',
    foreignKeyConstraintName: 'FK_event_registrations_event',
  })
  event?: EventEntity;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  phone: string;

  @Column({ type: 'varchar', length: 254, nullable: true })
  email: string | null;

  @Column({ type: 'int', default: 1 })
  seats: number;

  @Column({ type: 'varchar', length: 20, default: 'new' })
  status: RegistrationStatus;

  /** Платёж за платное событие. */
  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId: string | null;

  @ManyToOne(() => PaymentEntity, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'payment_id',
    foreignKeyConstraintName: 'FK_event_registrations_payment',
  })
  payment?: Relation<PaymentEntity> | null;

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
}
