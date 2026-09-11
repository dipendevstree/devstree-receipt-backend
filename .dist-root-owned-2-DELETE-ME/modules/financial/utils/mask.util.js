"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskAmount = maskAmount;
exports.maskNumber = maskNumber;
exports.maskAmounts = maskAmounts;
function maskAmount(amount, unlocked) {
    if (!unlocked || amount === null || amount === undefined)
        return null;
    return amount.toDecimalString();
}
function maskNumber(value, unlocked) {
    if (!unlocked || value === null || value === undefined)
        return null;
    return value;
}
function maskAmounts(amounts, unlocked) {
    const result = {};
    for (const key of Object.keys(amounts)) {
        result[key] = maskAmount(amounts[key], unlocked);
    }
    return result;
}
//# sourceMappingURL=mask.util.js.map