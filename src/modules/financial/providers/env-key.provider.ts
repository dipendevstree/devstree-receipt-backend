import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decodeEncryptionKey } from 'src/config/env.validation';
import { FinancialKeyProvider } from '../interfaces/key-provider.interface';

/**
 * Reads AES-256 key material from the process environment.
 *
 * Production deployments should replace this provider with a KMS/Vault-backed
 * one; nothing outside this class knows where the bytes came from.
 */
@Injectable()
export class EnvFinancialKeyProvider implements FinancialKeyProvider, OnModuleInit {
  private readonly logger = new Logger(EnvFinancialKeyProvider.name);
  private readonly keys = new Map<number, Buffer>();
  private currentVersion = 1;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.currentVersion = this.config.get<number>('financial.keyVersion', 1);

    const primary = this.config.get<string>('financial.encryptionKey');
    if (!primary) {
      // Startup must fail loudly rather than silently generating a key.
      throw new Error('FINANCIAL_ENCRYPTION_KEY is not configured. Refusing to start.');
    }
    this.keys.set(this.currentVersion, decodeEncryptionKey(primary));

    // Retired keys stay available for decryption during rotation.
    const previous = this.config.get<string>('financial.previousKeys', '');
    for (const entry of previous
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)) {
      const separator = entry.indexOf(':');
      if (separator < 1) {
        throw new Error(
          'FINANCIAL_ENCRYPTION_PREVIOUS_KEYS must use the format "version:base64key,version:base64key".',
        );
      }
      const version = Number(entry.slice(0, separator));
      if (!Number.isInteger(version) || version < 1) {
        throw new Error('FINANCIAL_ENCRYPTION_PREVIOUS_KEYS contains an invalid key version.');
      }
      if (this.keys.has(version)) {
        throw new Error(`Duplicate financial encryption key version ${version}.`);
      }
      this.keys.set(
        version,
        decodeEncryptionKey(
          entry.slice(separator + 1),
          `FINANCIAL_ENCRYPTION_PREVIOUS_KEYS[v${version}]`,
        ),
      );
    }

    // Log the shape of the configuration, never the material.
    this.logger.log(
      `Financial encryption ready — current key v${this.currentVersion}, ${this.keys.size} key version(s) loaded.`,
    );
  }

  getCurrentKeyVersion(): number {
    return this.currentVersion;
  }

  getKey(version: number): Buffer {
    const key = this.keys.get(version);
    if (!key) {
      throw new Error(`No financial encryption key available for version ${version}.`);
    }
    return key;
  }

  getAvailableVersions(): number[] {
    return [...this.keys.keys()].sort((a, b) => a - b);
  }
}
