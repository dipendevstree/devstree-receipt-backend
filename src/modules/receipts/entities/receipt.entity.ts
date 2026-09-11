import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { ReceiptStatus } from 'src/common/enums/master-type.enum';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('receipts')
@Index('idx_receipts_receipt_number', ['receiptNumber'], { unique: true })
@Index('idx_receipts_payment_id', ['paymentId'], { unique: true })
@Index('idx_receipts_receipt_date', ['receiptDate'])
export class Receipt extends BaseEntity {
  @ApiProperty()
  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId!: string;

  @OneToOne(() => Payment, (payment) => payment.receipt, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_id' })
  payment!: Payment;

  @ApiProperty({ example: 'REC-000001' })
  @Column({ name: 'receipt_number', type: 'varchar', length: 32 })
  receiptNumber!: string;

  @ApiProperty()
  @Column({ name: 'receipt_date', type: 'date' })
  receiptDate!: string;

  @ApiProperty({ enum: ReceiptStatus })
  @Column({ type: 'varchar', length: 16, default: ReceiptStatus.GENERATED })
  status!: ReceiptStatus;

  @Column({ name: 'generated_by', type: 'uuid', nullable: true })
  generatedBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'generated_by' })
  generatedByUser!: User | null;

  /** Populated only when a PDF has been rendered and cached on disk. */
  @Column({ name: 'pdf_path', type: 'varchar', length: 255, nullable: true })
  pdfPath!: string | null;
}
