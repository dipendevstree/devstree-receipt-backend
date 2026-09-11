import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Gap-free, concurrency-safe counters for human-readable document numbers
 * (receipts, client codes, project codes). Allocation happens inside the caller's
 * transaction with a row-level lock, so two simultaneous payments can never be
 * assigned the same receipt number.
 */
@Entity('document_sequences')
export class DocumentSequence {
  @PrimaryColumn({ type: 'varchar', length: 48 })
  key!: string;

  @Column({ name: 'current_value', type: 'bigint', default: 0 })
  currentValue!: string;

  @Column({ type: 'varchar', length: 16, default: '' })
  prefix!: string;

  @Column({ type: 'int', default: 6 })
  padding!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

export enum SequenceKey {
  RECEIPT = 'receipt_number',
  CLIENT = 'client_code',
  PROJECT = 'project_code',
}
