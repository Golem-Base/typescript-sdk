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
  custom,
  CustomTransport,
  toRlp,
  PublicClient,
} from 'viem'
import {
  privateKeyToAccount,
  nonceManager,
} from 'viem/accounts'
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
  type AccountData,
} from ".."

export interface EntitySortOption {
  field: 'annotationValue'
  annotationKey: string
  direction: 'asc' | 'desc'
  nulls?: 'first' | 'last'
}

export interface EntityFilter {
  sort?: EntitySortOption[]
  limit?: number
}
import { SmartAccount } from 'viem/_types/account-abstraction/accounts/types';

export { checksumAddress, toHex, TransactionReceipt }

export const storageAddress = '0x0000000000000000000000000000000060138453'

function getAnnotationValue(metadata: EntityMetaData, key: string): string | number | null {
  for (const annotation of metadata.stringAnnotations || []) {
    if (annotation.key === key) return annotation.value
  }
  
  for (const annotation of metadata.numericAnnotations || []) {
    if (annotation.key === key) return annotation.value
  }
  
  return null
}

type GolemGetStorageValueInputParams = Hex
type GolemGetStorageValueReturnType = string
type GolemGetStorageValueSchema = {
  Method: 'golembase_getStorageValue'
  Parameters: [GolemGetStorageValueInputParams]
  ReturnType: GolemGetStorageValueReturnType
}

type GolemGetEntityMetaDataInputParams = Hex
type GolemGetEntityMetaDataReturnType = EntityMetaData
type GolemGetEntityMetaDataSchema = {
  Method: 'golembase_getEntityMetaData'
  Parameters: [GolemGetEntityMetaDataInputParams]
  ReturnType: GolemGetEntityMetaDataReturnType
}

type GolemGetEntitiesToExpireAtBlockInputParams = number
type GolemGetEntitiesToExpireAtBlockReturnType = Hex[]
type GolemGetEntitiesToExpireAtBlockSchema = {
  Method: 'golembase_getEntitiesToExpireAtBlock'
  Parameters: [GolemGetEntitiesToExpireAtBlockInputParams]
  ReturnType: GolemGetEntitiesToExpireAtBlockReturnType
}

type GolemGetEntityCountReturnType = number
type GolemGetEntityCountSchema = {
  Method: 'golembase_getEntityCount'
  Parameters: []
  ReturnType: GolemGetEntityCountReturnType
}

type GolemGetAllEntityKeysReturnType = Hex[]
type GolemGetAllEntityKeysSchema = {
  Method: 'golembase_getAllEntityKeys'
  Parameters: []
  ReturnType: GolemGetAllEntityKeysReturnType
}

type GolemGetEntitiesOfOwnerInputParams = Hex
type GolemGetEntitiesOfOwnerReturnType = Hex[]
type GolemGetEntitiesOfOwnerSchema = {
  Method: 'golembase_getEntitiesOfOwner'
  Parameters: [GolemGetEntitiesOfOwnerInputParams]
  ReturnType: GolemGetEntitiesOfOwnerReturnType
}

type GolemQueryEntitiesInputParams = string
type GolemQueryEntitiesReturnType = { key: Hex, value: string }
type GolemQueryEntitiesSchema = {
  Method: 'golembase_queryEntities'
  Parameters: [GolemQueryEntitiesInputParams]
  ReturnType: [GolemQueryEntitiesReturnType]
}

export type GolemBaseActions = {
  getStorageValue(args: GolemGetStorageValueInputParams): Promise<Uint8Array>
  getEntityMetaData(args: GolemGetEntityMetaDataInputParams): Promise<EntityMetaData>
  /**
   * Get all entity keys for entities that will expire at the given block number
   */
  getEntitiesToExpireAtBlock(blockNumber: bigint): Promise<Hex[]>
  getEntityCount(): Promise<number>
  getAllEntityKeys(filter?: EntityFilter): Promise<Hex[]>
  getEntitiesOfOwner(args: GolemGetEntitiesOfOwnerInputParams): Promise<Hex[]>
  queryEntities(args: GolemQueryEntitiesInputParams): Promise<{ key: Hex, value: Uint8Array, }[]>
}

