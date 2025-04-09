import * as fs from 'fs'
import {
  expect
} from "chai"
import { describe, it } from "node:test"
import {
  type ILogObj,
  Logger
} from "tslog"
import {
  createClient,
  GolemBaseClient,
  type Hex,
  type GolemBaseCreate,
} from "../src/index"

const log = new Logger<ILogObj>({
  type: "pretty",
  minLevel: 3,
})

function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

const keyBytes = fs.readFileSync('/home/ramses/.config/golembase/private.key')

let entitiesOwnedCount = 0
let entityKey: Hex = "0x"
let expiryBlock: number

describe("the golem-base client", () => {
  const client = createClient(keyBytes, 'http://localhost:8545', log)

  const data = generateRandomString(32)
  const stringAnnotation = generateRandomString(32)

  async function numOfEntitiesOwned(client: GolemBaseClient): Promise<number> {
    const entitiesOwned = await client.getEntitiesOfOwner(await client.getOwnerAddress())
    log.info("Entities owned:", entitiesOwned)
    log.info("Number of entities owned:", entitiesOwned.length)
    return entitiesOwned.length
  }

  async function deleteAllEntitiesWithIndex(client: GolemBaseClient, index: number): Promise<void[]> {
    log.debug("Deleting entities with index", index)
    const queryResult = await client.queryEntities(`ix = ${index}`)
    log.debug("deleteEntitiesWithIndex, queryResult", queryResult)
    return Promise.all(
      queryResult.map(async (res) => {
        log.debug("Deleting entity with key", res.key)
        await client.deleteEntities([res.key])
      })
    )
  }

  it("should delete all existing entities", async () => {
    await client.deleteEntities(await client.getAllEntityKeys())
  })

  it("should be able to create entities", async () => {
    const receipt = await client.createEntities([{
      data: generateRandomString(32),
      ttl: 25,
      stringAnnotations: [["key", generateRandomString(32)]],
      numericAnnotations: [["ix", 1]]
    }])
    expect(receipt).to.exist

    entitiesOwnedCount += 1
    expect(await numOfEntitiesOwned(client)).to.eql(entitiesOwnedCount)
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
    const receipts = await client.createEntities(creates)
    entitiesOwnedCount += creates.length
    // Save this key for later
    entityKey = receipts[0].entityKey

    expiryBlock = receipts[0].expirationBlock

    expect(await numOfEntitiesOwned(client)).to.eql(entitiesOwnedCount)
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
    const entities = await client.getEntitiesForStringAnnotationValue("key", stringAnnotation)
    expect(entities).to.eql([entityKey])
  })

  it("should be able to retrieve entities based on numeric annotations", async () => {
    const entities = await client.getEntitiesForNumericAnnotationValue("ix", 2)
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
    expect(value).to.eql(Buffer.from(data, 'binary').toString('base64'))
  })

  it("should be able to retrieve the entity metadata", async () => {
    const value = await client.getEntityMetaData(entityKey)
    expect(value).to.eql({
      expiresAtBlock: expiryBlock,
      stringAnnotations: [{ key: "key", value: stringAnnotation }],
      numericAnnotations: [{ key: "ix", value: 2 }],
      // We get back a non-checksum-encoded address, so we convert back to all lower case here
      owner: (await client.getOwnerAddress()).toLowerCase()
    })
  })

  it("should be able to retrieve the entities that expire at a given block", async () => {
    const entities = await client.getEntitiesToExpireAtBlock(BigInt(expiryBlock))
    expect(entities).to.eql([
      entityKey
    ])
  })

  it("should be able to update entities", async () => {
    const newData = generateRandomString(32)
    const newStringAnnotation = generateRandomString(32)
    log.info(await client.updateEntities([{
      entityKey,
      ttl: 10,
      data: newData,
      stringAnnotations: [["key", newStringAnnotation]],
      numericAnnotations: [["ix", 2]],
    }]))
    expect(await numOfEntitiesOwned(client)).to.eql(entitiesOwnedCount, "wrong number of entities owned")
  })

  it("should be able to delete entities", async () => {
    await deleteAllEntitiesWithIndex(client, 1)
    entitiesOwnedCount--
    expect(await numOfEntitiesOwned(client)).to.eql(entitiesOwnedCount, "wrong number of entities owned")

    await deleteAllEntitiesWithIndex(client, 2)
    entitiesOwnedCount--
    expect(await numOfEntitiesOwned(client)).to.eql(entitiesOwnedCount, "wrong number of entities owned")
    await deleteAllEntitiesWithIndex(client, 3)
    entitiesOwnedCount -= 2
    expect(await numOfEntitiesOwned(client)).to.eql(entitiesOwnedCount, "wrong number of entities owned")
  })
})
