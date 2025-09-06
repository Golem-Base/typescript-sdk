/**
 * @fileoverview GolemBase TypeScript SDK - Main entry point for interacting with the Golem Base L2 network.
 * 
 * This module provides comprehensive functionality for decentralized data storage and management
 * on GolemBase, including entity CRUD operations, real-time event monitoring, and blockchain interactions.
 * 
 * @author Golem Base Team
 * @version 1.0.0
 * @see {@link https://docs.golemdb.io/} - Official GolemBase Documentation
 */

import {
  getAbiItem,
  parseAbi,
  toEventHash,
} from "viem"

// Export all high-level client functionality
export * from "./client"

// Export internal implementation for advanced use cases
export * as internal from "./internal/client"

// Re-export useful viem utilities
export { formatEther } from "viem"

/**
 * The Application Binary Interface (ABI) for GolemBase storage contract events.
 * 
 * This ABI defines the event signatures emitted by the GolemBase storage contract
 * for all entity lifecycle operations. These events are used to track entity creation,
 * updates, deletions, and BTL extensions on the blockchain.
 * 
 * @public
 */
export const golemBaseABI = parseAbi([
  "event GolemBaseStorageEntityCreated(uint256 indexed entityKey, uint256 expirationBlock)",
  "event GolemBaseStorageEntityUpdated(uint256 indexed entityKey, uint256 expirationBlock)",
  "event GolemBaseStorageEntityDeleted(uint256 indexed entityKey)",
  "event GolemBaseStorageEntityBTLExtended(uint256 indexed entityKey, uint256 oldExpirationBlock, uint256 newExpirationBlock)",
])

/**
 * Pre-computed event signature hash for GolemBaseStorageEntityCreated events.
 * Used for efficient event filtering and monitoring in blockchain queries.
 * @public
 */
export const golemBaseStorageEntityCreatedSignature =
  toEventHash(getAbiItem({ abi: golemBaseABI, name: "GolemBaseStorageEntityCreated" }))

/**
 * Pre-computed event signature hash for GolemBaseStorageEntityUpdated events.
 * Used for efficient event filtering and monitoring in blockchain queries.
 * @public
 */
export const golemBaseStorageEntityUpdatedSignature =
  toEventHash(getAbiItem({ abi: golemBaseABI, name: "GolemBaseStorageEntityUpdated" }))

/**
 * Pre-computed event signature hash for GolemBaseStorageEntityDeleted events.
 * Used for efficient event filtering and monitoring in blockchain queries.
 * @public
 */
export const golemBaseStorageEntityDeletedSignature =
  toEventHash(getAbiItem({ abi: golemBaseABI, name: "GolemBaseStorageEntityDeleted" }))

/**
 * Pre-computed event signature hash for GolemBaseStorageEntityBTLExtended events.
 * Used for efficient event filtering and monitoring in blockchain queries.
 * @public
 */
export const golemBaseStorageEntityBTLExtendedSignature =
  toEventHash(getAbiItem({ abi: golemBaseABI, name: "GolemBaseStorageEntityBTLExtended" }))


/**
 * Generic annotation class for attaching metadata to GolemBase entities.
 * 
 * Annotations provide a key-value mechanism for adding searchable metadata
 * to entities, enabling efficient querying and categorization of stored data.
 * They are essential for building database-like functionality on top of GolemBase.
 * 
 * @template V - The type of the annotation value (string, number, etc.)
 * @public
 * 
 * @example
 * ```typescript
 * // String annotations for categorization
 * const typeAnnotation = new Annotation("type", "user-profile");
 * const statusAnnotation = new Annotation("status", "active");
 * 
 * // Numeric annotations for indexing and filtering
 * const priorityAnnotation = new Annotation("priority", 1);
 * const timestampAnnotation = new Annotation("created_at", Date.now());
 * ```
 */
export class Annotation<V> {
  /** The annotation key identifier */
  readonly key: string
  /** The annotation value */
  readonly value: V

  /**
   * Create a new annotation with the specified key and value.
   * 
   * @param key - The string identifier for this annotation
   * @param value - The value to associate with the key
   */
  constructor(key: string, value: V) {
    this.key = key
    this.value = value
  }
}

