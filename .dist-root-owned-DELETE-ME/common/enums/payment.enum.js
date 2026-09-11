"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECEIVABLE_PAYMENT_STATUSES = exports.PaymentMethod = exports.PaymentStatus = void 0;
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["VALID"] = "VALID";
    PaymentStatus["VOIDED"] = "VOIDED";
    PaymentStatus["CANCELLED"] = "CANCELLED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["UPI"] = "UPI";
    PaymentMethod["CHEQUE"] = "CHEQUE";
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CREDIT_CARD"] = "CREDIT_CARD";
    PaymentMethod["OTHER"] = "OTHER";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
exports.RECEIVABLE_PAYMENT_STATUSES = [PaymentStatus.VALID];
//# sourceMappingURL=payment.enum.js.map