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
import { FundraiserEntity } from '@modules/content/entities/fundraiser.entity';
import { RequestEntity } from '@modules/requests/entities/request.entity';
import { EventRegistrationEntity } from '@modules/requests/entities/event-registration.entity';

export type PaymentPurpose = 'donation' | 'prayer' | 'event';
export type PaymentStatus = 'pending' | 'paid' | 'canceled' | 'failed';

/**
 * Платёж. Статус меняется только через PaymentsService.applyNotification.
 */
@Entity('payments')
@Check('CHK_payments_purpose', `purpose IN ('donation', 'prayer', 'event')`)
@Check('CHK_payments_amount', `amount_rub > 0`)
@Check(
  'CHK_payments_status',
  `status IN ('pending', 'paid', 'canceled', 'failed')`
)
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  purpose: PaymentPurpose;

  @Column({ name: 'amount_rub', type: 'int' })
  amountRub: number;

  @Index('IDX_payments_fundraiser_id')
  @Column({ name: 'fundraiser_id', type: 'uuid', nullable: true })
  fundraiserId: string | null;

  @ManyToOne(() => FundraiserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'fundraiser_id',
    foreignKeyConstraintName: 'FK_payments_fundraiser',
  })
  fundraiser?: Relation<FundraiserEntity> | null;

  @Column({ name: 'request_id', type: 'uuid', nullable: true })
  requestId: string | null;

  @ManyToOne(() => RequestEntity, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'request_id',
    foreignKeyConstraintName: 'FK_payments_request',
  })
  request?: Relation<RequestEntity> | null;

  @Column({ name: 'registration_id', type: 'uuid', nullable: true })
  registrationId: string | null;

  @ManyToOne(() => EventRegistrationEntity, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'registration_id',
    foreignKeyConstraintName: 'FK_payments_registration',
  })
  registration?: Relation<EventRegistrationEntity> | null;

  @Column({ name: 'donor_name', type: 'varchar', length: 200, nullable: true })
  donorName: string | null;

  @Column({ type: 'boolean', default: false })
  anonymous: boolean;

  @Column({ type: 'varchar', length: 254, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'text', nullable: true })
  dedication: string | null;

  @Column({ name: 'dedication_visible', type: 'boolean', default: false })
  dedicationVisible: boolean;

  @Column({ type: 'boolean', default: false })
  recurring: boolean;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: PaymentStatus;

  @Column({
    name: 'provider_payment_id',
    type: 'varchar',
    length: 100,
    nullable: true,
    unique: true,
  })
  providerPaymentId: string | null;

  /** Секрет ссылки на статус платежа (GET /payments/:id?token=). */
  @Column({ name: 'access_token', type: 'varchar', length: 64 })
  accessToken: string;

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

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;
}
