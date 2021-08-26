"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElrondHelper = void 0;
const v8_1 = __importDefault(require("v8"));
const erdjs_1 = require("@elrondnetwork/erdjs");
const axios_1 = __importDefault(require("axios"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const js_base64_1 = require("js-base64");
const chain_handler_1 = require("../chain_handler");
const common_1 = require("./common");
const nft_info_encoded_t = new erdjs_1.StructType('EncodedNft', [
    new erdjs_1.StructFieldDefinition('token', '', new erdjs_1.TokenIdentifierType()),
    new erdjs_1.StructFieldDefinition('nonce', '', new erdjs_1.U64Type())
]);
function isEsdtNftInfo(maybe) {
    return maybe.creator != undefined && maybe.balance == "1";
}
function bigIntFromBe(buf) {
    // TODO: something better than this hack
    return new bignumber_js_1.default(`0x${Buffer.from(buf).toString('hex')}`, 16);
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
        this.provider = provider;
        this.providerRest = providerRest;
        this.sender = sender;
        this.signer = signer;
        this.mintContract = mintContract;
        this.ws = eventSocket;
        this.codec = new erdjs_1.BinaryCodec();
    }
    async eventIter(cb) {
        this.ws.addEventListener("open", () => {
            this.ws.send(JSON.stringify({
                "subscriptionEntries": [
                    {
                        "address": this.mintContract
                    }
                ]
            }));
        });
        this.ws.addEventListener("message", (ev) => {
            const evs = JSON.parse(ev.data);
            evs.forEach(async (v) => await cb(v));
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
    async eventHandler(event) {
        if (event.topics.length < 4) {
            throw Error(`Invalid event: ${JSON.stringify(event)}`);
        }
        const action_id = bigIntFromBe(js_base64_1.Base64.toUint8Array(event.topics[0]));
        const chain_nonce = (new Uint32Array(js_base64_1.Base64.toUint8Array(event.topics[1])))[0]; // TODO: Consider LO
        const to = js_base64_1.Base64.atob(event.topics[2]);
        switch (event.identifier) {
            case "Unfreeze": {
                const value = bigIntFromBe(js_base64_1.Base64.toUint8Array(event.topics[3]));
                return new chain_handler_1.UnfreezeEvent(action_id, chain_nonce, to, value);
            }
            case "UnfreezeNft": {
                return new chain_handler_1.UnfreezeUniqueEvent(action_id, chain_nonce, to, js_base64_1.Base64.toUint8Array(event.topics[3]));
            }
            case "Transfer": {
                const value = bigIntFromBe(js_base64_1.Base64.toUint8Array(event.topics[3]));
                return new chain_handler_1.TransferEvent(action_id, chain_nonce, to, value);
            }
            case "TransferNft": {
                const token = Buffer.from(js_base64_1.Base64.toUint8Array(event.topics[3]));
                const nonce = bigIntFromBe(js_base64_1.Base64.toUint8Array(event.topics[4]));
                const nft_info = new erdjs_1.Struct(nft_info_encoded_t, [
                    new erdjs_1.StructField(new erdjs_1.TokenIdentifierValue(token), 'token'),
                    new erdjs_1.StructField(new erdjs_1.U64Value(nonce), 'nonce'),
                ]);
                const encoded_info = this.codec.encodeNested(nft_info);
                console.log(common_1.toHex(encoded_info));
                const nft_data = await this.getLockedNft({ token: token.toString("utf-8"), nonce: nonce.toNumber() });
                if (nft_data === undefined) {
                    throw Error("Transferring Non Frozen Nft?!");
                }
                return new chain_handler_1.TransferUniqueEvent(action_id, chain_nonce, to, Uint8Array.from(encoded_info), js_base64_1.Base64.atob(nft_data.uris[0]));
            }
            default:
                throw Error(`unhandled event: ${event.identifier}`);
        }
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
        if (!nft_data) {
            throw Error("unfreezing non existent nft?!");
        }
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
        return new Map(ents.filter(([, info]) => isEsdtNftInfo(info)));
    }
    async getLockedNft({ token, nonce }) {
        const nfts = await this.listNft(this.mintContract.toString());
        return nfts.get(`${token}-0${nonce.toString(16)}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxyb25kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hhbmRsZXJzL2Vscm9uZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw0Q0FBb0I7QUFDcEIsZ0RBMkI4QjtBQUM5QixrREFBMkM7QUFDM0MsZ0VBQXFDO0FBQ3JDLHlDQUFpQztBQUNqQyxvREFTMEI7QUFFMUIscUNBQWlDO0FBRWpDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxrQkFBVSxDQUFDLFlBQVksRUFBRTtJQUNwRCxJQUFJLDZCQUFxQixDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsSUFBSSwyQkFBbUIsRUFBRSxDQUFDO0lBQ2pFLElBQUksNkJBQXFCLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxJQUFJLGVBQU8sRUFBRSxDQUFDO0NBQ3hELENBQUMsQ0FBQztBQTRCSCxTQUFTLGFBQWEsQ0FBQyxLQUF1QjtJQUM1QyxPQUFPLEtBQUssQ0FBQyxPQUFPLElBQUksU0FBUyxJQUFJLEtBQUssQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDO0FBQzVELENBQUM7QUFTRCxTQUFTLFlBQVksQ0FBQyxHQUFlO0lBQ2pDLHdDQUF3QztJQUN4QyxPQUFPLElBQUksc0JBQVMsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7QUFDckUsQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILE1BQWEsWUFBWTtJQWlCckIsWUFDSSxRQUF1QixFQUM3QixZQUEyQixFQUNyQixNQUFlLEVBQ2YsTUFBZSxFQUNmLFlBQXFCLEVBQ3JCLFdBQXNCO1FBVGpCLGVBQVUsR0FBRyxHQUFHLENBQUM7UUFDcEIsZUFBVSxHQUFHLFFBQVEsQ0FBQztRQVV4QixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUMvQixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FB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