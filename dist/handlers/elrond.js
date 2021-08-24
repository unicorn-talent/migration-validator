"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElrondHelper = void 0;
const erdjs_1 = require("@elrondnetwork/erdjs");
const transactionWatcher_1 = require("@elrondnetwork/erdjs/out/transactionWatcher");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const chain_handler_1 = require("../chain_handler");
const common_1 = require("./common");
const v8_1 = __importDefault(require("v8"));
const axios_1 = __importDefault(require("axios"));
const js_base64_1 = require("js-base64");
const unfreeze_event_t = new erdjs_1.StructType('Unfreeze', [
    new erdjs_1.StructFieldDefinition('chain_nonce', '', new erdjs_1.U64Type()),
    new erdjs_1.StructFieldDefinition('to', '', new erdjs_1.ListType(new erdjs_1.U8Type())),
    new erdjs_1.StructFieldDefinition('value', '', new erdjs_1.BigUIntType()),
]);
const transfer_event_t = new erdjs_1.StructType('Transfer', [
    new erdjs_1.StructFieldDefinition('chain_nonce', '', new erdjs_1.U64Type()),
    new erdjs_1.StructFieldDefinition('to', '', new erdjs_1.ListType(new erdjs_1.U8Type())),
    new erdjs_1.StructFieldDefinition('value', '', new erdjs_1.BigUIntType()),
]);
const unfreeze_nft_event_t = new erdjs_1.StructType(`UnfreezeNft`, [
    new erdjs_1.StructFieldDefinition('chain_nonce', '', new erdjs_1.U64Type()),
    new erdjs_1.StructFieldDefinition('to', '', new erdjs_1.ListType(new erdjs_1.U8Type())),
    new erdjs_1.StructFieldDefinition('id', '', new erdjs_1.ListType(new erdjs_1.U8Type()))
]);
const transfer_nft_event_t = new erdjs_1.StructType('TransferNft', [
    new erdjs_1.StructFieldDefinition('chain_nonce', '', new erdjs_1.U64Type()),
    new erdjs_1.StructFieldDefinition('to', '', new erdjs_1.ListType(new erdjs_1.U8Type())),
    new erdjs_1.StructFieldDefinition('token', '', new erdjs_1.TokenIdentifierType()),
    new erdjs_1.StructFieldDefinition('nonce', '', new erdjs_1.U64Type())
]);
const event_t = new erdjs_1.EnumType('Event', [
    new erdjs_1.EnumVariantDefinition('Unfreeze', 0),
    new erdjs_1.EnumVariantDefinition('UnfreezeNft', 1),
    new erdjs_1.EnumVariantDefinition('Transfer', 2),
    new erdjs_1.EnumVariantDefinition('TransferNft', 3),
]);
const event_info_unfreeze_t = new erdjs_1.StructType('EventInfo', [
    new erdjs_1.StructFieldDefinition('event', '', event_t),
    new erdjs_1.StructFieldDefinition('evunfreeze', '', unfreeze_event_t),
    new erdjs_1.StructFieldDefinition('read_cnt', '', new erdjs_1.BigUIntType()),
]);
const event_info_transfer_t = new erdjs_1.StructType('EventInfo', [
    new erdjs_1.StructFieldDefinition('event', '', event_t),
    new erdjs_1.StructFieldDefinition('evtransfer', '', transfer_event_t),
    new erdjs_1.StructFieldDefinition('read_cnt', '', new erdjs_1.BigUIntType()),
]);
const event_info_nft_t = new erdjs_1.StructType('EventInfo', [
    new erdjs_1.StructFieldDefinition('event', '', event_t),
    new erdjs_1.StructFieldDefinition('evunfreezenft', '', unfreeze_nft_event_t),
    new erdjs_1.StructFieldDefinition('read_cnt', '', new erdjs_1.BigUIntType())
]);
const event_info_transfer_nft_t = new erdjs_1.StructType('EventInfo', [
    new erdjs_1.StructFieldDefinition('event', '', event_t),
    new erdjs_1.StructFieldDefinition('evtransfernft', '', transfer_nft_event_t),
    new erdjs_1.StructFieldDefinition('read_cnt', '', new erdjs_1.BigUIntType())
]);
const nft_info_encoded_t = new erdjs_1.StructType('EncodedNft', [
    new erdjs_1.StructFieldDefinition('token', '', new erdjs_1.TokenIdentifierType()),
    new erdjs_1.StructFieldDefinition('nonce', '', new erdjs_1.U64Type())
]);
function filterEventId(results) {
    for (const res of results) {
        if (res["nonce"] === 0) {
            continue;
        }
        const data = res.data.split("@");
        if (data[0] != "" || data[1] != "6f6b" || data.length != 3) {
            continue;
        }
        try {
            return parseInt(data[2], 16);
        }
        catch (NumberFormatException) {
            continue;
        }
    }
    throw Error(`invalid result: ${results.toString()}`);
}
function isEsdtNftInfo(maybe) {
    return maybe.creator != undefined && maybe.balance == "1";
}
/**
 * Elrond helper
 *
 * Handles [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 *
 * Emits [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 */
