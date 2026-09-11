"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUDIT_ACTION_LABELS = exports.AuditModule = exports.AuditAction = void 0;
var AuditAction;
(function (AuditAction) {
    AuditAction["LOGIN"] = "LOGIN";
    AuditAction["LOGIN_FAILED"] = "LOGIN_FAILED";
    AuditAction["LOGOUT"] = "LOGOUT";
    AuditAction["TOKEN_REFRESHED"] = "TOKEN_REFRESHED";
    AuditAction["CLIENT_CREATED"] = "CLIENT_CREATED";
    AuditAction["CLIENT_UPDATED"] = "CLIENT_UPDATED";
    AuditAction["CLIENT_ARCHIVED"] = "CLIENT_ARCHIVED";
    AuditAction["PROJECT_CREATED"] = "PROJECT_CREATED";
    AuditAction["PROJECT_UPDATED"] = "PROJECT_UPDATED";
    AuditAction["PROJECT_ARCHIVED"] = "PROJECT_ARCHIVED";
    AuditAction["PAYMENT_CREATED"] = "PAYMENT_CREATED";
    AuditAction["PAYMENT_UPDATED"] = "PAYMENT_UPDATED";
    AuditAction["PAYMENT_VOIDED"] = "PAYMENT_VOIDED";
    AuditAction["RECEIPT_GENERATED"] = "RECEIPT_GENERATED";
    AuditAction["RECEIPT_DOWNLOADED"] = "RECEIPT_DOWNLOADED";
    AuditAction["FINANCIAL_UNLOCKED"] = "FINANCIAL_UNLOCKED";
    AuditAction["FINANCIAL_LOCKED"] = "FINANCIAL_LOCKED";
    AuditAction["FINANCIAL_UNLOCK_FAILED"] = "FINANCIAL_UNLOCK_FAILED";
    AuditAction["LOGIN_PASSWORD_CHANGED"] = "LOGIN_PASSWORD_CHANGED";
    AuditAction["ACCOUNT_PASSWORD_CHANGED"] = "ACCOUNT_PASSWORD_CHANGED";
    AuditAction["PASSWORD_RESET_REQUESTED"] = "PASSWORD_RESET_REQUESTED";
    AuditAction["PASSWORD_RESET_COMPLETED"] = "PASSWORD_RESET_COMPLETED";
    AuditAction["USER_CREATED"] = "USER_CREATED";
    AuditAction["USER_UPDATED"] = "USER_UPDATED";
    AuditAction["USER_ARCHIVED"] = "USER_ARCHIVED";
    AuditAction["USER_ACTIVATED"] = "USER_ACTIVATED";
    AuditAction["USER_DEACTIVATED"] = "USER_DEACTIVATED";
    AuditAction["MASTER_CREATED"] = "MASTER_CREATED";
    AuditAction["MASTER_UPDATED"] = "MASTER_UPDATED";
    AuditAction["MASTER_DELETED"] = "MASTER_DELETED";
    AuditAction["SETTINGS_UPDATED"] = "SETTINGS_UPDATED";
    AuditAction["REPORT_EXPORTED"] = "REPORT_EXPORTED";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var AuditModule;
(function (AuditModule) {
    AuditModule["AUTH"] = "AUTH";
    AuditModule["CLIENTS"] = "CLIENTS";
    AuditModule["PROJECTS"] = "PROJECTS";
    AuditModule["PAYMENTS"] = "PAYMENTS";
    AuditModule["RECEIPTS"] = "RECEIPTS";
    AuditModule["FINANCIAL"] = "FINANCIAL";
    AuditModule["USERS"] = "USERS";
    AuditModule["SETTINGS"] = "SETTINGS";
    AuditModule["REPORTS"] = "REPORTS";
    AuditModule["MASTERS"] = "MASTERS";
})(AuditModule || (exports.AuditModule = AuditModule = {}));
exports.AUDIT_ACTION_LABELS = {
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
//# sourceMappingURL=audit-action.enum.js.map