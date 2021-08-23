"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolkadotPalletHelper = void 0;
const api_1 = require("@polkadot/api");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const chain_handler_1 = require("../chain_handler");
const encoding_1 = require("../encoding");
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
        this.chainNonce = 0x1;
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
                const data = Buffer.from(event.data[2].toString().replace('0x', ''), 'hex');
                const decoded = encoding_1.NftPacked.deserializeBinary(data);
                return new chain_handler_1.UnfreezeUniqueEvent(action_id, decoded.getChainNonce(), to, decoded.getData_asU8());
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
            block = await this.send_wrap_nft(event, origin_nonce);
        }
        else {
            throw Error(`unhandled event ${event}`);
        }
        return block;
    }
    async resolve_block(ext) {
        return await new Promise((res, rej) => ext.signAndSend(this.signer, { nonce: -1 }, (result) => {
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
            .transferWrappedVerify(origin_nonce, event.action_id.toString(), event.to, event.value.toString()));
    }
    async send_wrap_nft(event, origin_nonce) {
        console.log(`send wrap nft! to: ${event.to}`);
        const data = new encoding_1.NftPacked();
        data.setChainNonce(origin_nonce);
        data.setData(event.id);
        return await this.resolve_block(this.api.tx.freezer
            .transferWrappedNftVerify(event.action_id.toString(), event.to, `0x${common_1.toHex(data.serializeBinary())}`));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9sa2Fkb3RfcGFsbGV0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hhbmRsZXJzL3BvbGthZG90X3BhbGxldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx1Q0FBdUQ7QUFLdkQsZ0VBQXFDO0FBRXJDLG9EQVEwQjtBQUMxQiwwQ0FBd0M7QUFDeEMscUNBQWlDO0FBRWpDLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFBO0FBRWpDLFNBQVMsZUFBZSxDQUFDLEdBQVU7SUFDbEMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3pCLElBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUN6RCxPQUFPLENBQ1YsQ0FBQztJQUVMLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1FBQ25DLEdBQUcsR0FBRyxJQUFJLENBQUM7S0FDWDtJQUVELE9BQU8sR0FBRyxDQUFDO0FBQ1osQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILE1BQWEsb0JBQW9CO0lBZTdCLFlBQW9CLEdBQWUsRUFBRSxNQUFtQjtRQUYvQyxlQUFVLEdBQUcsR0FBRyxDQUFDO1FBR3RCLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1FBQ2YsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDekIsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBeUM7UUFDckQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDMUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENB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