class ElrondHelper {
    constructor(provider, providerRest, sender, signer, mintContract, eventSocket) {
        this.chainNonce = 0x2;
        this.chainIdent = "Elrond";
        this.transactionResult = async (tx_hash) => {
            const uri = `/transaction/${tx_hash.toString()}?withResults=true`;
            while (true) {
                const res = await this.providerRest.get(uri);
                const data = res.data;
                if (data["code"] != "successful") {
                    return undefined;
                }
                const tx_info = data["data"]["transaction"];
                if (tx_info["status"] == "pending") {
                    await new Promise(r => setTimeout(r, 5000));
                    continue;
                }
                if (tx_info["status"] != "success") {
                    throw Error("failed to execute txn");
                }
                return tx_info;
            }
        };
        this.provider = provider;
        this.providerRest = providerRest;
        this.sender = sender;
        this.signer = signer;
        this.mintContract = mintContract;
        this.eventSocket = eventSocket;
        this.codec = new erdjs_1.BinaryCodec();
    }
    async eventIter(cb) {
        this.eventSocket.on('elrond:transfer_tx', async (tx_hash) => {
            let txh;
            try {
                txh = new erdjs_1.TransactionHash(tx_hash);
            }
            catch (_) {
                return;
            }
            await new Promise(r => setTimeout(r, 3000));
            const watcher = new transactionWatcher_1.TransactionWatcher(txh, this.provider);
            await watcher.awaitNotarized();
            const res = (await this.transactionResult(txh))["smartContractResults"];
            const id = filterEventId(res).toString();
            await cb(id);
        });
    }
    async sendWrapper(tx) {
        const orig = v8_1.default.deserialize(v8_1.default.serialize(tx));
        tx.setNonce(this.sender.nonce);
        this.signer.sign(tx);
        this.sender.incrementNonce();
        try {
            await tx.send(this.provider);
        }
        catch (e) {
            if (e.message.includes("lowerNonceInTx")) {
                this.sender.sync(this.provider);
                return await this.sendWrapper(orig);
            }
            throw e;
        }
        return tx;
    }
    async eventHandler(id) {
        const rpc_ev = await this.eventDecoder(id);
        return rpc_ev;
    }
    async emittedEventHandler(event, origin_nonce) {
        let tx;
        let dat = undefined;
        if (event instanceof chain_handler_1.TransferEvent) {
            tx = await this.transferMintVerify(event, origin_nonce);
        }
        else if (event instanceof chain_handler_1.UnfreezeEvent) {
            tx = await this.unfreezeVerify(event);
        }
        else if (event instanceof chain_handler_1.TransferUniqueEvent) {
            tx = await this.transferNftVerify(event, origin_nonce);
            dat = { id: event.nft_data, data: event.to };
        }
        else if (event instanceof chain_handler_1.UnfreezeUniqueEvent) {
            const res = await this.unfreezeNftVerify(event);
            tx = res[0];
            dat = { id: res[1], data: event.to };
        }
        else {
            throw Error('Unsupported event!');
        }
        const hash = tx.getHash();
        console.log(`Elrond event hash: ${hash.toString()}`);
        return [hash, dat];
    }
    async unfreezeVerify({ id, to, value, }) {
        const tx = new erdjs_1.Transaction({
            receiver: this.mintContract,
            gasLimit: new erdjs_1.GasLimit(50000000),
            data: erdjs_1.TransactionPayload.contractCall()
                .setFunction(new erdjs_1.ContractFunction('validateUnfreeze'))
                .addArg(new erdjs_1.BigUIntValue(id))
                .addArg(new erdjs_1.AddressValue(new erdjs_1.Address(to)))
                .addArg(new erdjs_1.U32Value(value))
                .build(),
        });
        const ex = await this.sendWrapper(tx);
        return ex;
    }
    /**
    * Unfreeze a frozen nft
    *
    *
    * @returns Transaction hash and original data in the nft
    */
    async unfreezeNftVerify({ id, to, nft_id, }) {
        const nft_info = this.codec.decodeNested(Buffer.from(nft_id), nft_info_encoded_t)[0].valueOf();
        const nft_data = await this.getLockedNft({ nonce: nft_info.nonce, token: nft_info.token });
        const tx = new erdjs_1.Transaction({
            receiver: this.mintContract,
            gasLimit: new erdjs_1.GasLimit(70000000),
            data: erdjs_1.TransactionPayload.contractCall()
                .setFunction(new erdjs_1.ContractFunction("validateUnfreezeNft"))
                .addArg(new erdjs_1.BigUIntValue(id))
                .addArg(new erdjs_1.AddressValue(new erdjs_1.Address(to)))
                .addArg(new erdjs_1.TokenIdentifierValue(nft_info.token))
                .addArg(new erdjs_1.U64Value(nft_info.nonce))
                .build()
        });
        const ex = await this.sendWrapper(tx);
        return [ex, js_base64_1.Base64.atob(nft_data.uris[0])];
    }
    async transferNftVerify({ action_id, to, id }, origin_nonce) {
        const tx = new erdjs_1.Transaction({
            receiver: this.mintContract,
            gasLimit: new erdjs_1.GasLimit(80000000),
            data: erdjs_1.TransactionPayload.contractCall()
                .setFunction(new erdjs_1.ContractFunction('validateSendNft'))
                .addArg(new erdjs_1.BigUIntValue(action_id))
                .addArg(new erdjs_1.U64Value(new bignumber_js_1.default(origin_nonce)))
                .addArg(new erdjs_1.AddressValue(new erdjs_1.Address(to)))
                .addArg(erdjs_1.BytesValue.fromHex(common_1.toHex(id)))
                .build()
        });
        const ex = await this.sendWrapper(tx);
        return ex;
    }
    async transferMintVerify({ action_id, to, value, }, origin_nonce) {
        const tx = new erdjs_1.Transaction({
            receiver: this.mintContract,
            gasLimit: new erdjs_1.GasLimit(70000000),
            data: erdjs_1.TransactionPayload.contractCall()
                .setFunction(new erdjs_1.ContractFunction('validateSendWrapped'))
                .addArg(new erdjs_1.BigUIntValue(action_id))
                .addArg(new erdjs_1.U64Value(new bignumber_js_1.default(origin_nonce)))
                .addArg(new erdjs_1.AddressValue(new erdjs_1.Address(to)))
                .addArg(new erdjs_1.U32Value(value))
                .build(),
        });
        const ex = await this.sendWrapper(tx);
        return ex;
    }
    async listEsdt(owner) {
        const raw = await this.providerRest.get(`/address/${owner}/esdt`);
        const dat = raw.data.data.esdts;
        return dat;
    }
    async listNft(owner) {
        const ents = Object.entries(await this.listEsdt(owner));
        return new Map(ents.filter(([_ident, info]) => isEsdtNftInfo(info)));
    }
    async getLockedNft({ token, nonce }) {
        const nfts = await this.listNft(this.mintContract.toString());
        return nfts.get(`${token}-0${nonce.toString(16)}`);
    }
    async eventDecoder(id) {
        const tx = new erdjs_1.Transaction({
            receiver: this.mintContract,
            gasLimit: new erdjs_1.GasLimit(50000000),
            data: erdjs_1.TransactionPayload.contractCall()
                .setFunction(new erdjs_1.ContractFunction('eventRead'))
                .addArg(new erdjs_1.BigUIntValue(new bignumber_js_1.default(id)))
                .build(),
        });
        const ex = await this.sendWrapper(tx);
        await new Promise(r => setTimeout(r, 4000));
        await ex.awaitNotarized(this.provider);
        console.log(`tx hash: ${ex.getHash().toString()}`);
        const res = (await ex.getAsOnNetwork(this.provider)).getSmartContractResults();
        const data = res.getImmediate().outputUntyped();
        switch (data[0][0]) {
            case 0: {
                const unfreeze = this.codec
                    .decodeNested(data[0], event_info_unfreeze_t)[0]
                    .valueOf().evunfreeze;
                return new chain_handler_1.UnfreezeEvent(new bignumber_js_1.default(id), parseInt(unfreeze['chain_nonce'].toString()), Buffer.from(unfreeze['to']).toString(), new bignumber_js_1.default(Number(unfreeze['value'])));
            }
            case 1: {
                const unfreeze_nft = this.codec
                    .decodeNested(data[0], event_info_nft_t)[0]
                    .valueOf().evunfreezenft;
                return new chain_handler_1.UnfreezeUniqueEvent(new bignumber_js_1.default(id), parseInt(unfreeze_nft['chain_nonce'].toString()), Buffer.from(unfreeze_nft['to']).toString(), Buffer.from(unfreeze_nft['id']));
            }
            case 2: {
                const transfer = this.codec
                    .decodeNested(data[0], event_info_transfer_t)[0]
                    .valueOf().evtransfer;
                return new chain_handler_1.TransferEvent(new bignumber_js_1.default(id), parseInt(transfer['chain_nonce'].toString()), Buffer.from(transfer['to']).toString(), new bignumber_js_1.default(Number(transfer['value'])));
            }
            case 3: {
                const transfer_nft = this.codec
                    .decodeNested(data[0], event_info_transfer_nft_t)[0]
                    .valueOf().evtransfernft;
                const nft_info = new erdjs_1.Struct(nft_info_encoded_t, [
                    new erdjs_1.StructField(new erdjs_1.TokenIdentifierValue(transfer_nft['token']), 'token'),
                    new erdjs_1.StructField(new erdjs_1.U64Value(transfer_nft['nonce']), 'nonce'),
                ]);
                const encoded_info = this.codec.encodeNested(nft_info);
                console.log(common_1.toHex(encoded_info));
                const nft_data = await this.getLockedNft({ token: transfer_nft['token'], nonce: transfer_nft['nonce'] });
                return new chain_handler_1.TransferUniqueEvent(new bignumber_js_1.default(id), parseInt(transfer_nft['chain_nonce'].toString()), Buffer.from(transfer_nft['to']).toString(), Uint8Array.from(encoded_info), js_base64_1.Base64.atob(nft_data.uris[0]));
            }
            default:
                throw Error('unhandled event!!!');
        }
    }
}
exports.ElrondHelper = ElrondHelper;
/**
 *
 * @param node_uri uri of the local(or remote?) elrond node
 * @param secret_key String containing the pem content of validator's private key
 * @param sender Bech32 Address of the validator
 * @param minter Bech32 Address of the elrond-mint smart contract
 * @param socket uri of the elrond-event-middleware socket
 */
