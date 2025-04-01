import * as fs from 'fs'
import {
  createClient,
  GolemBaseCreate,
  GolemQueryEntitiesReturnType,
  TransactionReceipt,
  type Hex
} from './client'
import {
  ILogObj,
  Logger
} from "tslog";

const log = new Logger<ILogObj>({
  type: "pretty",
  minLevel: 3,
})

function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function generateRandomNumber(): number {
  return Math.floor(Math.random() * 1000);
}

function assert(condition: unknown, msg?: string): asserts condition {
  if (condition === false) throw new Error(msg)
}

function assertEqual<T>(a: T, b: T, msg?: string) {
  if (a !== b) throw new Error(`${msg}: ${a} is not equal to ${b}`)
}

async function numOfEntitiesOwnedBy(client: any, owner: Hex): Promise<number> {
  const entitiesOwned = await client.getEntitiesOfOwner(owner)
  log.info("Entities owned:", entitiesOwned)
  log.info("Number of entities owned:", entitiesOwned.length)
  return entitiesOwned.length
}

async function deleteAllEntitiesWithIndex(client: any, index: number): Promise<TransactionReceipt[]> {
  log.debug("Deleting entities with index", index)
  const queryResult = await client.queryEntities(`ix = ${index}`)
  log.debug("deleteEntitiesWithIndex, queryResult", queryResult)
  return Promise.all(
    queryResult.map(async (res: GolemQueryEntitiesReturnType) => {
      log.debug("Deleting entity with key", res.key)
      await client.deleteEntitiesAndWaitForReceipt([res.key])
    })
  )
}

async function main(): Promise<void> {
  const data = generateRandomString(32)
  const stringAnnotation = generateRandomString(32)
  const numericAnnotation = generateRandomNumber()

  const keyBytes = fs.readFileSync('/home/ramses/.config/golembase/private.key');
  const client = createClient(keyBytes, 'http://localhost:8545', log)

  const ownerAddress = (await client.getAddresses())[0]

  const hash = await client.createEntities([{
    data: generateRandomString(32),
    ttl: 25,
    stringAnnotations: [["key", generateRandomString(32)]],
    numericAnnotations: [["ix", 1]]
  }])
  log.info("Got receipt:", await client.waitForTransactionReceipt({ hash }))

  let entitiesOwnedCount = 1
  assertEqual(await numOfEntitiesOwnedBy(client, ownerAddress), entitiesOwnedCount, "wrong number of entities owned")

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
  log.info(await client.createEntitiesAndWaitForReceipt(creates))
  entitiesOwnedCount += creates.length
  assertEqual(await numOfEntitiesOwnedBy(client, ownerAddress), entitiesOwnedCount, "wrong number of entities owned")

  log.info((await client.queryEntities(`key = "${stringAnnotation}"`)) || [])

  const blockNumber = await client.getBlockNumber()
  log.info("block number:", blockNumber)
  log.info("entity count:", await client.getEntityCount())
  log.info("all entity keys:", await client.getAllEntityKeys())

  log.info("getEntitiesForStringAnnotationValue:",
    await client.getEntitiesForStringAnnotationValue({ key: "key", value: stringAnnotation }))

  log.info("getEntitiesForNumericAnnotationValue:",
    await client.getEntitiesForNumericAnnotationValue({ key: "numKey", value: numericAnnotation }))

  log.info("queryEntities:")
  const queryResult = (await client.queryEntities(`key = "${stringAnnotation}"`)).map(el => ({ ...el, value: Buffer.from(el["value"], 'base64').toString('utf8') }))
  const entityKey: Hex = queryResult[0].key as Hex
  log.info(queryResult)

  log.info("queryEntities: complex query")
  const complexQuery = `key = "${stringAnnotation}" && numKey = ${numericAnnotation}`
  log.info(complexQuery)
  const complexQueryResult = (await client.queryEntities(complexQuery))?.map(el => ({ ...el, value: Buffer.from(el["value"], 'base64').toString('utf8') }))
  log.info(complexQueryResult)

  log.info(`getStorageValue(${entityKey}:`)
  const value = await client.getStorageValue(entityKey)
  log.info(Buffer.from(value, 'base64').toString('utf8'))

  log.info(`getFullEntity(${entityKey}):`)
  log.info((await client.getFullEntity(entityKey)))

  log.info(`Entities to expire at the next block (${blockNumber + 1n}):`, await client.getEntitiesToExpireAtBlock(blockNumber + 1n))

  log.info(`Entities to expire at block ${blockNumber + 25n}:`, await client.getEntitiesToExpireAtBlock(blockNumber + 25n))

  log.info("all entity keys:", await client.getAllEntityKeys())

  assertEqual(await numOfEntitiesOwnedBy(client, ownerAddress), entitiesOwnedCount, "wrong number of entities owned")
  const newData = generateRandomString(32)
  const newStringAnnotation = generateRandomString(32)
  log.info(await client.updateEntitiesAndWaitForReceipt([{
    entityKey,
    ttl: 10,
    data: newData,
    stringAnnotations: [["key", newStringAnnotation]],
    numericAnnotations: [["ix", 2]],
  }]))
  assertEqual(await numOfEntitiesOwnedBy(client, ownerAddress), entitiesOwnedCount, "wrong number of entities owned")

  log.info("all entity keys:", await client.getAllEntityKeys())

  await deleteAllEntitiesWithIndex(client, 1)
  entitiesOwnedCount--
  assertEqual(await numOfEntitiesOwnedBy(client, ownerAddress), entitiesOwnedCount, "wrong number of entities owned")

  log.info("all entity keys:", await client.getAllEntityKeys())

  await deleteAllEntitiesWithIndex(client, 2)
  entitiesOwnedCount--
  log.info("all entity keys:", await client.getAllEntityKeys())
  await deleteAllEntitiesWithIndex(client, 3)
  entitiesOwnedCount -= 2
  log.info("all entity keys:", await client.getAllEntityKeys())
  assertEqual(await numOfEntitiesOwnedBy(client, ownerAddress), entitiesOwnedCount, "wrong number of entities owned")

  log.info(await numOfEntitiesOwnedBy(client, ownerAddress))
}

main()
