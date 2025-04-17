import * as fs from "fs"
import {
  type ILogObj,
  Logger
} from "tslog"
import xdg from "xdg-portable"
import {
  createClient,
  type GolemBaseClient,
  type GolemBaseCreate,
  Annotation,
} from "golem-base-sdk-ts"

const keyBytes = fs.readFileSync(xdg.config() + '/golembase/private.key');

const log = new Logger<ILogObj>({
  type: "pretty",
  minLevel: 3,
})

async function main() {
  const client: GolemBaseClient = createClient(
    keyBytes,
    'http://localhost:8545',
    'ws://localhost:8546',
    log
  )

  async function numOfEntitiesOwned(): Promise<number> {
    return (await client.getEntitiesOfOwner(await client.getOwnerAddress())).length
  }

  const block = await client.getRawClient().httpClient.getBlockNumber()
  const unsubscribe = client.watchLogs({
    fromBlock: block,
    onCreated: (args) => {
      log.info("Got creation event:", args)
    },
    onUpdated: (args) => {
      log.info("Got update event:", args)
    },
    onExtended: (args) => {
      log.info("Got extension event:", args)
    },
    onDeleted: (args) => {
      log.info("Got deletion event:", args)
    },
    pollingInterval: 50,
    transport: "http",
  })

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
      stringAnnotations: [new Annotation("key", "foo")],
      numericAnnotations: [new Annotation("ix", 1)]
    },
    {
      data: "bar",
      ttl: 2,
      stringAnnotations: [new Annotation("key", "bar")],
      numericAnnotations: [new Annotation("ix", 2)]
    },
    {
      data: "qux",
      ttl: 50,
      stringAnnotations: [new Annotation("key", "qux")],
      numericAnnotations: [new Annotation("ix", 2)]
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
    stringAnnotations: [new Annotation("key", "qux"), new Annotation("foo", "bar")],
    numericAnnotations: [new Annotation("ix", 2)]
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
      .map(result => result.entityKey)
  )

  log.info("Number of entities owned:", await numOfEntitiesOwned())

  unsubscribe()
}

main()
