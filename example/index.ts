import { readFileSync } from "fs"
import { join } from "path"
import { stdin, stdout } from "process"
import { createInterface } from "readline";
import {
  type ILogObj,
  Logger
} from "tslog"
import xdg from "xdg-portable"
import { Wallet, getBytes } from "ethers"
import {
  createClient,
  formatEther,
  type GolemDBCreate,
  Annotation,
  Tagged,
  type AccountData,
} from "golem-base-sdk"

// Path to a golembase wallet
const walletPath = join(xdg.config(), 'golembase', 'wallet.json');
const keystore = readFileSync(walletPath, 'utf8');

/**
 * Read password either from piped stdin or interactively from the terminal.
 */
async function readPassword(prompt: string = "Enter wallet password: "): Promise<string> {
  if (stdin.isTTY) {
    // Interactive prompt
    const rl = createInterface({
      input: stdin,
      output: stdout,
      terminal: true,
    });

    return new Promise((resolve) => {
      rl.question(prompt, (password) => {
        rl.close();
        resolve(password.trim());
      });
      // Hide input for security
      (rl as any)._writeToOutput = () => { };
    });
  } else {
    // Input is piped
    const chunks: Buffer[] = [];
    for await (const chunk of stdin) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString().trim();
  }
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const log = new Logger<ILogObj>({
  type: "pretty",
  minLevel: 3,
})

// Utility function to filter with async callbacks
async function asyncFilter<T>(arr: T[], callback: (item: T) => Promise<boolean>): Promise<T[]> {
  const results: T[] = [];
  for (const item of arr) {
    if (await callback(item)) {
      results.push(item);
    }
  }
  return results;
};

async function main() {
  log.info("Attempting to decrypt wallet", walletPath);
  const wallet = Wallet.fromEncryptedJsonSync(keystore, await readPassword());
  log.info("Successfully decrypted wallet for account", wallet.address);

  const key: AccountData = new Tagged("privatekey", getBytes(wallet.privateKey))
  const client = {
    local: await createClient(
      1337,
      key,
      'http://localhost:8545',
      'ws://localhost:8545',
      log,
    ),
    demo: await createClient(
      1337,
      key,
      'https://api.golembase.demo.golem-base.io',
      'wss://ws-api.golembase.demo.golem-base.io',
      log,
    ),
    kaolin: await createClient(
      600606,
      key,
      'https://rpc.kaolin.holesky.golem-base.io',
      'wss://ws.rpc.kaolin.holesky.golem-base.io',
      log,
    ),
  }.kaolin

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
    onError: (error) => {
      log.error("Got error:", error)
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

  const creates: GolemDBCreate[] = [
    {
      data: encoder.encode("foo"),
      btl: 25,
      stringAnnotations: [new Annotation("key", "foo")],
      numericAnnotations: [new Annotation("ix", 1)]
    },
    {
      data: encoder.encode("bar"),
      btl: 2,
      stringAnnotations: [new Annotation("key", "bar")],
      numericAnnotations: [new Annotation("ix", 2)]
    },
    {
      data: encoder.encode("qux"),
      btl: 50,
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
    btl: 40,
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
  log.info("* Extending the BTL of the third entity *")
  log.info("*****************************************")
  log.info("")

  log.info(
    "The third entity before the extension:",
    await client.getEntityMetaData(receipts[2].entityKey),
    "\nStorage value:",
    decoder.decode(await client.getStorageValue(receipts[2].entityKey)),
  )

  log.info("Extending the BTL of the entity...")
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

  // Figure out whether we still need to delete anything
  const toDelete = (await asyncFilter(
    await client.queryEntities("ix = 1 || ix = 2 || ix = 3"),
    async result => {
      const metadata = await client.getEntityMetaData(result.entityKey)
      return metadata.owner === (await client.getOwnerAddress()).toLocaleLowerCase()
    }
  )).map(result => result.entityKey)

  log.info("Entities to delete:", toDelete)
  if (toDelete.length !== 0) {
    await client.deleteEntities(toDelete)
  }

  log.info("Number of entities owned:", await numOfEntitiesOwned())

  log.info("Current balance: ", formatEther(await client.getRawClient().httpClient.getBalance({
    address: await client.getOwnerAddress(),
    blockTag: 'latest'
  })))

  await (new Promise(resolve => setTimeout(resolve, 500)))

  unsubscribe()
}

main()
