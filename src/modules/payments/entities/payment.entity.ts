import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { EncryptedAmountColumns, SoftDeletableEntity } from 'src/common/entities/base.entity';
import { PaymentMethod, PaymentStatus } from 'src/common/enums/payment.enum';
import { Client } from 'src/modules/clients/entities/client.entity';
import { Project } from 'src/modules/projects/entities/project.entity';
import { Receipt } from 'src/modules/receipts/entities/receipt.entity';
import { User } from 'src/modules/users/entities/user.entity';

/**
 * Payments are never hard-deleted — they are VOIDED so the audit trail and
 * receipt history stay intact. Only VALID payments count toward a project total.
 */
@Entity('payments')
@Index('idx_payments_project_id', ['projectId'])
@Index('idx_payments_client_id', ['clientId'])
@Index('idx_payments_payment_date', ['paymentDate'])
@Index('idx_payments_status', ['status'])
@Index('idx_payments_project_status', ['projectId', 'status'])
export class Payment extends SoftDeletableEntity implements EncryptedAmountColumns {
  @ApiProperty()
  @Column({ name: 'client_id', type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => Client, (client) => client.payments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_id' })
  client!: Client;

  @ApiProperty()
  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => Project, (project) => project.payments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ApiProperty()
  @Column({ name: 'payment_date', type: 'date' })
  paymentDate!: string;

  // ── Encrypted payment amount ────────────────────────────────
  @Exclude()
  @Column({ name: 'encrypted_amount', type: 'text' })
  encryptedAmount!: string;

  @Exclude()
  @Column({ name: 'amount_iv', type: 'varchar', length: 32 })
  amountIv!: string;

  @Exclude()
  @Column({ name: 'amount_auth_tag', type: 'varchar', length: 32 })
  amountAuthTag!: string;

  @Exclude()
  @Column({ name: 'encryption_key_version', type: 'int', default: 1 })
  encryptionKeyVersion!: number;

  @ApiProperty({ enum: PaymentMethod })
  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @ApiProperty({ required: false })
  @Column({ name: 'transaction_reference', type: 'varchar', length: 120, nullable: true })
  transactionReference!: string | null;

  @ApiProperty({ required: false })
  @Column({ name: 'bank_account', type: 'varchar', length: 120, nullable: true })
  bankAccount!: string | null;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @ApiProperty({ required: false })
  @Column({ name: 'attachment_path', type: 'varchar', length: 255, nullable: true })
  attachmentPath!: string | null;

  @ApiProperty({ enum: PaymentStatus })
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.VALID })
  status!: PaymentStatus;

  @ApiProperty({ required: false })
  @Column({ name: 'void_reason', type: 'varchar', length: 255, nullable: true })
  voidReason!: string | null;

  @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
  voidedAt!: Date | null;

  @Column({ name: 'voided_by', type: 'uuid', nullable: true })
  voidedBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'voided_by' })
  voidedByUser!: User | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser!: User | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: User | null;

  @OneToOne(() => Receipt, (receipt) => receipt.payment)
  receipt!: Receipt | null;

  countsTowardTotal(): boolean {
    return this.status === PaymentStatus.VALID && !this.deletedAt;
  }
}
