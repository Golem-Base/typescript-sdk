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
import {
  internal,
  type GolemBaseCreate,
  type Hex,
  Annotation,
  Tagged,
  type AccountData,
} from "../../src/index.ts"
import {
  generateRandomBytes,
  generateRandomString,
} from "../utils.ts"
import { GolemBaseClient } from '../../src/internal/client.ts'

const log = new Logger<ILogObj>({
  type: "pretty",
  minLevel: 3,
})

async function getEntitiesOwned(client: internal.GolemBaseClient): Promise<Hex[]> {
  return client.httpClient.getEntitiesOfOwner(await ownerAddress(client))
}

async function numOfEntitiesOwned(client: internal.GolemBaseClient): Promise<number> {
  const entitiesOwned = await getEntitiesOwned(client)
  log.debug("Entities owned:", entitiesOwned)
  log.debug("Number of entities owned:", entitiesOwned.length)
  return entitiesOwned.length
}

async function deleteAllEntitiesWithIndex(client: internal.GolemBaseClient, index: number): Promise<internal.TransactionReceipt[]> {
  log.debug("Deleting entities with index", index)
  const queryResult = await client.httpClient.queryEntities(`ix = ${index}`)
  log.debug("deleteEntitiesWithIndex, queryResult", queryResult)
  return Promise.all(
    queryResult.map(async (res: { key: Hex }) => {
      log.debug("Deleting entity with key", res.key)
      return await client.walletClient.sendGolemBaseTransactionAndWaitForReceipt(
        [],
        [],
        [res.key]
      )
    })
  )
}

async function ownerAddress(client: internal.GolemBaseClient): Promise<Hex> {
  return (await client.walletClient.getAddresses())[0]
}

const keyBytes = fs.readFileSync(xdg.config() + '/golembase/private.key');
let client: GolemBaseClient

const data = generateRandomBytes(32)
const stringAnnotation = generateRandomString(32)

let entitiesOwnedCount = 0
let entityKey: Hex
let expirationBlock: number

describe("the internal golem-base client", () => {
  it("can be created", async () => {
    const key: AccountData = new Tagged("privatekey", keyBytes)
    client = {
      local: await internal.createClient(
        1337,
        key,
        'http://localhost:8545',
        'ws://localhost:8545',
        log),
      demo: await internal.createClient(
        1337,
        key,
        'https://api.golembase.demo.golem-base.io',
        'wss://ws-api.golembase.demo.golem-base.io',
        log),
      kaolin: await internal.createClient(
        600606,
        key,
        'https://rpc.kaolin.holesky.golem-base.io',
        'wss://ws.rpc.kaolin.holesky.golem-base.io',
      ),
    }.local

    expect(client).to.exist
  })

  it("should delete all our entities", async () => {
    await client.walletClient.sendGolemBaseTransactionAndWaitForReceipt(
      [],
      [],
      await getEntitiesOwned(client)
    )
    expect(await numOfEntitiesOwned(client)).to.eql(entitiesOwnedCount)
  })

  it("should not crash on no entities to expire", async () => {
    expect((await client.httpClient.getEntitiesToExpireAtBlock(0n))).to.have.lengthOf(0)
  })
  it("should not crash on no entities in query", async () => {
    expect(await client.httpClient.queryEntities('foo = "foo"')).to.have.lengthOf(0)
  })

  it("should be able to create entities", async () => {
    const hash = await client.walletClient.sendGolemBaseTransaction([{
      data: generateRandomBytes(32),
      btl: 25,
      stringAnnotations: [new Annotation("key", generateRandomString(32))],
      numericAnnotations: [new Annotation("ix", 1)]
    }])
    expect(hash).to.exist
    await client.httpClient.waitForTransactionReceipt({ hash })

    entitiesOwnedCount += 1
    expect(await numOfEntitiesOwned(client)).to.eql(entitiesOwnedCount)
  })

  it("should be able to create multiple entities", async () => {
    const creates: GolemBaseCreate[] = [
      {
        data,
        btl: 25,
        stringAnnotations: [new Annotation("key", stringAnnotation)],
        numericAnnotations: [new Annotation("ix", 2)]
      },
      {
        data,
        btl: 15,
        stringAnnotations: [new Annotation("key", generateRandomString(32))],
        numericAnnotations: [new Annotation("ix", 3)]
      },
      {
        data,
        btl: 15,
        stringAnnotations: [new Annotation("key", generateRandomString(32))],
        numericAnnotations: [new Annotation("ix", 3)]
      }
    ]
    const receipts = await client.walletClient.sendGolemBaseTransactionAndWaitForReceipt(creates)
    entitiesOwnedCount += creates.length;
    // Save this key for later
    [{ entityKey, expirationBlock }] = receipts.logs.map(txlog => ({
      entityKey: txlog.topics[1] as Hex,
      expirationBlock: parseInt(txlog.data),
    }))

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
    const entities = await client.httpClient.queryEntities(`key = "${stringAnnotation}"`)
    expect(entities).to.eql([{
      key: entityKey,
      value: data,
    }])
  })

  it("should be able to query entities based on numeric annotations", async () => {
    const entities = await client.httpClient.queryEntities(`ix = 2`)
    expect(entities).to.eql([{
      key: entityKey,
      value: data,
    }])
  })

  it("should be able to query entities based on multiple annotations", async () => {
    const entities = await client.httpClient.queryEntities(`key = "${stringAnnotation}" && ix = 2`)
    expect(entities).to.eql([{
      key: entityKey,
      value: data,
    }])
  })

  it("should be able to retrieve the stored value", async () => {
    const value = await client.httpClient.getStorageValue(entityKey)
    log.debug(value)
    expect(value).to.eql(data)
  })

  it("should be able to retrieve the entity metadata", async () => {
    const value = await client.httpClient.getEntityMetaData(entityKey)
    expect(value).to.eql({
      expiresAtBlock: expirationBlock,
      stringAnnotations: [{ key: "key", value: stringAnnotation }],
      numericAnnotations: [{ key: "ix", value: 2 }],
      // We get back a non-checksum-encoded address, so we convert back to all lower case here
      owner: (await ownerAddress(client)).toLowerCase()
    })
  })

  it("should be able to retrieve the entities that expire at a given block", async () => {
    const entities = await client.httpClient.getEntitiesToExpireAtBlock(BigInt(expirationBlock))
    expect(entities).to.contain(
      entityKey
    )
  })

  it("should be able to update entities", async () => {
    const newData = generateRandomBytes(32)
    const newStringAnnotation = generateRandomString(32)
    const result = await client.walletClient.sendGolemBaseTransactionAndWaitForReceipt([], [{
      entityKey,
      btl: 10,
      data: newData,
      stringAnnotations: [new Annotation("key", newStringAnnotation)],
      numericAnnotations: [new Annotation("ix", 2)],
    }])
    expect(result).to.exist
    log.debug(result)
    expect(await numOfEntitiesOwned(client)).to.eql(entitiesOwnedCount, "wrong number of entities owned")
  })

  it("should be able to extend entities", async () => {
    const numberOfBlocks = 20
    const result = await client.walletClient.sendGolemBaseTransactionAndWaitForReceipt([], [], [], [{
      entityKey,
      numberOfBlocks,
    }])
    expect(result).to.exist
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
