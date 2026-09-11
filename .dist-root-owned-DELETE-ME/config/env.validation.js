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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeEnv = void 0;
exports.decodeEncryptionKey = decodeEncryptionKey;
exports.validateEnv = validateEnv;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
var NodeEnv;
(function (NodeEnv) {
    NodeEnv["development"] = "development";
    NodeEnv["test"] = "test";
    NodeEnv["production"] = "production";
})(NodeEnv || (exports.NodeEnv = NodeEnv = {}));
const AES_256_KEY_BYTES = 32;
const FORBIDDEN_SECRET_FRAGMENTS = ['change_me', 'changeme', 'secret', 'password', 'example'];
class EnvironmentVariables {
    NODE_ENV = NodeEnv.development;
    BACKEND_PORT = 5001;
    API_PREFIX = 'api';
    CORS_ORIGINS = 'http://localhost:5000';
    DATABASE_HOST;
    DATABASE_PORT = 5432;
    DATABASE_NAME;
    DATABASE_USER;
    DATABASE_PASSWORD;
    DATABASE_SSL = false;
    DATABASE_LOGGING = false;
    JWT_SECRET;
    JWT_EXPIRES_IN = '15m';
    JWT_REFRESH_SECRET;
    JWT_REFRESH_EXPIRES_IN = '7d';
    FINANCIAL_ENCRYPTION_KEY;
    FINANCIAL_ENCRYPTION_KEY_VERSION = 1;
    FINANCIAL_ENCRYPTION_PREVIOUS_KEYS = '';
    FINANCIAL_UNLOCK_MINUTES = 15;
    FINANCIAL_UNLOCK_MAX_ATTEMPTS = 5;
    FINANCIAL_UNLOCK_LOCKOUT_MINUTES = 15;
    THROTTLE_TTL = 60;
    THROTTLE_LIMIT = 100;
    LOGIN_THROTTLE_LIMIT = 5;
    LOGIN_THROTTLE_TTL = 300;
    ALLOW_OVERPAYMENT = false;
    DEFAULT_CURRENCY = 'INR';
    DEFAULT_CURRENCY_PRECISION = 2;
    SEED_ADMIN_NAME = 'System Administrator';
    SEED_ADMIN_EMAIL = 'admin@devstree.local';
    SEED_ADMIN_PHONE = '9000000001';
    SEED_ADMIN_PASSWORD;
    SEED_ADMIN_ACCOUNT_PASSWORD;
}
__decorate([
    (0, class_validator_1.IsEnum)(NodeEnv),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "NODE_ENV", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(65535),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "BACKEND_PORT", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "API_PREFIX", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "CORS_ORIGINS", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "DATABASE_HOST", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "DATABASE_PORT", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "DATABASE_NAME", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "DATABASE_USER", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "DATABASE_PASSWORD", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "DATABASE_SSL", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "DATABASE_LOGGING", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(32, { message: 'JWT_SECRET must be at least 32 characters' }),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "JWT_SECRET", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "JWT_EXPIRES_IN", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters' }),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "JWT_REFRESH_SECRET", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "JWT_REFRESH_EXPIRES_IN", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'FINANCIAL_ENCRYPTION_KEY is required' }),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "FINANCIAL_ENCRYPTION_KEY", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "FINANCIAL_ENCRYPTION_KEY_VERSION", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "FINANCIAL_ENCRYPTION_PREVIOUS_KEYS", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(240),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "FINANCIAL_UNLOCK_MINUTES", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "FINANCIAL_UNLOCK_MAX_ATTEMPTS", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "FINANCIAL_UNLOCK_LOCKOUT_MINUTES", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "THROTTLE_TTL", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "THROTTLE_LIMIT", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "LOGIN_THROTTLE_LIMIT", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "LOGIN_THROTTLE_TTL", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "ALLOW_OVERPAYMENT", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "DEFAULT_CURRENCY", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(6),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "DEFAULT_CURRENCY_PRECISION", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "SEED_ADMIN_NAME", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "SEED_ADMIN_EMAIL", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], EnvironmentVariables.prototype, "SEED_ADMIN_PHONE", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "SEED_ADMIN_PASSWORD", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "SEED_ADMIN_ACCOUNT_PASSWORD", void 0);
const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'off']);
function coerce(raw) {
    const numericKeys = [
        'BACKEND_PORT',
        'DATABASE_PORT',
        'FINANCIAL_ENCRYPTION_KEY_VERSION',
        'FINANCIAL_UNLOCK_MINUTES',
        'FINANCIAL_UNLOCK_MAX_ATTEMPTS',
        'FINANCIAL_UNLOCK_LOCKOUT_MINUTES',
        'THROTTLE_TTL',
        'THROTTLE_LIMIT',
        'LOGIN_THROTTLE_LIMIT',
        'LOGIN_THROTTLE_TTL',
        'DEFAULT_CURRENCY_PRECISION',
    ];
    const booleanKeys = ['DATABASE_SSL', 'DATABASE_LOGGING', 'ALLOW_OVERPAYMENT'];
    const out = { ...raw };
    for (const key of numericKeys) {
        if (out[key] !== undefined && out[key] !== '')
            out[key] = Number(out[key]);
        else
            delete out[key];
    }
    for (const key of booleanKeys) {
        const value = String(out[key] ?? '').toLowerCase();
        if (TRUE_VALUES.has(value))
            out[key] = true;
        else if (FALSE_VALUES.has(value))
            out[key] = false;
        else
            delete out[key];
    }
    for (const key of Object.keys(out)) {
        if (out[key] === '')
            delete out[key];
    }
    return out;
}
function decodeEncryptionKey(raw, label = 'FINANCIAL_ENCRYPTION_KEY') {
    const trimmed = raw.trim();
    if (!trimmed)
        throw new Error(`${label} is not set.`);
    const lowered = trimmed.toLowerCase();
    if (FORBIDDEN_SECRET_FRAGMENTS.some((fragment) => lowered.includes(fragment))) {
        throw new Error(`${label} still contains a placeholder value. Generate one with: openssl rand -base64 32`);
    }
    let key;
    if (/^[0-9a-f]{64}$/i.test(trimmed)) {
        key = Buffer.from(trimmed, 'hex');
    }
    else {
        key = Buffer.from(trimmed, 'base64');
        if (key.toString('base64').replace(/=+$/, '') !== trimmed.replace(/=+$/, '')) {
            throw new Error(`${label} is not valid base64 or 64-character hex.`);
        }
    }
    if (key.length !== AES_256_KEY_BYTES) {
        throw new Error(`${label} must decode to exactly ${AES_256_KEY_BYTES} bytes for AES-256-GCM (got ${key.length}).`);
    }
    const distinctBytes = new Set(key).size;
    if (distinctBytes < 8) {
        throw new Error(`${label} has insufficient entropy and was rejected.`);
    }
    return key;
}
function assertSecretStrength(name, value, nodeEnv) {
    const lowered = value.toLowerCase();
    if (nodeEnv === NodeEnv.production &&
        FORBIDDEN_SECRET_FRAGMENTS.some((f) => lowered.includes(f))) {
        throw new Error(`${name} contains a placeholder value and cannot be used in production.`);
    }
}
function validateEnv(config) {
    const validated = (0, class_transformer_1.plainToInstance)(EnvironmentVariables, coerce(config), {
        enableImplicitConversion: false,
        exposeDefaultValues: true,
    });
    const errors = (0, class_validator_1.validateSync)(validated, { skipMissingProperties: false, whitelist: false });
    if (errors.length > 0) {
        const details = errors
            .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
            .join('\n');
        throw new Error(`Invalid environment configuration:\n${details}`);
    }
    decodeEncryptionKey(validated.FINANCIAL_ENCRYPTION_KEY);
    assertSecretStrength('JWT_SECRET', validated.JWT_SECRET, validated.NODE_ENV);
    assertSecretStrength('JWT_REFRESH_SECRET', validated.JWT_REFRESH_SECRET, validated.NODE_ENV);
    if (validated.JWT_SECRET === validated.JWT_REFRESH_SECRET) {
        throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different values.');
    }
    if (validated.NODE_ENV === NodeEnv.production && validated.SEED_ADMIN_PASSWORD) {
        assertSecretStrength('SEED_ADMIN_PASSWORD', validated.SEED_ADMIN_PASSWORD, validated.NODE_ENV);
    }
    return validated;
}
//# sourceMappingURL=env.validation.js.map