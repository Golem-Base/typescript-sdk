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
  type ArkivCreate,
  type ArkivUpdate,
  type ArkivTransaction,
  type EntityMetaData,
  type ArkivExtend,
  type AccountData,
} from ".."
import { SmartAccount } from 'viem/_types/account-abstraction/accounts/types';

export { checksumAddress, toHex, TransactionReceipt }

/**
 * The fixed Ethereum address of the Arkiv storage contract on the network.
 * All entity operations (create, update, delete, extend) are performed by sending
 * transactions to this address.
 * 
 * @public
 */
export const storageAddress = '0x0000000000000000000000000000000060138453'

type ArkivGetStorageValueInputParams = Hex
type ArkivGetStorageValueReturnType = string
type ArkivGetStorageValueSchema = {
  Method: 'arkiv_getStorageValue'
  Parameters: [ArkivGetStorageValueInputParams]
  ReturnType: ArkivGetStorageValueReturnType
}

type ArkivGetEntityMetaDataInputParams = Hex
type ArkivGetEntityMetaDataReturnType = EntityMetaData
type ArkivGetEntityMetaDataSchema = {
  Method: 'arkiv_getEntityMetaData'
  Parameters: [ArkivGetEntityMetaDataInputParams]
  ReturnType: ArkivGetEntityMetaDataReturnType
}

type ArkivGetEntitiesToExpireAtBlockInputParams = number
type ArkivGetEntitiesToExpireAtBlockReturnType = Hex[]
type ArkivGetEntitiesToExpireAtBlockSchema = {
  Method: 'arkiv_getEntitiesToExpireAtBlock'
  Parameters: [ArkivGetEntitiesToExpireAtBlockInputParams]
  ReturnType: ArkivGetEntitiesToExpireAtBlockReturnType
}

type ArkivGetEntityCountReturnType = number
type ArkivGetEntityCountSchema = {
  Method: 'arkiv_getEntityCount'
  Parameters: []
  ReturnType: ArkivGetEntityCountReturnType
}

type ArkivGetAllEntityKeysReturnType = Hex[]
type ArkivGetAllEntityKeysSchema = {
  Method: 'arkiv_getAllEntityKeys'
  Parameters: []
  ReturnType: ArkivGetAllEntityKeysReturnType
}

type ArkivGetEntitiesOfOwnerInputParams = Hex
type ArkivGetEntitiesOfOwnerReturnType = Hex[]
type ArkivGetEntitiesOfOwnerSchema = {
  Method: 'arkiv_getEntitiesOfOwner'
  Parameters: [ArkivGetEntitiesOfOwnerInputParams]
  ReturnType: ArkivGetEntitiesOfOwnerReturnType
}

type ArkivQueryEntitiesInputParams = string
type ArkivQueryEntitiesReturnType = { key: Hex, value: string }
type ArkivQueryEntitiesSchema = {
  Method: 'arkiv_queryEntities'
  Parameters: [ArkivQueryEntitiesInputParams]
  ReturnType: [ArkivQueryEntitiesReturnType]
}

/**
 * Type definition for Arkiv read-only actions that can be performed
 * through the JSON-RPC interface. These methods provide query capabilities
 * for retrieving entity data and metadata.
 * 
 * @public
 */
export type ArkivActions = {
  /** Retrieve the raw storage value (data) for a specific entity */
  getStorageValue(args: ArkivGetStorageValueInputParams): Promise<Uint8Array>
  /** Get complete metadata for an entity including annotations and expiration info */
  getEntityMetaData(args: ArkivGetEntityMetaDataInputParams): Promise<EntityMetaData>
  /**
   * Get all entity keys for entities that will expire at the given block number.
   * Useful for monitoring entities approaching their TTL expiration.
   */
  getEntitiesToExpireAtBlock(blockNumber: bigint): Promise<Hex[]>
  /** Get the total count of entities currently stored in Arkiv */
  getEntityCount(): Promise<number>
  /** Retrieve all entity keys currently stored in Arkiv */
  getAllEntityKeys(): Promise<Hex[]>
  /** Get all entity keys owned by a specific Ethereum address */
  getEntitiesOfOwner(args: ArkivGetEntitiesOfOwnerInputParams): Promise<Hex[]>
  /** Query entities based on annotation criteria, returning matching keys and values */
  queryEntities(args: ArkivQueryEntitiesInputParams): Promise<{ key: Hex, value: Uint8Array, }[]>
}

