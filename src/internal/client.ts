import {
  createWalletClient,
  defineChain,
  http,
  webSocket,
  publicActions,
  toHex,
  checksumAddress,
  type TransactionReceipt,
  type Account,
  type Chain,
  type Client,
  type PublicActions,
  type RpcSchema,
  type Transport,
  type WalletActions,
  type HttpTransport,
  type WebSocketTransport,
  createPublicClient,
  parseGwei,
  formatGwei,
} from 'viem'
import {
  privateKeyToAccount,
  nonceManager,
} from 'viem/accounts'
import RLP from '../rlp'
import {
  type ILogObj,
  Logger,
} from "tslog";

import {
  type Hex,
  type GolemBaseCreate,
  type GolemBaseUpdate,
  type GolemBaseTransaction,
  type EntityMetaData,
  type GolemBaseExtend,
  StringAnnotation,
  NumericAnnotation,
} from "../.."

export { checksumAddress, toHex, TransactionReceipt }

export const storageAddress = '0x0000000000000000000000000000000060138453'

type GolemGetStorageValueInputParams = Hex
export type GolemGetStorageValueReturnType = string
type GolemGetStorageValueSchema = {
  Method: 'golembase_getStorageValue'
  Parameters: [GolemGetStorageValueInputParams]
  ReturnType: GolemGetStorageValueReturnType
}

type GolemGetEntityMetaDataInputParams = Hex
export type GolemGetEntityMetaDataReturnType = EntityMetaData
type GolemGetEntityMetaDataSchema = {
  Method: 'golembase_getEntityMetaData'
  Parameters: [GolemGetEntityMetaDataInputParams]
  ReturnType: GolemGetEntityMetaDataReturnType
}

type GolemGetEntitiesToExpireAtBlockInputParams = number
export type GolemGetEntitiesToExpireAtBlockReturnType = Hex[]
type GolemGetEntitiesToExpireAtBlockSchema = {
  Method: 'golembase_getEntitiesToExpireAtBlock'
  Parameters: [GolemGetEntitiesToExpireAtBlockInputParams]
  ReturnType: GolemGetEntitiesToExpireAtBlockReturnType
}

type GolemGetEntitiesForStringAnnotationValueInputParams = [string, string]
export type GolemGetEntitiesForStringAnnotationValueReturnType = Hex[]
type GolemGetEntitiesForStringAnnotationValueSchema = {
  Method: 'golembase_getEntitiesForStringAnnotationValue'
  Parameters: GolemGetEntitiesForStringAnnotationValueInputParams
  ReturnType: GolemGetEntitiesForStringAnnotationValueReturnType
}

type GolemGetEntitiesForNumericAnnotationValueInputParams = [string, number]
export type GolemGetEntitiesForNumericAnnotationValueReturnType = Hex[]
type GolemGetEntitiesForNumericAnnotationValueSchema = {
  Method: 'golembase_getEntitiesForNumericAnnotationValue'
  Parameters: GolemGetEntitiesForNumericAnnotationValueInputParams
  ReturnType: GolemGetEntitiesForNumericAnnotationValueReturnType
}

export type GolemGetEntityCountReturnType = number
type GolemGetEntityCountSchema = {
  Method: 'golembase_getEntityCount'
  Parameters: []
  ReturnType: GolemGetEntityCountReturnType
}

export type GolemGetAllEntityKeysReturnType = Hex[]
type GolemGetAllEntityKeysSchema = {
  Method: 'golembase_getAllEntityKeys'
  Parameters: []
  ReturnType: GolemGetAllEntityKeysReturnType
}

type GolemGetEntitiesOfOwnerInputParams = Hex
export type GolemGetEntitiesOfOwnerReturnType = Hex[]
type GolemGetEntitiesOfOwnerSchema = {
  Method: 'golembase_getEntitiesOfOwner'
  Parameters: [GolemGetEntitiesOfOwnerInputParams]
  ReturnType: GolemGetEntitiesOfOwnerReturnType
}

type GolemQueryEntitiesInputParams = string
export type GolemQueryEntitiesReturnType = { key: Hex, value: string }
type GolemQueryEntitiesSchema = {
  Method: 'golembase_queryEntities'
  Parameters: [GolemQueryEntitiesInputParams]
  ReturnType: [GolemQueryEntitiesReturnType]
}

