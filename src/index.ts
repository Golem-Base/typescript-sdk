import {
  getAbiItem,
  parseAbi,
  toEventHash,
} from "viem"

export * from "./client"
export * as internal from "./internal/client"

export { formatEther } from "viem"

// The Golem Base ABI
export const golemBaseABI = parseAbi([
  "event GolemBaseStorageEntityCreated(uint256 indexed entityKey, uint256 expirationBlock)",
  "event GolemBaseStorageEntityUpdated(uint256 indexed entityKey, uint256 expirationBlock)",
  "event GolemBaseStorageEntityDeleted(uint256 indexed entityKey)",
  "event GolemBaseStorageEntityBTLExtended(uint256 indexed entityKey, uint256 oldExpirationBlock, uint256 newExpirationBlock)",
])

// Golem Base event signatures
export const golemBaseStorageEntityCreatedSignature =
  toEventHash(getAbiItem({ abi: golemBaseABI, name: "GolemBaseStorageEntityCreated" }))
export const golemBaseStorageEntityUpdatedSignature =
  toEventHash(getAbiItem({ abi: golemBaseABI, name: "GolemBaseStorageEntityUpdated" }))
export const golemBaseStorageEntityDeletedSignature =
  toEventHash(getAbiItem({ abi: golemBaseABI, name: "GolemBaseStorageEntityDeleted" }))
export const golemBaseStorageEntityBTLExtendedSignature =
  toEventHash(getAbiItem({ abi: golemBaseABI, name: "GolemBaseStorageEntityBTLExtended" }))


/**
 * Type representing an annotation with a key and a value, used for efficient lookups
 */
export class Annotation<V> {
  readonly key: string
  readonly value: V

  constructor(key: string, value: V) {
    this.key = key
    this.value = value
  }
}
export type StringAnnotation = Annotation<string>
export type NumericAnnotation = Annotation<number>

export class Tagged<Tag, Data> {
  readonly tag: Tag
  readonly data: Data

  constructor(tag: Tag, data: Data) {
    this.tag = tag
    this.data = data
  }
}

export type AccountData =
  Tagged<"privatekey", Uint8Array> |
  Tagged<"ethereumprovider", { request(...args: any): Promise<any> }>

/**
 * Type representing hexadecimal numbers
 */
export type Hex = `0x${string}`

/**
 * Type representing a create transaction in GolemBase
 */
export type GolemBaseCreate = {
  readonly data: Uint8Array,
  readonly btl: number,
  readonly stringAnnotations: StringAnnotation[]
  readonly numericAnnotations: NumericAnnotation[],
}
/**
 * Type representing an update transaction in GolemBase
 */
export type GolemBaseUpdate = {
  readonly entityKey: Hex,
  readonly data: Uint8Array,
  readonly btl: number,
  readonly stringAnnotations: StringAnnotation[]
  readonly numericAnnotations: NumericAnnotation[],
}
/**
 * Type representing an extend transaction in GolemBase
 */
export type GolemBaseExtend = {
  readonly entityKey: Hex,
  readonly numberOfBlocks: number,
}
/**
 * Type representing a delete transaction in GolemBase
 */
export type GolemBaseTransaction = {
  readonly creates?: GolemBaseCreate[],
  readonly updates?: GolemBaseUpdate[],
  readonly deletes?: Hex[],
  readonly extensions?: GolemBaseExtend[],
}

/**
 * Type representing the metadata of a entity stored in GolemBase
 */
export type EntityMetaData = {
  readonly expiresAtBlock: bigint,
  readonly payload: string,
  readonly stringAnnotations: StringAnnotation[],
  readonly numericAnnotations: NumericAnnotation[],
  readonly owner: Hex,
}
