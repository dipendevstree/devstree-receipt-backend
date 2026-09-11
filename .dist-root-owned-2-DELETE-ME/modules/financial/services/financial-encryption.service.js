"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var FinancialEncryptionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialEncryptionService = exports.EncryptionContext = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const error_codes_1 = require("../../../common/constants/error-codes");
const app_exception_1 = require("../../../common/exceptions/app.exception");
const money_util_1 = require("../../../common/utils/money.util");
const key_provider_interface_1 = require("../interfaces/key-provider.interface");
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
var EncryptionContext;
(function (EncryptionContext) {
    EncryptionContext["PROJECT_AMOUNT"] = "project.amount";
    EncryptionContext["PAYMENT_AMOUNT"] = "payment.amount";
})(EncryptionContext || (exports.EncryptionContext = EncryptionContext = {}));
let FinancialEncryptionService = FinancialEncryptionService_1 = class FinancialEncryptionService {
    keyProvider;
    logger = new common_1.Logger(FinancialEncryptionService_1.name);
    constructor(keyProvider) {
        this.keyProvider = keyProvider;
    }
    encryptAmount(amount, context) {
        if (!(amount instanceof money_util_1.Money)) {
            throw new Error('encryptAmount requires a Money instance.');
        }
        const version = this.keyProvider.getCurrentKeyVersion();
        const key = this.keyProvider.getKey(version);
        const iv = (0, crypto_1.randomBytes)(IV_BYTES);
        const cipher = (0, crypto_1.createCipheriv)(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_BYTES });
        cipher.setAAD(this.aad(context, version));
        const ciphertext = Buffer.concat([
            cipher.update(amount.toMinorUnits(), 'utf8'),
            cipher.final(),
        ]);
        return {
            encryptedAmount: ciphertext.toString('base64'),
            amountIv: iv.toString('base64'),
            amountAuthTag: cipher.getAuthTag().toString('base64'),
            encryptionKeyVersion: version,
        };
    }
    decryptAmount(payload, context, precision = money_util_1.Money.DEFAULT_PRECISION) {
        this.assertWellFormed(payload);
        let key;
        try {
            key = this.keyProvider.getKey(payload.encryptionKeyVersion);
        }
        catch {
            this.logger.error(`Decryption requested for unavailable key version ${payload.encryptionKeyVersion}.`);
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.ENCRYPTION_KEY_UNAVAILABLE, 'Financial data cannot be read with the currently configured encryption keys.', 500);
        }
        try {
            const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, key, Buffer.from(payload.amountIv, 'base64'), {
                authTagLength: AUTH_TAG_BYTES,
            });
            decipher.setAAD(this.aad(context, payload.encryptionKeyVersion));
            decipher.setAuthTag(Buffer.from(payload.amountAuthTag, 'base64'));
            const plaintext = Buffer.concat([
                decipher.update(Buffer.from(payload.encryptedAmount, 'base64')),
                decipher.final(),
            ]).toString('utf8');
            if (!/^-?\d{1,25}$/.test(plaintext)) {
                throw new Error('Decrypted payload is not a minor-unit integer.');
            }
            return money_util_1.Money.fromMinorUnits(plaintext, precision);
        }
        catch {
            this.logger.error(`Financial decryption failed for context ${context} (key v${payload.encryptionKeyVersion}).`);
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.DECRYPTION_FAILED, 'Stored financial data failed its integrity check.', 500);
        }
    }
    verify(payload, context) {
        try {
            this.decryptAmount(payload, context);
            return true;
        }
        catch {
            return false;
        }
    }
    rotate(payload, context) {
        if (payload.encryptionKeyVersion === this.keyProvider.getCurrentKeyVersion()) {
            return payload;
        }
        return this.encryptAmount(this.decryptAmount(payload, context), context);
    }
    aad(context, version) {
        return Buffer.from(`${context}|v${version}`, 'utf8');
    }
    assertWellFormed(payload) {
        const missing = !payload ||
            typeof payload.encryptedAmount !== 'string' ||
            typeof payload.amountIv !== 'string' ||
            typeof payload.amountAuthTag !== 'string' ||
            !Number.isInteger(payload.encryptionKeyVersion);
        if (missing) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.DECRYPTION_FAILED, 'Stored financial data is incomplete.', 500);
        }
        const iv = Buffer.from(payload.amountIv, 'base64');
        const tag = Buffer.from(payload.amountAuthTag, 'base64');
        if (iv.length !== IV_BYTES || tag.length !== AUTH_TAG_BYTES) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCode.DECRYPTION_FAILED, 'Stored financial data has invalid encryption metadata.', 500);
        }
    }
    static safeEquals(a, b) {
        const bufferA = Buffer.from(a);
        const bufferB = Buffer.from(b);
        if (bufferA.length !== bufferB.length)
            return false;
        return (0, crypto_1.timingSafeEqual)(bufferA, bufferB);
    }
};
exports.FinancialEncryptionService = FinancialEncryptionService;
exports.FinancialEncryptionService = FinancialEncryptionService = FinancialEncryptionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(key_provider_interface_1.FINANCIAL_KEY_PROVIDER)),
    __metadata("design:paramtypes", [Object])
], FinancialEncryptionService);
//# sourceMappingURL=financial-encryption.service.js.map