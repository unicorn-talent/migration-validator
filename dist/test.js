"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const api_1 = require("@polkadot/api");
const wasm_crypto_1 = require("@polkadot/wasm-crypto");
const socket_io_client_1 = require("socket.io-client");
const config_1 = __importDefault(require("./config"));
const Minter_json_1 = require("./Minter.json");
const index_1 = require("./index");
//@ts-ignore
async function polkadotTestHelper() {
    await wasm_crypto_1.waitReady();
    const keyring = new api_1.Keyring();
    return await index_1.PolkadotPalletHelper.new(config_1.default.xnode, keyring.createFromUri("//Alice", undefined, 'sr25519'));
}
//@ts-ignore
async function elrondTestHelper() {
    const aliceE = await fs.promises.readFile(config_1.default.private_key, "utf-8");
    return await index_1.ElrondHelper.new(config_1.default.elrond_node, aliceE, config_1.default.elrond_minter, socket_io_client_1.io(config_1.default.elrond_ev_socket));
}
//@ts-ignore
async function web3TestHelper() {
    return await index_1.Web3Helper.new(config_1.default.heco_node, config_1.default.heco_pkey, config_1.default.heco_minter, 
    //@ts-expect-error minter abi
    Minter_json_1.abi);
}
//@ts-ignore
async function listen2way(b1, b2) {
    index_1.emitEvents(b1, b2);
    index_1.emitEvents(b2, b1);
}
const main = async () => {
    listen2way(await polkadotTestHelper(), await elrondTestHelper());
    console.log('READY TO LISTEN EVENTS!');
};
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUF5QjtBQUN6Qix1Q0FBd0M7QUFDeEMsdURBQWtEO0FBQ2xELHVEQUFzQztBQUV0QyxzREFBOEI7QUFDOUIsK0NBQW9DO0FBQ3BDLG1DQUFxRjtBQUdyRixZQUFZO0FBQ1osS0FBSyxVQUFVLGtCQUFrQjtJQUNoQyxNQUFNLHVCQUFTLEVBQUUsQ0FBQztJQUNsQixNQUFNLE9BQU8sR0FBRyxJQUFJLGFBQU8sRUFBRSxDQUFDO0lBQzlCLE9BQU8sTUFBTSw0QkFBb0IsQ0FBQyxHQUFHLENBQ3BDLGdCQUFNLENBQUMsS0FBSyxFQUNaLE9BQU8sQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FDdEQsQ0FBQztBQUNILENBQUM7QUFFRCxZQUFZO0FBQ1osS0FBSyxVQUFVLGdCQUFnQjtJQUMzQixNQUFNLE1BQU0sR0FBRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGdCQUFNLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzFFLE9BQU8sTUFBTSxvQkFBWSxDQUFDLEdBQUcsQ0FDNUIsZ0JBQU0sQ0FBQyxXQUFXLEVBQ2xCLE1BQU0sRUFDTixnQkFBTSxDQUFDLGFBQWEsRUFDcEIscUJBQUUsQ0FBQyxnQkFBTSxDQUFDLGdCQUFnQixDQUFDLENBQzNCLENBQUM7QUFDSCxDQUFDO0FBRUQsWUFBWTtBQUNaLEtBQUssVUFBVSxjQUFjO0lBQzVCLE9BQU8sTUFBTSxrQkFBVSxDQUFDLEdBQUcsQ0FDMUIsZ0JBQU0sQ0FBQyxTQUFTLEVBQ2hCLGdCQUFNLENBQUMsU0FBUyxFQUNoQixnQkFBTSxDQUFDLFdBQVc7SUFDbEIsNkJBQTZCO0lBQzdCLGlCQUFHLENBQ0gsQ0FBQztBQUNILENBQUM7QUFJRCxZQUFZO0FBQ1osS0FBSyxVQUFVLFVBQVUsQ0FBZSxFQUF5QixFQUFFLEVBQXlCO0lBQzNGLGtCQUFVLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ25CLGtCQUFVLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLElBQUksR0FBRyxLQUFLLElBQUksRUFBRTtJQUN2QixVQUFVLENBQUMsTUFBTSxrQkFBa0IsRUFBRSxFQUFFLE1BQU0sZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO0lBQzlELE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUM7QUFFRixJQUFJLEVBQUUsQ0FBQyJ9