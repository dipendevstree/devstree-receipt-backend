export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESHED = 'TOKEN_REFRESHED',

  CLIENT_CREATED = 'CLIENT_CREATED',
  CLIENT_UPDATED = 'CLIENT_UPDATED',
  CLIENT_ARCHIVED = 'CLIENT_ARCHIVED',

  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  PROJECT_ARCHIVED = 'PROJECT_ARCHIVED',

  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_UPDATED = 'PAYMENT_UPDATED',
  PAYMENT_VOIDED = 'PAYMENT_VOIDED',

  RECEIPT_GENERATED = 'RECEIPT_GENERATED',
  RECEIPT_DOWNLOADED = 'RECEIPT_DOWNLOADED',

  FINANCIAL_UNLOCKED = 'FINANCIAL_UNLOCKED',
  FINANCIAL_LOCKED = 'FINANCIAL_LOCKED',
  FINANCIAL_UNLOCK_FAILED = 'FINANCIAL_UNLOCK_FAILED',

  LOGIN_PASSWORD_CHANGED = 'LOGIN_PASSWORD_CHANGED',
  ACCOUNT_PASSWORD_CHANGED = 'ACCOUNT_PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',

  PROFILE_UPDATED = 'PROFILE_UPDATED',

  IMPORT_STARTED = 'IMPORT_STARTED',
  IMPORT_COMPLETED = 'IMPORT_COMPLETED',
  IMPORT_FAILED = 'IMPORT_FAILED',

  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_ARCHIVED = 'USER_ARCHIVED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',

  MASTER_CREATED = 'MASTER_CREATED',
  MASTER_UPDATED = 'MASTER_UPDATED',
  MASTER_DELETED = 'MASTER_DELETED',

  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  REPORT_EXPORTED = 'REPORT_EXPORTED',
}

export enum AuditModule {
  AUTH = 'AUTH',
  CLIENTS = 'CLIENTS',
  PROJECTS = 'PROJECTS',
  PAYMENTS = 'PAYMENTS',
  RECEIPTS = 'RECEIPTS',
  FINANCIAL = 'FINANCIAL',
  USERS = 'USERS',
  PROFILE = 'PROFILE',
  SETTINGS = 'SETTINGS',
  REPORTS = 'REPORTS',
  MASTERS = 'MASTERS',
}

/**
 * Human labels for the dashboard's recent-activity feed. Keeping them beside
 * the enum means a new action cannot ship without someone deciding how it
 * reads to an administrator.
 */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  [AuditAction.LOGIN]: 'Signed In',
  [AuditAction.LOGIN_FAILED]: 'Failed Sign-In',
  [AuditAction.LOGOUT]: 'Signed Out',
  [AuditAction.TOKEN_REFRESHED]: 'Refreshed Session',

  [AuditAction.CLIENT_CREATED]: 'Created Client',
  [AuditAction.CLIENT_UPDATED]: 'Updated Client',
  [AuditAction.CLIENT_ARCHIVED]: 'Archived Client',

  [AuditAction.PROJECT_CREATED]: 'Created Project',
  [AuditAction.PROJECT_UPDATED]: 'Updated Project',
  [AuditAction.PROJECT_ARCHIVED]: 'Archived Project',

  [AuditAction.PAYMENT_CREATED]: 'Received Payment',
  [AuditAction.PAYMENT_UPDATED]: 'Updated Payment',
  [AuditAction.PAYMENT_VOIDED]: 'Voided Payment',

  [AuditAction.RECEIPT_GENERATED]: 'Generated Receipt',
  [AuditAction.RECEIPT_DOWNLOADED]: 'Downloaded Receipt',

  [AuditAction.FINANCIAL_UNLOCKED]: 'Unlocked Financial Access',
  [AuditAction.FINANCIAL_LOCKED]: 'Locked Financial Access',
  [AuditAction.FINANCIAL_UNLOCK_FAILED]: 'Failed Financial Unlock',

  [AuditAction.LOGIN_PASSWORD_CHANGED]: 'Changed Login Password',
  [AuditAction.ACCOUNT_PASSWORD_CHANGED]: 'Changed Account Password',
  [AuditAction.PASSWORD_RESET_REQUESTED]: 'Requested Password Reset',
  [AuditAction.PASSWORD_RESET_COMPLETED]: 'Completed Password Reset',

  [AuditAction.PROFILE_UPDATED]: 'Updated Own Profile',

  [AuditAction.IMPORT_STARTED]: 'Started Excel Import',
  [AuditAction.IMPORT_COMPLETED]: 'Completed Excel Import',
  [AuditAction.IMPORT_FAILED]: 'Failed Excel Import',

  [AuditAction.USER_CREATED]: 'Created User',
  [AuditAction.USER_UPDATED]: 'Updated User',
  [AuditAction.USER_ARCHIVED]: 'Archived User',
  [AuditAction.USER_ACTIVATED]: 'Activated User',
  [AuditAction.USER_DEACTIVATED]: 'Deactivated User',

  [AuditAction.MASTER_CREATED]: 'Created Master Record',
  [AuditAction.MASTER_UPDATED]: 'Updated Master Record',
  [AuditAction.MASTER_DELETED]: 'Deleted Master Record',

  [AuditAction.SETTINGS_UPDATED]: 'Updated Settings',
  [AuditAction.REPORT_EXPORTED]: 'Exported Report',
};
