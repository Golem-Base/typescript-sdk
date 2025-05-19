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
  golemBaseStorageEntityCreatedSignature,
  golemBaseStorageEntityBTLExtendedSignature,
  golemBaseStorageEntityDeletedSignature,
  golemBaseStorageEntityUpdatedSignature,
} from "."
import {
  decodeEventLog,
  Log,
  pad,
  toHex
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

export interface GolemBaseClient {
  /**
   * Get the raw viem.sh ethereum client, which allows to call low-level ethereum
   * methods directly
   *
   * @returns - A client object
   */
  getRawClient(): internal.GolemBaseClient

  /**
   * Get the ethereum address of the owner of the ethereum account used by this client
   */
  getOwnerAddress(): Promise<Hex>

  /**
   * Get the total count of entities in GolemBase
   */
  getEntityCount(): Promise<number>

  /**
   * Get the entity keys of all entities in GolemBase
   */
  getAllEntityKeys(): Promise<Hex[]>

  /**
   * Get the entity keys of all entities in GolemBase owned by the given address
   *
   * @returns Array of the entity keys
   */
  getEntitiesOfOwner(address: Hex): Promise<Hex[]>

  /**
   * Get the storage value associated with the given entity key
   *
   * @param {Hex} key - The key of the entity to look up
   *
   * @returns The base64-encoded value stored in the entity
   */
  getStorageValue(key: Hex): Promise<Uint8Array>

  /**
   * Query entities in GolemBase based on annotations
   *
   * @param query - The query to look up entities with
   *
   * @returns Array of the entities that matched the query
   */
  queryEntities(query: string): Promise<{ entityKey: Hex, storageValue: Uint8Array }[]>

  /**
   * Get all entity keys for entities that will expire at the given block number
   *
   * @param blockNumber - The block number
   *
   * @returns An array of entities that expire at the given block
   */
  getEntitiesToExpireAtBlock(blockNumber: bigint): Promise<Hex[]>

  /**
   * Get entity metadata
   *
   * @param {Hex} key - The key of the entity to look up
   *
   * @returns The entity's metadata
   */
  getEntityMetaData(key: Hex): Promise<EntityMetaData>

  sendTransaction(
    creates?: GolemBaseCreate[],
    updates?: GolemBaseUpdate[],
    deletes?: Hex[],
    extensions?: GolemBaseExtend[]
  ): Promise<{
    createEntitiesReceipts: CreateEntityReceipt[],
    updateEntitiesReceipts: UpdateEntityReceipt[],
    deleteEntitiesReceipts: DeleteEntityReceipt[],
    extendEntitiesReceipts: ExtendEntityReceipt[],
  }>

  /**
   * Create one or more new entities in GolemBase
   *
   * @param creates - The entities to create
   *
   * @return An array of the entity keys of the entities that were created,
   *         together with the number of the block at which they will expire
   */
  createEntities(creates: GolemBaseCreate[]): Promise<CreateEntityReceipt[]>

  /**
   * Update one or more new entities in GolemBase
   *
   * @param updates - The entities to update
   *
   * @return An array of the entity keys of the entities that were updated,
   *         together with the number of the block at which they will expire
   */
  updateEntities(updates: GolemBaseUpdate[]): Promise<UpdateEntityReceipt[]>

  /**
   * Delete one or more new entities in GolemBase
   *
   * @param deletes - The entity keys of the entities to delete
   *
   * @return An array of the entity keys of the entities that were deleted
   */
  deleteEntities(deletes: Hex[]): Promise<DeleteEntityReceipt[]>

  /**
   * Extend the BTL of one or more new entities in GolemBase
   *
   * @param extensions - The entities to extend the BTL of
   *
   * @return An array of the entity keys of the entities that had their BTL extended,
   *         together with the numbers of the old and the new block at which the
   *         entities expire
   */
  extendEntities(extensions: GolemBaseExtend[]): Promise<ExtendEntityReceipt[]>

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
 * Create a client to interact with GolemBase
 * @param chainId - The ID of the chain you are connecting to
 * @param accountData - Either a private key or a wallet provider for the user's account
 * @param rpcUrl - JSON-RPC URL to talk to
 * @param wsUrl - WebSocket URL to talk to
 * @param logger - Optional logger instance to use for logging
 *
 * @returns A client object
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

  const log = logger.getSubLogger({ name: "client" });

  const client = await internal.createClient(chainId, accountData, rpcUrl, wsUrl, log)

  log.debug(
    "Calculated the following event signatures:",
    "create",
    golemBaseStorageEntityCreatedSignature,
    "update",
    golemBaseStorageEntityUpdatedSignature,
    "delete",
    golemBaseStorageEntityDeletedSignature,
    "extend",
    golemBaseStorageEntityBTLExtendedSignature,
  )

  function parseTransactionLogs(logs: Log<bigint, number, false>[]): {
    createEntitiesReceipts: CreateEntityReceipt[],
    updateEntitiesReceipts: UpdateEntityReceipt[],
    deleteEntitiesReceipts: DeleteEntityReceipt[],
    extendEntitiesReceipts: ExtendEntityReceipt[],
  } {
    return logs.reduce((receipts, txlog) => {
      const parsed = decodeEventLog({
        abi: golemBaseABI,
        // The call to pad here is needed when running in the browser, but somehow
        // not when running in node...
        // Our geth node seems to correctly return a uint256.
        // There is a test in viem that tests the transaction receipt handling
        // and asserts that the data field is 32 bytes, so probably this is a bug
        // in the implementation of some function in the browser.
        data: pad(txlog.data),
        topics: txlog.topics
      })
      switch (parsed.eventName) {
        case "GolemBaseStorageEntityCreated": {
          return {
            ...receipts,
            createEntitiesReceipts: receipts.createEntitiesReceipts.concat([{
              entityKey: toHex(parsed.args.entityKey),
              expirationBlock: Number(parsed.args.expirationBlock),
            }]),
          }
        }
        case "GolemBaseStorageEntityUpdated": {
          return {
            ...receipts,
            updateEntitiesReceipts: receipts.updateEntitiesReceipts.concat([{
              entityKey: toHex(parsed.args.entityKey),
              expirationBlock: Number(parsed.args.expirationBlock),
            }]),
          }
        }
        case "GolemBaseStorageEntityBTLExtended": {
          return {
            ...receipts,
            extendEntitiesReceipts: receipts.extendEntitiesReceipts.concat([{
              entityKey: toHex(parsed.args.entityKey),
              newExpirationBlock: Number(parsed.args.newExpirationBlock),
              oldExpirationBlock: Number(parsed.args.oldExpirationBlock),
            }]),
          }
        }
        case "GolemBaseStorageEntityDeleted": {
          return {
            ...receipts,
            deleteEntitiesReceipts: receipts.deleteEntitiesReceipts.concat([{
              entityKey: toHex(parsed.args.entityKey),
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

  return {
    getRawClient() {
      return client
    },

    async getStorageValue(key: Hex): Promise<Uint8Array> {
      return client.httpClient.getStorageValue(key)
    },

    async getOwnerAddress(): Promise<Hex> {
      return (await client.walletClient.getAddresses())[0]
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

    async sendTransaction(
      creates: GolemBaseCreate[] = [],
      updates: GolemBaseUpdate[] = [],
      deletes: Hex[] = [],
      extensions: GolemBaseExtend[] = [],
    ): Promise<{
      createEntitiesReceipts: CreateEntityReceipt[],
      updateEntitiesReceipts: UpdateEntityReceipt[],
      deleteEntitiesReceipts: DeleteEntityReceipt[],
      extendEntitiesReceipts: ExtendEntityReceipt[],
    }> {
      const receipt = await client.walletClient.sendGolemBaseTransactionAndWaitForReceipt(
        creates, updates, deletes, extensions
      )
      log.debug("Got receipt:", receipt)
      return parseTransactionLogs(receipt.logs)
    },

    async createEntities(
      this: GolemBaseClient,
      creates: GolemBaseCreate[]
    ): Promise<CreateEntityReceipt[]> {
      return (await this.sendTransaction(
        creates
      )).createEntitiesReceipts
    },

    async updateEntities(
      this: GolemBaseClient,
      updates: GolemBaseUpdate[]
    ): Promise<UpdateEntityReceipt[]> {
      return (await this.sendTransaction(
        [],
        updates
      )).updateEntitiesReceipts
    },

    async deleteEntities(
      this: GolemBaseClient,
      deletes: Hex[]
    ): Promise<DeleteEntityReceipt[]> {
      return (await this.sendTransaction(
        [],
        [],
        deletes,
      )).deleteEntitiesReceipts
    },

    async extendEntities(
      this: GolemBaseClient,
      extensions: GolemBaseExtend[]
    ): Promise<ExtendEntityReceipt[]> {
      return (await this.sendTransaction(
        [],
        [],
        [],
        extensions,
      )).extendEntitiesReceipts
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
          } = parseTransactionLogs(logs)

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