/**
 * Type alias for string-valued annotations, commonly used for categorization and tagging.
 * @public
 */
export type StringAnnotation = Annotation<string>

/**
 * Type alias for numeric-valued annotations, commonly used for scoring and indexing.
 * @public
 */
export type NumericAnnotation = Annotation<number>

/**
 * Generic tagged union helper class for type-safe discrimination.
 * 
 * This utility class provides a way to create discriminated unions with
 * compile-time type safety, commonly used in functional programming patterns.
 * 
 * @template Tag - The discriminant tag type
 * @template Data - The associated data type
 * @public
 */
export class Tagged<Tag, Data> {
  /** The discriminant tag for this tagged value */
  readonly tag: Tag
  /** The associated data payload */
  readonly data: Data

  /**
   * Create a new tagged value with the specified tag and data.
   * 
   * @param tag - The discriminant tag
   * @param data - The associated data payload
   */
  constructor(tag: Tag, data: Data) {
    this.tag = tag
    this.data = data
  }
}

/**
 * Account data discriminated union for different authentication methods.
 * 
 * GolemBase supports two primary authentication mechanisms:
 * - Private key accounts for server-side applications and testing
 * - Ethereum provider integration for browser wallets (MetaMask, WalletConnect, etc.)
 * 
 * @public
 * 
 * @example
 * Private key account:
 * ```typescript
 * const privateKeyAccount: AccountData = new Tagged(
 *   "privatekey", 
 *   new Uint8Array([...]) // 32-byte private key
 * );
 * ```
 * 
 * @example
 * Browser wallet provider:
 * ```typescript
 * const providerAccount: AccountData = new Tagged(
 *   "ethereumprovider",
 *   window.ethereum // MetaMask provider
 * );
 * ```
 */
export type AccountData =
  Tagged<"privatekey", Uint8Array> |
  Tagged<"ethereumprovider", { request(...args: any): Promise<any> }>

/**
 * Type representing hexadecimal-encoded values used throughout the GolemBase protocol.
 * 
 * This type ensures type safety for Ethereum addresses, entity keys, transaction hashes,
 * and other blockchain-related hexadecimal values that must start with '0x'.
 * 
 * @public
 * 
 * @example
 * ```typescript
 * const entityKey: Hex = "0x1234567890abcdef1234567890abcdef12345678";
 * const address: Hex = "0x742d35Cc9e1e3FbD000de0e98a3b8b8c0d3b2F8e";
 * ```
 */
export type Hex = `0x${string}`

/**
 * Specification for creating new entities in GolemBase.
 * 
 * This type defines all the parameters needed to create a new entity,
 * including the data payload, time-to-live (BTL), and metadata annotations
 * for efficient querying and categorization.
 * 
 * @public
 * 
 * @example
 * ```typescript
 * const createSpec: GolemBaseCreate = {
 *   data: new TextEncoder().encode(JSON.stringify({ message: "Hello GolemBase" })),
 *   btl: 1000,
 *   stringAnnotations: [
 *     new Annotation("type", "message"),
 *     new Annotation("category", "greeting")
 *   ],
 *   numericAnnotations: [
 *     new Annotation("priority", 1),
 *     new Annotation("timestamp", Date.now())
 *   ]
 * };
 * ```
 */
export type GolemBaseCreate = {
  /** The binary data to store in the entity */
  readonly data: Uint8Array,
  /** Block-to-Live: number of blocks after which the entity expires */
  readonly btl: number,
  /** String-valued metadata annotations for querying and categorization */
  readonly stringAnnotations: StringAnnotation[]
  /** Numeric-valued metadata annotations for indexing and filtering */
  readonly numericAnnotations: NumericAnnotation[],
}
/**
 * Specification for updating existing entities in GolemBase.
 * 
 * Updates replace the entire entity content including data and annotations.
 * The entity owner can modify the BTL to extend or reduce the entity's lifetime.
 * Only the entity owner can perform update operations.
 * 
 * @public
 * 
 * @example
 * ```typescript
 * const updateSpec: GolemBaseUpdate = {
 *   entityKey: "0x1234567890abcdef12345678",
 *   data: new TextEncoder().encode(JSON.stringify({ message: "Updated content" })),
 *   btl: 2000,
 *   stringAnnotations: [
 *     new Annotation("status", "updated"),
 *     new Annotation("version", "2.0")
 *   ],
 *   numericAnnotations: [
 *     new Annotation("last_modified", Date.now())
 *   ]
 * };
 * ```
 */
