import * as internal from "./internal/client"
import {
  type ILogObj,
  Logger,
} from "tslog";

import {
  type Hex,
  type GolemBaseCreate,
  type GolemBaseUpdate,
  type GolemBaseExtend,
  type EntityMetaData,
  type AccountData,
  golemBaseABI,
} from "."
import {
  decodeEventLog,
  Log,
  pad,
  toEventHash,
  toHex,
} from "viem";

/**
 * Receipt returned when successfully creating an entity in GolemBase
 * @public
 */
export type CreateEntityReceipt = {
  /** The unique hexadecimal key of the created entity */
  entityKey: Hex,
  /** The block number at which this entity will expire */
  expirationBlock: number,
}

/**
 * Receipt returned when successfully updating an entity in GolemBase
 * @public
 */
export type UpdateEntityReceipt = {
  /** The unique hexadecimal key of the updated entity */
  entityKey: Hex,
  /** The new block number at which this entity will expire */
  expirationBlock: number,
}

/**
 * Receipt returned when successfully deleting an entity in GolemBase
 * @public
 */
export type DeleteEntityReceipt = {
  /** The unique hexadecimal key of the deleted entity */
  entityKey: Hex
}

/**
 * Receipt returned when successfully extending an entity's BTL (Block-to-Live) in GolemBase
 * @public
 */
export type ExtendEntityReceipt = {
  /** The unique hexadecimal key of the extended entity */
  entityKey: Hex,
  /** The previous block number at which the entity would have expired */
  oldExpirationBlock: number,
  /** The new block number at which the entity will expire */
  newExpirationBlock: number,
}

/**
 * Generic interface for GolemBase clients providing core functionality for interacting
 * with the Golem Base L2 network for decentralized data storage and management.
 * 
 * @template Internal - The type of the internal client implementation
 * @public
 */
interface GenericClient<Internal> {
  /**
   * Returns the raw internal client used under the hood.
   * The internal client which exposes low-level methods and also gives
   * access to the raw viem.sh ethereum clients,
   * which allows to call low-level ethereum methods directly
   *
   * This includes low-level Ethereum client access (via viem.sh). This is considered an advanced feature. Use with caution if you need to make low-level Ethereum calls directly.
   * @returns {Internal} The internal client object used by the SDK.
   */

  getRawClient(): Internal

  /**
   * Returns the total number of entities stored in GolemBase.
   * @returns A promise that resolves to the total count of entities.
   */
  getEntityCount(): Promise<number>

  /**
   * Returns all entity keys stored in GolemBase.
   * @returns A promise that resolves to an array of entity keys (Hex[]).
   */
  getAllEntityKeys(): Promise<Hex[]>

  /**
   * Retrieves all entity keys owned by a specific Ethereum address.
   * @param address The address whose owned entities should be returned.
   * @returns A promise that resolves to an array of entity keys owned by the address.
   */
   getEntitiesOfOwner(address: Hex): Promise<Hex[]>

  /**
   * Returns the raw base64-encoded storage value associated with a given entity key.
   * @param key The entity key to fetch the data for.
   * @returns A Uint8Array containing the base64 encoded  value stored in the entity.
   */
   getStorageValue(key: Hex): Promise<Uint8Array>

  /**
   * Queries entities in GolemBase using annotations or metadata filters.
   * @param query A query string in the GolemBase filter syntax.
   * @returns A promise that resolves to an array of matching entity keys.
   */
   queryEntities(query: string): Promise<{ entityKey: Hex, storageValue: Uint8Array }[]>

  /**
   * Finds all entities that are scheduled to expire at a specific block.
   * @param blockNumber The block number to check against.
   * @returns A promise that resolves to an array of entity keys expiring at the given block.
   */
   getEntitiesToExpireAtBlock(blockNumber: bigint): Promise<Hex[]>

 /**
   * Retrieves metadata for a given entity key.
   * @param key The key to retrieve metadata for.
   * @returns An EntityMetaData object with structured information about the entity.
   */
   getEntityMetaData(key: Hex): Promise<EntityMetaData>

