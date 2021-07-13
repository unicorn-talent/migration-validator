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
const index_1 = require("./index");
const main = async () => {
    //const private_key = await fs.promises.readFile(config.private_key, "utf-8");
    const keyring = new api_1.Keyring();
    await wasm_crypto_1.waitReady();
    const signersP = [keyring.addFromUri("//Alice", undefined, 'sr25519'), keyring.addFromUri("//Bob", undefined, 'sr25519'), keyring.addFromUri("//Charlie", undefined, 'sr25519')];
    console.log(signersP[0].address);
    const aliceE = await fs.promises.readFile("../XP.network-Elrond-Migration/elrond-mint-contract/wallets/users/alice.pem", "utf-8");
    const bobE = await fs.promises.readFile("../XP.network-Elrond-Migration/elrond-mint-contract/wallets/users/bob.pem", "utf-8");
    const carolE = await fs.promises.readFile("../XP.network-Elrond-Migration/elrond-mint-contract/wallets/users/carol.pem", "utf-8");
    const signersE = [aliceE, bobE, carolE];
    for (let i = 0; i < 1; i += 1) {
        const polka = await index_1.PolkadotPalletHelper.new(config_1.default.xnode, signersP[i]);
        const elrd = await index_1.ElrondHelper.new(config_1.default.elrond_node, signersE[i], config_1.default.elrond_minter, socket_io_client_1.io(config_1.default.elrond_ev_socket));
        index_1.emitEvents(polka, elrd);
        index_1.emitEvents(elrd, polka);
    }
    console.log('READY TO LISTEN EVENTS!');
};
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUF5QjtBQUN6Qix1Q0FBd0M7QUFDeEMsdURBQWtEO0FBQ2xELHVEQUFzQztBQUV0QyxzREFBOEI7QUFDOUIsbUNBQXlFO0FBRXpFLE1BQU0sSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFO0lBQ3BCLDhFQUE4RTtJQUU5RSxNQUFNLE9BQU8sR0FBRyxJQUFJLGFBQU8sRUFBRSxDQUFDO0lBQzlCLE1BQU0sdUJBQVMsRUFBRSxDQUFDO0lBQ2xCLE1BQU0sUUFBUSxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUNqTCxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUVqQyxNQUFNLE1BQU0sR0FBRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLDZFQUE2RSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2xJLE1BQU0sSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsMkVBQTJFLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDOUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyw2RUFBNkUsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUNqSSxNQUFNLFFBQVEsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFFeEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQzNCLE1BQU0sS0FBSyxHQUFHLE1BQU0sNEJBQW9CLENBQUMsR0FBRyxDQUN4QyxnQkFBTSxDQUFDLEtBQUssRUFDWixRQUFRLENBQUMsQ0FBQyxDQUFDLENBQ2QsQ0FBQztRQUVGLE1BQU0sSUFBSSxHQUFHLE1BQU0sb0JBQVksQ0FBQyxHQUFHLENBQy9CLGdCQUFNLENBQUMsV0FBVyxFQUNsQixRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQ1gsZ0JBQU0sQ0FBQyxhQUFhLEVBQ3BCLHFCQUFFLENBQUMsZ0JBQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUM5QixDQUFDO1FBR0Ysa0JBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDeEIsa0JBQVUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDM0I7SUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDO0FBRUYsSUFBSSxFQUFFLENBQUMifQ==