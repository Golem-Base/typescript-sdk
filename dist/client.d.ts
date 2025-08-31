import * as internal from "./internal/client";
import { type ILogObj, Logger } from "tslog";
import { type Hex, type GolemBaseCreate, type GolemBaseUpdate, type GolemBaseExtend, type EntityMetaData, type AccountData } from ".";
export type CreateEntityReceipt = {
    entityKey: Hex;
    expirationBlock: number;
};
export type UpdateEntityReceipt = {
    entityKey: Hex;
    expirationBlock: number;
};
export type DeleteEntityReceipt = {
    entityKey: Hex;
};
export type ExtendEntityReceipt = {
    entityKey: Hex;
    oldExpirationBlock: number;
    newExpirationBlock: number;
};
interface GenericClient<Internal> {
    getRawClient(): Internal;
    getEntityCount(): Promise<number>;
    getAllEntityKeys(): Promise<Hex[]>;
    getEntitiesOfOwner(address: Hex): Promise<Hex[]>;
    getStorageValue(key: Hex): Promise<Uint8Array>;
    queryEntities(query: string): Promise<{
        entityKey: Hex;
        storageValue: Uint8Array;
    }[]>;
    getEntitiesToExpireAtBlock(blockNumber: bigint): Promise<Hex[]>;
    getEntityMetaData(key: Hex): Promise<EntityMetaData>;
    watchLogs(args: {
        fromBlock: bigint;
        onCreated: (args: {
            entityKey: Hex;
            expirationBlock: number;
        }) => void;
        onUpdated: (args: {
            entityKey: Hex;
            expirationBlock: number;
        }) => void;
        onExtended: (args: {
            entityKey: Hex;
            oldExpirationBlock: number;
            newExpirationBlock: number;
        }) => void;
        onDeleted: (args: {
            entityKey: Hex;
        }) => void;
        onError?: ((error: Error) => void) | undefined;
        pollingInterval?: number;
        transport?: `http` | `websocket`;
    }): () => void;
}
export interface GolemBaseROClient extends GenericClient<internal.GolemBaseROClient> {
}
export interface GolemBaseClient extends GenericClient<internal.GolemBaseClient> {
    getOwnerAddress(): Promise<Hex>;
    sendTransaction(creates?: GolemBaseCreate[], updates?: GolemBaseUpdate[], deletes?: Hex[], extensions?: GolemBaseExtend[], args?: {
        txHashCallback?: (txHash: Hex) => void;
        gas?: bigint;
        maxFeePerGas?: bigint | undefined;
        maxPriorityFeePerGas?: bigint | undefined;
    }): Promise<{
        createEntitiesReceipts: CreateEntityReceipt[];
        updateEntitiesReceipts: UpdateEntityReceipt[];
        deleteEntitiesReceipts: DeleteEntityReceipt[];
        extendEntitiesReceipts: ExtendEntityReceipt[];
    }>;
    createEntities(creates: GolemBaseCreate[], args?: {
        txHashCallback?: (txHash: Hex) => void;
        gas?: bigint;
        maxFeePerGas?: bigint | undefined;
        maxPriorityFeePerGas?: bigint | undefined;
    }): Promise<CreateEntityReceipt[]>;
    updateEntities(updates: GolemBaseUpdate[], args?: {
        txHashCallback?: (txHash: Hex) => void;
        gas?: bigint;
        maxFeePerGas?: bigint | undefined;
        maxPriorityFeePerGas?: bigint | undefined;
    }): Promise<UpdateEntityReceipt[]>;
    deleteEntities(deletes: Hex[], args?: {
        txHashCallback?: (txHash: Hex) => void;
        gas?: bigint;
        maxFeePerGas?: bigint | undefined;
        maxPriorityFeePerGas?: bigint | undefined;
    }): Promise<DeleteEntityReceipt[]>;
    extendEntities(extensions: GolemBaseExtend[], args?: {
        txHashCallback?: (txHash: Hex) => void;
        gas?: bigint;
        maxFeePerGas?: bigint | undefined;
        maxPriorityFeePerGas?: bigint | undefined;
    }): Promise<ExtendEntityReceipt[]>;
}
export declare function createROClient(chainId: number, rpcUrl: string, wsUrl: string, logger?: Logger<ILogObj>): GolemBaseROClient;
export declare function createClient(chainId: number, accountData: AccountData, rpcUrl: string, wsUrl: string, logger?: Logger<ILogObj>): Promise<GolemBaseClient>;
export {};