export type GolemBaseActions = {
  getStorageValue(args: GolemGetStorageValueInputParams): Promise<GolemGetStorageValueReturnType>
  getEntityMetaData(args: GolemGetEntityMetaDataInputParams): Promise<GolemGetEntityMetaDataReturnType>
  /**
   * Get all entity keys for entities that will expire at the given block number
   */
  getEntitiesToExpireAtBlock(blockNumber: bigint): Promise<GolemGetEntitiesToExpireAtBlockReturnType>
  getEntitiesForStringAnnotationValue(annotation: StringAnnotation): Promise<GolemGetEntitiesForStringAnnotationValueReturnType>
  getEntitiesForNumericAnnotationValue(annotation: NumericAnnotation): Promise<GolemGetEntitiesForNumericAnnotationValueReturnType>
  getEntityCount(): Promise<GolemGetEntityCountReturnType>
  getAllEntityKeys(): Promise<GolemGetAllEntityKeysReturnType>
  getEntitiesOfOwner(args: GolemGetEntitiesOfOwnerInputParams): Promise<GolemGetEntitiesOfOwnerReturnType>
  queryEntities(args: GolemQueryEntitiesInputParams): Promise<GolemQueryEntitiesReturnType[]>

  createRawStorageTransaction(payload: Hex): Promise<Hex>

  createEntities(creates: GolemBaseCreate[]): Promise<Hex>
  createEntitiesAndWaitForReceipt(creates: GolemBaseCreate[]): Promise<TransactionReceipt>
  updateEntities(updates: GolemBaseUpdate[]): Promise<Hex>
  updateEntitiesAndWaitForReceipt(updates: GolemBaseUpdate[]): Promise<TransactionReceipt>
  deleteEntities(deletes: Hex[]): Promise<Hex>
  deleteEntitiesAndWaitForReceipt(deletes: Hex[]): Promise<TransactionReceipt>
  extendEntities(extensions: GolemBaseExtend[]): Promise<Hex>
  extendEntitiesAndWaitForReceipt(extensions: GolemBaseExtend[]): Promise<TransactionReceipt>
}

export type AllActions<
  transport extends Transport = Transport,
  chain extends Chain | undefined = Chain | undefined,
  account extends Account | undefined = Account | undefined,
> =
  PublicActions<transport, chain, account> &
  WalletActions<chain, account> &
  GolemBaseActions

export type GolemBaseClient<
  chain extends Chain | undefined = Chain | undefined,
  account extends Account | undefined = Account | undefined,
> = {
  httpClient: Client<
    HttpTransport,
    chain,
    account,
    RpcSchema,
    AllActions>,
  wsClient: Client<
    WebSocketTransport,
    chain,
    account,
    RpcSchema,
    PublicActions<WebSocketTransport, chain, account>
  >
}


/**
 * Create a client to interact with GolemBase
 * @param {Buffer} key - Private key for this client
 * @param {string} rpcUrl - JSON-RPC URL to talk to
 * @param {string} wsUrl - WebSocket URL to talk to
 * @param {Logger<ILogObj>} log - Optional logger instance to use for logging
 *
 * @returns A client object
 */