export type GolemBaseWalletActions = {
  createRawStorageTransaction(
    payload: Hex,
    gas: bigint | undefined,
    maxFeePerGas: bigint | undefined,
    maxPriorityFeePerGas: bigint | undefined,
  ): Promise<Hex>

  sendGolemBaseTransaction(
    creates?: GolemBaseCreate[],
    updates?: GolemBaseUpdate[],
    deletes?: Hex[],
    extensions?: GolemBaseExtend[],
    gas?: bigint,
    maxFeePerGas?: bigint,
    maxPriorityFeePerGas?: bigint,
  ): Promise<Hex>

  sendGolemBaseTransactionAndWaitForReceipt(
    creates?: GolemBaseCreate[],
    updates?: GolemBaseUpdate[],
    deletes?: Hex[],
    extensions?: GolemBaseExtend[],
    args?: {
      gas?: bigint,
      maxFeePerGas?: bigint,
      maxPriorityFeePerGas?: bigint,
      txHashCallback?: (txHash: Hex) => void
    },
  ): Promise<TransactionReceipt>
}

export type AllActions<
  transport extends Transport = Transport,
> =
  PublicActions<transport, Chain, Account> &
  WalletActions<Chain, Account> &
  GolemBaseActions

export interface GolemBaseROClient {
  httpClient: Client<
    HttpTransport,
    Chain,
    Account | undefined,
    RpcSchema,
    PublicActions<HttpTransport, Chain, Account | undefined> & GolemBaseActions
  >

  wsClient: Client<
    WebSocketTransport,
    Chain,
    Account | undefined,
    RpcSchema,
    PublicActions<WebSocketTransport, Chain, Account | undefined>
  >
}

export interface GolemBaseClient extends GolemBaseROClient {
  walletClient: Client<
    HttpTransport | CustomTransport,
    Chain,
    Account,
    RpcSchema,
    WalletActions<Chain, Account> & PublicActions<HttpTransport | CustomTransport,
      Chain,
      Account> & GolemBaseWalletActions
  >
}

function mkHttpClient(rpcUrl: string, chain: Chain): Client<
  HttpTransport,
  Chain,
  Account | undefined,
  RpcSchema,
  PublicActions<HttpTransport, Chain, Account | undefined> & GolemBaseActions
> {
  return createPublicClient<HttpTransport, Chain, Account | undefined>({
    chain,
    transport: http(rpcUrl),
  }).extend((client) => ({
    /**
     * Get the storage value associated with the given entity key
     */
    async getStorageValue(args: GolemGetStorageValueInputParams): Promise<Uint8Array> {
      return Buffer.from(await client.request<GolemGetStorageValueSchema>({
        method: 'golembase_getStorageValue',
        params: [args]
      }), "base64")
    },
    /**
     * Get the full entity information
     */
    async getEntityMetaData(args: GolemGetEntityMetaDataInputParams): Promise<EntityMetaData> {
      return client.request<GolemGetEntityMetaDataSchema>({
        method: 'golembase_getEntityMetaData',
        params: [args]
      })
    },
    /**
     * Get all entity keys for entities that will expire at the given block number
     */
    async getEntitiesToExpireAtBlock(blockNumber: bigint): Promise<Hex[]> {
      return client.request<GolemGetEntitiesToExpireAtBlockSchema>({
        method: 'golembase_getEntitiesToExpireAtBlock',
        // TODO: bigint gets serialised in json as a string, which the api doesn't accept.
        // is there a better workaround?
        params: [Number(blockNumber)]
      })
    },
    async getEntityCount(): Promise<number> {
      return client.request<GolemGetEntityCountSchema>({
        method: 'golembase_getEntityCount',
        params: []
      })
    },
    async getAllEntityKeys(filter?: EntityFilter): Promise<Hex[]> {
      const entityKeys = await client.request<GolemGetAllEntityKeysSchema>({
        method: 'golembase_getAllEntityKeys',
        params: []
      })
      
      if (filter?.sort?.length) {
        try {
          const entitiesWithMetadata = await Promise.all(
            entityKeys.map(async (key: Hex) => ({
              key,
              metadata: await this.getEntityMetaData(key)
            }))
          )
          
          const sorted = entitiesWithMetadata.sort((a, b) => {
            const sort = filter.sort![0]
            const aValue = getAnnotationValue(a.metadata, sort.annotationKey)
            const bValue = getAnnotationValue(b.metadata, sort.annotationKey)
            
            const nulls = sort.nulls ?? 'last'
            if (aValue === null && bValue === null) return 0
            if (aValue === null) return nulls === 'first' ? -1 : 1
            if (bValue === null) return nulls === 'first' ? 1 : -1
            
            const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
            return sort.direction === 'asc' ? result : -result
          })
          
          let result = sorted.map(e => e.key)
          
          if (filter.limit) {
            result = result.slice(0, filter.limit)
          }
          
          return result
        } catch (error) {
          return entityKeys
        }
      }
      
      return entityKeys
    },
    async getEntitiesOfOwner(args: GolemGetEntitiesOfOwnerInputParams): Promise<Hex[]> {
      return client.request<GolemGetEntitiesOfOwnerSchema>({
        method: 'golembase_getEntitiesOfOwner',
        params: [args]
      })
    },
    async queryEntities(args: GolemQueryEntitiesInputParams): Promise<{ key: Hex, value: Uint8Array }[]> {
      return (await client.request<GolemQueryEntitiesSchema>({
        method: 'golembase_queryEntities',
        params: [args]
      })).map((res: { key: Hex, value: string }) => ({
        key: res.key,
        value: Buffer.from(res.value, "base64"),
      }))
    },
  }))
}