  /**
   * Install callbacks that will be invoked for every GolemBase transaction
   *
   * @param args.fromBlock - The starting block, events trigger the callbacks starting from this block
   * @param args.onCreated - A callback that's invoked whenever entities are created
   * @param args.onUpdated - A callback that's invoked whenever entitier are updated
   * @param args.onExtended - A callback that's invoked whenever entities have their BTL extended
   * @param args.onDeleted - A callback that's invoked whenever entities are deleted
   * @param args.onError - A callback that's invoked whenever there is an error during the processing
   * @param args.pollingInterval - In that case of HTTP transport, the polling interval in milliseconds.
   *                               Defaults to the default polling interval of viem
   * @param args.transport - The transport to use, either HTTP or WebSocket (the default)
   *
   * @returns a callback to cancel the subscription and stop receiving notifications
   */
  watchLogs(args: {
    fromBlock: bigint,
    onCreated: (args: { entityKey: Hex, expirationBlock: number, }) => void,
    onUpdated: (args: { entityKey: Hex, expirationBlock: number, }) => void,
    onExtended: (args: { entityKey: Hex, oldExpirationBlock: number, newExpirationBlock: number, }) => void,
    onDeleted: (args: { entityKey: Hex, }) => void,
    onError?: ((error: Error) => void) | undefined,
    pollingInterval?: number,
    transport?: `http` | `websocket`
  }): () => void
}

/**
 * Read-only client interface for GolemBase providing access to query operations
 * without the ability to modify data on the blockchain.
 * 
 * Use this client when you only need to read data from GolemBase and don't require
 * transaction capabilities.
 * 
 * @public
 * @example
 * ```typescript
 * const roClient = createROClient(chainId, rpcUrl, wsUrl);
 * const entityCount = await roClient.getEntityCount();
 * const entities = await roClient.getAllEntityKeys();
 * ```
 */
export interface GolemBaseROClient extends GenericClient<internal.GolemBaseROClient> { }

/**
 * The GolemBaseClient interface provides both read and write operations
 * for interacting with the Golem Base L2 network.
 * 
 * This client can perform CRUD operations on entities, manage their BTL (Block-to-Live),
 * and handle transactions on the blockchain.
 * 
 * This interface extends the GolemBaseROClient interface, inheriting all its read-only methods.
 *
 * @public
 * @example
 * ```typescript
 * const client = await createClient(chainId, accountData, rpcUrl, wsUrl);
 * 
 * // Create entities with annotations
 * const receipts = await client.createEntities([
 *   {
 *     data: new TextEncoder().encode("Hello, GolemBase!"),
 *     btl: 1000,
 *     stringAnnotations: [new Annotation("type", "message")],
 *     numericAnnotations: []
 *   }
 * ]);
 * ```
 */
export interface GolemBaseClient extends GenericClient<internal.GolemBaseClient> {
  /**
   * Get the Ethereum address of the owner of the Ethereum account used by this client
   * 
   * @returns A promise that resolves to the address as a Hex string.
   * @throws Will throw an error if the client is not properly configured with account data
   * 
   * @example
   * ```typescript
   * const client = await createClient(chainId, accountData, rpcUrl, wsUrl);
   * const address = await client.getOwnerAddress();
   * console.log('Account address:', address); // 0x742d35Cc9e1e3FbD...
   * ```
   */

  getOwnerAddress(): Promise<Hex>