export type GolemBaseUpdate = {
  /** The hexadecimal key of the entity to update */
  readonly entityKey: Hex,
  /** The new binary data to store in the entity */
  readonly data: Uint8Array,
  /** New Block-to-Live value for the entity */
  readonly btl: number,
  /** New string-valued metadata annotations */
  readonly stringAnnotations: StringAnnotation[]
  /** New numeric-valued metadata annotations */
  readonly numericAnnotations: NumericAnnotation[],
}
/**
 * Specification for extending the BTL (Block-to-Live) of existing entities.
 * 
 * BTL extension allows entity owners to prolong the lifetime of their entities
 * without modifying the data or annotations. This is useful for maintaining
 * important data that should not expire.
 * 
 * @public
 * 
 * @example
 * ```typescript
 * const extendSpec: GolemBaseExtend = {
 *   entityKey: "0x1234567890abcdef12345678",
 *   numberOfBlocks: 500
 * };
 * ```
 */
export type GolemBaseExtend = {
  /** The hexadecimal key of the entity to extend */
  readonly entityKey: Hex,
  /** Number of additional blocks to add to the entity's current expiration */
  readonly numberOfBlocks: number,
}
/**
 * Comprehensive transaction specification for atomic GolemBase operations.
 * 
 * This type allows combining multiple entity operations (create, update, delete, extend)
 * into a single atomic blockchain transaction. All operations within a transaction
 * either succeed together or fail together, ensuring data consistency.
 * 
 * @public
 * 
 * @example
 * ```typescript
 * const transaction: GolemBaseTransaction = {
 *   creates: [{
 *     data: new TextEncoder().encode("New entity 1"),
 *     btl: 1000,
 *     stringAnnotations: [new Annotation("type", "document")],
 *     numericAnnotations: []
 *   }],
 *   updates: [{
 *     entityKey: "0xabcd1234567890ef",
 *     data: new TextEncoder().encode("Updated content"),
 *     btl: 1500,
 *     stringAnnotations: [new Annotation("status", "modified")],
 *     numericAnnotations: []
 *   }],
 *   deletes: ["0x567890abcdef1234", "0x901234567890abcd"],
 *   extensions: [{
 *     entityKey: "0xef34567890abcdef",
 *     numberOfBlocks: 200
 *   }]
 * };
 * ```
 */
export type GolemBaseTransaction = {
  /** Array of entity creation specifications */
  readonly creates?: GolemBaseCreate[],
  /** Array of entity update specifications */
  readonly updates?: GolemBaseUpdate[],
  /** Array of entity keys to delete */
  readonly deletes?: Hex[],
  /** Array of BTL extension specifications */
  readonly extensions?: GolemBaseExtend[],
}

/**
 * Complete metadata information for an entity stored in GolemBase.
 * 
 * This type contains all the information about an entity including its expiration,
 * data payload, annotations, and ownership details. It's returned by query operations
 * to provide comprehensive entity information.
 * 
 * @public
 * 
 * @example
 * ```typescript
 * const metadata: EntityMetaData = await client.getEntityMetaData("0x1234567890abcdef");
 * 
 * console.log(`Entity expires at block: ${metadata.expiresAtBlock}`);
 * console.log(`Entity owner: ${metadata.owner}`);
 * console.log(`Data payload: ${metadata.payload}`);
 * 
 * // Access annotations
 * metadata.stringAnnotations.forEach(ann => {
 *   console.log(`${ann.key}: ${ann.value}`);
 * });
 * ```
 */
export type EntityMetaData = {
  /** The block number at which this entity will expire and be automatically deleted */
  readonly expiresAtBlock: bigint,
  /** The base64-encoded data payload stored in the entity */
  readonly payload: string,
  /** String-valued metadata annotations attached to the entity */
  readonly stringAnnotations: StringAnnotation[],
  /** Numeric-valued metadata annotations attached to the entity */
  readonly numericAnnotations: NumericAnnotation[],
  /** The Ethereum address of the entity owner */
  readonly owner: Hex,
}
