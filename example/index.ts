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
  Tagged,
} from "golem-base-sdk-ts"
import { formatEther } from "viem";

const keyBytes = fs.readFileSync(xdg.config() + '/golembase/private.key');

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const log = new Logger<ILogObj>({
  type: "pretty",
  minLevel: 3,
})

async function main() {
  const client: GolemBaseClient = await createClient(
    new Tagged("privatekey", keyBytes),
    //'http://localhost:8545',
    //'ws://localhost:8546',
    'https://api.golembase.demo.golem-base.io',
    'wss://ws-api.golembase.demo.golem-base.io',
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
    pollingInterval: 500,
    transport: "http",
  })

  log.info("Address used:", await client.getOwnerAddress())
  log.info("Number of entities owned:", await numOfEntitiesOwned())

  log.info("")
  log.info("*********************")
  log.info("* Creating entities *")
  log.info("*********************")
  log.info("")

  const creates: GolemBaseCreate[] = [
    {
      data: encoder.encode("foo"),
      ttl: 25,
      stringAnnotations: [new Annotation("key", "foo")],
      numericAnnotations: [new Annotation("ix", 1)]
    },
    {
      data: encoder.encode("bar"),
      ttl: 2,
      stringAnnotations: [new Annotation("key", "bar")],
      numericAnnotations: [new Annotation("ix", 2)]
    },
    {
      data: encoder.encode("qux"),
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
    decoder.decode(await client.getStorageValue(receipts[2].entityKey)),
  )

  log.info("Updating the entity...")
  await client.updateEntities([{
    entityKey: receipts[2].entityKey,
    ttl: 40,
    data: encoder.encode("foobar"),
    stringAnnotations: [new Annotation("key", "qux"), new Annotation("foo", "bar")],
    numericAnnotations: [new Annotation("ix", 2)]
  }])

  log.info(
    "The third entity after the update:",
    await client.getEntityMetaData(receipts[2].entityKey),
    "\nStorage value:",
    decoder.decode(await client.getStorageValue(receipts[2].entityKey)),
  )

  log.info("Number of entities owned:", await numOfEntitiesOwned())

  log.info("")
  log.info("*****************************************")
  log.info("* Extending the TTL of the third entity *")
  log.info("*****************************************")
  log.info("")

  log.info(
    "The third entity before the extension:",
    await client.getEntityMetaData(receipts[2].entityKey),
    "\nStorage value:",
    decoder.decode(await client.getStorageValue(receipts[2].entityKey)),
  )

  log.info("Extending the TTL of the entity...")
  await client.extendEntities([{
    entityKey: receipts[2].entityKey,
    numberOfBlocks: 40,
  }])

  log.info(
    "The third entity after the extension:",
    await client.getEntityMetaData(receipts[2].entityKey),
    "\nStorage value:",
    decoder.decode(await client.getStorageValue(receipts[2].entityKey)),
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

  log.debug("Current balance: ", formatEther(await client.getRawClient().httpClient.getBalance({
    address: await client.getOwnerAddress(),
    blockTag: 'latest'
  })))

  await (new Promise(resolve => setTimeout(resolve, 500)))

  unsubscribe()
}

main()