  /**
   * Send a combined transaction to GolemBase that can include multiple operations:
   * create, update, delete, and extend operations in a single atomic transaction.
   * 
   * @param creates - Array of create operations to include in this transaction
   * @param updates - Array of update operations to include in this transaction  
   * @param deletes - Array of entity keys to delete in this transaction
   * @param extensions - Array of BTL extension operations to include in this transaction
   * @param args - Optional transaction configuration
   * @param args.txHashCallback - Callback function invoked with the transaction hash once submitted
   * @param args.gas - Manual gas limit override for the transaction
   * @param args.maxFeePerGas - Maximum fee per gas unit (EIP-1559)
   * @param args.maxPriorityFeePerGas - Maximum priority fee per gas unit (EIP-1559)
   * 
   * @returns A promise that resolves to an object with arrays of receipts for each type of operation.
   * @throws Will throw an error if the transaction fails or is reverted
   * 
   * @example
   * ```typescript
   * const result = await client.sendTransaction(
   *   [{ data: new TextEncoder().encode("create"), btl: 1000, stringAnnotations: [], numericAnnotations: [] }],
   *   [{ entityKey: "0x123...", data: new TextEncoder().encode("update"), btl: 2000, stringAnnotations: [], numericAnnotations: [] }],
   *   ["0x456..."],
   *   [{ entityKey: "0x789...", numberOfBlocks: 500 }],
   *   { txHashCallback: (hash) => console.log('TX Hash:', hash) }
   * );
   * ```
   * @param creates - The list of create operations to include in this transaction
   * @param updates - The list of update operations to include in this transaction
   * @param deletes - The list of delete operations to include in this transaction
   * @param extensions - The list of extend operations to include in this transaction
   * @param args - Optional config object for the transaction.
   * @param args.txHashCallback - Callback to invoke with the transaction hash of the transaction
   * @param args.gas - Override the gas limit.
   * @param args.maxFeePerGas - Sets the max fee per gas manually
   * @param args.maxPriorityFeePerGas - Sets the max priority fee per gas manually
   */

  sendTransaction(
    creates?: GolemBaseCreate[],
    updates?: GolemBaseUpdate[],
    deletes?: Hex[],
    extensions?: GolemBaseExtend[],
    args?: {
      txHashCallback?: (txHash: Hex) => void,
      gas?: bigint,
      maxFeePerGas?: bigint | undefined,
      maxPriorityFeePerGas?: bigint | undefined,
    },
  ): Promise<{
    createEntitiesReceipts: CreateEntityReceipt[],
    updateEntitiesReceipts: UpdateEntityReceipt[],
    deleteEntitiesReceipts: DeleteEntityReceipt[],
    extendEntitiesReceipts: ExtendEntityReceipt[],
  }>

  /**
   * Create one or more new entities in GolemBase with specified data and annotations.
   * 
   * Each entity is stored with a configurable BTL (Block-to-Live) that determines when
   * the entity will automatically expire and be removed from the network.
   *
   * @param creates - Array of entity creation specifications
   * @param args - Optional transaction parameters
   * @param args.txHashCallback - Callback invoked with transaction hash when submitted
   * @param args.gas - Manual gas limit override
   * @param args.maxFeePerGas - Maximum fee per gas unit (EIP-1559)
   * @param args.maxPriorityFeePerGas - Maximum priority fee per gas unit (EIP-1559)
   *
   * @returns Promise resolving to an array of creation receipts, each including the new entity key and its expiration block.
   * @throws Will throw an error if the transaction fails or any entity creation fails
   * 
   * @example
   * ```typescript
   * const receipts = await client.createEntities([
   *   {
   *     data: new TextEncoder().encode(JSON.stringify({ message: "Hello World" })),
   *     btl: 1000, // Entity expires in 1000 blocks
   *     stringAnnotations: [
   *       new Annotation("type", "greeting"),
   *       new Annotation("version", "1.0")
   *     ],
   *     numericAnnotations: [
   *       new Annotation("priority", 1)
   *     ]
   *   }
   * ]);
   * 
   * console.log('Created entity:', receipts[0].entityKey);
   * console.log('Expires at block:', receipts[0].expirationBlock);
   * ```
   */
  createEntities(
    creates: GolemBaseCreate[],
    args?: {
      txHashCallback?: (txHash: Hex) => void,
      gas?: bigint,
      maxFeePerGas?: bigint | undefined,
      maxPriorityFeePerGas?: bigint | undefined,
    },
  ): Promise<CreateEntityReceipt[]>

