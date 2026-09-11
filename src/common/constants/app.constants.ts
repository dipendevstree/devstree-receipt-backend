export const MASKED_AMOUNT_PLACEHOLDER = 'XXX';

/** Header carrying the opaque financial unlock token issued by POST /financial/unlock. */
export const FINANCIAL_UNLOCK_HEADER = 'x-financial-token';

export const RECEIPT_NUMBER_PREFIX = 'REC';
export const RECEIPT_NUMBER_PAD = 6;
export const CLIENT_CODE_PREFIX = 'CLI';
export const PROJECT_CODE_PREFIX = 'PRJ';
export const CODE_PAD = 4;

/** Postgres advisory lock namespaces — keeps concurrent sequence allocation serialized. */
export const ADVISORY_LOCK_RECEIPT_NUMBER = 815_001;
export const ADVISORY_LOCK_CLIENT_CODE = 815_002;
export const ADVISORY_LOCK_PROJECT_CODE = 815_003;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_HISTORY_DEPTH = 5;

export const COMPANY_SETTINGS_SINGLETON_KEY = 'default';
