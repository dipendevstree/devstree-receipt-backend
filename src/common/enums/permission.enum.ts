export enum Permission {
  CLIENTS_VIEW = 'clients.view',
  CLIENTS_CREATE = 'clients.create',
  CLIENTS_UPDATE = 'clients.update',
  CLIENTS_DELETE = 'clients.delete',

  PROJECTS_VIEW = 'projects.view',
  PROJECTS_CREATE = 'projects.create',
  PROJECTS_UPDATE = 'projects.update',
  PROJECTS_DELETE = 'projects.delete',

  PAYMENTS_VIEW = 'payments.view',
  PAYMENTS_CREATE = 'payments.create',
  PAYMENTS_UPDATE = 'payments.update',
  PAYMENTS_VOID = 'payments.void',

  RECEIPTS_VIEW = 'receipts.view',
  RECEIPTS_PRINT = 'receipts.print',

  REPORTS_VIEW = 'reports.view',
  REPORTS_EXPORT = 'reports.export',

  USERS_VIEW = 'users.view',
  USERS_CREATE = 'users.create',
  USERS_UPDATE = 'users.update',
  USERS_DELETE = 'users.delete',

  SETTINGS_VIEW = 'settings.view',
  SETTINGS_UPDATE = 'settings.update',

  AUDIT_LOGS_VIEW = 'audit_logs.view',

  MASTERS_VIEW = 'masters.view',
  MASTERS_CREATE = 'masters.create',
  MASTERS_UPDATE = 'masters.update',
  MASTERS_DELETE = 'masters.delete',
}

export const ALL_PERMISSIONS: Permission[] = Object.values(Permission);

export const PERMISSION_GROUPS: Record<string, Permission[]> = {
  Clients: [
    Permission.CLIENTS_VIEW,
    Permission.CLIENTS_CREATE,
    Permission.CLIENTS_UPDATE,
    Permission.CLIENTS_DELETE,
  ],
  Projects: [
    Permission.PROJECTS_VIEW,
    Permission.PROJECTS_CREATE,
    Permission.PROJECTS_UPDATE,
    Permission.PROJECTS_DELETE,
  ],
  Payments: [
    Permission.PAYMENTS_VIEW,
    Permission.PAYMENTS_CREATE,
    Permission.PAYMENTS_UPDATE,
    Permission.PAYMENTS_VOID,
  ],
  Receipts: [Permission.RECEIPTS_VIEW, Permission.RECEIPTS_PRINT],
  Reports: [Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT],
  Users: [
    Permission.USERS_VIEW,
    Permission.USERS_CREATE,
    Permission.USERS_UPDATE,
    Permission.USERS_DELETE,
  ],
  Settings: [Permission.SETTINGS_VIEW, Permission.SETTINGS_UPDATE],
  Audit: [Permission.AUDIT_LOGS_VIEW],
  Masters: [
    Permission.MASTERS_VIEW,
    Permission.MASTERS_CREATE,
    Permission.MASTERS_UPDATE,
    Permission.MASTERS_DELETE,
  ],
};