/**
 * Type definition for Arkiv wallet actions that enable writing operations
 * to the blockchain. These methods handle transaction creation and submission.
 * 
 * @public
 */
export type ArkivWalletActions = {
  /**
   * Create and submit a raw storage transaction with pre-encoded payload.
   * This is a low-level method used internally by higher-level operations.
   */
  createRawStorageTransaction(
    payload: Hex,
    gas: bigint | undefined,
    maxFeePerGas: bigint | undefined,
    maxPriorityFeePerGas: bigint | undefined,
  ): Promise<Hex>

  /**
   * Send a Arkiv transaction with entity operations and return the transaction hash.
   * This method submits the transaction but doesn't wait for confirmation.
   */
  sendArkivTransaction(
    creates?: ArkivCreate[],
    updates?: ArkivUpdate[],
    deletes?: Hex[],
    extensions?: ArkivExtend[],
    gas?: bigint,
    maxFeePerGas?: bigint,
    maxPriorityFeePerGas?: bigint,
  ): Promise<Hex>

  /**
   * Send a Arkiv transaction and wait for the blockchain receipt.
   * This method provides complete transaction lifecycle handling with error reporting.
   */
  sendArkivTransactionAndWaitForReceipt(
    creates?: ArkivCreate[],
    updates?: ArkivUpdate[],
    deletes?: Hex[],
    extensions?: ArkivExtend[],
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
  ArkivActions

/**
 * Interface for the internal read-only Arkiv client providing access to
 * both HTTP and WebSocket connections for querying blockchain data.
 * 
 * @public
 */
export interface ArkivROClient {
  /** HTTP client for making JSON-RPC calls and reading Arkiv data */
  httpClient: Client<
    HttpTransport,
    Chain,
    Account | undefined,
    RpcSchema,
    PublicActions<HttpTransport, Chain, Account | undefined> & ArkivActions
  >

  /** WebSocket client for real-time event monitoring and subscriptions */
  wsClient: Client<
    WebSocketTransport,
    Chain,
    Account | undefined,
    RpcSchema,
    PublicActions<WebSocketTransport, Chain, Account | undefined>
  >
}

/**
 * Interface for the internal full Arkiv client extending read-only capabilities
 * with wallet functionality for transaction signing and submission.
 * 
 * @public
 */
export interface ArkivClient extends ArkivROClient {
  /** Wallet client for signing and sending transactions to Arkiv */
  walletClient: Client<
    HttpTransport | CustomTransport,
    Chain,
    Account,
    RpcSchema,
    WalletActions<Chain, Account> & PublicActions<HttpTransport | CustomTransport,
      Chain,
      Account> & ArkivWalletActions
  >
}

/**
 * Create an HTTP client for Arkiv with extended Arkiv-specific actions.
 * 
 * This function creates a viem public client configured for the Arkiv chain
 * and extends it with custom RPC methods for interacting with Arkiv entities.
 * 
 * @param rpcUrl - The HTTP RPC endpoint URL for the Arkiv network
 * @param chain - The chain configuration for the Arkiv network
 * @returns A configured HTTP client with Arkiv actions
 * 
 * @internal
 */
function mkHttpClient(rpcUrl: string, chain: Chain): Client<
  HttpTransport,
  Chain,
  Account | undefined,
  RpcSchema,
  PublicActions<HttpTransport, Chain, Account | undefined> & ArkivActions
> {
  return createPublicClient<HttpTransport, Chain, Account | undefined>({
    chain,
    transport: http(rpcUrl),
  }).extend((client) => ({
    /**
     * Get the storage value associated with the given entity key
     */
    async getStorageValue(args: ArkivGetStorageValueInputParams): Promise<Uint8Array> {
      return Buffer.from(await client.request<ArkivGetStorageValueSchema>({
        method: 'arkiv_getStorageValue',
        params: [args]
      }), "base64")
    },
    /**
     * Get the full entity information
     */
    async getEntityMetaData(args: ArkivGetEntityMetaDataInputParams): Promise<EntityMetaData> {
      return client.request<ArkivGetEntityMetaDataSchema>({
        method: 'arkiv_getEntityMetaData',
        params: [args]
      })
    },
    /**
     * Get all entity keys for entities that will expire at the given block number
     */
    async getEntitiesToExpireAtBlock(blockNumber: bigint): Promise<Hex[]> {
      return client.request<ArkivGetEntitiesToExpireAtBlockSchema>({
        method: 'arkiv_getEntitiesToExpireAtBlock',
        // TODO: bigint gets serialised in json as a string, which the api doesn't accept.
        // is there a better workaround?
        params: [Number(blockNumber)]
      })
    },
    async getEntityCount(): Promise<number> {
      return client.request<ArkivGetEntityCountSchema>({
        method: 'arkiv_getEntityCount',
        params: []
      })
    },
    async getAllEntityKeys(): Promise<Hex[]> {
      return await client.request<ArkivGetAllEntityKeysSchema>({
        method: 'arkiv_getAllEntityKeys',
        params: []
      })
    },
    async getEntitiesOfOwner(args: ArkivGetEntitiesOfOwnerInputParams): Promise<Hex[]> {
      return client.request<ArkivGetEntitiesOfOwnerSchema>({
        method: 'arkiv_getEntitiesOfOwner',
        params: [args]
      })
    },
    async queryEntities(args: ArkivQueryEntitiesInputParams): Promise<{ key: Hex, value: Uint8Array }[]> {
      return (await client.request<ArkivQueryEntitiesSchema>({
        method: 'arkiv_queryEntities',
        params: [args]
      })).map((res: { key: Hex, value: string }) => ({
        key: res.key,
        value: Buffer.from(res.value, "base64"),
      }))
    },
  }))
}

/**
 * Create a WebSocket client for Arkiv for real-time event monitoring.
 * 
 * This function creates a viem public client configured to connect via WebSocket
 * for subscribing to blockchain events and real-time updates.
 * 
 * @param wsUrl - The WebSocket RPC endpoint URL for the Arkiv network
 * @param chain - The chain configuration for the Arkiv network
 * @returns A configured WebSocket client for event subscriptions
 * 
 * @internal
 */
function mkWebSocketClient(wsUrl: string, chain: Chain):
  PublicClient<WebSocketTransport, Chain, Account | undefined, RpcSchema> {
  return createPublicClient<WebSocketTransport, Chain, Account | undefined, RpcSchema>({
    chain,
    transport: webSocket(wsUrl),
  })
}

/**
 * Create a wallet client for Arkiv with transaction signing capabilities.
 * 
 * This function creates a wallet client that can sign and submit transactions
 * to Arkiv. It supports both private key accounts and external wallet providers.
 * 
 * @param accountData - Either a private key or external wallet provider for signing
 * @param chain - The chain configuration for the Arkiv network
 * @param log - Logger instance for debugging transaction operations
 * @returns A configured wallet client with Arkiv transaction actions
 * 
 * @internal
 */
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
    Account> & ArkivWalletActions>> {
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

  /**
   * Create RLP-encoded payload for Arkiv transactions.
   * 
   * This internal function converts Arkiv transaction operations into
   * the binary format expected by the Arkiv storage contract.
   * 
   * @param tx - The transaction containing create, update, delete, and extend operations
   * @returns Hex-encoded RLP payload ready for blockchain submission
   */
  function createPayload(tx: ArkivTransaction): Hex {
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

    async sendArkivTransaction(
      creates: ArkivCreate[] = [],
      updates: ArkivUpdate[] = [],
      deletes: Hex[] = [],
      extensions: ArkivExtend[] = [],
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

    async sendArkivTransactionAndWaitForReceipt(
      creates: ArkivCreate[] = [],
      updates: ArkivUpdate[] = [],
      deletes: Hex[] = [],
      extensions: ArkivExtend[] = [],
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

/**
 * Create a viem chain configuration for the Arkiv network.
 * 
 * This function defines the chain parameters needed by viem to interact
 * with the Arkiv L2 network, including RPC endpoints and network metadata.
 * 
 * @param chainId - The numeric chain ID of the Arkiv network
 * @param rpcUrl - The HTTP RPC endpoint URL
 * @param wsUrl - The WebSocket RPC endpoint URL
 * @returns A viem Chain configuration object
 * 
 * @internal
 */
function createArkivChain(
  chainId: number,
  rpcUrl: string,
  wsUrl: string,
): Chain {
  return defineChain({
    id: chainId,
    name: "arkiv",
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
 * Create a read-only client to interact with Arkiv
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
): ArkivROClient {
  const log = logger.getSubLogger({ name: "internal" });

  const chain = createArkivChain(
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
 * Create a client to interact with Arkiv
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
): Promise<ArkivClient> {
  const log = logger.getSubLogger({ name: "internal" });

  const chain = createArkivChain(
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
