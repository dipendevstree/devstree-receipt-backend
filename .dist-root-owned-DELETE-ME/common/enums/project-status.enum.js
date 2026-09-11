"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROJECT_STATUSES_BLOCKING_PAYMENT = exports.ProjectPaymentStatus = exports.ProjectStatus = void 0;
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["DRAFT"] = "DRAFT";
    ProjectStatus["ACTIVE"] = "ACTIVE";
    ProjectStatus["ON_HOLD"] = "ON_HOLD";
    ProjectStatus["COMPLETED"] = "COMPLETED";
    ProjectStatus["CANCELLED"] = "CANCELLED";
})(ProjectStatus || (exports.ProjectStatus = ProjectStatus = {}));
var ProjectPaymentStatus;
(function (ProjectPaymentStatus) {
    ProjectPaymentStatus["UNPAID"] = "UNPAID";
    ProjectPaymentStatus["PARTIALLY_PAID"] = "PARTIALLY_PAID";
    ProjectPaymentStatus["FULLY_PAID"] = "FULLY_PAID";
    ProjectPaymentStatus["OVERPAID"] = "OVERPAID";
})(ProjectPaymentStatus || (exports.ProjectPaymentStatus = ProjectPaymentStatus = {}));
exports.PROJECT_STATUSES_BLOCKING_PAYMENT = [
    ProjectStatus.CANCELLED,
    ProjectStatus.DRAFT,
];
//# sourceMappingURL=project-status.enum.js.map