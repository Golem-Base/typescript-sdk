export * from "./client"
export * as internal from "./internal/client"

export type Hex = `0x${string}`
/**
 * Type representing a create transaction in GolemBase
 */
export type GolemBaseCreate = {
  data: string,
  ttl: number,
  stringAnnotations: [string, string][],
  numericAnnotations: [string, number][],
}
/**
 * Type representing an update transaction in GolemBase
 */
export type GolemBaseUpdate = {
  entityKey: Hex,
  data: string,
  ttl: number,
  stringAnnotations: [string, string][],
  numericAnnotations: [string, number][],
}
/**
 * Type representing a delete transaction in GolemBase
 */
export type GolemBaseTransaction = {
  creates?: GolemBaseCreate[],
  updates?: GolemBaseUpdate[],
  deletes?: Hex[],
}

export type EntityMetaData = {
  expiresAtBlock: number,
  payload: string,
  stringAnnotations: {
    key: string,
    value: string,
  },
  numericAnnotations: {
    key: string,
    value: number,
  },
  owner: Hex,
}
