import { ApiProperty } from '@nestjs/swagger';
import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

export abstract class SoftDeletableEntity extends BaseEntity {
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}

/**
 * Columns shared by every encrypted monetary field. The plaintext amount never
 * exists as a column — only ciphertext plus the metadata needed to decrypt it.
 */
export interface EncryptedAmountColumns {
  encryptedAmount: string;
  amountIv: string;
  amountAuthTag: string;
  encryptionKeyVersion: number;
}

/**
 * Same shape for fields where the amount itself is optional (project amount).
 * All four columns are NULL together — that combination is the encoding of
 * "no amount defined", which is not the same thing as an encrypted zero.
 */
export interface NullableEncryptedAmountColumns {
  encryptedAmount: string | null;
  amountIv: string | null;
  amountAuthTag: string | null;
  encryptionKeyVersion: number | null;
}
