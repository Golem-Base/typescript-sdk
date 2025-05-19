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
import { SmartAccount } from 'viem/_types/account-abstraction/accounts/types';

export { checksumAddress, toHex, TransactionReceipt }

export const storageAddress = '0x0000000000000000000000000000000060138453'

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
  getAllEntityKeys(): Promise<Hex[]>
  getEntitiesOfOwner(args: GolemGetEntitiesOfOwnerInputParams): Promise<Hex[]>
  queryEntities(args: GolemQueryEntitiesInputParams): Promise<{ key: Hex, value: Uint8Array, }[]>
}

export type GolemBaseWalletActions = {
  createRawStorageTransaction(
    payload: Hex,
    maxFeePerGas: bigint | undefined,
    maxPriorityFeePerGas: bigint | undefined,
  ): Promise<Hex>

  sendGolemBaseTransaction(
    creates?: GolemBaseCreate[],
    updates?: GolemBaseUpdate[],
    deletes?: Hex[],
    extensions?: GolemBaseExtend[],
    maxFeePerGas?: bigint | undefined,
    maxPriorityFeePerGas?: bigint | undefined,
  ): Promise<Hex>

  sendGolemBaseTransactionAndWaitForReceipt(
    creates?: GolemBaseCreate[],
    updates?: GolemBaseUpdate[],
    deletes?: Hex[],
    extensions?: GolemBaseExtend[],
    maxFeePerGas?: bigint | undefined,
    maxPriorityFeePerGas?: bigint | undefined,
  ): Promise<TransactionReceipt>
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
  walletClient: Client<
    HttpTransport | CustomTransport,
    chain,
    account,
    RpcSchema,
    WalletActions<chain, account> & PublicActions<HttpTransport | CustomTransport,
      chain,
      account> & GolemBaseWalletActions
  >,
  httpClient: Client<
    HttpTransport,
    chain,
    account,
    RpcSchema,
    PublicActions<HttpTransport, chain, account> & GolemBaseActions
  >,
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
      (tx.extensions || []).map(el => [
        el.entityKey,
        toHex(el.numberOfBlocks),
      ]),
    ]
    log.debug("Payload before RLP encoding:", JSON.stringify(payload, null, 2))
    return toRlp(payload)
  }

  const chain = defineChain({
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

  log.debug("Creating internal client", {
    rpcUrl,
    wsUrl,
    chain
  })

  async function mkWalletClient(): Promise<Client<
    HttpTransport | CustomTransport,
    Chain,
    Account,
    RpcSchema,
    WalletActions
  >> {
    if (accountData.tag === "privatekey") {
      return createWalletClient({
        account: privateKeyToAccount(toHex(accountData.data, { size: 32 }), { nonceManager }),
        chain,
        transport: http(),
      })
    } else {
      const [account]: [SmartAccount] = await accountData.data.request({ method: 'eth_requestAccounts' })
      return createWalletClient({
        account,
        chain,
        transport: custom(accountData.data),
      })
    }
  }
  const walletClient = await mkWalletClient()

  const defaultMaxFeePerGas = undefined
  const defaultMaxPriorityFeePerGas = undefined

  return {
    walletClient: walletClient.extend(publicActions).extend(client => ({
      async createRawStorageTransaction(
        data: Hex,
        maxFeePerGas: bigint | undefined,
        maxPriorityFeePerGas: bigint | undefined,
      ): Promise<Hex> {
        const value = 0n
        const type = 'eip1559'

        const hash = await client.sendTransaction({
          account: client.account,
          chain: client.chain,
          to: storageAddress,
          maxFeePerGas,
          maxPriorityFeePerGas,
          type,
          value,
          gas: undefined,
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
        maxFeePerGas: bigint | undefined = defaultMaxFeePerGas,
        maxPriorityFeePerGas: bigint | undefined = defaultMaxPriorityFeePerGas,
      ): Promise<Hex> {
        return this.createRawStorageTransaction(
          createPayload({ creates, updates, deletes, extensions }),
          maxFeePerGas,
          maxPriorityFeePerGas,
        )
      },

      async sendGolemBaseTransactionAndWaitForReceipt(
        creates: GolemBaseCreate[] = [],
        updates: GolemBaseUpdate[] = [],
        deletes: Hex[] = [],
        extensions: GolemBaseExtend[] = [],
        maxFeePerGas: bigint | undefined = defaultMaxFeePerGas,
        maxPriorityFeePerGas: bigint | undefined = defaultMaxPriorityFeePerGas,
      ): Promise<TransactionReceipt> {
        return client.waitForTransactionReceipt({
          hash: await this.createRawStorageTransaction(
            createPayload({ creates, updates, deletes, extensions }),
            maxFeePerGas,
            maxPriorityFeePerGas,
          )
        })
      },
    })),
    wsClient: createPublicClient({
      chain,
      transport: webSocket(wsUrl),
    }),
    httpClient: createPublicClient({
      chain,
      transport: http(),
    }).extend(client => ({
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
      async getAllEntityKeys(): Promise<Hex[]> {
        return await client.request<GolemGetAllEntityKeysSchema>({
          method: 'golembase_getAllEntityKeys',
          params: []
        })
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
        })).map((res) => ({
          key: res.key,
          value: Buffer.from(res.value, "base64"),
        }))
      },
    }))
  }
}