  /**
   * Update one or more existing entities in GolemBase with new data and annotations.
   * 
   * Updates replace the entire entity content, including data and annotations.
   * The BTL can also be modified to extend or reduce the entity's lifetime.
   *
   * @param updates - Array of entity update specifications containing entity keys and new data
   * @param args - Optional transaction parameters
   * @param args.txHashCallback - Callback invoked with transaction hash when submitted
   * @param args.gas - Manual gas limit override
   * @param args.maxFeePerGas - Maximum fee per gas unit (EIP-1559)
   * @param args.maxPriorityFeePerGas - Maximum priority fee per gas unit (EIP-1559)
   *
   * @returns A promise that resolves to an array of `UpdateEntityReceipt` objects, each including the entity key and its new expiration block.
   * @throws Will throw an error if the transaction fails, entity doesn't exist, or caller lacks permission
   * 
   * @example
   * ```typescript
   * const receipts = await client.updateEntities([
   *   {
   *     entityKey: "0x1234567890abcdef...",
   *     data: new TextEncoder().encode(JSON.stringify({ message: "Updated content" })),
   *     btl: 2000, // Extend lifetime to 2000 blocks
   *     stringAnnotations: [new Annotation("status", "updated")],
   *     numericAnnotations: []
   *   }
   * ]);
   * ```
   */
  updateEntities(
    updates: GolemBaseUpdate[],
    args?: {
      txHashCallback?: (txHash: Hex) => void,
      gas?: bigint,
      maxFeePerGas?: bigint | undefined,
      maxPriorityFeePerGas?: bigint | undefined,
    },
  ): Promise<UpdateEntityReceipt[]>

  /**
   * Deletes one or more entities from GolemBase permanently.
   * 
   * Only the entity owner can delete their entities. Deleted entities cannot be recovered
   * and their storage is immediately freed on the network.
   *
   * @param deletes - Array of hexadecimal entity keys to delete
   * @param args - Optional transaction parameters
   * @param args.txHashCallback - Callback invoked with transaction hash when submitted
   * @param args.gas - Manual gas limit override
   * @param args.maxFeePerGas - Maximum fee per gas unit (EIP-1559)
   * @param args.maxPriorityFeePerGas - Maximum priority fee per gas unit (EIP-1559)
   *
   * @returns A promise that resolves to an array of `DeleteEntityReceipt` objects (usually just the deleted keys).
   * @throws Will throw an error if the transaction fails, entity doesn't exist, or caller lacks permission
   * 
   * @example
   * ```typescript
   * const receipts = await client.deleteEntities([
   *   "0x1234567890abcdef...",
   *   "0xfedcba0987654321..."
   * ]);
   * 
   * receipts.forEach(receipt => {
   *   console.log('Deleted entity:', receipt.entityKey);
   * });
   * ```
   */
  deleteEntities(
    deletes: Hex[],
    args?: {
      txHashCallback?: (txHash: Hex) => void,
      gas?: bigint,
      maxFeePerGas?: bigint | undefined,
      maxPriorityFeePerGas?: bigint | undefined,
    },
  ): Promise<DeleteEntityReceipt[]>

  /**
   * Extends the BTL (Block-to-Live) of one or more entities in GolemBase.
   * 
   * This operation increases the lifetime of entities by adding additional blocks
   * to their expiration time, preventing them from being automatically deleted.
   *
   * @param extensions - Array of BTL extension specifications
   * @param args - Optional transaction parameters
   * @param args.txHashCallback - Callback invoked with transaction hash when submitted
   * @param args.gas - Manual gas limit override
   * @param args.maxFeePerGas - Maximum fee per gas unit (EIP-1559)
   * @param args.maxPriorityFeePerGas - Maximum priority fee per gas unit (EIP-1559)
   *
   * @returns A promise resolving to n array of `ExtendEntityReceipt` objects, each showing the old and new expiration blocks.
   * @throws Will throw an error if the transaction fails, entity doesn't exist, or caller lacks permission
   * 
   * @example
   * ```typescript
   * const receipts = await client.extendEntities([
   *   {
   *     entityKey: "0x1234567890abcdef...",
   *     numberOfBlocks: 500 // Add 500 more blocks to the entity's lifetime
   *   }
   * ]);
   * 
   * receipts.forEach(receipt => {
   *   console.log(`Entity ${receipt.entityKey}:`);
   *   console.log(`  Old expiration: block ${receipt.oldExpirationBlock}`);
   *   console.log(`  New expiration: block ${receipt.newExpirationBlock}`);
   * });
   * ```
   */

