"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_DESCRIPTIONS = exports.DEFAULT_ROLE_PERMISSIONS = exports.RoleName = void 0;
const permission_enum_1 = require("./permission.enum");
var RoleName;
(function (RoleName) {
    RoleName["SUPER_ADMIN"] = "SUPER_ADMIN";
    RoleName["ADMIN"] = "ADMIN";
    RoleName["ACCOUNTANT"] = "ACCOUNTANT";
    RoleName["VIEWER"] = "VIEWER";
})(RoleName || (exports.RoleName = RoleName = {}));
exports.DEFAULT_ROLE_PERMISSIONS = {
    [RoleName.SUPER_ADMIN]: permission_enum_1.ALL_PERMISSIONS,
    [RoleName.ADMIN]: permission_enum_1.ALL_PERMISSIONS.filter((p) => ![permission_enum_1.Permission.USERS_DELETE, permission_enum_1.Permission.SETTINGS_UPDATE].includes(p)),
    [RoleName.ACCOUNTANT]: [
        permission_enum_1.Permission.CLIENTS_VIEW,
        permission_enum_1.Permission.CLIENTS_CREATE,
        permission_enum_1.Permission.CLIENTS_UPDATE,
        permission_enum_1.Permission.PROJECTS_VIEW,
        permission_enum_1.Permission.PROJECTS_CREATE,
        permission_enum_1.Permission.PROJECTS_UPDATE,
        permission_enum_1.Permission.PAYMENTS_VIEW,
        permission_enum_1.Permission.PAYMENTS_CREATE,
        permission_enum_1.Permission.RECEIPTS_VIEW,
        permission_enum_1.Permission.RECEIPTS_PRINT,
        permission_enum_1.Permission.REPORTS_VIEW,
        permission_enum_1.Permission.REPORTS_EXPORT,
        permission_enum_1.Permission.SETTINGS_VIEW,
        permission_enum_1.Permission.MASTERS_VIEW,
    ],
    [RoleName.VIEWER]: [
        permission_enum_1.Permission.CLIENTS_VIEW,
        permission_enum_1.Permission.PROJECTS_VIEW,
        permission_enum_1.Permission.PAYMENTS_VIEW,
        permission_enum_1.Permission.RECEIPTS_VIEW,
        permission_enum_1.Permission.REPORTS_VIEW,
        permission_enum_1.Permission.SETTINGS_VIEW,
        permission_enum_1.Permission.MASTERS_VIEW,
    ],
};
exports.ROLE_DESCRIPTIONS = {
    [RoleName.SUPER_ADMIN]: 'Unrestricted access including user and system administration.',
    [RoleName.ADMIN]: 'Day-to-day administration of clients, projects, payments and reports.',
    [RoleName.ACCOUNTANT]: 'Records payments and produces receipts and financial reports.',
    [RoleName.VIEWER]: 'Read-only access to operational and financial screens.',
};
//# sourceMappingURL=role.enum.js.map