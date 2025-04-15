import * as fs from 'fs'
import {
  expect
} from "chai"
import { describe, it } from "node:test"
import {
  ILogObj,
  Logger
} from "tslog"
import xdg from "xdg-portable"
import {
  internal,
  type GolemBaseCreate,
  type Hex
} from "../.."
import {
  generateRandomString,
} from "../utils.ts"

const log = new Logger<ILogObj>({
  type: "pretty",
  minLevel: 3,
})

async function numOfEntitiesOwnedBy(client: internal.GolemBaseClient, owner: Hex): Promise<number> {
  const entitiesOwned = await client.getEntitiesOfOwner(owner)
  log.debug("Entities owned:", entitiesOwned)
  log.debug("Number of entities owned:", entitiesOwned.length)
  return entitiesOwned.length
}

async function deleteAllEntitiesWithIndex(client: internal.GolemBaseClient, index: number): Promise<internal.TransactionReceipt[]> {
  log.debug("Deleting entities with index", index)
  const queryResult = await client.queryEntities(`ix = ${index}`)
  log.debug("deleteEntitiesWithIndex, queryResult", queryResult)
  return Promise.all(
    queryResult.map(async (res: internal.GolemQueryEntitiesReturnType) => {
      log.debug("Deleting entity with key", res.key)
      return await client.deleteEntitiesAndWaitForReceipt([res.key])
    })
  )
}

const keyBytes = fs.readFileSync(xdg.config() + '/golembase/private.key');
const client = internal.createClient(keyBytes, 'http://localhost:8545', log)

async function ownerAddress(): Promise<Hex> {
  return (await client.getAddresses())[0]
}

const data = generateRandomString(32)
const stringAnnotation = generateRandomString(32)

let entitiesOwnedCount = 0
let entityKey: Hex
let expirationBlock: number