  extendEntities(
    extensions: GolemBaseExtend[],
    args?: {
      txHashCallback?: (txHash: Hex) => void,
      gas?: bigint,
      maxFeePerGas?: bigint | undefined,
      maxPriorityFeePerGas?: bigint | undefined,
    },
  ): Promise<ExtendEntityReceipt[]>
}

/**
 * Parse transaction logs from GolemBase operations to extract receipts for different entity operations.
 * 
 * This internal function processes blockchain event logs and categorizes them into the appropriate
 * operation types (create, update, delete, extend) based on the event signatures.
 * 
 * @param log - Logger instance for debugging transaction log parsing
 * @param logs - Array of blockchain transaction logs to parse
 * @returns Object containing arrays of receipts categorized by operation type
 * 
 * @internal
 */
function parseTransactionLogs(
  log: Logger<ILogObj>,
  logs: Log<bigint, number, false>[]
): {
  createEntitiesReceipts: CreateEntityReceipt[],
  updateEntitiesReceipts: UpdateEntityReceipt[],
  deleteEntitiesReceipts: DeleteEntityReceipt[],
  extendEntitiesReceipts: ExtendEntityReceipt[],
} {
  return logs.reduce((receipts, txlog) => {
    // The call to pad here is needed when running in the browser, but somehow
    // not when running in node...
    // Our geth node seems to correctly return a uint256.
    // We pad to either 32 or 64 bytes (the longest data field in our ABI).
    // TODO: investigate why this is needed
    let paddedData
    if (txlog.data.length > 2 && txlog.data.length < 34) {
      paddedData = pad(txlog.data, { size: 32, dir: "left" })
    } else if (txlog.data.length > 34 && txlog.data.length < 66) {
      paddedData = pad(txlog.data, { size: 64, dir: "left" })
    } else {
      paddedData = txlog.data
    }
    log.debug("padded data:", paddedData)
    const parsed = decodeEventLog({
      abi: golemBaseABI,
      data: paddedData,
      topics: txlog.topics
    })
    switch (parsed.eventName) {
      case "GolemBaseStorageEntityCreated": {
        log.debug(parsed.args)
        return {
          ...receipts,
          createEntitiesReceipts: receipts.createEntitiesReceipts.concat([{
            entityKey: toHex(parsed.args.entityKey, { size: 32 }),
            expirationBlock: Number(parsed.args.expirationBlock),
          }]),
        }
      }
      case "GolemBaseStorageEntityUpdated": {
        return {
          ...receipts,
          updateEntitiesReceipts: receipts.updateEntitiesReceipts.concat([{
            entityKey: toHex(parsed.args.entityKey, { size: 32 }),
            expirationBlock: Number(parsed.args.expirationBlock),
          }]),
        }
      }
      case "GolemBaseStorageEntityBTLExtended": {
        return {
          ...receipts,
          extendEntitiesReceipts: receipts.extendEntitiesReceipts.concat([{
            entityKey: toHex(parsed.args.entityKey, { size: 32 }),
            newExpirationBlock: Number(parsed.args.newExpirationBlock),
            oldExpirationBlock: Number(parsed.args.oldExpirationBlock),
          }]),
        }
      }
      case "GolemBaseStorageEntityDeleted": {
        return {
          ...receipts,
          deleteEntitiesReceipts: receipts.deleteEntitiesReceipts.concat([{
            entityKey: toHex(parsed.args.entityKey, { size: 32 }),
          }]),
        }
      }
    }
  },
    {
      createEntitiesReceipts: [] as CreateEntityReceipt[],
      updateEntitiesReceipts: [] as UpdateEntityReceipt[],
      deleteEntitiesReceipts: [] as DeleteEntityReceipt[],
      extendEntitiesReceipts: [] as ExtendEntityReceipt[],
    }
  )
}

/**
 * Create a generic client wrapper that provides common functionality for both
 * read-only and full GolemBase clients.
 * 
 * This factory function wraps the internal client with high-level methods that handle
 * common operations like querying entities, watching blockchain events, and managing
 * entity metadata.
 * 
 * @template Internal - Type of the internal client (read-only or full client)
 * @param client - The internal client instance to wrap
 * @param logger - Logger instance for debugging and monitoring operations
 * @returns A generic client with common GolemBase functionality
 * 
 * @internal
 */
