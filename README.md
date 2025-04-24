# 🚀 Golem Base

This is part of the [Golem Base](https://github.com/Golem-Base) project, which is a Layer2 Network deployed on Ethereum, acting as a gateway to various Layer 3 Database Chains (DB-Chains).

> **For an overview of Golem Base, check out our [Litepaper](https://golem-base.io/wp-content/uploads/2025/03/GolemBase-Litepaper.pdf).**

# 🌌GolemBase SDK for TypeScript

This SDK allows you to use [GolemBase](https://github.com/Golem-Base) from TypeScript. It is available [on NPM](https://www.npmjs.com/package/golem-base-sdk).

We also publish [generated documentation](https://golem-base.github.io/typescript-sdk/).

The repo also contains an example application to showcase how you can use this SDK.

**Tip:** For getting up and running quickly, we recommend the following two steps:

1. Start golembase-op-geth through its [docker-compose](https://github.com/Golem-Base/golembase-op-geth/blob/main/RUN_LOCALLY.md).

2. [Install the demo CLI](https://github.com/Golem-Base/golembase-demo-cli?tab=readme-ov-file#installation) and [create a user](https://github.com/Golem-Base/golembase-demo-cli?tab=readme-ov-file#quickstart).

(Note: As an alternative to installing the demo CLI, you can build the [actual CLI](https://github.com/Golem-Base/golembase-op-geth/blob/main/cmd/golembase/README.md) as it's included in the golembase-op-geth repo.)

When you create a user, it will generate a private key file called `private.key` and store it in:

- `~/.config/golembase/` on **Linux**  
- `~/Library/Application Support/golembase/` on **macOS**  
- `%LOCALAPPDATA%\golembase\` on **Windows**  

(This is a standard folder as per the [XDG specification](https://specifications.freedesktop.org/basedir-spec/latest/).)

You will also need to fund the account. You can do so by typing:

```
golembase-demo-cli account fund 10
```

# 🧭 Getting Started: Backend

Here's how you can get going with the SDK. First, create a new folder to hold your project:

```bash
mkdir golem-sdk-practice
cd golem-sdk-practice
```

Then create a new package.json file by typing:

```bash
npm init -y
```

Next, add TypeScript as a development dependency:

```bash
npm install --save-dev typescript
```

And now add the golem TypeScript SDK to your package by typing:

```
npm i golem-base-sdk
```

Now update your package.json file, adding the `"type": "module",` line and the two script lines for build and start:

```json
{
  "name": "mytypescript2",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "devDependencies": {
    "typescript": "^5.8.3"
  },
  "dependencies": {
    "golem-base-sdk": "^0.1.3",
    "xdg-portable": "^10.6.0"
  }
}
```

And next, create a file called tsconfig.json, and add the following to it:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

Finally, create a folder called `src`, where you'll put the `index.ts` file as described next.

```
golem-sdk-practice/
├──src
    ├── index.ts 
```

## 🧱 Base Code

You can find some [base starter code here](https://github.com/Golem-Base/typescript-sdk/tree/main/example); copy the `index.ts` into your own `src` folder.

This is a basic TypeScript application that:

1. Imports several items from the SDK (called "golem-base-sdk-ts") including:

    * `createClient`: A function that creates a client to interact with GolemBase
    * `type GolemBaseClient`: A type that represents the base client for interacting with Golem
    * `type GolemBaseCreate`: A type representing a create transaction in GolemBase
    * `Annotation`: A type representing an annotation with a key and a value, used for efficient lookups

2. Reads the private key, which it locates through the `xdg-portable` module.

3. Create a logger using the `tslog` TypeScript Logger

4. The `main` follows, which is where the bulk of the demo code lives.

The `main` function demonstrates how to create, modify, and delete entities:

1. Creates a client object that connects to the local Geth installation. You supply it two URLs, one `http` and one `ws`. You also supply it the data read in from the private key, as well as a reference to the logger.

2. The code then does some initial housekeeping, including subscribing to logging events.

3. Next it creates three demo entities:

    * One with data `"foo"` and a time to live of `25` and a numeric annotation of `1`
	* One with data `"bar"` and a time to live of `2`, and a numeric annotation of `2`
	* One with data `"qux"` and a time to live of `50`, and a numeric annotation also of `2`

	Notice that the type of each is GolemBaseCreate.

4. It then calls client.createEntities to create the entities within Golem. Notice that this returns a promise of an array of items, each of which contain an `entityKey` and an `expirationBlock`.

5. Next, it prints out various information about the current state.

6. It then makes some modifications:

    * It deletes the first entity by calling `client.deleteEntities`, passing in an array of one element, the first `entityKey`.
	* It modifies the third entity by calling `client.updateEntities`, passing in the modified data

7. And finally it deletes all the entities. Note that this code demonstrates how to query the entities; it then retrieves the entities, and uses the JavaScript `map` function to build a list of `entityKeys` to delete.


## 🏃‍♂️ Building and Running

To build your app, type:

```
npm run build
```

This will compile the TypeScript code and place the compiled JavaScript code in a folder called dist.

To run your app, type:

```
npm run start
```

This will run the code found in the dist folder.

# 🖥️ Front End

The SDK also supports running inside the browser as a module. Documentation coming soon!


# 🛠️ Manually building

If you wish to manually build the library from TypeScript, simply type:

```sh
pnpm build
```