export function createClient(
  key: Buffer,
  rpcUrl: string,
  wsUrl: string,
  log: Logger<ILogObj> = new Logger<ILogObj>({
    type: "hidden",
    hideLogPositionForProduction: true,
  })
): GolemBaseClient {

  function createPayload(tx: GolemBaseTransaction): Hex {
    function formatAnnotation<T>(annotation: { key: string, value: T, }): [string, T] {
      return [annotation.key, annotation.value]
    }

    log.debug("Transaction:", JSON.stringify(tx, null, 2))
    const payload = [
      // Create
      (tx.creates || []).map(el => [
        el.ttl,
        el.data,
        el.stringAnnotations.map(formatAnnotation),
        el.numericAnnotations.map(formatAnnotation),
      ]),
      // Update
      (tx.updates || []).map(el => [
        el.entityKey,
        el.ttl,
        el.data,
        el.stringAnnotations.map(formatAnnotation),
        el.numericAnnotations.map(formatAnnotation),
      ]),
      // Delete
      tx.deletes || [],
      (tx.extensions || []).map(el => [
        el.entityKey,
        el.numberOfBlocks,
      ]),
    ]
    log.debug("Payload before RLP encoding:", JSON.stringify(payload, null, 2))
    return toHex(RLP.encode(payload))
  }

  const chain = defineChain({
    id: 1337,
    name: "golem-base",
    nativeCurrency: {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: {
        http: [rpcUrl],
        websockets: [wsUrl],
      }
    },
  })
  const account = privateKeyToAccount(toHex(key, { size: 32 }), { nonceManager })

  return {
    wsClient: createPublicClient({
      chain,
      transport: webSocket(wsUrl),
    }),
    httpClient: createWalletClient({
      account,
      chain,
      transport: http(),
    }).extend(publicActions).extend(client => ({
      /**
       * Get the storage value associated with the given entity key
       */
      async getStorageValue(args: GolemGetStorageValueInputParams): Promise<GolemGetStorageValueReturnType> {
        return client.request<GolemGetStorageValueSchema>({
          method: 'golembase_getStorageValue',
          params: [args]
        })
      },
      /**
       * Get the full entity information
       */
      async getEntityMetaData(args: GolemGetEntityMetaDataInputParams): Promise<GolemGetEntityMetaDataReturnType> {
        return client.request<GolemGetEntityMetaDataSchema>({
          method: 'golembase_getEntityMetaData',
          params: [args]
        })
      },
      /**
       * Get all entity keys for entities that will expire at the given block number
       */
      async getEntitiesToExpireAtBlock(blockNumber: bigint): Promise<GolemGetEntitiesToExpireAtBlockReturnType> {
        const res = await client.request<GolemGetEntitiesToExpireAtBlockSchema>({
          method: 'golembase_getEntitiesToExpireAtBlock',
          // TODO: bigint gets serialised in json as a string, which the api doesn't accept.
          // is there a better workaround?
          params: [Number(blockNumber)]
        })
        return res || []
      },
      async getEntitiesForStringAnnotationValue(annotation: StringAnnotation): Promise<GolemGetEntitiesForStringAnnotationValueReturnType> {
        const res = await client.request<GolemGetEntitiesForStringAnnotationValueSchema>({
          method: 'golembase_getEntitiesForStringAnnotationValue',
          params: [annotation.key, annotation.value]
        })
        return res || []
      },
      async getEntitiesForNumericAnnotationValue(annotation: NumericAnnotation): Promise<GolemGetEntitiesForNumericAnnotationValueReturnType> {
        const res = await client.request<GolemGetEntitiesForNumericAnnotationValueSchema>({
          method: 'golembase_getEntitiesForNumericAnnotationValue',
          params: [annotation.key, annotation.value]
        })
        return res || []
      },
      async getEntityCount(): Promise<GolemGetEntityCountReturnType> {
        return client.request<GolemGetEntityCountSchema>({
          method: 'golembase_getEntityCount',
          params: []
        })
      },
      async getAllEntityKeys(): Promise<GolemGetAllEntityKeysReturnType> {
        const res = await client.request<GolemGetAllEntityKeysSchema>({
          method: 'golembase_getAllEntityKeys',
          params: []
        })
        return res || []
      },
      async getEntitiesOfOwner(args: GolemGetEntitiesOfOwnerInputParams): Promise<GolemGetEntitiesOfOwnerReturnType> {
        const res = await client.request<GolemGetEntitiesOfOwnerSchema>({
          method: 'golembase_getEntitiesOfOwner',
          params: [args]
        })
        return res || []
      },
      async queryEntities(args: GolemQueryEntitiesInputParams): Promise<[GolemQueryEntitiesReturnType]> {
        const res = await client.request<GolemQueryEntitiesSchema>({
          method: 'golembase_queryEntities',
          params: [args]
        })
        return res || []
      },

      async createRawStorageTransaction(
        data: Hex,
        maxFeePerGas: bigint = parseGwei('150'),
        maxPriorityFeePerGas: bigint = parseGwei('1'),
      ): Promise<Hex> {
        const value = 0n
        const type = 'eip1559'

        const gasEstimate = await client.estimateGas({
          to: storageAddress,
          maxFeePerGas,
          maxPriorityFeePerGas,
          type,
          value,
          data,
        })
        log.debug("Received GAS estimate: ", formatGwei(gasEstimate))

        const req = await client.prepareTransactionRequest({
          to: storageAddress,
          maxFeePerGas,
          maxPriorityFeePerGas,
          type,
          value,
          gas: gasEstimate,
          data,
          nonceManager,
        })
        const tx = await client.signTransaction(req)

        const hash = await client.sendRawTransaction({ serializedTransaction: tx })
        log.debug("Got transaction hash:", hash)
        return hash
      },

      async createEntities(creates: GolemBaseCreate[]): Promise<Hex> {
        return this.createRawStorageTransaction(createPayload({ creates }))
      },
      async createEntitiesAndWaitForReceipt(creates: GolemBaseCreate[]): Promise<TransactionReceipt> {
        const receipt = await client.waitForTransactionReceipt({
          hash: await this.createEntities(creates)
        })
        return receipt
      },
      async updateEntities(updates: GolemBaseUpdate[]): Promise<Hex> {
        return this.createRawStorageTransaction(createPayload({ updates }))
      },
      async updateEntitiesAndWaitForReceipt(updates: GolemBaseUpdate[]): Promise<TransactionReceipt> {
        const receipt = await client.waitForTransactionReceipt({
          hash: await this.updateEntities(updates)
        })
        return receipt
      },
      async deleteEntities(deletes: Hex[]): Promise<Hex> {
        log.debug("deleteEntities", deletes)
        const payload = createPayload({ deletes })
        return this.createRawStorageTransaction(payload)
      },
      async deleteEntitiesAndWaitForReceipt(deletes: Hex[]): Promise<TransactionReceipt> {
        const receipt = await client.waitForTransactionReceipt({
          hash: await this.deleteEntities(deletes)
        })
        return receipt
      },
      async extendEntities(extensions: GolemBaseExtend[]): Promise<Hex> {
        log.debug("extendEntities", extensions)
        const payload = createPayload({ extensions })
        return this.createRawStorageTransaction(payload)
      },
      async extendEntitiesAndWaitForReceipt(extensions: GolemBaseExtend[]): Promise<TransactionReceipt> {
        const receipt = await client.waitForTransactionReceipt({
          hash: await this.extendEntities(extensions)
        })
        return receipt
      },
    }))
  }
}