function createGenericClient<Internal extends internal.GolemBaseROClient>(
  client: Internal,
  logger: Logger<ILogObj>
): GenericClient<Internal> {
  const log = logger.getSubLogger({ name: "generic client" });

  // Log the event hashes in case we need to debug event log parsing
  for (let value of golemBaseABI) {
    log.debug("Calculated the following event signature:", value.name, "->", toEventHash(value))
  }

  return {
    getRawClient() {
      return client
    },

    async getStorageValue(key: Hex): Promise<Uint8Array> {
      return client.httpClient.getStorageValue(key)
    },

    async getEntityMetaData(key: Hex): Promise<EntityMetaData> {
      return client.httpClient.getEntityMetaData(key)
    },

    async getEntitiesToExpireAtBlock(blockNumber: bigint): Promise<Hex[]> {
      return client.httpClient.getEntitiesToExpireAtBlock(blockNumber)
    },

    async getEntityCount(): Promise<number> {
      return client.httpClient.getEntityCount()
    },

    async getAllEntityKeys(): Promise<Hex[]> {
      return client.httpClient.getAllEntityKeys()
    },

    async getEntitiesOfOwner(address: Hex): Promise<Hex[]> {
      return client.httpClient.getEntitiesOfOwner(address)
    },

    async queryEntities(query: string): Promise<{ entityKey: Hex, storageValue: Uint8Array }[]> {
      return (await client.httpClient.queryEntities(query)).map(res => ({
        entityKey: res.key,
        storageValue: res.value,
      }))
    },

    watchLogs(args: {
      fromBlock: bigint,
      onCreated: (args: { entityKey: Hex, expirationBlock: number, }) => void,
      onUpdated: (args: { entityKey: Hex, expirationBlock: number, }) => void,
      onExtended: (args: { entityKey: Hex, oldExpirationBlock: number, newExpirationBlock: number, }) => void,
      onDeleted: (args: { entityKey: Hex, }) => void,
      onError?: (error: Error) => void,
      pollingInterval?: number,
      transport?: `http` | `websocket`
    }): () => void {
      let c
      if (args.transport === "http") {
        c = client.httpClient
      } else {
        c = client.wsClient
      }

      const unsubscribe = c.watchEvent({
        address: internal.storageAddress,
        fromBlock: args.fromBlock,
        events: golemBaseABI,
        onLogs: logs => {
          log.debug("watchLogs, got logs: ", logs)
          const {
            createEntitiesReceipts,
            updateEntitiesReceipts,
            deleteEntitiesReceipts,
            extendEntitiesReceipts,
          } = parseTransactionLogs(log, logs)

          createEntitiesReceipts.forEach(args.onCreated)
          updateEntitiesReceipts.forEach(args.onUpdated)
          deleteEntitiesReceipts.forEach(args.onDeleted)
          extendEntitiesReceipts.forEach(args.onExtended)
        },
        onError: args.onError,
        pollingInterval: args.pollingInterval,
      })

      return unsubscribe
    }
  }
}

/**
 * Creates a read-only client for querying a golem-base op-geth node.
 *
 * This client can fetch metadata, search for keys, and inspect the current state, but cannot write to the blockchain.
 *
 * @param chainId The chain ID of the Ethereum-compatible network.
 * @param rpcUrl The HTTP endpoint for RPC requests.
 * @param wsUrl The WebSocket endpoint for listening to events.
 * @param logger A logger instance. Defaults to a silent logger if omitted.
 * @returns An instance of GolemBaseROClient.
 */
export function createROClient(
  chainId: number,
  rpcUrl: string,
  wsUrl: string,
  logger: Logger<ILogObj> = new Logger<ILogObj>({
    type: "hidden",
    hideLogPositionForProduction: true,
  })
): GolemBaseROClient {
  const iClient = internal.createROClient(chainId, rpcUrl, wsUrl, logger)
  const baseClient = createGenericClient(iClient, logger)

  return {
    ...baseClient,
    getRawClient(): internal.GolemBaseROClient {
      return iClient
    },
  }
}

