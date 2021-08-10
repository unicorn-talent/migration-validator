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
        this.chainNonce = 0x0;
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
                const chain_nonce = parseInt(event.data[1].toString());
                const dest = sanitizeHexData(event.data[2]);
                const value = new bignumber_js_1.default(event.data[3].toJSON());
                return new chain_handler_1.TransferEvent(action_id, chain_nonce, dest, value);
            }
            case 'TransferUniqueFrozen': {
                const action_id = new bignumber_js_1.default(event.data[0].toString());
                const chain_nonce = parseInt(event.data[1].toString());
                const to = sanitizeHexData(event.data[2]);
                const ident = event.data[3].toU8a();
                return new chain_handler_1.TransferUniqueEvent(action_id, chain_nonce, to, ident);
            }
            case 'UnfreezeWrapped': {
                const action_id = new bignumber_js_1.default(event.data[0].toString());
                const chain_nonce = parseInt(event.data[1].toString());
                const dest = sanitizeHexData(event.data[2]);
                const value = new bignumber_js_1.default(event.data[3].toJSON());
                return new chain_handler_1.UnfreezeEvent(action_id, chain_nonce, dest, value);
            }
            case 'UnfreezeUniqueWrapped': {
                const action_id = new bignumber_js_1.default(event.data[0].toString());
                const to = sanitizeHexData(event.data[1]);
                const data = event.data[2].toString().replace('0x', '');
                return new chain_handler_1.UnfreezeUniqueEvent(action_id, 0, // TODO: Decode
                to, Buffer.from(data, 'hex'));
            }
            default:
                return undefined;
        }
    }
    async emittedEventHandler(event, origin_nonce) {
        let block;
        if (event instanceof chain_handler_1.UnfreezeEvent) {
            block = await this.unfreeze(event);
        }
        else if (event instanceof chain_handler_1.TransferEvent) {
            block = await this.send_wrap(event, origin_nonce);
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
    async unfreeze_nft(event) {
        console.log(`unfreeze_nft! to: ${event.to}`);
        return await this.resolve_block(this.api.tx.freezer
            .unfreezeNftVerify(event.id.toString(), event.to, event.nft_id));
    }
    async send_wrap(event, origin_nonce) {
        console.log(`send_wrap! to: ${event.to}, value: ${event.value}`);
        return await this.resolve_block(this.api.tx.freezer
            .transferWrappedVerify(event.action_id.toString(), origin_nonce, event.to, event.value.toString()));
    }
    async send_wrap_nft(event) {
        console.log(`send wrap nft! to: ${event.to}`);
        return await this.resolve_block(this.api.tx.freezer
            .transferWrappedNftVerify(event.action_id.toString(), event.to, `0x${common_1.toHex(event.id)}` // TODO: Encode Chain Nonce
        ));
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
            TokenId: 'u64',
            CommodityId: 'H256',
            CommodityInfo: 'Vec<u8>',
            NftId: 'H256',
            NftInfo: 'Vec<u8>',
            Erc1155Balance: 'Balance',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9sa2Fkb3RfcGFsbGV0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hhbmRsZXJzL3BvbGthZG90X3BhbGxldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBdUQ7QUFLdkQsZ0VBQXFDO0FBRXJDLG9EQVEwQjtBQUMxQixxQ0FBaUM7QUFFakMsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUE7QUFFakMsU0FBUyxlQUFlLENBQUMsR0FBVTtJQUNsQyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDekIsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQ3pELE9BQU8sQ0FDVixDQUFDO0lBRUwsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUU7UUFDbkMsR0FBRyxHQUFHLElBQUksQ0FBQztLQUNYO0lBRUQsT0FBTyxHQUFHLENBQUM7QUFDWixDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsTUFBYSxvQkFBb0I7SUFlN0IsWUFBb0IsR0FBZSxFQUFFLE1BQW1CO1FBRi9DLGVBQVUsR0FBRyxHQUFHLENBQUM7UUFHdEIsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFDZixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN6QixDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUF5QztRQUNyRCxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUMxQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6QyxDQUFD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