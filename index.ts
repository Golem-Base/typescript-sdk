export * from "./src/client"
export * as internal from "./src/internal/client"

/**
 * Type representing an annotation with a key and a value, used for efficient lookups
 */
export class Annotation<V> {
  key: string
  value: V

  constructor(key: string, value: V) {
    this.key = key
    this.value = value
  }
}
export type StringAnnotation = Annotation<string>
export type NumericAnnotation = Annotation<number>

/**
 * Type representing hexadecimal numbers
 */
export type Hex = `0x${string}`

/**
 * Type representing a create transaction in GolemBase
 */
export type GolemBaseCreate = {
  data: string,
  ttl: number,
  stringAnnotations: StringAnnotation[]
  numericAnnotations: NumericAnnotation[],
}
/**
 * Type representing an update transaction in GolemBase
 */
export type GolemBaseUpdate = {
  entityKey: Hex,
  data: string,
  ttl: number,
  stringAnnotations: StringAnnotation[]
  numericAnnotations: NumericAnnotation[],
}
/**
 * Type representing an extend transaction in GolemBase
 */
export type GolemBaseExtend = {
  entityKey: Hex,
  numberOfBlocks: number,
}
/**
 * Type representing a delete transaction in GolemBase
 */
export type GolemBaseTransaction = {
  creates?: GolemBaseCreate[],
  updates?: GolemBaseUpdate[],
  deletes?: Hex[],
  extensions?: GolemBaseExtend[],
}

/**
 * Type representing the metadata of a entity stored in GolemBase
 */
export type EntityMetaData = {
  expiresAtBlock: bigint,
  payload: string,
  stringAnnotations: StringAnnotation[],
  numericAnnotations: NumericAnnotation[],
  owner: Hex,
}
