import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, Validate } from 'class-validator';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PaginatedDateFilterQueryDto } from 'src/common/dto/date-filter.dto';
import { ReceiptStatus } from 'src/common/enums/master-type.enum';
import { PaymentMethod, PaymentStatus } from 'src/common/enums/payment.enum';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

@ValidatorConstraint({ name: 'isDecimalAmount', async: false })
class IsDecimalAmountConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && /^\d{1,13}(\.\d{1,4})?$/.test(value) && Number(value) > 0;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a positive decimal amount, e.g. "25000.00".`;
  }
}

/**
 * Receipt filters. The date window applies to `receipt_date` and is resolved
 * by the shared preset utility, so "This Quarter" here means exactly what it
 * means on the payment list and in every report.
 */
export class QueryReceiptDto extends PaginatedDateFilterQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  clientId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @ApiPropertyOptional({ description: 'Exact or partial receipt number' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(trim)
  receiptNumber?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @Transform(trim)
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ enum: PaymentStatus, description: 'Status of the underlying payment' })
  @IsOptional()
  @Transform(trim)
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ enum: ReceiptStatus })
  @IsOptional()
  @Transform(trim)
  @IsEnum(ReceiptStatus)
  receiptStatus?: ReceiptStatus;

  @ApiPropertyOptional({ format: 'uuid', description: 'Administrator who generated the receipt' })
  @IsOptional()
  @IsUUID('4')
  generatedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  transactionReference?: string;

  @ApiPropertyOptional({ description: 'Applied post-decryption; requires financial unlock.' })
  @IsOptional()
  @Transform(trim)
  @Validate(IsDecimalAmountConstraint)
  minAmount?: string;

  @ApiPropertyOptional({ description: 'Applied post-decryption; requires financial unlock.' })
  @IsOptional()
  @Transform(trim)
  @Validate(IsDecimalAmountConstraint)
  maxAmount?: string;
}

export class ReceiptResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() receiptNumber!: string;
  @ApiProperty() receiptDate!: string;
  @ApiProperty({ enum: ReceiptStatus }) status!: ReceiptStatus;
  @ApiProperty() paymentId!: string;

  @ApiProperty() clientId!: string;
  @ApiProperty() clientName!: string;
  @ApiPropertyOptional() clientEmail!: string | null;
  @ApiPropertyOptional() clientPhone!: string | null;

  @ApiProperty() projectId!: string;
  @ApiProperty() projectName!: string;
  @ApiPropertyOptional() projectCode!: string | null;

  @ApiProperty() paymentDate!: string;
  @ApiProperty({ enum: PaymentMethod }) paymentMethod!: PaymentMethod;
  @ApiProperty({ enum: PaymentStatus }) paymentStatus!: PaymentStatus;
  @ApiPropertyOptional() transactionReference!: string | null;

  @ApiProperty() financialLocked!: boolean;
  @ApiPropertyOptional({ nullable: true }) amount!: string | null;
  @ApiPropertyOptional({
    nullable: true,
    description:
      'The payment amount spelled out. Derived from the amount, so it is withheld while locked for exactly the same reason the figure is.',
  })
  amountInWords!: string | null;

  // ── Project financial summary ──
  @ApiProperty({ description: 'False for variable projects — render "Not Defined", never ₹0.' })
  hasProjectAmount!: boolean;
  @ApiPropertyOptional({ nullable: true }) projectAmount!: string | null;
  @ApiPropertyOptional({ nullable: true }) projectTotalReceived!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Null when hasProjectAmount is false.' })
  projectDueAmount!: string | null;

  @ApiPropertyOptional() generatedByName!: string | null;
  @ApiPropertyOptional() notes!: string | null;
  @ApiProperty() createdAt!: Date;
}
