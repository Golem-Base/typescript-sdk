import * as fs from 'fs'
import {
  expect
} from "chai"
import { describe, it } from "node:test"
import {
  type ILogObj,
  Logger
} from "tslog"
import xdg from "xdg-portable"
//import { spawn } from "child_process"
import {
  createClient,
  type GolemBaseClient,
  type Hex,
  type GolemBaseCreate,
  Annotation,
  Tagged,
} from "../src/index.ts"
import {
  generateRandomBytes,
  generateRandomString,
} from "./utils.ts"

const log = new Logger<ILogObj>({
  type: "pretty",
  minLevel: 3,
})

const keyBytes = fs.readFileSync(xdg.config() + '/golembase/private.key');

let entitiesOwnedCount = 0
let entityKey: Hex = "0x"
let expiryBlock: number
let client: GolemBaseClient

describe("the golem-base client", () => {
  it("can be created", async () => {
    client = await createClient(
      new Tagged("privatekey", keyBytes),
      //'http://localhost:8545',
      //'ws://localhost:8546',
      'https://api.golembase.demo.golem-base.io',
      'wss://ws-api.golembase.demo.golem-base.io',
      log)

    expect(client).to.exist
  })

  const data = generateRandomBytes(32)
  const stringAnnotation = generateRandomString(32)

  async function getEntitiesOwned(client: GolemBaseClient): Promise<Hex[]> {
    return client.getEntitiesOfOwner(await client.getOwnerAddress())
  }

  async function numOfEntitiesOwned(client: GolemBaseClient): Promise<number> {
    const entitiesOwned = await getEntitiesOwned(client)
    log.debug("Entities owned:", entitiesOwned)
    log.debug("Number of entities owned:", entitiesOwned.length)
    return entitiesOwned.length
  }

  async function deleteAllEntitiesWithIndex(client: GolemBaseClient, index: number): Promise<void[]> {
    log.debug("Deleting entities with index", index)
    const queryResult = await client.queryEntities(`ix = ${index}`)
    log.debug("deleteEntitiesWithIndex, queryResult", queryResult)
    return Promise.all(
      queryResult.map(async (res) => {
        log.debug("Deleting entity with key", res.entityKey)
        await client.deleteEntities([res.entityKey])
      })
    )
  }

  it("should delete all our existing entities", async () => {
    await client.deleteEntities(await getEntitiesOwned(client))
  })

  it("should be able to create entities", async () => {
    const receipt = await client.createEntities([{
      data: generateRandomBytes(32),
      ttl: 25,
      stringAnnotations: [new Annotation("key", generateRandomString(32))],
      numericAnnotations: [new Annotation("ix", 1)]
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
        stringAnnotations: [new Annotation("key", stringAnnotation)],
        numericAnnotations: [new Annotation("ix", 2)]
      },
      {
        data,
        ttl: 5,
        stringAnnotations: [new Annotation("key", generateRandomString(32))],
        numericAnnotations: [new Annotation("ix", 3)]
      },
      {
        data,
        ttl: 5,
        stringAnnotations: [new Annotation("key", generateRandomString(32))],
        numericAnnotations: [new Annotation("ix", 3)]
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
    const entityCount = await numOfEntitiesOwned(client)
    expect(entityCount).to.eql(entitiesOwnedCount, "wrong number of entities in DB")
  })

  it("should have the right entity keys", async () => {
    const allEntityKeys = await getEntitiesOwned(client)
    expect(allEntityKeys).to.have.a.lengthOf(entitiesOwnedCount, "wrong number of entities in DB")
    expect(allEntityKeys).to.include(entityKey, "expected entity not in DB")
  })

  it("should be able to query entities based on string annotations", async () => {
    const entities = await client.queryEntities(`key = "${stringAnnotation}"`)
    expect(entities).to.eql([{
      entityKey: entityKey,
      storageValue: data,
    }])
  })

  it("should be able to query entities based on numeric annotations", async () => {
    const entities = await client.queryEntities(`ix = 2`)
    expect(entities).to.eql([{
      entityKey: entityKey,
      storageValue: data,
    }])
  })

  it("should be able to query entities based on multiple annotations", async () => {
    const entities = await client.queryEntities(`key = "${stringAnnotation}" && ix = 2`)
    expect(entities).to.eql([{
      entityKey: entityKey,
      storageValue: data,
    }])
  })

  it("should be able to retrieve the stored value", async () => {
    const value = await client.getStorageValue(entityKey)
    expect(value).to.eql(data)
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
    const newData = generateRandomBytes(32)
    const newStringAnnotation = generateRandomString(32)
    const [result] = (await client.updateEntities([{
      entityKey,
      ttl: 10,
      data: newData,
      stringAnnotations: [new Annotation("key", newStringAnnotation)],
      numericAnnotations: [new Annotation("ix", 2)],
    }]))
    expect(result).to.exist
    log.debug(result)
    expect(await numOfEntitiesOwned(client)).to.eql(entitiesOwnedCount, "wrong number of entities owned")
  })

  it("should be able to extend entities", async () => {
    const numberOfBlocks = 20
    const [result] = (await client.extendEntities([{
      entityKey,
      numberOfBlocks,
    }]))
    expect(result).to.exist
    log.debug(`Extend result: ${JSON.stringify(result, (_, v) => typeof v === 'bigint' ? v.toString() : v)}`)
    expect(await numOfEntitiesOwned(client)).to.eql(entitiesOwnedCount, "wrong number of entities owned")
    expect(result.newExpirationBlock - result.oldExpirationBlock == BigInt(numberOfBlocks))
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
