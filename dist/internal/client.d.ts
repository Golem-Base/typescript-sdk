import { toHex, checksumAddress, type TransactionReceipt, type Account, type Chain, type Client, type PublicActions, type RpcSchema, type Transport, type WalletActions, type HttpTransport, type WebSocketTransport, CustomTransport } from 'viem';
import { type ILogObj, Logger } from "tslog";
import { type Hex, type GolemBaseCreate, type GolemBaseUpdate, type EntityMetaData, type GolemBaseExtend, type AccountData } from "..";
export { checksumAddress, toHex, TransactionReceipt };
export declare const storageAddress = "0x0000000000000000000000000000000060138453";
type GolemGetStorageValueInputParams = Hex;
type GolemGetEntityMetaDataInputParams = Hex;
type GolemGetEntitiesOfOwnerInputParams = Hex;
type GolemQueryEntitiesInputParams = string;
export type GolemBaseActions = {
    getStorageValue(args: GolemGetStorageValueInputParams): Promise<Uint8Array>;
    getEntityMetaData(args: GolemGetEntityMetaDataInputParams): Promise<EntityMetaData>;
    getEntitiesToExpireAtBlock(blockNumber: bigint): Promise<Hex[]>;
    getEntityCount(): Promise<number>;
    getAllEntityKeys(): Promise<Hex[]>;
    getEntitiesOfOwner(args: GolemGetEntitiesOfOwnerInputParams): Promise<Hex[]>;
    queryEntities(args: GolemQueryEntitiesInputParams): Promise<{
        key: Hex;
        value: Uint8Array;
    }[]>;
};
export type GolemBaseWalletActions = {
    createRawStorageTransaction(payload: Hex, gas: bigint | undefined, maxFeePerGas: bigint | undefined, maxPriorityFeePerGas: bigint | undefined): Promise<Hex>;
    sendGolemBaseTransaction(creates?: GolemBaseCreate[], updates?: GolemBaseUpdate[], deletes?: Hex[], extensions?: GolemBaseExtend[], gas?: bigint, maxFeePerGas?: bigint, maxPriorityFeePerGas?: bigint): Promise<Hex>;
    sendGolemBaseTransactionAndWaitForReceipt(creates?: GolemBaseCreate[], updates?: GolemBaseUpdate[], deletes?: Hex[], extensions?: GolemBaseExtend[], args?: {
        gas?: bigint;
        maxFeePerGas?: bigint;
        maxPriorityFeePerGas?: bigint;
        txHashCallback?: (txHash: Hex) => void;
    }): Promise<TransactionReceipt>;
};
export type AllActions<transport extends Transport = Transport> = PublicActions<transport, Chain, Account> & WalletActions<Chain, Account> & GolemBaseActions;
export interface GolemBaseROClient {
    httpClient: Client<HttpTransport, Chain, Account | undefined, RpcSchema, PublicActions<HttpTransport, Chain, Account | undefined> & GolemBaseActions>;
    wsClient: Client<WebSocketTransport, Chain, Account | undefined, RpcSchema, PublicActions<WebSocketTransport, Chain, Account | undefined>>;
}
export interface GolemBaseClient extends GolemBaseROClient {
    walletClient: Client<HttpTransport | CustomTransport, Chain, Account, RpcSchema, WalletActions<Chain, Account> & PublicActions<HttpTransport | CustomTransport, Chain, Account> & GolemBaseWalletActions>;
}
export declare function createROClient(chainId: number, rpcUrl: string, wsUrl: string, logger?: Logger<ILogObj>): GolemBaseROClient;
export declare function createClient(chainId: number, accountData: AccountData, rpcUrl: string, wsUrl: string, logger?: Logger<ILogObj>): Promise<GolemBaseClient>;
