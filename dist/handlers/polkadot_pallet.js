"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolkadotPalletHelper = void 0;
const api_1 = require("@polkadot/api");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const chain_handler_1 = require("../chain_handler");
const common_1 = require("./common");
const polkadot_1 = require("./polkadot");
function sanitizeHexData(dest) {
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
                const dest = sanitizeHexData(event.data[1]);
                const value = new bignumber_js_1.default(event.data[2].toJSON());
                return new chain_handler_1.TransferEvent(action_id, dest, value);
            }
            case 'TransferUniqueFrozen': {
                const action_id = new bignumber_js_1.default(event.data[0].toString());
                const to = sanitizeHexData(event.data[1]);
                const ident = event.data[2].toU8a();
                return new chain_handler_1.TransferUniqueEvent(action_id, to, ident);
            }
            case 'ScCall': {
                const action_id = new bignumber_js_1.default(event.data[0].toString());
                const to = sanitizeHexData(event.data[1]);
                const endpoint = event.data[2].toJSON();
                const args = event.data[3].toJSON();
                return new chain_handler_1.ScCallEvent(action_id, to, new bignumber_js_1.default(0), endpoint, polkadot_1.scCallArgSanitize(args));
            }
            case 'UnfreezeWrapped': {
                const action_id = new bignumber_js_1.default(event.data[0].toString());
                const dest = sanitizeHexData(event.data[1]);
                const value = new bignumber_js_1.default(event.data[2].toJSON());
                return new chain_handler_1.UnfreezeEvent(action_id, dest, value);
            }
            case 'UnfreezeUniqueWrapped': {
                const action_id = new bignumber_js_1.default(event.data[0].toString());
                const to = sanitizeHexData(event.data[1]);
                const data = sanitizeHexData(event.data[2]);
                return new chain_handler_1.UnfreezeUniqueEvent(action_id, to, Buffer.from(data, 'hex'));
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
        else if (event instanceof chain_handler_1.UnfreezeUniqueEvent) {
            await this.unfreeze_nft(event);
        }
        else if (event instanceof chain_handler_1.TransferUniqueEvent) {
            await this.send_wrap_nft(event);
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
    async unfreeze_nft(event) {
        console.log(`unfreeze_nft! to: ${event.to}`);
        await this.api.tx.freezer
            .unfreezeNftVerify(event.id.toString(), event.to, event.nft_id)
            .signAndSend(this.signer, (result) => {
            console.log(`unfreeze nft: ${result.status}`);
        });
    }
    async send_wrap(event) {
        console.log(`send_wrap! to: ${event.to}, value: ${event.value}`);
        await this.api.tx.freezer
            .transferWrappedVerify(event.action_id.toString(), event.to, event.value.toString())
            .signAndSend(this.signer, (result) => {
            console.log(`send wrap: `, result.status);
        });
    }
    async send_wrap_nft(event) {
        console.log(`send wrap nft! to: ${event.to}`);
        await this.api.tx.freezer
            .transferWrappedNftVerify(event.action_id.toString(), event.to, common_1.toHex(event.id))
            .signAndSend(this.signer, (result) => {
            console.log(`send wrap nft: ${result.status}`);
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
            CommodityId: 'H256',
            CommodityInfo: 'Vec<u8>',
            NftId: 'H256',
            NftInfo: 'Vec<u8>',
            EgldBalance: 'Balance',
            Commodity: '(H256, Vec<u8>)',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9sa2Fkb3RfcGFsbGV0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hhbmRsZXJzL3BvbGthZG90X3BhbGxldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBdUQ7QUFJdkQsZ0VBQXFDO0FBRXJDLG9EQVEwQjtBQUMxQixxQ0FBaUM7QUFDakMseUNBQStDO0FBRS9DLFNBQVMsZUFBZSxDQUFDLElBQVc7SUFDaEMsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FDakUsT0FBTyxDQUNWLENBQUM7QUFDTixDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsTUFBYSxvQkFBb0I7SUFZN0IsWUFBb0IsR0FBZSxFQUFFLE1BQW1CO1FBQ3BELElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1FBQ2YsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDekIsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBeUM7UUFDckQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDMUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDekMsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBeURELEtBQUssQ0FBQyxZQUFZLENBQ2QsRUFBZTtRQUVmLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDdkIsUUFBUSxLQUFLLENBQUMsTUFBTSxFQUFFO1lBQ2xCLEtBQUssZ0JBQWdCLENBQUMsQ0FBQztnQkFDbkIsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxD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