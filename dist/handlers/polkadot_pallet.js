"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolkadotPalletHelper = void 0;
const api_1 = require("@polkadot/api");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const chain_handler_1 = require("../chain_handler");
const polkadot_1 = require("./polkadot");
function sanitizeDest(dest) {
    return Buffer.from(dest.toString().replace('0x', ''), 'hex').toString('utf-8');
}
/**
 * Polkadot Freezer Pallet Helper
 *
 * Handles [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 *
 * Emits [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 */
class PolkadotPalletHelper {
    constructor(api, signer) {
        this.api = api;
        this.signer = signer;
    }
    async eventIter(cb) {
        this.api.query.system.events(async (events) => {
            events.forEach((event) => cb(event));
        });
    }
    async eventHandler(ev) {
        const event = ev.event;
        switch (event.method) {
            case 'TransferFrozen': {
                const action_id = new bignumber_js_1.default(event.data[0].toString());
                const dest = sanitizeDest(event.data[1]);
                const value = new bignumber_js_1.default(event.data[2].toJSON());
                return new chain_handler_1.TransferEvent(action_id, dest, value);
            }
            case 'ScCall': {
                const action_id = new bignumber_js_1.default(event.data[0].toString());
                const to = sanitizeDest(event.data[1]);
                const endpoint = event.data[2].toJSON();
                const args = event.data[3].toJSON();
                return new chain_handler_1.ScCallEvent(action_id, to, new bignumber_js_1.default(0), endpoint, polkadot_1.scCallArgSanitize(args));
            }
            case 'UnfreezeWrapped': {
                const action_id = new bignumber_js_1.default(event.data[0].toString());
                const dest = sanitizeDest(event.data[1]);
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
            .unfreezeVerify(event.id.toString(), event.to, event.value.toString())
            .signAndSend(this.signer, (result) => {
            console.log(`unfreeze verify:`, result.status);
        });
    }
    async sccall(_event) {
        //pub fn sc_call_verify(&mut self, action_id: String, to: AccountId, value: Balance, endpoint: [u8; 4], args: Vec<Vec<u8>>)
        throw Error('unimplimented');
    }
    async send_wrap(event) {
        console.log(`send_wrap! to: ${event.to}, value: ${event.value}`);
        await this.api.tx.freezer
            .transferWrappedVerify(event.action_id.toString(), event.to, event.value.toString())
            .signAndSend(this.signer, (result) => {
            console.log(`send wrap: `, result.status);
        });
    }
}
exports.PolkadotPalletHelper = PolkadotPalletHelper;
/**
 *
 * @param node_uri uri of the local(or remote?) substrate/polkadot node
 * @param freezer_abi ABI of the freezer smart contract
 * @param contract_addr Address of the freezer smart contract
 *
 * WARN: The helper object uses an internal account as a workaround.
 */
PolkadotPalletHelper.new = async (node_uri, signer) => {
    const provider = new api_1.WsProvider(node_uri);
    const api = await api_1.ApiPromise.create({
        provider: provider,
        types: {
            ActionId: 'u128',
            TokenId: 'u128',
            EgldBalance: 'Balance',
            LocalAction: {
                _enum: {
                    //@ts-expect-error struct
                    Unfreeze: {
                        to: 'AccountId',
                        value: 'Balance',
                    },
                    //@ts-expect-error struct
                    RpcCall: {
                        contract: 'AccountId',
                        call_data: 'Vec<u8>',
                    },
                    //@ts-expect-error struct
                    TransferWrapped: {
                        to: 'AccountId',
                        value: 'Balance',
                    },
                },
            },
            ActionInfo: {
                action: 'LocalAction',
                validators: 'BTreeSet<AccountId>',
            },
        },
    });
    const helper = new PolkadotPalletHelper(api, signer);
    return helper;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9sa2Fkb3RfcGFsbGV0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hhbmRsZXJzL3BvbGthZG90X3BhbGxldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBdUQ7QUFJdkQsZ0VBQXFDO0FBRXJDLG9EQU0wQjtBQUMxQix5Q0FBK0M7QUFFL0MsU0FBUyxZQUFZLENBQUMsSUFBVztJQUM3QixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUNqRSxPQUFPLENBQ1YsQ0FBQztBQUNOLENBQUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxNQUFhLG9CQUFvQjtJQVk3QixZQUFvQixHQUFlLEVBQUUsTUFBbUI7UUFDcEQsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFDZixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN6QixDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUF5QztRQUNyRCxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUMxQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6QyxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFvREQsS0FBSyxDQUFDLFlBQVksQ0FDZCxFQUFlO1FBRWYsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUN2QixRQUFRLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDbEIsS0FBSyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUNuQixNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFTLENBQzNCLEtBQUssQ0FB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