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
} from ".."

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

  /**
   * Create one or more new entities in GolemBase
   *
   * @param creates - The entities to create
   *
   * @return An array of the entity keys of the entities that were created,
   *         together with the number of the block at which they will expire
   */
  createEntities(creates: GolemBaseCreate[]): Promise<
    {
      entityKey: Hex,
      expirationBlock: number,
    }[]
  >

  /**
   * Update one or more new entities in GolemBase
   *
   * @param updates - The entities to update
   *
   * @return An array of the entity keys of the entities that were updated,
   *         together with the number of the block at which they will expire
   */
  updateEntities(updates: GolemBaseUpdate[]): Promise<
    {
      entityKey: Hex,
      expirationBlock: number,
    }[]
  >

  /**
   * Delete one or more new entities in GolemBase
   *
   * @param deletes - The entity keys of the entities to delete
   *
   * @return An array of the entity keys of the entities that were deleted
   */
  deleteEntities(deletes: Hex[]): Promise<{ entityKey: Hex }[]>

  /**
   * Extend the TTL of one or more new entities in GolemBase
   *
   * @param extensions - The entities to extend the TTL of
   *
   * @return An array of the entity keys of the entities that had their TTL extended,
   *         together with the numbers of the old and the new block at which the
   *         entities expire
   */
  extendEntities(extensions: GolemBaseExtend[]): Promise<{
    entityKey: Hex,
    oldExpirationBlock: bigint,
    newExpirationBlock: bigint,
  }[]>

  /**
   * Install callbacks that will be invoked for every GolemBase transaction
   *
   * @param args.fromBlock - The starting block, events trigger the callbacks starting from this block
   * @param args.onCreated - A callback that's invoked whenever entities are created
   * @param args.onUpdated - A callback that's invoked whenever entitier are updated
   * @param args.onExtended - A callback that's invoked whenever entities have their TTL extended
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
    onExtended: (args: { entityKey: Hex, oldExpirationBlock: bigint, newExpirationBlock: bigint, }) => void,
    onDeleted: (args: { entityKey: Hex, }) => void,
    onError?: ((error: Error) => void) | undefined,
    pollingInterval?: number,
    transport?: `http` | `websocket`
  }): () => void
}

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

/**
 * Create a client to interact with GolemBase
 * @param accountData - Either a private key or a wallet provider for the user's account
 * @param rpcUrl - JSON-RPC URL to talk to
 * @param wsUrl - WebSocket URL to talk to
 * @param logger - Optional logger instance to use for logging
 *
 * @returns A client object
 */
export async function createClient(
  accountData: AccountData,
  rpcUrl: string,
  wsUrl: string,
  logger: Logger<ILogObj> = new Logger<ILogObj>({
    type: "hidden",
    hideLogPositionForProduction: true,
  })
): Promise<GolemBaseClient> {

  const log = logger.getSubLogger({ name: "client" });

  const client = await internal.createClient(accountData, rpcUrl, wsUrl, log)

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

    async createEntities(creates: GolemBaseCreate[]): Promise<
      {
        expirationBlock: number,
        entityKey: Hex,
      }[]
    > {
      const receipt = await client.walletClient.createEntitiesAndWaitForReceipt(creates)
      log.debug("Got receipt:", receipt)
      return receipt.logs.map(txlog => ({
        expirationBlock: parseInt(txlog.data),
        entityKey: txlog.topics[1] as Hex
      }))
    },

    async updateEntities(updates: GolemBaseUpdate[]): Promise<
      {
        expirationBlock: number,
        entityKey: Hex,
      }[]
    > {
      const receipt = await client.walletClient.updateEntitiesAndWaitForReceipt(updates)
      log.debug("Got receipt:", receipt)
      return receipt.logs.map(txlog => ({
        expirationBlock: parseInt(txlog.data),
        entityKey: txlog.topics[1] as Hex
      }))
    },

    async deleteEntities(deletes: Hex[]): Promise<{ entityKey: Hex }[]> {
      const receipt = await client.walletClient.deleteEntitiesAndWaitForReceipt(deletes)
      log.debug("Got receipt:", receipt)
      return receipt.logs.map(txlog => ({
        entityKey: txlog.topics[1] as Hex
      }))
    },

    async extendEntities(extensions: GolemBaseExtend[]): Promise<{
      oldExpirationBlock: bigint,
      newExpirationBlock: bigint,
      entityKey: Hex
    }[]> {
      const receipt = await client.walletClient.extendEntitiesAndWaitForReceipt(extensions)
      log.debug("Got receipt:", receipt)
      return receipt.logs.map(txlog => {
        const { oldExpirationBlock, newExpirationBlock, } = parseExtendTTLData(txlog.data)
        return {
          oldExpirationBlock,
          newExpirationBlock,
          entityKey: txlog.topics[1] as Hex,
        }
      })
    },

    watchLogs(args: {
      fromBlock: bigint,
      onCreated: (args: { entityKey: Hex, expirationBlock: number, }) => void,
      onUpdated: (args: { entityKey: Hex, expirationBlock: number, }) => void,
      onExtended: (args: { entityKey: Hex, oldExpirationBlock: bigint, newExpirationBlock: bigint, }) => void,
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
        onLogs: logs => {
          log.debug("watchLogs, got logs: ", logs)
          logs.forEach(l => {
            switch (l.topics[0]) {
              case "0xce4b4ad6891d716d0b1fba2b4aeb05ec20edadb01df512263d0dde423736bbb9": {
                // Create
                const entityKey = l.topics[1]
                const expirationBlock = parseInt(l.data)
                if (entityKey && expirationBlock) {
                  args.onCreated({ entityKey, expirationBlock, })
                }
                break
              }
              case "0xf371f40aa6932ad9dacbee236e5f3b93d478afe3934b5cfec5ea0d800a41d165": {
                // Update
                const entityKey = l.topics[1]
                const expirationBlock = parseInt(l.data)
                if (entityKey && expirationBlock) {
                  args.onUpdated({ entityKey, expirationBlock, })
                }
                break
              }
              case "0x49f78ff301f2020db26cdf781a7e801d1015e0b851fe4117c7740837ed6724e9": {
                // Extend
                const entityKey = l.topics[1]
                const { oldExpirationBlock, newExpirationBlock, } = parseExtendTTLData(l.data)
                if (entityKey) {
                  args.onExtended({ entityKey, oldExpirationBlock, newExpirationBlock, })
                }
                break
              }
              case "0x0297b0e6eaf1bc2289906a8123b8ff5b19e568a60d002d47df44f8294422af93": {
                // Delete
                const entityKey = l.topics[1]
                if (entityKey) {
                  args.onDeleted({ entityKey, })
                }
                break
              }
            }
          })
        },
        onError: args.onError,
        pollingInterval: args.pollingInterval,
      })

      return unsubscribe
    }
  }
}
