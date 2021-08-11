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
async function web3TestHelpers() {
    return Promise.all(config_1.default.web3.map(async ({ node, pkey, minter, nonce }) => await index_1.Web3Helper.new(node, pkey, minter, 
    //@ts-expect-error minter abi
    Minter_json_1.abi, nonce)));
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
        ...await web3TestHelpers()
    ]);
    console.log('READY TO LISTEN EVENTS!');
};
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUF5QjtBQUN6QiwrQkFBb0M7QUFDcEMsdUNBQXdDO0FBQ3hDLHVEQUFrRDtBQUNsRCx1REFBbUQ7QUFFbkQsK0NBQW9DO0FBQ3BDLHNEQUE4QjtBQUM5QixxQ0FBeUQ7QUFDekQsbUNBQXFGO0FBRXJGLEtBQUssVUFBVSxrQkFBa0I7SUFDaEMsTUFBTSx1QkFBUyxFQUFFLENBQUM7SUFDbEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxhQUFPLEVBQUUsQ0FBQztJQUM5QixPQUFPLE1BQU0sNEJBQW9CLENBQUMsR0FBRyxDQUNwQyxnQkFBTSxDQUFDLEtBQUssRUFDWixPQUFPLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQ3RELENBQUM7QUFDSCxDQUFDO0FBRUQsS0FBSyxVQUFVLGdCQUFnQjtJQUMzQixNQUFNLE1BQU0sR0FBRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGdCQUFNLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzFFLE9BQU8sTUFBTSxvQkFBWSxDQUFDLEdBQUcsQ0FDNUIsZ0JBQU0sQ0FBQyxXQUFXLEVBQ2xCLE1BQU0sRUFDTixnQkFBTSxDQUFDLGFBQWEsRUFDcEIscUJBQVMsQ0FBQyxnQkFBTSxDQUFDLGdCQUFnQixDQUFDLENBQ2xDLENBQUM7QUFDSCxDQUFDO0FBRUQsS0FBSyxVQUFVLGVBQWU7SUFDN0IsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUNqQixnQkFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQ3RCLElBQUksRUFDSixJQUFJLEVBQ0osTUFBTSxFQUNOLEtBQUssRUFDTCxFQUFFLEVBQUUsQ0FBQyxNQUFNLGtCQUFVLENBQUMsR0FBRyxDQUN6QixJQUFJLEVBQ0osSUFBSSxFQUNKLE1BQU07SUFDTiw2QkFBNkI7SUFDN0IsaUJBQUcsRUFDSCxLQUFLLENBQ0wsQ0FBQyxDQUNGLENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUyxnQkFBZ0I7SUFDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQzNDLE1BQU0sUUFBUSxHQUFHLG1CQUFZLEVBQUUsQ0FBQztJQUVoQyxNQUFNLEVBQUUsR0FBRyxzQkFBYSxDQUFDLFFBQVEsRUFBRTtRQUNsQyxJQUFJLEVBQUUscUJBQXFCO1FBQzNCLElBQUksRUFBRTtZQUNMLE1BQU0sRUFBRSxHQUFHO1NBQ1g7S0FDRCxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsTUFBTSxDQUFDLGdCQUFNLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLGdCQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRTdGLE9BQU8sRUFBRSxDQUFDO0FBQ1gsQ0FBQztBQUVELE1BQU0sSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFO0lBQ3ZCLE1BQU0sRUFBRSxHQUFHLGdCQUFnQixFQUFFLENBQUM7SUFDOUIsa0JBQVUsQ0FDVCxFQUFFLEVBQ0Y7UUFDQyxNQUFNLGtCQUFrQixFQUFFO1FBQzFCLE1BQU0sZ0JBQWdCLEVBQUU7UUFDeEIsR0FBRyxNQUFNLGVBQWUsRUFBRTtLQUMxQixDQUNELENBQUM7SUFDQyxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDO0FBRUYsSUFBSSxFQUFFLENBQUMifQ==