function mkWebSocketClient(wsUrl: string, chain: Chain):
  PublicClient<WebSocketTransport, Chain, Account | undefined, RpcSchema> {
  return createPublicClient<WebSocketTransport, Chain, Account | undefined, RpcSchema>({
    chain,
    transport: webSocket(wsUrl),
  })
}

async function mkWalletClient(
  accountData: AccountData,
  chain: Chain,
  log: Logger<ILogObj>,
): Promise<Client<
  HttpTransport | CustomTransport,
  Chain,
  Account,
  RpcSchema,
  WalletActions<Chain, Account> & PublicActions<HttpTransport | CustomTransport,
    Chain,
    Account> & GolemBaseWalletActions>> {
  const defaultMaxFeePerGas = undefined
  const defaultMaxPriorityFeePerGas = undefined

  let walletClient: Client<
    HttpTransport | CustomTransport,
    Chain,
    Account,
    RpcSchema,
    WalletActions<Chain, Account>
  >
  if (accountData.tag === "privatekey") {
    walletClient = createWalletClient({
      account: privateKeyToAccount(toHex(accountData.data, { size: 32 }), { nonceManager }),
      chain,
      transport: http(),
    })
  } else {
    const [account]: [SmartAccount] = await accountData.data.request({ method: 'eth_requestAccounts' })
    walletClient = createWalletClient({
      account,
      chain,
      transport: custom(accountData.data),
    })
  }

  function createPayload(tx: GolemBaseTransaction): Hex {
    function formatAnnotation<
      T extends string | number | bigint | boolean
    >(annotation: { key: string, value: T, }): [Hex, Hex] {
      return [toHex(annotation.key), toHex(annotation.value)]
    }

    log.debug("Transaction:", JSON.stringify(tx, null, 2))
    const payload = [
      // Create
      (tx.creates || []).map(el => [
        toHex(el.btl),
        toHex(el.data),
        el.stringAnnotations.map(formatAnnotation),
        el.numericAnnotations.map(formatAnnotation),
      ]),

      // Update
      (tx.updates || []).map(el => [
        el.entityKey,
        toHex(el.btl),
        toHex(el.data),
        el.stringAnnotations.map(formatAnnotation),
        el.numericAnnotations.map(formatAnnotation),
      ]),

      // Delete
      (tx.deletes || []),

      // Extend
      (tx.extensions || []).map(el => [
        el.entityKey,
        toHex(el.numberOfBlocks),
      ]),
    ]
    log.debug("Payload before RLP encoding:", JSON.stringify(payload, null, 2))
    return toRlp(payload)
  }

  return walletClient.extend(publicActions).extend((client) => ({
    async createRawStorageTransaction(
      data: Hex,
      gas: bigint | undefined,
      maxFeePerGas: bigint | undefined,
      maxPriorityFeePerGas: bigint | undefined,
    ): Promise<Hex> {
      const value = 0n
      const type = 'eip1559'

      const hash = await client.sendTransaction({
        account: client.account,
        chain: client.chain,
        to: storageAddress,
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        type,
        value,
        data,
        nonceManager,
      })

      log.debug("Got transaction hash:", hash)
      return hash
    },

    async sendGolemBaseTransaction(
      creates: GolemBaseCreate[] = [],
      updates: GolemBaseUpdate[] = [],
      deletes: Hex[] = [],
      extensions: GolemBaseExtend[] = [],
      gas: bigint | undefined,
      maxFeePerGas: bigint | undefined = defaultMaxFeePerGas,
      maxPriorityFeePerGas: bigint | undefined = defaultMaxPriorityFeePerGas,
    ): Promise<Hex> {
      return this.createRawStorageTransaction(
        createPayload({ creates, updates, deletes, extensions }),
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
      )
    },

    async sendGolemBaseTransactionAndWaitForReceipt(
      creates: GolemBaseCreate[] = [],
      updates: GolemBaseUpdate[] = [],
      deletes: Hex[] = [],
      extensions: GolemBaseExtend[] = [],
      args: {
        gas?: bigint,
        maxFeePerGas?: bigint,
        maxPriorityFeePerGas?: bigint,
        txHashCallback?: (txHash: Hex) => void
      } = {},
    ): Promise<TransactionReceipt> {
      const data = createPayload({ creates, updates, deletes, extensions })
      const hash = await this.createRawStorageTransaction(
        data,
        args.gas,
        args.maxFeePerGas,
        args.maxPriorityFeePerGas,
      )
      if (args.txHashCallback) {
        args.txHashCallback(hash)
      }
      const receipt = await client.waitForTransactionReceipt({ hash })

      // If the tx was reverted, then we run it again with eth_call so that we
      // get a descriptive error message.
      // The eth_call method will throw an exception.
      if (receipt.status === "reverted") {
        await client.call({
          account: client.account,
          to: storageAddress,
          gas: args.gas,
          maxFeePerGas: args.maxFeePerGas,
          maxPriorityFeePerGas: args.maxPriorityFeePerGas,
          type: "eip1559",
          value: 0n,
          data,
        })
      }

      // If we get here, the tx was successful.
      return receipt
    },
  }))
}

