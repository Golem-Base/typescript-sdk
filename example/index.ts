import * as fs from "fs"
import {
  type ILogObj,
  Logger
} from "tslog"
import {
  createClient,
  type GolemBaseClient,
  type GolemBaseCreate,
} from "golem-base-sdk-ts"

const keyBytes = fs.readFileSync('/home/ramses/.config/golembase/private.key')

const log = new Logger<ILogObj>({
  type: "pretty",
  minLevel: 3,
})

async function main() {
  const client: GolemBaseClient = createClient(keyBytes, 'http://localhost:8545', log)

  async function numOfEntitiesOwned(): Promise<number> {
    return (await client.getEntitiesOfOwner(await client.getOwnerAddress())).length
  }

  log.info("Number of entities owned:", await numOfEntitiesOwned())

  log.info("")
  log.info("*********************")
  log.info("* Creating entities *")
  log.info("*********************")
  log.info("")

  const creates: GolemBaseCreate[] = [
    {
      data: "foo",
      ttl: 25,
      stringAnnotations: [["key", "foo"]],
      numericAnnotations: [["ix", 1]]
    },
    {
      data: "bar",
      ttl: 2,
      stringAnnotations: [["key", "bar"]],
      numericAnnotations: [["ix", 2]]
    },
    {
      data: "qux",
      ttl: 50,
      stringAnnotations: [["key", "qux"]],
      numericAnnotations: [["ix", 2]]
    }
  ]
  const receipts = await client.createEntities(creates)

  log.info("Number of entities owned:", await numOfEntitiesOwned())

  log.info("")
  log.info("*************************")
  log.info("* Deleting first entity *")
  log.info("*************************")
  log.info("")

  await client.deleteEntities([receipts[0].entityKey])
  log.info("Number of entities owned:", await numOfEntitiesOwned())

  log.info("")
  log.info("*****************************")
  log.info("* Updating the third entity *")
  log.info("*****************************")
  log.info("")

  log.info(
    "The third entity before the update:",
    await client.getEntityMetaData(receipts[2].entityKey),
    "\nStorage value:",
    Buffer.from(await client.getStorageValue(receipts[2].entityKey), 'base64').toString('binary')
  )

  log.info("Updating the entity...")
  await client.updateEntities([{
    entityKey: receipts[2].entityKey,
    ttl: 40,
    data: "foobar",
    stringAnnotations: [["key", "qux"], ["foo", "bar"]],
    numericAnnotations: [["ix", 2]]
  }])

  log.info(
    "The third entity after the update:",
    await client.getEntityMetaData(receipts[2].entityKey),
    "\nStorage value:",
    Buffer.from(await client.getStorageValue(receipts[2].entityKey), 'base64').toString('binary')
  )

  log.info("Number of entities owned:", await numOfEntitiesOwned())

  log.info("")
  log.info("*******************************")
  log.info("* Deleting remaining entities *")
  log.info("*******************************")
  log.info("")

  await client.deleteEntities(
    (await client.queryEntities("ix = 1 || ix = 2 || ix = 3"))
      .map(result => result.key)
  )

  log.info("Number of entities owned:", await numOfEntitiesOwned())
}

main()
