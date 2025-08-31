Object.defineProperty(exports, "__esModule", { value: true });
exports.createROClient = createROClient;
exports.createClient = createClient;
const tslib_1 = require("tslib");
const internal = tslib_1.__importStar(require("./internal/client"));
const tslog_1 = require("tslog");
const _1 = require(".");
const viem_1 = require("viem");
function parseTransactionLogs(log, logs) {
    return logs.reduce((receipts, txlog) => {
        let paddedData;
        if (txlog.data.length > 2 && txlog.data.length < 34) {
            paddedData = (0, viem_1.pad)(txlog.data, { size: 32, dir: "left" });
        }
        else if (txlog.data.length > 34 && txlog.data.length < 66) {
            paddedData = (0, viem_1.pad)(txlog.data, { size: 64, dir: "left" });
        }
        else {
            paddedData = txlog.data;
        }
        log.debug("padded data:", paddedData);
        const parsed = (0, viem_1.decodeEventLog)({
            abi: _1.golemBaseABI,
            data: paddedData,
            topics: txlog.topics
        });
        switch (parsed.eventName) {
            case "GolemBaseStorageEntityCreated": {
                log.debug(parsed.args);
                return {
                    ...receipts,
                    createEntitiesReceipts: receipts.createEntitiesReceipts.concat([{
                            entityKey: (0, viem_1.toHex)(parsed.args.entityKey, { size: 32 }),
                            expirationBlock: Number(parsed.args.expirationBlock),
                        }]),
                };
            }
            case "GolemBaseStorageEntityUpdated": {
                return {
                    ...receipts,
                    updateEntitiesReceipts: receipts.updateEntitiesReceipts.concat([{
                            entityKey: (0, viem_1.toHex)(parsed.args.entityKey, { size: 32 }),
                            expirationBlock: Number(parsed.args.expirationBlock),
                        }]),
                };
            }
            case "GolemBaseStorageEntityBTLExtended": {
                return {
                    ...receipts,
                    extendEntitiesReceipts: receipts.extendEntitiesReceipts.concat([{
                            entityKey: (0, viem_1.toHex)(parsed.args.entityKey, { size: 32 }),
                            newExpirationBlock: Number(parsed.args.newExpirationBlock),
                            oldExpirationBlock: Number(parsed.args.oldExpirationBlock),
                        }]),
                };
            }
            case "GolemBaseStorageEntityDeleted": {
                return {
                    ...receipts,
                    deleteEntitiesReceipts: receipts.deleteEntitiesReceipts.concat([{
                            entityKey: (0, viem_1.toHex)(parsed.args.entityKey, { size: 32 }),
                        }]),
                };
            }
        }
    }, {
        createEntitiesReceipts: [],
        updateEntitiesReceipts: [],
        deleteEntitiesReceipts: [],
        extendEntitiesReceipts: [],
    });
}
function createGenericClient(client, logger) {
    const log = logger.getSubLogger({ name: "generic client" });
    for (let value of _1.golemBaseABI) {
        log.debug("Calculated the following event signature:", value.name, "->", (0, viem_1.toEventHash)(value));
    }
    return {
        getRawClient() {
            return client;
        },
        async getStorageValue(key) {
            return client.httpClient.getStorageValue(key);
        },
        async getEntityMetaData(key) {
            return client.httpClient.getEntityMetaData(key);
        },
        async getEntitiesToExpireAtBlock(blockNumber) {
            return client.httpClient.getEntitiesToExpireAtBlock(blockNumber);
        },
        async getEntityCount() {
            return client.httpClient.getEntityCount();
        },
        async getAllEntityKeys() {
            return client.httpClient.getAllEntityKeys();
        },
        async getEntitiesOfOwner(address) {
            return client.httpClient.getEntitiesOfOwner(address);
        },
        async queryEntities(query) {
            return (await client.httpClient.queryEntities(query)).map(res => ({
                entityKey: res.key,
                storageValue: res.value,
            }));
        },
        watchLogs(args) {
            let c;
            if (args.transport === "http") {
                c = client.httpClient;
            }
            else {
                c = client.wsClient;
            }
            const unsubscribe = c.watchEvent({
                address: internal.storageAddress,
                fromBlock: args.fromBlock,
                events: _1.golemBaseABI,
                onLogs: logs => {
                    log.debug("watchLogs, got logs: ", logs);
                    const { createEntitiesReceipts, updateEntitiesReceipts, deleteEntitiesReceipts, extendEntitiesReceipts, } = parseTransactionLogs(log, logs);
                    createEntitiesReceipts.forEach(args.onCreated);
                    updateEntitiesReceipts.forEach(args.onUpdated);
                    deleteEntitiesReceipts.forEach(args.onDeleted);
                    extendEntitiesReceipts.forEach(args.onExtended);
                },
                onError: args.onError,
                pollingInterval: args.pollingInterval,
            });
            return unsubscribe;
        }
    };
}
function createROClient(chainId, rpcUrl, wsUrl, logger = new tslog_1.Logger({
    type: "hidden",
    hideLogPositionForProduction: true,
})) {
    const iClient = internal.createROClient(chainId, rpcUrl, wsUrl, logger);
    const baseClient = createGenericClient(iClient, logger);
    return {
        ...baseClient,
        getRawClient() {
            return iClient;
        },
    };
}
async function createClient(chainId, accountData, rpcUrl, wsUrl, logger = new tslog_1.Logger({
    type: "hidden",
    hideLogPositionForProduction: true,
})) {
    const iClient = await internal.createClient(chainId, accountData, rpcUrl, wsUrl, logger);
    const baseClient = createGenericClient(iClient, logger);
    const log = logger.getSubLogger({ name: "client" });
    return {
        ...baseClient,
        getRawClient() {
            return iClient;
        },
        async getOwnerAddress() {
            return (await iClient.walletClient.getAddresses())[0];
        },
        async sendTransaction(creates = [], updates = [], deletes = [], extensions = [], args = {}) {
            const receipt = await iClient.walletClient.sendGolemBaseTransactionAndWaitForReceipt(creates, updates, deletes, extensions, args);
            log.debug("Got receipt:", receipt);
            const out = parseTransactionLogs(log, receipt.logs);
            log.debug("parsed transaction log:", out);
            return out;
        },
        async createEntities(creates, args = {}) {
            return (await this.sendTransaction(creates, [], [], [], args)).createEntitiesReceipts;
        },
        async updateEntities(updates, args = {}) {
            return (await this.sendTransaction([], updates, [], [], args)).updateEntitiesReceipts;
        },
        async deleteEntities(deletes, args = {}) {
            return (await this.sendTransaction([], [], deletes, [], args)).deleteEntitiesReceipts;
        },
        async extendEntities(extensions, args = {}) {
            return (await this.sendTransaction([], [], [], extensions, args)).extendEntitiesReceipts;
        },
    };
}
//# sourceMappingURL=client.js.map