/**
 * Creates a read-write client for a golem-base op-geth node. 
 * This client supports all available operations, including writing
 * new entities and fetching metadata.
 * @param chainId The numeric chain ID of the Ethereum-compatible network you're connecting to.
 * @param accountData An object containing the private key or account credentials for signing transactions.
 * @param rpcUrl The HTTP endpoint of the golem-base op-geth node.
 * @param wsUrl The WebSocket endpoint of the same node, used for event listening or subscriptions.
 * @param logger A pino-like logger instance for structured logs. Defaults to a minimal hidden logger if not provided.
 *
 * @returns A Promise that resolves to a GolemBaseClient instance.
 */
export async function createClient(
  chainId: number,
  accountData: AccountData,
  rpcUrl: string,
  wsUrl: string,
  logger: Logger<ILogObj> = new Logger<ILogObj>({
    type: "hidden",
    hideLogPositionForProduction: true,
  })
): Promise<GolemBaseClient> {

  const iClient = await internal.createClient(chainId, accountData, rpcUrl, wsUrl, logger)
  const baseClient = createGenericClient(iClient, logger)

  const log = logger.getSubLogger({ name: "client" })

  return {
    ...baseClient,

    getRawClient() {
      return iClient
    },

    async getOwnerAddress(): Promise<Hex> {
      return (await iClient.walletClient.getAddresses())[0]
    },

    async sendTransaction(
      this: GolemBaseClient,
      creates: GolemBaseCreate[] = [],
      updates: GolemBaseUpdate[] = [],
      deletes: Hex[] = [],
      extensions: GolemBaseExtend[] = [],
      args: {
        txHashCallback?: (txHash: Hex) => void,
        gas?: bigint,
        maxFeePerGas?: bigint,
        maxPriorityFeePerGas?: bigint,
      } = {},
    ): Promise<{
      createEntitiesReceipts: CreateEntityReceipt[],
      updateEntitiesReceipts: UpdateEntityReceipt[],
      deleteEntitiesReceipts: DeleteEntityReceipt[],
      extendEntitiesReceipts: ExtendEntityReceipt[],
    }> {
      const receipt = await iClient.walletClient.sendGolemBaseTransactionAndWaitForReceipt(
        creates, updates, deletes, extensions, args
      )
      log.debug("Got receipt:", receipt)

      const out = parseTransactionLogs(log, receipt.logs)
      log.debug("parsed transaction log:", out)
      return out
    },

    async createEntities(
      this: GolemBaseClient,
      creates: GolemBaseCreate[],
      args: {
        txHashCallback?: (txHash: Hex) => void,
        gas?: bigint,
        maxFeePerGas?: bigint,
        maxPriorityFeePerGas?: bigint,
      } = {},
    ): Promise<CreateEntityReceipt[]> {
      return (await this.sendTransaction(
        creates, [], [], [], args
      )).createEntitiesReceipts
    },

    async updateEntities(
      this: GolemBaseClient,
      updates: GolemBaseUpdate[],
      args: {
        txHashCallback?: (txHash: Hex) => void,
        gas?: bigint,
        maxFeePerGas?: bigint,
        maxPriorityFeePerGas?: bigint,
      } = {},
    ): Promise<UpdateEntityReceipt[]> {
      return (await this.sendTransaction(
        [], updates, [], [], args
      )).updateEntitiesReceipts
    },

    async deleteEntities(
      this: GolemBaseClient,
      deletes: Hex[],
      args: {
        txHashCallback?: (txHash: Hex) => void,
        gas?: bigint,
        maxFeePerGas?: bigint,
        maxPriorityFeePerGas?: bigint,
      } = {},
    ): Promise<DeleteEntityReceipt[]> {
      return (await this.sendTransaction(
        [], [], deletes, [], args
      )).deleteEntitiesReceipts
    },

    async extendEntities(
      this: GolemBaseClient,
      extensions: GolemBaseExtend[],
      args: {
        txHashCallback?: (txHash: Hex) => void,
        gas?: bigint,
        maxFeePerGas?: bigint,
        maxPriorityFeePerGas?: bigint,
      } = {},
    ): Promise<ExtendEntityReceipt[]> {
      return (await this.sendTransaction(
        [], [], [], extensions, args
      )).extendEntitiesReceipts
    },
  }
}
