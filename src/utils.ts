/**
 * @fileoverview Utility functions for GolemBase TypeScript SDK
 * 
 * This module provides validation helpers and utility functions for working with
 * GolemBase entities, addresses, and data types.
 * 
 * @author Golem Base Community
 * @version 1.0.0
 */

import { type Hex } from "./index"

/**
 * Validates if a string is a properly formatted hexadecimal value.
 * 
 * A valid hex string must:
 * - Start with '0x'
 * - Contain only valid hexadecimal characters (0-9, a-f, A-F)
 * - Have an even length (excluding '0x' prefix)
 * 
 * @param value - The string to validate
 * @returns True if the string is a valid hex format
 * 
 * @example
 * ```typescript
 * isValidHex("0x1234abcd"); // true
 * isValidHex("0x123");      // false (odd length)
 * isValidHex("1234abcd");   // false (no '0x' prefix)
 * isValidHex("0xGGHH");     // false (invalid characters)
 * ```
 * 
 * @public
 */
export function isValidHex(value: string): value is Hex {
  if (typeof value !== 'string') {
    return false;
  }
  
  // Must start with '0x'
  if (!value.startsWith('0x')) {
    return false;
  }
  
  // Must have even length after '0x' (each byte = 2 hex chars)
  const hexPart = value.slice(2);
  if (hexPart.length % 2 !== 0 || hexPart.length === 0) {
    return false;
  }
  
  // Must contain only valid hex characters
  return /^[0-9a-fA-F]*$/.test(hexPart);
}

/**
 * Validates if a string is a properly formatted GolemBase entity key.
 * 
 * A valid entity key must:
 * - Be a valid hex string (see isValidHex)
 * - Be exactly 32 bytes long (66 characters including '0x')
 * 
 * @param key - The string to validate as an entity key
 * @returns True if the string is a valid entity key format
 * 
 * @example
 * ```typescript
 * const validKey = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
 * isValidEntityKey(validKey); // true
 * 
 * isValidEntityKey("0x1234"); // false (too short)
 * isValidEntityKey("invalid"); // false (not hex)
 * ```
 * 
 * @public
 */
export function isValidEntityKey(key: string): key is Hex {
  return isValidHex(key) && key.length === 66; // 2 + 64 = 66 chars for 32 bytes
}

/**
 * Validates if a string is a properly formatted Ethereum address.
 * 
 * A valid Ethereum address must:
 * - Be a valid hex string (see isValidHex)
 * - Be exactly 20 bytes long (42 characters including '0x')
 * 
 * @param address - The string to validate as an Ethereum address
 * @returns True if the string is a valid Ethereum address format
 * 
 * @example
 * ```typescript
 * const validAddress = "0x742d35Cc9e1e3FbD000de0e98a3b8b8c0d3b2F8e";
 * isValidAddress(validAddress); // true
 * 
 * isValidAddress("0x742d35Cc"); // false (too short)
 * isValidAddress("742d35Cc9e1e3FbD000de0e98a3b8b8c0d3b2F8e"); // false (no '0x')
 * ```
 * 
 * @public
 */
export function isValidAddress(address: string): address is Hex {
  return isValidHex(address) && address.length === 42; // 2 + 40 = 42 chars for 20 bytes
}

/**
 * Validates if a string is a valid annotation key.
 * 
 * A valid annotation key must:
 * - Be a non-empty string
 * - Not consist only of whitespace
 * - Be a string type
 * 
 * @param key - The string to validate as an annotation key
 * @returns True if the string is a valid annotation key
 * 
 * @example
 * ```typescript
 * isValidAnnotationKey("type"); // true
 * isValidAnnotationKey("my-key"); // true
 * isValidAnnotationKey(""); // false
 * isValidAnnotationKey("   "); // false
 * isValidAnnotationKey(123); // false
 * ```
 * 
 * @public
 */
export function isValidAnnotationKey(key: any): key is string {
  return typeof key === 'string' && key.trim().length > 0;
}

/**
 * Validates if a BTL (Block-to-Live) value is within acceptable bounds.
 * 
 * A valid BTL must:
 * - Be a positive integer
 * - Be greater than 0
 * - Be less than or equal to the maximum safe integer
 * 
 * @param btl - The BTL value to validate
 * @returns True if the BTL is valid
 * 
 * @example
 * ```typescript
 * isValidBTL(1000); // true
 * isValidBTL(0); // false
 * isValidBTL(-100); // false
 * isValidBTL(1.5); // false
 * ```
 * 
 * @public
 */
export function isValidBTL(btl: any): btl is number {
  return typeof btl === 'number' && 
         Number.isInteger(btl) && 
         btl > 0 && 
         btl <= Number.MAX_SAFE_INTEGER;
}

/**
 * Predefined BTL (Block-to-Live) values for common use cases.
 * Based on ~12 second block times (Ethereum average).
 * 
 * @public
 */
export const BTL_PRESETS = {
  /** Short-lived entities: ~15 minutes (100 blocks) */
  SHORT: 100,
  /** Medium-lived entities: ~4 hours (1,200 blocks) */
  MEDIUM: 1200,
  /** Long-lived entities: ~1 day (7,200 blocks) */
  LONG: 7200,
  /** Very long-lived entities: ~30 days (216,000 blocks) */
  PERMANENT: 216000,
} as const;

/**
 * Commonly used annotation keys for consistent metadata labeling.
 * 
 * @public
 */
export const ANNOTATION_KEYS = {
  /** Entity type classification */
  TYPE: 'type',
  /** Entity category for grouping */
  CATEGORY: 'category',
  /** Priority level (typically numeric) */
  PRIORITY: 'priority',
  /** Creation or modification timestamp */
  TIMESTAMP: 'timestamp',
  /** Entity version identifier */
  VERSION: 'version',
  /** Current status of the entity */
  STATUS: 'status',
  /** Entity owner or creator */
  OWNER: 'owner',
  /** Tags for easy searching */
  TAG: 'tag',
} as const;

/**
 * Type guard to check if a value is a valid BTL preset.
 * 
 * @param value - The value to check
 * @returns True if the value is one of the predefined BTL presets
 * 
 * @example
 * ```typescript
 * isBTLPreset(BTL_PRESETS.SHORT); // true
 * isBTLPreset(1000); // false
 * ```
 * 
 * @public
 */
export function isBTLPreset(value: number): value is typeof BTL_PRESETS[keyof typeof BTL_PRESETS] {
  return Object.values(BTL_PRESETS).includes(value as any);
}
