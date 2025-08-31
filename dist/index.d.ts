export * from "./client";
export * as internal from "./internal/client";
export { formatEther } from "viem";
export declare const golemBaseABI: readonly [{
    readonly name: "GolemBaseStorageEntityCreated";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "entityKey";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "expirationBlock";
    }];
}, {
    readonly name: "GolemBaseStorageEntityUpdated";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "entityKey";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "expirationBlock";
    }];
}, {
    readonly name: "GolemBaseStorageEntityDeleted";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "entityKey";
        readonly indexed: true;
    }];
}, {
    readonly name: "GolemBaseStorageEntityBTLExtended";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "entityKey";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "oldExpirationBlock";
    }, {
        readonly type: "uint256";
        readonly name: "newExpirationBlock";
    }];
}];
export declare const golemBaseStorageEntityCreatedSignature: `0x${string}`;
export declare const golemBaseStorageEntityUpdatedSignature: `0x${string}`;
export declare const golemBaseStorageEntityDeletedSignature: `0x${string}`;
export declare const golemBaseStorageEntityBTLExtendedSignature: `0x${string}`;
export declare class Annotation<V> {
    readonly key: string;
    readonly value: V;
    constructor(key: string, value: V);
}
export type StringAnnotation = Annotation<string>;
export type NumericAnnotation = Annotation<number>;
export declare class Tagged<Tag, Data> {
    readonly tag: Tag;
    readonly data: Data;
    constructor(tag: Tag, data: Data);
}
export type AccountData = Tagged<"privatekey", Uint8Array> | Tagged<"ethereumprovider", {
    request(...args: any): Promise<any>;
}>;
export type Hex = `0x${string}`;
export type GolemBaseCreate = {
    readonly data: Uint8Array;
    readonly btl: number;
    readonly stringAnnotations: StringAnnotation[];
    readonly numericAnnotations: NumericAnnotation[];
};
export type GolemBaseUpdate = {
    readonly entityKey: Hex;
    readonly data: Uint8Array;
    readonly btl: number;
    readonly stringAnnotations: StringAnnotation[];
    readonly numericAnnotations: NumericAnnotation[];
};
export type GolemBaseExtend = {
    readonly entityKey: Hex;
    readonly numberOfBlocks: number;
};
export type GolemBaseTransaction = {
    readonly creates?: GolemBaseCreate[];
    readonly updates?: GolemBaseUpdate[];
    readonly deletes?: Hex[];
    readonly extensions?: GolemBaseExtend[];
};
export type EntityMetaData = {
    readonly expiresAtBlock: bigint;
    readonly payload: string;
    readonly stringAnnotations: StringAnnotation[];
    readonly numericAnnotations: NumericAnnotation[];
    readonly owner: Hex;
};
