"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSION_GROUPS = exports.ALL_PERMISSIONS = exports.Permission = void 0;
var Permission;
(function (Permission) {
    Permission["CLIENTS_VIEW"] = "clients.view";
    Permission["CLIENTS_CREATE"] = "clients.create";
    Permission["CLIENTS_UPDATE"] = "clients.update";
    Permission["CLIENTS_DELETE"] = "clients.delete";
    Permission["PROJECTS_VIEW"] = "projects.view";
    Permission["PROJECTS_CREATE"] = "projects.create";
    Permission["PROJECTS_UPDATE"] = "projects.update";
    Permission["PROJECTS_DELETE"] = "projects.delete";
    Permission["PAYMENTS_VIEW"] = "payments.view";
    Permission["PAYMENTS_CREATE"] = "payments.create";
    Permission["PAYMENTS_UPDATE"] = "payments.update";
    Permission["PAYMENTS_VOID"] = "payments.void";
    Permission["RECEIPTS_VIEW"] = "receipts.view";
    Permission["RECEIPTS_PRINT"] = "receipts.print";
    Permission["REPORTS_VIEW"] = "reports.view";
    Permission["REPORTS_EXPORT"] = "reports.export";
    Permission["USERS_VIEW"] = "users.view";
    Permission["USERS_CREATE"] = "users.create";
    Permission["USERS_UPDATE"] = "users.update";
    Permission["USERS_DELETE"] = "users.delete";
    Permission["SETTINGS_VIEW"] = "settings.view";
    Permission["SETTINGS_UPDATE"] = "settings.update";
    Permission["AUDIT_LOGS_VIEW"] = "audit_logs.view";
})(Permission || (exports.Permission = Permission = {}));
exports.ALL_PERMISSIONS = Object.values(Permission);
exports.PERMISSION_GROUPS = {
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
};
//# sourceMappingURL=permission.enum.js.map