import { Annotation, type Hex } from "../src/index";

export function generateRandomBytes(length: number): Uint8Array {
  return new TextEncoder().encode(generateRandomString(length));
}

export function generateRandomString(length: number): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Generates a random valid entity key (32 bytes as hex string).
 *
 * @returns A valid entity key in hex format
 */
export function generateRandomEntityKey(): Hex {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}` as Hex;
}

/**
 * Generates a random valid Ethereum address (20 bytes as hex string).
 *
 * @returns A valid Ethereum address in hex format
 */
export function generateRandomAddress(): Hex {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}` as Hex;
}

/**
 * Creates a test string annotation with random or provided values.
 *
 * @param key - The annotation key (optional, generates random if not provided)
 * @param value - The annotation value (optional, generates random if not provided)
 * @returns A new string annotation
 */
export function createTestStringAnnotation(
  key?: string,
  value?: string
): Annotation<string> {
  return new Annotation(
    key ?? `test_key_${generateRandomString(8)}`,
    value ?? generateRandomString(16)
  );
}

/**
 * Creates a test numeric annotation with random or provided values.
 *
 * @param key - The annotation key (optional, generates random if not provided)
 * @param value - The annotation value (optional, generates random if not provided)
 * @returns A new numeric annotation
 */
export function createTestNumericAnnotation(
  key?: string,
  value?: number
): Annotation<number> {
  return new Annotation(
    key ?? `test_num_${generateRandomString(8)}`,
    value ?? Math.floor(Math.random() * 1000)
  );
}

/**
 * Creates test data for GolemBase entity creation.
 *
 * @param size - Size of the data in bytes (default: 32)
 * @returns Random test data as Uint8Array
 */
export function createTestEntityData(size: number = 32): Uint8Array {
  return generateRandomBytes(size);
}

/**
 * Generates a random valid BTL (Block-to-Live) value.
 *
 * @param min - Minimum BTL value (default: 1)
 * @param max - Maximum BTL value (default: 10000)
 * @returns A random BTL value within the specified range
 */
export function generateRandomBTL(
  min: number = 1,
  max: number = 10000
): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
