import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentEntity } from './payment.entity';

export type RecurringStatus = 'active' | 'canceled';

/** Ежемесячное пожертвование; payment_id — первый платёж. */
@Entity('recurring_donations')
@Check('CHK_recurring_donations_amount', `amount_rub > 0`)
@Check('CHK_recurring_donations_status', `status IN ('active', 'canceled')`)
export class RecurringDonationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId: string;

  @ManyToOne(() => PaymentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'payment_id',
    foreignKeyConstraintName: 'FK_recurring_donations_payment',
  })
  payment?: PaymentEntity;

  @Column({ name: 'amount_rub', type: 'int' })
  amountRub: number;

  @Column({ type: 'varchar', length: 254 })
  email: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: RecurringStatus;

  @Column({ name: 'cancel_token', type: 'varchar', length: 64, unique: true })
  cancelToken: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
