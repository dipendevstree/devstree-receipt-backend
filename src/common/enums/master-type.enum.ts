export enum MasterType {
  COUNTRY = 'COUNTRY',
  CURRENCY = 'CURRENCY',
  PAYMENT_METHOD = 'PAYMENT_METHOD',
  PROJECT_STATUS = 'PROJECT_STATUS',
  PAYMENT_STATUS = 'PAYMENT_STATUS',
  RECEIPT_STATUS = 'RECEIPT_STATUS',
  CLIENT_STATUS = 'CLIENT_STATUS',
}

export enum MasterStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/** URL segment ↔ master type. The slug is the public contract for /masters/:type. */
export const MASTER_TYPE_BY_SLUG: Record<string, MasterType> = {
  countries: MasterType.COUNTRY,
  currencies: MasterType.CURRENCY,
  'payment-methods': MasterType.PAYMENT_METHOD,
  'project-statuses': MasterType.PROJECT_STATUS,
  'payment-statuses': MasterType.PAYMENT_STATUS,
  'receipt-statuses': MasterType.RECEIPT_STATUS,
  'client-statuses': MasterType.CLIENT_STATUS,
};

export const MASTER_SLUG_BY_TYPE: Record<MasterType, string> = Object.entries(
  MASTER_TYPE_BY_SLUG,
).reduce((acc, [slug, type]) => ({ ...acc, [type]: slug }), {} as Record<MasterType, string>);

export const MASTER_TYPE_LABELS: Record<MasterType, string> = {
  [MasterType.COUNTRY]: 'Countries',
  [MasterType.CURRENCY]: 'Currencies',
  [MasterType.PAYMENT_METHOD]: 'Payment Methods',
  [MasterType.PROJECT_STATUS]: 'Project Statuses',
  [MasterType.PAYMENT_STATUS]: 'Payment Statuses',
  [MasterType.RECEIPT_STATUS]: 'Receipt Statuses',
  [MasterType.CLIENT_STATUS]: 'Client Statuses',
};

export enum ReceiptStatus {
  GENERATED = 'GENERATED',
  PRINTED = 'PRINTED',
  CANCELLED = 'CANCELLED',
}
