export enum PaymentStatus {
  VALID = 'VALID',
  VOIDED = 'VOIDED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  UPI = 'UPI',
  CHEQUE = 'CHEQUE',
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  OTHER = 'OTHER',
}

/** Only these statuses contribute to a project's received total. */
export const RECEIVABLE_PAYMENT_STATUSES: readonly PaymentStatus[] = [PaymentStatus.VALID];
