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

export type CreateEntityReceipt = {
  entityKey: Hex,
  expirationBlock: number,
}

export type UpdateEntityReceipt = {
  entityKey: Hex,
  expirationBlock: number,
}

export type DeleteEntityReceipt = {
  entityKey: Hex
}

export type ExtendEntityReceipt = {
  entityKey: Hex,
  oldExpirationBlock: number,
  newExpirationBlock: number,
}

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

export interface GolemBaseROClient extends GenericClient<internal.GolemBaseROClient> { }

/**
 * The GolemBaseClient interface provides read-write access to a golem-base op-geth node.
 *
 * It allows you to query entities, fetch metadata, subscribe to events, and interact with annotations as well as create, update, delete, and extend entities.
 * This interface extends the GolemBaseROClient interface, inheriting all its read-only methods.
 */
export interface GolemBaseClient extends GenericClient<internal.GolemBaseClient> {
   /**
   * Get the Ethereum address of the account this client is authenticated with.
   * @returns A promise that resolves to the address as a Hex string.
   */

  getOwnerAddress(): Promise<Hex>

  /**
   * Submits a single transaction that may contain any combination of creates, updates, deletes, or extensions.
   * @param creates - The list of create operations to include in this transaction
   * @param updates - The list of update operations to include in this transaction
   * @param deletes - The list of delete operations to include in this transaction
   * @param extensions - The list of extend operations to include in this transaction
   * @param args - Optional config object for the transaction.
   * @param args.txHashCallback - Callback to invoke with the transaction hash of the transaction
   * @param args.gas - Override the gas limit.
   * @param args.maxFeePerGas - Sets the max fee per gas manually
   * @param args.maxPriorityFeePerGas - Sets the max priority fee per gas manually
   * @returns A promise that resolves to an object with arrays of receipts for each type of operation.
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
   * Creates one or more new entities on the node.
   * @param creates The entities to create.
   * @param Optional configuration object, with the same structure as the `sendTransaction` method.
   * @returns A promise that resolves to an array of `CreateEntityReceipt` objects, each including the new entity key and its expiration block.
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
   * Updates one or more entities on the node.
   * @param updates The entities to update.
   * @param Optional configuration object, with the same structure as the `sendTransaction` method.
   * @returns A promise that resolves to an array of `UpdateEntityReceipt` objects, each including the entity key and its new expiration block.
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
   * Deletes one or more entities from the node.
   * @param deletes The entity keys to delete.
   * @param Optional configuration object, with the same structure as the `sendTransaction` method.
   * @returns A promise that resolves to an array of `DeleteEntityReceipt` objects (usually just the deleted keys).
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
   * Extends the BTL (Block-To-Live) of one or more entities.
   * @param {GolemBaseExtend[]} extensions The entities and new blocks to live.
   * @param {object} [args] Optional configuration object, with the same structure as the `sendTransaction` method.
   * @returns {Promise<ExtendEntityReceipt[]>} An array of `ExtendEntityReceipt` objects, each showing the old and new expiration blocks.
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
 * @returns {Promise<GolemBaseClient>} A Promise that resolves to a GolemBaseClient instance.
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
