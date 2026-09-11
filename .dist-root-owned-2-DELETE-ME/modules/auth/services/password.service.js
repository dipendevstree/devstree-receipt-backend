"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordService = void 0;
const common_1 = require("@nestjs/common");
const argon2 = __importStar(require("argon2"));
const crypto_1 = require("crypto");
const error_codes_1 = require("../../../common/constants/error-codes");
const app_constants_1 = require("../../../common/constants/app.constants");
const app_exception_1 = require("../../../common/exceptions/app.exception");
const ARGON2_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
};
const COMMON_PASSWORDS = new Set([
    'password',
    'password123',
    'admin123456',
    '1234567890',
    'qwertyuiop',
    'letmein123',
    'welcome123',
    'changeme123',
]);
let PasswordService = class PasswordService {
    async hash(plaintext) {
        return argon2.hash(plaintext, ARGON2_OPTIONS);
    }
    async verify(hash, plaintext) {
        if (!hash) {
            await this.burnTime();
            return false;
        }
        try {
            return await argon2.verify(hash, plaintext);
        }
        catch {
            return false;
        }
    }
    assertStrength(plaintext, label = 'Password') {
        const failures = [];
        if (plaintext.length < app_constants_1.PASSWORD_MIN_LENGTH) {
            failures.push(`be at least ${app_constants_1.PASSWORD_MIN_LENGTH} characters`);
        }
        if (!/[a-z]/.test(plaintext))
            failures.push('include a lowercase letter');
        if (!/[A-Z]/.test(plaintext))
            failures.push('include an uppercase letter');
        if (!/\d/.test(plaintext))
            failures.push('include a number');
        if (!/[^A-Za-z0-9]/.test(plaintext))
            failures.push('include a symbol');
        if (COMMON_PASSWORDS.has(plaintext.toLowerCase())) {
            failures.push('not be a commonly used password');
        }
        if (failures.length > 0) {
            throw app_exception_1.AppException.badRequest(error_codes_1.ErrorCode.WEAK_PASSWORD, `${label} must ${failures.join(', ')}.`);
        }
    }
    generateToken(bytes = 48) {
        return (0, crypto_1.randomBytes)(bytes).toString('base64url');
    }
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    compareTokenHash(a, b) {
        const bufferA = Buffer.from(a, 'utf8');
        const bufferB = Buffer.from(b, 'utf8');
        if (bufferA.length !== bufferB.length)
            return false;
        return (0, crypto_1.timingSafeEqual)(bufferA, bufferB);
    }
    async burnTime() {
        await argon2.hash((0, crypto_1.randomBytes)(16).toString('hex'), ARGON2_OPTIONS);
    }
};
exports.PasswordService = PasswordService;
exports.PasswordService = PasswordService = __decorate([
    (0, common_1.Injectable)()
], PasswordService);
//# sourceMappingURL=password.service.js.map