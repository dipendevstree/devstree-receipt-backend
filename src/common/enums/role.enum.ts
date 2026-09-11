import { ALL_PERMISSIONS, Permission } from './permission.enum';

export enum RoleName {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  ACCOUNTANT = 'ACCOUNTANT',
  VIEWER = 'VIEWER',
}

/** Seed defaults. Roles are data — new roles can be added without code changes. */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  [RoleName.SUPER_ADMIN]: ALL_PERMISSIONS,
  [RoleName.ADMIN]: ALL_PERMISSIONS.filter(
    (p) => ![Permission.USERS_DELETE, Permission.SETTINGS_UPDATE].includes(p),
  ),
  [RoleName.ACCOUNTANT]: [
    Permission.CLIENTS_VIEW,
    Permission.CLIENTS_CREATE,
    Permission.CLIENTS_UPDATE,
    Permission.PROJECTS_VIEW,
    Permission.PROJECTS_CREATE,
    Permission.PROJECTS_UPDATE,
    Permission.PAYMENTS_VIEW,
    Permission.PAYMENTS_CREATE,
    Permission.RECEIPTS_VIEW,
    Permission.RECEIPTS_PRINT,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
    Permission.SETTINGS_VIEW,
    Permission.MASTERS_VIEW,
  ],
  [RoleName.VIEWER]: [
    Permission.CLIENTS_VIEW,
    Permission.PROJECTS_VIEW,
    Permission.PAYMENTS_VIEW,
    Permission.RECEIPTS_VIEW,
    Permission.REPORTS_VIEW,
    Permission.SETTINGS_VIEW,
    Permission.MASTERS_VIEW,
  ],
};

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  [RoleName.SUPER_ADMIN]: 'Unrestricted access including user and system administration.',
  [RoleName.ADMIN]: 'Day-to-day administration of clients, projects, payments and reports.',
  [RoleName.ACCOUNTANT]: 'Records payments and produces receipts and financial reports.',
  [RoleName.VIEWER]: 'Read-only access to operational and financial screens.',
};
