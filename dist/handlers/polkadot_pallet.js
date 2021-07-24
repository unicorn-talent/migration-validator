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
const REPLACEMENT_CHAR = '\ufffd';
function sanitizeHexData(dat) {
    const dats = dat.toString();
    let res = Buffer.from(dats.replace('0x', ''), 'hex').toString('utf-8');
    if (res.includes(REPLACEMENT_CHAR)) {
        res = dats;
    }
    return res;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9sa2Fkb3RfcGFsbGV0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hhbmRsZXJzL3BvbGthZG90X3BhbGxldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBdUQ7QUFJdkQsZ0VBQXFDO0FBRXJDLG9EQVEwQjtBQUMxQixxQ0FBaUM7QUFDakMseUNBQStDO0FBRS9DLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFBO0FBRWpDLFNBQVMsZUFBZSxDQUFDLEdBQVU7SUFDbEMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3pCLElBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUN6RCxPQUFPLENBQ1YsQ0FBQztJQUVMLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1FBQ25DLEdBQUcsR0FBRyxJQUFJLENBQUM7S0FDWDtJQUVELE9BQU8sR0FBRyxDQUFDO0FBQ1osQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILE1BQWEsb0JBQW9CO0lBWTdCLFlBQW9CLEdBQWUsRUFBRSxNQUFtQjtRQUNwRCxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztRQUNmLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3pCLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQXlDO1FBQ3JELElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLENBQUMsQ0FBQyxDQUFDO0lB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