import * as fs from 'fs'
import { createClient, type Hex } from './client'
import { ILogObj, Logger } from "tslog";

const log = new Logger<ILogObj>({
  type: "pretty",
  //minLevel: 3,
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

async function main(): Promise<void> {
  const data = generateRandomString(32)
  const stringAnnotation = generateRandomString(32)
  const numericAnnotation = generateRandomNumber()

  const keyBytes = fs.readFileSync('/home/ramses/.config/golembase/private.key');
  const client = createClient(keyBytes, 'http://localhost:8545', log)

  const hash = await client.createEntities([{
    data: generateRandomString(32),
    ttl: 25,
    stringAnnotations: [["key", generateRandomString(32)]],
    numericAnnotations: [["numKey", generateRandomNumber()]]
  }])
  log.info("Got receipt:", await client.waitForTransactionReceipt({ hash }))

  await client.createEntitiesAndWaitForReceipt([
    {
      data,
      ttl: 25,
      stringAnnotations: [["key", stringAnnotation]],
      numericAnnotations: [["numKey", numericAnnotation]]
    },
    {
      data,
      ttl: 5,
      stringAnnotations: [["key", generateRandomString(32)]],
      numericAnnotations: [["numKey", generateRandomNumber()]]
    }
  ])

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

  const newData = generateRandomString(32)
  const newStringAnnotation = generateRandomString(32)
  await client.updateEntitiesAndWaitForReceipt([{
    entityKey,
    ttl: 10,
    data: newData,
    stringAnnotations: [["key", newStringAnnotation]],
    numericAnnotations: [],
  }])
  const newQueryResult = (await client.queryEntities(`key = "${newStringAnnotation}"`)).map(el => ({ ...el, value: Buffer.from(el["value"], 'base64').toString('utf8') }))
  const newEntityKey: Hex = newQueryResult[0].key as Hex
  log.info(await client.getStorageValue(newEntityKey))

  //log.info((await client.getFullEntity(entityKey)))
}

main()
