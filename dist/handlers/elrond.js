"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElrondHelper = void 0;
const erdjs_1 = require("@elrondnetwork/erdjs");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const chain_handler_1 = require("../chain_handler");
const common_1 = require("./common");
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
/**
 * Elrond helper
 *
 * Handles [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 *
 * Emits [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 */
class ElrondHelper {
    constructor(provider, sender, signer, mintContract, eventSocket) {
        this.chainNonce = 0x1;
        this.provider = provider;
        this.sender = sender;
        this.signer = signer;
        this.mintContract = mintContract;
        this.eventSocket = eventSocket;
        this.codec = new erdjs_1.BinaryCodec();
    }
    async eventIter(cb) {
        this.eventSocket.on('elrond:transfer_event', async (id) => await cb(id));
    }
    async eventHandler(id) {
        const rpc_ev = await this.eventDecoder(id);
        return rpc_ev;
    }
    async emittedEventHandler(event) {
        let tx;
        if (event instanceof chain_handler_1.TransferEvent) {
            tx = await this.transferMintVerify(event);
        }
        else if (event instanceof chain_handler_1.UnfreezeEvent) {
            tx = await this.unfreezeVerify(event);
        }
        else if (event instanceof chain_handler_1.TransferUniqueEvent) {
            tx = await this.transferNftVerify(event);
        }
        else if (event instanceof chain_handler_1.UnfreezeUniqueEvent) {
            tx = await this.unfreezeNftVerify(event);
        }
        else {
            throw Error('Unsupported event!');
        }
        const hash = tx.getHash();
        console.log(`Elrond event hash: ${hash.toString()}`);
        return hash;
    }
    async unfreezeVerify({ id, to, value, }) {
        await this.sender.sync(this.provider);
        const tx = new erdjs_1.Transaction({
            receiver: this.mintContract,
            nonce: this.sender.nonce,
            gasLimit: new erdjs_1.GasLimit(50000000),
            data: erdjs_1.TransactionPayload.contractCall()
                .setFunction(new erdjs_1.ContractFunction('validateUnfreeze'))
                .addArg(new erdjs_1.BigUIntValue(id))
                .addArg(new erdjs_1.AddressValue(new erdjs_1.Address(to)))
                .addArg(new erdjs_1.U32Value(value))
                .build(),
        });
        this.signer.sign(tx);
        await tx.send(this.provider);
        return tx;
    }
    async unfreezeNftVerify({ id, to, nft_id, }) {
        await this.sender.sync(this.provider);
        const nft_info = this.codec.decodeNested(Buffer.from(nft_id), nft_info_encoded_t)[0].valueOf();
        const tx = new erdjs_1.Transaction({
            receiver: this.mintContract,
            nonce: this.sender.nonce,
            gasLimit: new erdjs_1.GasLimit(70000000),
            data: erdjs_1.TransactionPayload.contractCall()
                .setFunction(new erdjs_1.ContractFunction("validateUnfreezeNft"))
                .addArg(new erdjs_1.BigUIntValue(id))
                .addArg(new erdjs_1.AddressValue(new erdjs_1.Address(to)))
                .addArg(new erdjs_1.TokenIdentifierValue(nft_info.token))
                .addArg(new erdjs_1.U64Value(nft_info.nonce))
                .build()
        });
        this.signer.sign(tx);
        await tx.send(this.provider);
        return tx;
    }
    async transferNftVerify({ action_id, chain_nonce, to, id }) {
        await this.sender.sync(this.provider);
        const tx = new erdjs_1.Transaction({
            receiver: this.mintContract,
            nonce: this.sender.nonce,
            gasLimit: new erdjs_1.GasLimit(80000000),
            data: erdjs_1.TransactionPayload.contractCall()
                .setFunction(new erdjs_1.ContractFunction('validateSendNft'))
                .addArg(new erdjs_1.BigUIntValue(action_id))
                .addArg(new erdjs_1.U64Value(new bignumber_js_1.default(chain_nonce)))
                .addArg(new erdjs_1.AddressValue(new erdjs_1.Address(to)))
                .addArg(erdjs_1.BytesValue.fromHex(common_1.toHex(id)))
                .build()
        });
        this.signer.sign(tx);
        await tx.send(this.provider);
        return tx;
    }
    async transferMintVerify({ action_id, chain_nonce, to, value, }) {
        await this.sender.sync(this.provider);
        const tx = new erdjs_1.Transaction({
            receiver: this.mintContract,
            nonce: this.sender.nonce,
            gasLimit: new erdjs_1.GasLimit(50000000),
            data: erdjs_1.TransactionPayload.contractCall()
                .setFunction(new erdjs_1.ContractFunction('validateSendWrapped'))
                .addArg(new erdjs_1.BigUIntValue(action_id))
                .addArg(new erdjs_1.U64Value(new bignumber_js_1.default(chain_nonce)))
                .addArg(new erdjs_1.AddressValue(new erdjs_1.Address(to)))
                .addArg(new erdjs_1.U32Value(value))
                .build(),
        });
        this.signer.sign(tx);
        await tx.send(this.provider);
        return tx;
    }
    async eventDecoder(id) {
        await this.sender.sync(this.provider);
        const tx = new erdjs_1.Transaction({
            receiver: this.mintContract,
            nonce: this.sender.nonce,
            gasLimit: new erdjs_1.GasLimit(50000000),
            data: erdjs_1.TransactionPayload.contractCall()
                .setFunction(new erdjs_1.ContractFunction('eventRead'))
                .addArg(new erdjs_1.BigUIntValue(new bignumber_js_1.default(id)))
                .build(),
        });
        this.signer.sign(tx);
        await tx.send(this.provider);
        await new Promise(r => setTimeout(r, 4000));
        await tx.awaitNotarized(this.provider);
        console.log(`tx hash: ${tx.getHash().toString()}`);
        const res = (await tx.getAsOnNetwork(this.provider)).getSmartContractResults();
        const data = res.getImmediate().outputUntyped();
        switch (data[0][0]) {
            case 0: {
                const unfreeze = this.codec
                    .decodeNested(data[0], event_info_unfreeze_t)[0]
                    .valueOf().evunfreeze;
                return new chain_handler_1.UnfreezeEvent(new bignumber_js_1.default(id), unfreeze['chain_nonce'].valueOf().toNumber(), Buffer.from(unfreeze['to']).toString(), new bignumber_js_1.default(Number(unfreeze['value'])));
            }
            case 1: {
                const unfreeze_nft = this.codec
                    .decodeNested(data[0], event_info_nft_t)[0]
                    .valueOf().evunfreezenft;
                return new chain_handler_1.UnfreezeUniqueEvent(new bignumber_js_1.default(id), unfreeze_nft['chain_nonce'].valueOf().toNumber(), Buffer.from(unfreeze_nft['to']).toString(), Buffer.from(unfreeze_nft['id']));
            }
            case 2: {
                const transfer = this.codec
                    .decodeNested(data[0], event_info_transfer_t)[0]
                    .valueOf().evtransfer;
                return new chain_handler_1.TransferEvent(new bignumber_js_1.default(id), transfer['chain_nonce'].valueOf().toNumber(), Buffer.from(transfer['to']).toString(), new bignumber_js_1.default(Number(transfer['value'])));
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
                return new chain_handler_1.TransferUniqueEvent(new bignumber_js_1.default(id), transfer_nft['chain_nonce'].valueOf().toNumber(), Buffer.from(transfer_nft['to']).toString(), Uint8Array.from(encoded_info));
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
    await erdjs_1.NetworkConfig.getDefault().sync(provider);
    const signer = new erdjs_1.UserSigner(erdjs_1.parseUserKey(secret_key));
    const senderac = new erdjs_1.Account(signer.getAddress());
    return new ElrondHelper(provider, senderac, signer, new erdjs_1.Address(minter), socket);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxyb25kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hhbmRsZXJzL2Vscm9uZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxnREFnQzhCO0FBQzlCLGdFQUFxQztBQUVyQyxvREFRMEI7QUFFMUIscUNBQWlDO0FBRWpDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxrQkFBVSxDQUFDLFVBQVUsRUFBRTtJQUNoRCxJQUFJLDZCQUFxQixDQUFDLGFBQWEsRUFBRSxFQUFFLEVBQUUsSUFBSSxlQUFPLEVBQUUsQ0FBQztJQUMzRCxJQUFJLDZCQUFxQixDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxnQkFBUSxDQUFDLElBQUksY0FBTSxFQUFFLENBQUMsQ0FBQztJQUMvRCxJQUFJLDZCQUFxQixDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsSUFBSSxtQkFBVyxFQUFFLENBQUM7Q0FDNUQsQ0FBQyxDQUFDO0FBRUgsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGtCQUFVLENBQUMsVUFBVSxFQUFFO0lBQ2hELElBQUksNkJBQXFCLENBQUMsYUFBYSxFQUFFLEVBQUUsRUFBRSxJQUFJLGVBQU8sRUFBRSxDQUFDO0lBQzNELElBQUksNkJBQXFCLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLGdCQUFRLENBQUMsSUFBSSxjQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELElBQUksNkJBQXFCLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxJQUFJLG1CQUFXLEVBQUUsQ0FBQztDQUM1RCxDQUFDLENBQUM7QUFFSCxNQUFNLG9CQUFvQixHQUFHLElBQUksa0JBQVUsQ0FBQyxhQUFhLEVBQUU7SUFDdkQsSUFBSSw2QkFBcUIsQ0FBQyxhQUFhLEVBQUUsRUFBRSxFQUFFLElBQUksZUFBTyxFQUFFLENBQUM7SUFDM0QsSUFBSSw2QkFBcUIsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksZ0JBQVEsQ0FBQyxJQUFJLGNB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