function createGolemBaseChain(
  chainId: number,
  rpcUrl: string,
  wsUrl: string,
): Chain {
  return defineChain({
    id: chainId,
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
}

/**
 * Create a read-only client to interact with GolemBase
 * @param rpcUrl - JSON-RPC URL to talk to
 * @param wsUrl - WebSocket URL to talk to
 * @param logger - Optional logger instance to use for logging
 *
 * @returns A client object
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
  const log = logger.getSubLogger({ name: "internal" });

  const chain = createGolemBaseChain(
    chainId, rpcUrl, wsUrl
  )

  log.debug("Creating internal client", {
    rpcUrl,
    wsUrl,
    chain
  })

  return {
    httpClient: mkHttpClient(rpcUrl, chain),
    wsClient: mkWebSocketClient(wsUrl, chain),
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
  chainId: number,
  accountData: AccountData,
  rpcUrl: string,
  wsUrl: string,
  logger: Logger<ILogObj> = new Logger<ILogObj>({
    type: "hidden",
    hideLogPositionForProduction: true,
  })
): Promise<GolemBaseClient> {
  const log = logger.getSubLogger({ name: "internal" });

  const chain = createGolemBaseChain(
    chainId, rpcUrl, wsUrl
  )

  log.debug("Creating internal client", {
    rpcUrl,
    wsUrl,
    chain
  })

  return {
    httpClient: mkHttpClient(rpcUrl, chain),
    wsClient: mkWebSocketClient(wsUrl, chain),
    walletClient: await mkWalletClient(accountData, chain, log),
  }
}