ElrondHelper.new = async (node_uri, secret_key, minter, socket) => {
    const provider = new erdjs_1.ProxyProvider(node_uri);
    const providerRest = axios_1.default.create({
        baseURL: node_uri
    });
    await erdjs_1.NetworkConfig.getDefault().sync(provider);
    const signer = new erdjs_1.UserSigner(erdjs_1.parseUserKey(secret_key));
    const senderac = new erdjs_1.Account(signer.getAddress());
    await senderac.sync(provider);
    return new ElrondHelper(provider, providerRest, senderac, signer, new erdjs_1.Address(minter), socket);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxyb25kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hhbmRsZXJzL2Vscm9uZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxnREFnQzhCO0FBQzlCLG9GQUFnRjtBQUNoRixnRUFBcUM7QUFFckMsb0RBUzBCO0FBRTFCLHFDQUFpQztBQUNqQyw0Q0FBb0I7QUFDcEIsa0RBQTJDO0FBQzNDLHlDQUFpQztBQUdqQyxNQUFNLGdCQUFnQixHQUFHLElBQUksa0JBQVUsQ0FBQyxVQUFVLEVBQUU7SUFDaEQsSUFBSSw2QkFBcUIsQ0FBQyxhQUFhLEVBQUUsRUFBRSxFQUFFLElBQUksZUFBTyxFQUFFLENBQUM7SUFDM0QsSUFBSSw2QkFBcUIsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksZ0JBQVEsQ0FBQyxJQUFJLGNBQU0sRUFBRSxDQUFDLENBQUM7SUFDL0QsSUFBSSw2QkFBcUIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLElBQUksbUJBQVcsRUFBRSxDQUFDO0NBQzVELENBQUMsQ0FBQztBQUVILE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxrQkFBVSxDQUFDLFVBQVUsRUFBRTtJQUNoRCxJQUFJLDZCQUFxQixDQUFDLGFBQWEsRUFBRSxFQUFFLEVBQUUsSUFBSSxlQUFPLEVBQUUsQ0FBQztJQUMzRCxJQUFJLDZCQUFxQixDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxnQkFBUSxDQUFDLElBQUksY0FBTSxFQUFFLENBQUMsQ0FBQztJQUMvRCxJQUFJLDZCQUFxQixDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsSUFBSSxtQkFBVyxFQUFFLENBQUM7Q0FDNUQsQ0FBQyxDQUFDO0FBRUgsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLGtCQUFVLENBQUMsYUFBYSxFQUFFO0lBQ3ZELElBQUksNkJBQXFCLENBQUMsYUFBYSxFQUFFLEVBQUUsRUFBRSxJQUFJLGVBQU8sRUFBRSxDQUFDO0lBQzNELElBQUksNkJB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