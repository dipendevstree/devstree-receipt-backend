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
var EnvFinancialKeyProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvFinancialKeyProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const env_validation_1 = require("../../../config/env.validation");
let EnvFinancialKeyProvider = EnvFinancialKeyProvider_1 = class EnvFinancialKeyProvider {
    config;
    logger = new common_1.Logger(EnvFinancialKeyProvider_1.name);
    keys = new Map();
    currentVersion = 1;
    constructor(config) {
        this.config = config;
    }
    onModuleInit() {
        this.currentVersion = this.config.get('financial.keyVersion', 1);
        const primary = this.config.get('financial.encryptionKey');
        if (!primary) {
            throw new Error('FINANCIAL_ENCRYPTION_KEY is not configured. Refusing to start.');
        }
        this.keys.set(this.currentVersion, (0, env_validation_1.decodeEncryptionKey)(primary));
        const previous = this.config.get('financial.previousKeys', '');
        for (const entry of previous
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)) {
            const separator = entry.indexOf(':');
            if (separator < 1) {
                throw new Error('FINANCIAL_ENCRYPTION_PREVIOUS_KEYS must use the format "version:base64key,version:base64key".');
            }
            const version = Number(entry.slice(0, separator));
            if (!Number.isInteger(version) || version < 1) {
                throw new Error('FINANCIAL_ENCRYPTION_PREVIOUS_KEYS contains an invalid key version.');
            }
            if (this.keys.has(version)) {
                throw new Error(`Duplicate financial encryption key version ${version}.`);
            }
            this.keys.set(version, (0, env_validation_1.decodeEncryptionKey)(entry.slice(separator + 1), `FINANCIAL_ENCRYPTION_PREVIOUS_KEYS[v${version}]`));
        }
        this.logger.log(`Financial encryption ready — current key v${this.currentVersion}, ${this.keys.size} key version(s) loaded.`);
    }
    getCurrentKeyVersion() {
        return this.currentVersion;
    }
    getKey(version) {
        const key = this.keys.get(version);
        if (!key) {
            throw new Error(`No financial encryption key available for version ${version}.`);
        }
        return key;
    }
    getAvailableVersions() {
        return [...this.keys.keys()].sort((a, b) => a - b);
    }
};
exports.EnvFinancialKeyProvider = EnvFinancialKeyProvider;
exports.EnvFinancialKeyProvider = EnvFinancialKeyProvider = EnvFinancialKeyProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EnvFinancialKeyProvider);
//# sourceMappingURL=env-key.provider.js.map