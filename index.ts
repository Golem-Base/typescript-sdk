export * from "./src/client"
export * as internal from "./src/internal/client"

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
  readonly ttl: number,
  readonly stringAnnotations: StringAnnotation[]
  readonly numericAnnotations: NumericAnnotation[],
}
/**
 * Type representing an update transaction in GolemBase
 */
export type GolemBaseUpdate = {
  readonly entityKey: Hex,
  readonly data: Uint8Array,
  readonly ttl: number,
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
