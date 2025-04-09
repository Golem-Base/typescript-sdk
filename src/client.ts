import * as internalClient from "./internal/client"
import { ILogObj, Logger } from "tslog";

import {
  type Hex,
  type GolemBaseCreate,
  type GolemBaseUpdate,
  EntityMetaData,
} from "./index"

export interface GolemBaseClient {
  // TODO: can we give this a better type? Something purely structural?
  getRawClient(): any

  getOwnerAddress(): Promise<Hex>
  getEntityCount(): Promise<number>
  getAllEntityKeys(): Promise<Hex[]>

  getEntitiesOfOwner(address: Hex): Promise<Hex[]>
  getStorageValue(key: Hex): Promise<any>

  queryEntities(query: string): Promise<[{ key: Hex, value: string }]>
  getEntitiesForStringAnnotationValue(key: string, value: string): Promise<Hex[]>
  getEntitiesForNumericAnnotationValue(key: string, value: number): Promise<Hex[]>
  getEntitiesToExpireAtBlock(blockNumber: bigint): Promise<Hex[]>

  getEntityMetaData(key: Hex): Promise<EntityMetaData>

  createEntities(creates: GolemBaseCreate[]): Promise<
    {
      expirationBlock: number,
      entityKey: Hex,
    }[]
  >
  updateEntities(updates: GolemBaseUpdate[]): Promise<
    {
      expirationBlock: number,
      entityKey: Hex,
    }[]
  >
  deleteEntities(deletes: Hex[]): Promise<{ entityKey: Hex }[]>
}

/**
 * Create a client to interact with GolemBase
 * @param {Buffer} key - Private key for this client
 * @param {string} rpcUrl - JSON-RPC URL to talk to
 * @param {Logger<ILogObj>} log - Optional logger instance to use for logging
 *
 * @returns A client object
 */
export function createClient(key: Buffer, rpcUrl: string, log: Logger<ILogObj> = new Logger<ILogObj>({
  type: "hidden",
  hideLogPositionForProduction: true,
})): GolemBaseClient {

  const client = internalClient.createClient(key, rpcUrl, log)

  return {
    getRawClient() {
      return client
    },

    /**
     * Get the storage value associated with the given entity key
     */
    async getStorageValue(key: Hex): Promise<any> {
      return client.getStorageValue(key)
    },

    async getOwnerAddress(): Promise<Hex> {
      return (await client.getAddresses())[0]
    },

    /**
     * Get the full entity information
     */
    async getEntityMetaData(key: Hex): Promise<EntityMetaData> {
      return client.getEntityMetaData(key)
    },

    ///**
    // * Get all entity keys for entities that will expire at the given block number
    // */
    async getEntitiesToExpireAtBlock(blockNumber: bigint): Promise<Hex[]> {
      return client.getEntitiesToExpireAtBlock(blockNumber)
    },

    async getEntitiesForStringAnnotationValue(key: string, value: string): Promise<Hex[]> {
      return client.getEntitiesForStringAnnotationValue({ key, value })
    },

    async getEntitiesForNumericAnnotationValue(key: string, value: number): Promise<Hex[]> {
      return client.getEntitiesForNumericAnnotationValue({ key, value })
    },

    async getEntityCount(): Promise<number> {
      return client.getEntityCount()
    },

    async getAllEntityKeys(): Promise<Hex[]> {
      return client.getAllEntityKeys()
    },

    async getEntitiesOfOwner(address: Hex): Promise<Hex[]> {
      return client.getEntitiesOfOwner(address)
    },

    async queryEntities(query: string): Promise<[{ key: Hex, value: string }]> {
      return client.queryEntities(query)
    },

    async createEntities(creates: GolemBaseCreate[]): Promise<
      {
        expirationBlock: number,
        entityKey: Hex,
      }[]
    > {
      const receipt = await client.createEntitiesAndWaitForReceipt(creates)
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
      const receipt = await client.updateEntitiesAndWaitForReceipt(updates)
      log.debug("Got receipt:", receipt)
      return receipt.logs.map(txlog => ({
        expirationBlock: parseInt(txlog.data),
        entityKey: txlog.topics[1] as Hex
      }))
    },

    async deleteEntities(deletes: Hex[]): Promise<{ entityKey: Hex }[]> {
      const receipt = await client.deleteEntitiesAndWaitForReceipt(deletes)
      log.info("Got receipt:", receipt)
      return receipt.logs.map(txlog => ({
        entityKey: txlog.topics[1] as Hex
      }))
    },
  }
}
