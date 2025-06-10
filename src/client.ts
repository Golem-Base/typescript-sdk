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
   * @param key - The key of the entity to look up
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
   * @param key - The key of the entity to look up
   *
   * @returns The entity's metadata
   */
  getEntityMetaData(key: Hex): Promise<EntityMetaData>

  /**
   * @param creates - The list of create operations to include in this transaction
   * @param updates - The list of update operations to include in this transaction
   * @param deletes - The list of delete operations to include in this transaction
   * @param extensions - The list of extend operations to include in this transaction
   * @param args.txHashCallback - Callback to invoke with the transaction hash of the transaction
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
   * Create one or more new entities in GolemBase
   *
   * @param creates - The entities to create
   * @param args - Optional parameters, see {@link sendTransaction}
   *
   * @return An array of the entity keys of the entities that were created,
   *         together with the number of the block at which they will expire
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
   * Update one or more new entities in GolemBase
   *
   * @param updates - The entities to update
   * @param args - Optional parameters, see {@link sendTransaction}
   *
   * @return An array of the entity keys of the entities that were updated,
   *         together with the number of the block at which they will expire
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
   * Delete one or more new entities in GolemBase
   *
   * @param deletes - The entity keys of the entities to delete
   * @param args - Optional parameters, see {@link sendTransaction}
   *
   * @return An array of the entity keys of the entities that were deleted
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
   * Extend the BTL of one or more new entities in GolemBase
   *
   * @param extensions - The entities to extend the BTL of
   * @param args - Optional parameters, see {@link sendTransaction}
   *
   * @return An array of the entity keys of the entities that had their BTL extended,
   *         together with the numbers of the old and the new block at which the
   *         entities expire
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

  for (let value of golemBaseABI) {
    log.debug("Calculated the following event signature:", value.name, "->", toEventHash(value))
  }

  function parseTransactionLogs(logs: Log<bigint, number, false>[]): {
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
        // Old ABI event that has a typo in the name and a missing non-indexed argument
        case "GolemBaseStorageEntityBTLExptended":
        // Old ABI before renme of TTL -> BTL
        case "GolemBaseStorageEntityTTLExptended": {
          // We need to manually parse the data in this case, since one argument is missing from the signature
          function parseExtendTTLData(data: Hex): { oldExpirationBlock: bigint, newExpirationBlock: bigint, } {
            // Take the first 64 bytes by masking the rest (shift 1 to the left 256 positions, then negate the number)
            // Example:
            // 0x 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 012f
            //    0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0143
            // mask this with 0x 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000
            //                   1111 1111 1111 1111 1111 1111 1111 1111 1111 1111 1111 1111 1111 1111 1111 1111
            // to obtain 0x143
            // and then shift the original number to the right by 256 to obtain 0x12f
            const dataParsed = BigInt(data)
            const newExpirationBlock = dataParsed & ((1n << 256n) - 1n)
            const oldExpirationBlock = dataParsed >> 256n
            return {
              oldExpirationBlock,
              newExpirationBlock,
            }
          }
          const expirationBlocks = parseExtendTTLData(txlog.data)
          return {
            ...receipts,
            extendEntitiesReceipts: receipts.extendEntitiesReceipts.concat([{
              entityKey: toHex(parsed.args.entityKey),
              newExpirationBlock: Number(expirationBlocks.newExpirationBlock),
              oldExpirationBlock: Number(expirationBlocks.oldExpirationBlock),
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
      const receipt = await client.walletClient.sendGolemBaseTransactionAndWaitForReceipt(
        creates, updates, deletes, extensions, args
      )
      log.debug("Got receipt:", receipt)

      const out = parseTransactionLogs(receipt.logs)
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
