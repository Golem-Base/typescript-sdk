import { readFileSync } from "fs"
import { join } from "path"
import {
  expect
} from "chai"
import { describe, it } from "node:test"
import {
  type ILogObj,
  Logger
} from "tslog"
import xdg from "xdg-portable"
import { Wallet, getBytes } from "ethers"
import {
  internal,
  type GolemDBCreate,
  type Hex,
  Annotation,
  Tagged,
  type AccountData,
  golemBaseABI,
} from "../../src/index.ts"
import {
  generateRandomBytes,
  generateRandomString,
} from "../utils.ts"
import { GolemDBClient } from '../../src/internal/client.ts'
import { decodeEventLog, toHex } from 'viem'

const log = new Logger<ILogObj>({
  name: "internal client spec",
  type: "pretty",
  minLevel: 3,
})

async function getEntitiesOwned(client: internal.GolemDBClient): Promise<Hex[]> {
  return client.httpClient.getEntitiesOfOwner(await ownerAddress(client))
}

async function numOfEntitiesOwned(client: internal.GolemDBClient): Promise<number> {
  const entitiesOwned = await getEntitiesOwned(client)
  log.debug("Entities owned:", entitiesOwned)
  log.debug("Number of entities owned:", entitiesOwned.length)
  return entitiesOwned.length
}

async function deleteAllEntitiesWithIndex(client: internal.GolemDBClient, index: number): Promise<internal.TransactionReceipt[]> {
  log.debug("Deleting entities with index", index)
  const queryResult = await client.httpClient.queryEntities(`ix = ${index}`)
  log.debug("deleteEntitiesWithIndex, queryResult", queryResult)
  return Promise.all(
    queryResult.map(async (res: { key: Hex }) => {
      log.debug("Deleting entity with key", res.key)
      return await client.walletClient.sendGolemDBTransactionAndWaitForReceipt(
        [],
        [],
        [res.key]
      )
    })
  )
}

async function ownerAddress(client: internal.GolemDBClient): Promise<Hex> {
  return (await client.walletClient.getAddresses())[0]
}

// Path to a golembase wallet
const walletPath = join(xdg.config(), 'golembase', 'wallet.json');
// The password that the test wallet was encrypted with
const walletTestPassword = "password";
const keystore = readFileSync(walletPath);
const wallet = Wallet.fromEncryptedJsonSync(keystore, walletTestPassword);

let client: GolemDBClient

const data = generateRandomBytes(32)
const stringAnnotation = generateRandomString(32)

let entitiesOwnedCount = 0
let entityKey: Hex
let expirationBlock: number

describe("the internal golem-base client", () => {
  it("can be created", async () => {
    const key: AccountData = new Tagged("privatekey", getBytes(wallet.privateKey))
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
    await client.walletClient.sendGolemDBTransactionAndWaitForReceipt(
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
    const hash = await client.walletClient.sendGolemDBTransaction([{
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
    const creates: GolemDBCreate[] = [
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
    const receipt = await client.walletClient.sendGolemDBTransactionAndWaitForReceipt(creates)
    entitiesOwnedCount += creates.length;

    const txlog = receipt.logs[0]
    const parsed = decodeEventLog({
      abi: golemBaseABI,
      data: txlog.data,
      topics: txlog.topics
    })

    expect(parsed.eventName).to.eql("GolemBaseStorageEntityCreated")

    if (parsed.eventName === "GolemBaseStorageEntityCreated") {
      // Save these for later
      entityKey = toHex(parsed.args.entityKey, { size: 32 })
      expirationBlock = Number(parsed.args.expirationBlock)
    }

    expect(entityKey).to.exist
    expect(expirationBlock).to.exist

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
    const result = await client.walletClient.sendGolemDBTransactionAndWaitForReceipt([], [{
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
    const result = await client.walletClient.sendGolemDBTransactionAndWaitForReceipt([], [], [], [{
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