describe("the internal golem-base client", () => {
  it("should delete all entities", async () => {
    await client.deleteEntitiesAndWaitForReceipt(await client.getAllEntityKeys())
  })

  it("should be able to create entities", async () => {
    const hash = await client.createEntities([{
      data: generateRandomString(32),
      ttl: 25,
      stringAnnotations: [["key", generateRandomString(32)]],
      numericAnnotations: [["ix", 1]]
    }])
    expect(hash).to.exist
    await client.waitForTransactionReceipt({ hash })

    entitiesOwnedCount += 1
    expect(await numOfEntitiesOwnedBy(client, await ownerAddress())).to.eql(entitiesOwnedCount)
  })

  it("should be able to create multiple entities", async () => {
    const creates: GolemBaseCreate[] = [
      {
        data,
        ttl: 25,
        stringAnnotations: [["key", stringAnnotation]],
        numericAnnotations: [["ix", 2]]
      },
      {
        data,
        ttl: 5,
        stringAnnotations: [["key", generateRandomString(32)]],
        numericAnnotations: [["ix", 3]]
      },
      {
        data,
        ttl: 5,
        stringAnnotations: [["key", generateRandomString(32)]],
        numericAnnotations: [["ix", 3]]
      }
    ]
    const receipts = await client.createEntitiesAndWaitForReceipt(creates)
    entitiesOwnedCount += creates.length;
    // Save this key for later
    ({ entityKey, expirationBlock } = receipts.logs.map(txlog => ({
      entityKey: txlog.topics[1] as Hex,
      expirationBlock: parseInt(txlog.data),
    }))[0])

    expect(await numOfEntitiesOwnedBy(client, await ownerAddress())).to.eql(entitiesOwnedCount)
  })

  it("should have the right amount of entities", async () => {
    const entityCount = await client.getEntityCount()
    expect(entityCount).to.eql(entitiesOwnedCount, "wrong number of entities in DB")
  })

  it("should have the right entity keys", async () => {
    const allEntityKeys = await client.getAllEntityKeys()
    expect(allEntityKeys).to.have.a.lengthOf(entitiesOwnedCount, "wrong number of entities in DB")
    expect(allEntityKeys).to.include(entityKey, "expected entity not in DB")
  })

  it("should be able to retrieve entities based on string annotations", async () => {
    const entities = await client.getEntitiesForStringAnnotationValue({ key: "key", value: stringAnnotation })
    expect(entities).to.eql([entityKey])
  })

  it("should be able to retrieve entities based on numeric annotations", async () => {
    const entities = await client.getEntitiesForNumericAnnotationValue({ key: "ix", value: 2 })
    expect(entities).to.eql([entityKey])
  })

  it("should be able to query entities based on string annotations", async () => {
    const entities = await client.queryEntities(`key = "${stringAnnotation}"`)
    expect(entities).to.eql([{
      key: entityKey,
      value: Buffer.from(data, 'binary').toString('base64'),
    }])
  })

  it("should be able to query entities based on numeric annotations", async () => {
    const entities = await client.queryEntities(`ix = 2`)
    expect(entities).to.eql([{
      key: entityKey,
      value: Buffer.from(data, 'binary').toString('base64'),
    }])
  })

  it("should be able to query entities based on multiple annotations", async () => {
    const entities = await client.queryEntities(`key = "${stringAnnotation}" && ix = 2`)
    expect(entities).to.eql([{
      key: entityKey,
      value: Buffer.from(data, 'binary').toString('base64'),
    }])
  })

  it("should be able to retrieve the stored value", async () => {
    const value = await client.getStorageValue(entityKey)
    log.debug(value)
    expect(value).to.eql(Buffer.from(data, 'binary').toString('base64'))
  })

  it("should be able to retrieve the entity metadata", async () => {
    const value = await client.getEntityMetaData(entityKey)
    expect(value).to.eql({
      expiresAtBlock: expirationBlock,
      stringAnnotations: [{ key: "key", value: stringAnnotation }],
      numericAnnotations: [{ key: "ix", value: 2 }],
      // We get back a non-checksum-encoded address, so we convert back to all lower case here
      owner: (await ownerAddress()).toLowerCase()
    })
  })

  it("should be able to retrieve the entities that expire at a given block", async () => {
    const entities = await client.getEntitiesToExpireAtBlock(BigInt(expirationBlock))
    expect(entities).to.eql([
      entityKey
    ])
  })

  it("should be able to update entities", async () => {
    const newData = generateRandomString(32)
    const newStringAnnotation = generateRandomString(32)
    const result = await client.updateEntitiesAndWaitForReceipt([{
      entityKey,
      ttl: 10,
      data: newData,
      stringAnnotations: [["key", newStringAnnotation]],
      numericAnnotations: [["ix", 2]],
    }])
    expect(result).to.exist
    log.debug(result)
    expect(await numOfEntitiesOwnedBy(client, await ownerAddress())).to.eql(entitiesOwnedCount, "wrong number of entities owned")
  })

  it("should be able to extend entities", async () => {
    const numberOfBlocks = 20
    const result = await client.extendEntitiesAndWaitForReceipt([{
      entityKey,
      numberOfBlocks,
    }])
    expect(result).to.exist
    expect(await numOfEntitiesOwnedBy(client, await ownerAddress())).to.eql(entitiesOwnedCount, "wrong number of entities owned")
  })

  it("should be able to delete entities", async () => {
    await deleteAllEntitiesWithIndex(client, 1)
    entitiesOwnedCount--
    expect(await numOfEntitiesOwnedBy(client, await ownerAddress())).to.eql(entitiesOwnedCount, "wrong number of entities owned")

    await deleteAllEntitiesWithIndex(client, 2)
    entitiesOwnedCount--
    expect(await numOfEntitiesOwnedBy(client, await ownerAddress())).to.eql(entitiesOwnedCount, "wrong number of entities owned")
    await deleteAllEntitiesWithIndex(client, 3)
    entitiesOwnedCount -= 2
    expect(await numOfEntitiesOwnedBy(client, await ownerAddress())).to.eql(entitiesOwnedCount, "wrong number of entities owned")
  })
})
