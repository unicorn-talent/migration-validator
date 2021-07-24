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
async function polkadotTestHelper() {
    await wasm_crypto_1.waitReady();
    const keyring = new api_1.Keyring();
    return await index_1.PolkadotPalletHelper.new(config_1.default.xnode, keyring.createFromUri("//Alice", undefined, 'sr25519'));
}
//@ts-expect-error unused
async function elrondTestHelper() {
    const aliceE = await fs.promises.readFile("../XP.network-Elrond-Migration/elrond-mint-contract/wallets/users/alice.pem", "utf-8");
    return await index_1.ElrondHelper.new(config_1.default.elrond_node, aliceE, config_1.default.elrond_minter, socket_io_client_1.io(config_1.default.elrond_ev_socket));
}
async function web3TestHelper() {
    return await index_1.Web3Helper.new(config_1.default.heco_node, config_1.default.heco_pkey, config_1.default.heco_minter, 
    //@ts-expect-error minter abi
    Minter_json_1.abi);
}
async function listen2way(b1, b2) {
    index_1.emitEvents(b1, b2);
    index_1.emitEvents(b2, b1);
}
const main = async () => {
    listen2way(await polkadotTestHelper(), await web3TestHelper());
    console.log('READY TO LISTEN EVENTS!');
};
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUF5QjtBQUN6Qix1Q0FBd0M7QUFDeEMsdURBQWtEO0FBQ2xELHVEQUFzQztBQUV0QyxzREFBOEI7QUFDOUIsK0NBQW9DO0FBQ3BDLG1DQUFxRjtBQUdyRixLQUFLLFVBQVUsa0JBQWtCO0lBQ2hDLE1BQU0sdUJBQVMsRUFBRSxDQUFDO0lBQ2xCLE1BQU0sT0FBTyxHQUFHLElBQUksYUFBTyxFQUFFLENBQUM7SUFDOUIsT0FBTyxNQUFNLDRCQUFvQixDQUFDLEdBQUcsQ0FDcEMsZ0JBQU0sQ0FBQyxLQUFLLEVBQ1osT0FBTyxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUN0RCxDQUFDO0FBQ0gsQ0FBQztBQUVELHlCQUF5QjtBQUN6QixLQUFLLFVBQVUsZ0JBQWdCO0lBQzNCLE1BQU0sTUFBTSxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsNkVBQTZFLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDckksT0FBTyxNQUFNLG9CQUFZLENBQUMsR0FBRyxDQUM1QixnQkFBTSxDQUFDLFdBQVcsRUFDbEIsTUFBTSxFQUNOLGdCQUFNLENBQUMsYUFBYSxFQUNwQixxQkFBRSxDQUFDLGdCQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FDM0IsQ0FBQztBQUNILENBQUM7QUFFRCxLQUFLLFVBQVUsY0FBYztJQUM1QixPQUFPLE1BQU0sa0JBQVUsQ0FBQyxHQUFHLENBQzFCLGdCQUFNLENBQUMsU0FBUyxFQUNoQixnQkFBTSxDQUFDLFNBQVMsRUFDaEIsZ0JBQU0sQ0FBQyxXQUFXO0lBQ2xCLDZCQUE2QjtJQUM3QixpQkFBRyxDQUNILENBQUM7QUFDSCxDQUFDO0FBSUQsS0FBSyxVQUFVLFVBQVUsQ0FBZSxFQUF5QixFQUFFLEVBQXlCO0lBQzNGLGtCQUFVLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ25CLGtCQUFVLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLElBQUksR0FBRyxLQUFLLElBQUksRUFBRTtJQUN2QixVQUFVLENBQUMsTUFBTSxrQkFBa0IsRUFBRSxFQUFFLE1BQU0sY0FBYyxFQUFFLENBQUMsQ0FBQztJQUU1RCxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDO0FBRUYsSUFBSSxFQUFFLENBQUMifQ==