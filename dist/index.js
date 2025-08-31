Object.defineProperty(exports, "__esModule", { value: true });
exports.Tagged = exports.Annotation = exports.golemBaseStorageEntityBTLExtendedSignature = exports.golemBaseStorageEntityDeletedSignature = exports.golemBaseStorageEntityUpdatedSignature = exports.golemBaseStorageEntityCreatedSignature = exports.golemBaseABI = exports.formatEther = exports.internal = void 0;
const tslib_1 = require("tslib");
const viem_1 = require("viem");
tslib_1.__exportStar(require("./client"), exports);
exports.internal = tslib_1.__importStar(require("./internal/client"));
var viem_2 = require("viem");
Object.defineProperty(exports, "formatEther", { enumerable: true, get: function () { return viem_2.formatEther; } });
exports.golemBaseABI = (0, viem_1.parseAbi)([
    "event GolemBaseStorageEntityCreated(uint256 indexed entityKey, uint256 expirationBlock)",
    "event GolemBaseStorageEntityUpdated(uint256 indexed entityKey, uint256 expirationBlock)",
    "event GolemBaseStorageEntityDeleted(uint256 indexed entityKey)",
    "event GolemBaseStorageEntityBTLExtended(uint256 indexed entityKey, uint256 oldExpirationBlock, uint256 newExpirationBlock)",
]);
exports.golemBaseStorageEntityCreatedSignature = (0, viem_1.toEventHash)((0, viem_1.getAbiItem)({ abi: exports.golemBaseABI, name: "GolemBaseStorageEntityCreated" }));
exports.golemBaseStorageEntityUpdatedSignature = (0, viem_1.toEventHash)((0, viem_1.getAbiItem)({ abi: exports.golemBaseABI, name: "GolemBaseStorageEntityUpdated" }));
exports.golemBaseStorageEntityDeletedSignature = (0, viem_1.toEventHash)((0, viem_1.getAbiItem)({ abi: exports.golemBaseABI, name: "GolemBaseStorageEntityDeleted" }));
exports.golemBaseStorageEntityBTLExtendedSignature = (0, viem_1.toEventHash)((0, viem_1.getAbiItem)({ abi: exports.golemBaseABI, name: "GolemBaseStorageEntityBTLExtended" }));
class Annotation {
    key;
    value;
    constructor(key, value) {
        this.key = key;
        this.value = value;
    }
}
exports.Annotation = Annotation;
class Tagged {
    tag;
    data;
    constructor(tag, data) {
        this.tag = tag;
        this.data = data;
    }
}
exports.Tagged = Tagged;
//# sourceMappingURL=index.js.map
