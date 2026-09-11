export enum ProjectStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Derived from payments — never persisted as a source of truth.
 *
 * VARIABLE covers projects with no defined project amount: there is nothing to
 * compare the received total against, so "partially paid" and "overpaid" are
 * both meaningless. It exists so the UI can say so plainly instead of picking
 * a misleading neighbour.
 */
export enum ProjectPaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  FULLY_PAID = 'FULLY_PAID',
  OVERPAID = 'OVERPAID',
  VARIABLE = 'VARIABLE',
}

/** Statuses that reject new payments unless business rules are relaxed. */
export const PROJECT_STATUSES_BLOCKING_PAYMENT: readonly ProjectStatus[] = [
  ProjectStatus.CANCELLED,
  ProjectStatus.DRAFT,
];
