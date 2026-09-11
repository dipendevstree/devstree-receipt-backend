/**
 * Abstraction over key material so the storage backend can change without
 * touching the encryption service. The environment-backed provider is the
 * development default; AWS KMS / Secrets Manager / Vault providers implement the
 * same contract and are swapped in via the FINANCIAL_KEY_PROVIDER token.
 */
export interface FinancialKeyProvider {
  /** Key used for new encryptions. */
  getCurrentKeyVersion(): number;

  /**
   * Returns the raw 32-byte key for a version. Must throw — never return a
   * fallback — when the version is unknown, so ciphertext is never mis-decrypted.
   */
  getKey(version: number): Buffer;

  /** Versions available for decryption, ascending. */
  getAvailableVersions(): number[];
}

export const FINANCIAL_KEY_PROVIDER = Symbol('FINANCIAL_KEY_PROVIDER');
