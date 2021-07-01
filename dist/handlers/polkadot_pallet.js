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
exports.PolkadotHelper = void 0;
const api_1 = require("@polkadot/api");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const aliceJ = __importStar(require("../alice.json"));
const chain_handler_1 = require("../chain_handler");
const polkadot_1 = require("./polkadot");
/**
 * Polkadot Freezer Pallet Helper
 *
 * Handles [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 *
 * Emits [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 */
class PolkadotHelper {
    constructor(api, alice) {
        this.api = api;
        this.alice = alice;
    }
    async eventIter(cb) {
        this.api.query.system.events(async (events) => {
            events.forEach((event) => cb(event));
        });
    }
    async subscribe() {
        // TODO
        /*await this.freezer.tx
            .subscribe({ value: 0, gasLimit: -1 })
            .signAndSend(this.alice, (result) => {
                console.log(`sub tx: ${result.status}`);
            });*/
    }
    async eventHandler(ev) {
        const event = ev.event;
        switch (event.method) {
            case 'Transfer': {
                const action_id = new bignumber_js_1.default(event.data[0].toString());
                const dest = event.data[1].toJSON();
                const value = new bignumber_js_1.default(event.data[2].toJSON());
                return new chain_handler_1.TransferEvent(action_id, dest, value);
            }
            case 'ScCall': {
                const action_id = new bignumber_js_1.default(event.data[0].toString());
                const to = event.data[1].toJSON();
                const endpoint = event.data[2].toJSON();
                const args = event.data[3].toJSON();
                return new chain_handler_1.ScCallEvent(action_id, to, new bignumber_js_1.default(0), endpoint, polkadot_1.scCallArgSanitize(args));
            }
            case 'UnfreezeWrapped': {
                const action_id = new bignumber_js_1.default(event.data[0].toString());
                const dest = event.data[1].toJSON();
                const value = new bignumber_js_1.default(event.data[2].toJSON());
                return new chain_handler_1.UnfreezeEvent(action_id, dest, value);
            }
            default:
                return undefined;
        }
    }
    async emittedEventHandler(event) {
        if (event instanceof chain_handler_1.UnfreezeEvent) {
            await this.unfreeze(event);
        }
        else if (event instanceof chain_handler_1.ScCallEvent) {
            await this.sccall(event);
        }
        else if (event instanceof chain_handler_1.TransferEvent) {
            await this.send_wrap(event);
        }
    }
    async unfreeze(event) {
        console.log(`unfreeze! to: ${event.to}, value: ${event.value}`);
        await this.api.tx.freezer
            .unfreezeVerify(event.id, event.to, event.value)
            .signAndSend(this.alice, (result) => {
            console.log(`unfreeze verify:`, result);
        });
    }
    async sccall(_event) {
        //pub fn sc_call_verify(&mut self, action_id: String, to: AccountId, value: Balance, endpoint: [u8; 4], args: Vec<Vec<u8>>)
        throw Error("unimplimented");
    }
    async send_wrap(_event) {
        throw Error("unimplimented");
    }
}
exports.PolkadotHelper = PolkadotHelper;
/**
 *
 * @param node_uri uri of the local(or remote?) substrate/polkadot node
 * @param freezer_abi ABI of the freezer smart contract
 * @param contract_addr Address of the freezer smart contract
 *
 * WARN: The helper object uses an internal account as a workaround.
 */
PolkadotHelper.new = async (node_uri) => {
    const provider = new api_1.WsProvider(node_uri);
    const api = await api_1.ApiPromise.create({ provider: provider });
    const keyring = new api_1.Keyring({});
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const alice = keyring.addFromJson(aliceJ);
    alice.unlock('ahPQDcuGjPJDMe4');
    const helper = new PolkadotHelper(api, alice);
    await helper.subscribe();
    return helper;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9sa2Fkb3RfcGFsbGV0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hhbmRsZXJzL3BvbGthZG90X3BhbGxldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdUNBQWdFO0FBR2hFLGdFQUFxQztBQUVyQyxzREFBd0M7QUFDeEMsb0RBTTBCO0FBQzFCLHlDQUErQztBQUUvQzs7Ozs7O0dBTUc7QUFDSCxNQUFhLGNBQWM7SUFZdkIsWUFDSSxHQUFlLEVBQ2YsS0FBa0I7UUFFbEIsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFDZixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUN2QixDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUF5QztRQUNyRCxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUMxQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6QyxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUE2Qk8sS0FBSyxDQUFDLFNBQVM7UUFDbkIsT0FBTztRQUNQOzs7O2lCQUlTO0lBQ2IsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQ2QsRUFBZTtRQUVmLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDdkIsUUFBUSxLQUFLLENBQUMsTUFBTSxFQUFFO1lBQ2xCLEtBQUssVUFBVSxDQUFDLENBQUM7Z0JBQ2IsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFZLENBQUMsQ0FBQztnQkFDcEUsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FB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