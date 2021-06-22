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
const socket_io_client_1 = require("socket.io-client");
const config_1 = __importDefault(require("./config"));
const freezer_abi = __importStar(require("./freezer_abi.json"));
const index_1 = require("./index");
const main = async () => {
    const private_key = await fs.promises.readFile(config_1.default.private_key, 'utf-8');
    const polka = await index_1.PolkadotHelper.new(config_1.default.xnode, freezer_abi, config_1.default.xp_freezer);
    const elrd = await index_1.ElrondHelper.new(config_1.default.elrond_node, private_key, config_1.default.elrond_sender, config_1.default.elrond_minter, socket_io_client_1.io(config_1.default.elrond_ev_socket));
    console.log('READY TO LISTEN EVENTS!');
    index_1.emitEvents(polka, elrd);
    index_1.emitEvents(elrd, polka);
};
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUF5QjtBQUN6Qix1REFBc0M7QUFFdEMsc0RBQThCO0FBQzlCLGdFQUFrRDtBQUNsRCxtQ0FBbUU7QUFFbkUsTUFBTSxJQUFJLEdBQUcsS0FBSyxJQUFJLEVBQUU7SUFDcEIsTUFBTSxXQUFXLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxnQkFBTSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUU1RSxNQUFNLEtBQUssR0FBRyxNQUFNLHNCQUFjLENBQUMsR0FBRyxDQUNsQyxnQkFBTSxDQUFDLEtBQUssRUFDWixXQUFXLEVBQ1gsZ0JBQU0sQ0FBQyxVQUFVLENBQ3BCLENBQUM7SUFDRixNQUFNLElBQUksR0FBRyxNQUFNLG9CQUFZLENBQUMsR0FBRyxDQUMvQixnQkFBTSxDQUFDLFdBQVcsRUFDbEIsV0FBVyxFQUNYLGdCQUFNLENBQUMsYUFBYSxFQUNwQixnQkFBTSxDQUFDLGFBQWEsRUFDcEIscUJBQUUsQ0FBQyxnQkFBTSxDQUFDLGdCQUFnQixDQUFDLENBQzlCLENBQUM7SUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFFdkMsa0JBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDeEIsa0JBQVUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDO0FBRUYsSUFBSSxFQUFFLENBQUMifQ==