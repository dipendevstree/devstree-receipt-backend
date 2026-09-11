"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptStatus = exports.MASTER_TYPE_LABELS = exports.MASTER_SLUG_BY_TYPE = exports.MASTER_TYPE_BY_SLUG = exports.MasterStatus = exports.MasterType = void 0;
var MasterType;
(function (MasterType) {
    MasterType["COUNTRY"] = "COUNTRY";
    MasterType["CURRENCY"] = "CURRENCY";
    MasterType["PAYMENT_METHOD"] = "PAYMENT_METHOD";
    MasterType["PROJECT_STATUS"] = "PROJECT_STATUS";
    MasterType["PAYMENT_STATUS"] = "PAYMENT_STATUS";
    MasterType["RECEIPT_STATUS"] = "RECEIPT_STATUS";
})(MasterType || (exports.MasterType = MasterType = {}));
var MasterStatus;
(function (MasterStatus) {
    MasterStatus["ACTIVE"] = "ACTIVE";
    MasterStatus["INACTIVE"] = "INACTIVE";
})(MasterStatus || (exports.MasterStatus = MasterStatus = {}));
exports.MASTER_TYPE_BY_SLUG = {
    countries: MasterType.COUNTRY,
    currencies: MasterType.CURRENCY,
    'payment-methods': MasterType.PAYMENT_METHOD,
    'project-statuses': MasterType.PROJECT_STATUS,
    'payment-statuses': MasterType.PAYMENT_STATUS,
    'receipt-statuses': MasterType.RECEIPT_STATUS,
};
exports.MASTER_SLUG_BY_TYPE = Object.entries(exports.MASTER_TYPE_BY_SLUG).reduce((acc, [slug, type]) => ({ ...acc, [type]: slug }), {});
exports.MASTER_TYPE_LABELS = {
    [MasterType.COUNTRY]: 'Countries',
    [MasterType.CURRENCY]: 'Currencies',
    [MasterType.PAYMENT_METHOD]: 'Payment Methods',
    [MasterType.PROJECT_STATUS]: 'Project Statuses',
    [MasterType.PAYMENT_STATUS]: 'Payment Statuses',
    [MasterType.RECEIPT_STATUS]: 'Receipt Statuses',
};
var ReceiptStatus;
(function (ReceiptStatus) {
    ReceiptStatus["GENERATED"] = "GENERATED";
    ReceiptStatus["PRINTED"] = "PRINTED";
    ReceiptStatus["CANCELLED"] = "CANCELLED";
})(ReceiptStatus || (exports.ReceiptStatus = ReceiptStatus = {}));
//# sourceMappingURL=master-type.enum.js.map