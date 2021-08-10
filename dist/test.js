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
const http_1 = require("http");
const api_1 = require("@polkadot/api");
const wasm_crypto_1 = require("@polkadot/wasm-crypto");
const socket_io_client_1 = require("socket.io-client");
const Minter_json_1 = require("./Minter.json");
const config_1 = __importDefault(require("./config"));
const socket_1 = require("./socket");
const index_1 = require("./index");
async function polkadotTestHelper() {
    await wasm_crypto_1.waitReady();
    const keyring = new api_1.Keyring();
    return await index_1.PolkadotPalletHelper.new(config_1.default.xnode, keyring.createFromUri("//Alice", undefined, 'sr25519'));
}
async function elrondTestHelper() {
    const aliceE = await fs.promises.readFile(config_1.default.private_key, "utf-8");
    return await index_1.ElrondHelper.new(config_1.default.elrond_node, aliceE, config_1.default.elrond_minter, socket_io_client_1.io(config_1.default.elrond_ev_socket));
}
async function web3TestHelper() {
    return await index_1.Web3Helper.new(config_1.default.heco_node, config_1.default.heco_pkey, config_1.default.heco_minter, 
    //@ts-expect-error minter abi
    Minter_json_1.abi, 0x2);
}
function testSocketServer() {
    console.log("WARN: using permissive cors");
    const httpServ = http_1.createServer();
    const io = socket_1.txEventSocket(httpServ, {
        path: "/txsocket/socket.io",
        cors: {
            origin: "*"
        }
    });
    httpServ.listen(config_1.default.tx_port, () => console.log(`tx socket listening @${config_1.default.tx_port}`));
    return io;
}
const main = async () => {
    const io = testSocketServer();
    index_1.emitEvents(io, [
        await polkadotTestHelper(),
        await elrondTestHelper(),
        await web3TestHelper()
    ]);
    console.log('READY TO LISTEN EVENTS!');
};
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUF5QjtBQUN6QiwrQkFBb0M7QUFDcEMsdUNBQXdDO0FBQ3hDLHVEQUFrRDtBQUNsRCx1REFBbUQ7QUFFbkQsK0NBQW9DO0FBQ3BDLHNEQUE4QjtBQUM5QixxQ0FBeUQ7QUFDekQsbUNBQXFGO0FBRXJGLEtBQUssVUFBVSxrQkFBa0I7SUFDaEMsTUFBTSx1QkFBUyxFQUFFLENBQUM7SUFDbEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxhQUFPLEVBQUUsQ0FBQztJQUM5QixPQUFPLE1BQU0sNEJBQW9CLENBQUMsR0FBRyxDQUNwQyxnQkFBTSxDQUFDLEtBQUssRUFDWixPQUFPLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQ3RELENBQUM7QUFDSCxDQUFDO0FBRUQsS0FBSyxVQUFVLGdCQUFnQjtJQUMzQixNQUFNLE1BQU0sR0FBRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGdCQUFNLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzFFLE9BQU8sTUFBTSxvQkFBWSxDQUFDLEdBQUcsQ0FDNUIsZ0JBQU0sQ0FBQyxXQUFXLEVBQ2xCLE1BQU0sRUFDTixnQkFBTSxDQUFDLGFBQWEsRUFDcEIscUJBQVMsQ0FBQyxnQkFBTSxDQUFDLGdCQUFnQixDQUFDLENBQ2xDLENBQUM7QUFDSCxDQUFDO0FBRUQsS0FBSyxVQUFVLGNBQWM7SUFDNUIsT0FBTyxNQUFNLGtCQUFVLENBQUMsR0FBRyxDQUMxQixnQkFBTSxDQUFDLFNBQVMsRUFDaEIsZ0JBQU0sQ0FBQyxTQUFTLEVBQ2hCLGdCQUFNLENBQUMsV0FBVztJQUNsQiw2QkFBNkI7SUFDN0IsaUJBQUcsRUFDSCxHQUFHLENBQ0gsQ0FBQztBQUNILENBQUM7QUFFRCxTQUFTLGdCQUFnQjtJQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDM0MsTUFBTSxRQUFRLEdBQUcsbUJBQVksRUFBRSxDQUFDO0lBRWhDLE1BQU0sRUFBRSxHQUFHLHNCQUFhLENBQUMsUUFBUSxFQUFFO1FBQ2xDLElBQUksRUFBRSxxQkFBcUI7UUFDM0IsSUFBSSxFQUFFO1lBQ0wsTUFBTSxFQUFFLEdBQUc7U0FDWDtLQUNELENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxNQUFNLENBQUMsZ0JBQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsZ0JBQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFN0YsT0FBTyxFQUFFLENBQUM7QUFDWCxDQUFDO0FBRUQsTUFBTSxJQUFJLEdBQUcsS0FBSyxJQUFJLEVBQUU7SUFDdkIsTUFBTSxFQUFFLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztJQUM5QixrQkFBVSxDQUNULEVBQUUsRUFDRjtRQUNDLE1BQU0sa0JBQWtCLEVBQUU7UUFDMUIsTUFBTSxnQkFBZ0IsRUFBRTtRQUN4QixNQUFNLGNBQWMsRUFBRTtLQUN0QixDQUNELENBQUM7SUFDQyxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDO0FBRUYsSUFBSSxFQUFFLENBQUMifQ==