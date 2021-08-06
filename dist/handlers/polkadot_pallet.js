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
        this.chainIdentifier = "POLKADOT";
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
                const data = event.data[2].toString().replace('0x', '');
                return new chain_handler_1.UnfreezeUniqueEvent(action_id, to, Buffer.from(data, 'hex'));
            }
            default:
                return undefined;
        }
    }
    async emittedEventHandler(event) {
        let block;
        if (event instanceof chain_handler_1.UnfreezeEvent) {
            block = await this.unfreeze(event);
        }
        else if (event instanceof chain_handler_1.ScCallEvent) {
            block = await this.sccall(event);
        }
        else if (event instanceof chain_handler_1.TransferEvent) {
            block = await this.send_wrap(event);
        }
        else if (event instanceof chain_handler_1.UnfreezeUniqueEvent) {
            block = await this.unfreeze_nft(event);
        }
        else if (event instanceof chain_handler_1.TransferUniqueEvent) {
            block = await this.send_wrap_nft(event);
        }
        else {
            throw Error(`unhandled event ${event}`);
        }
        return block;
    }
    async resolve_block(ext) {
        return await new Promise((res, rej) => ext.signAndSend(this.signer, (result) => {
            result.isInBlock && res(result.status.asInBlock);
            result.isError && rej();
        }));
    }
    async unfreeze(event) {
        console.log(`unfreeze! to: ${event.to}, value: ${event.value}`);
        return await this.resolve_block(this.api.tx.freezer
            .unfreezeVerify(event.id.toString(), event.to, event.value.toString()));
    }
    async sccall(_event) {
        //pub fn sc_call_verify(&mut self, action_id: String, to: AccountId, value: Balance, endpoint: [u8; 4], args: Vec<Vec<u8>>)
        throw Error('unimplimented');
    }
    async unfreeze_nft(event) {
        console.log(`unfreeze_nft! to: ${event.to}`);
        return await this.resolve_block(this.api.tx.freezer
            .unfreezeNftVerify(event.id.toString(), event.to, event.nft_id));
    }
    async send_wrap(event) {
        console.log(`send_wrap! to: ${event.to}, value: ${event.value}`);
        return await this.resolve_block(this.api.tx.freezer
            .transferWrappedVerify(event.action_id.toString(), event.to, event.value.toString()));
    }
    async send_wrap_nft(event) {
        console.log(`send wrap nft! to: ${event.to}`);
        return await this.resolve_block(this.api.tx.freezer
            .transferWrappedNftVerify(event.action_id.toString(), event.to, `0x${common_1.toHex(event.id)}`));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9sa2Fkb3RfcGFsbGV0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hhbmRsZXJzL3BvbGthZG90X3BhbGxldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBdUQ7QUFLdkQsZ0VBQXFDO0FBRXJDLG9EQVMwQjtBQUMxQixxQ0FBaUM7QUFDakMseUNBQStDO0FBRS9DLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFBO0FBRWpDLFNBQVMsZUFBZSxDQUFDLEdBQVU7SUFDbEMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3pCLElBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUN6RCxPQUFPLENBQ1YsQ0FBQztJQUVMLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1FBQ25DLEdBQUcsR0FBRyxJQUFJLENBQUM7S0FDWDtJQUVELE9BQU8sR0FBRyxDQUFDO0FBQ1osQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILE1BQWEsb0JBQW9CO0lBZTdCLFlBQW9CLEdBQWUsRUFBRSxNQUFtQjtRQUYvQyxvQkFBZSxHQUFHLFVBQVUsQ0FBQztRQUdsQyxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztRQUNmLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3pCLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQXlDO1FBQ3JELElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxD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