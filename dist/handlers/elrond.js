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
    new erdjs_1.StructFieldDefinition('to', '', new erdjs_1.ListType(new erdjs_1.U8Type())),
    new erdjs_1.StructFieldDefinition('value', '', new erdjs_1.BigUIntType()),
]);
const rpc_event_t = new erdjs_1.StructType('Rpc', [
    new erdjs_1.StructFieldDefinition('to', '', new erdjs_1.ListType(new erdjs_1.U8Type())),
    new erdjs_1.StructFieldDefinition('value', '', new erdjs_1.BigUIntType()),
    new erdjs_1.StructFieldDefinition('endpoint', '', new erdjs_1.ListType(new erdjs_1.U8Type())),
    new erdjs_1.StructFieldDefinition('args', '', new erdjs_1.ListType(new erdjs_1.ListType(new erdjs_1.U8Type()))),
]);
const transfer_event_t = new erdjs_1.StructType('Transfer', [
    new erdjs_1.StructFieldDefinition('to', '', new erdjs_1.ListType(new erdjs_1.U8Type())),
    new erdjs_1.StructFieldDefinition('value', '', new erdjs_1.BigUIntType()),
]);
const unfreeze_nft_event_t = new erdjs_1.StructType(`UnfreezeNft`, [
    new erdjs_1.StructFieldDefinition('to', '', new erdjs_1.ListType(new erdjs_1.U8Type())),
    new erdjs_1.StructFieldDefinition('id', '', new erdjs_1.ListType(new erdjs_1.U8Type()))
]);
const transfer_nft_event_t = new erdjs_1.StructType('TransferNft', [
    new erdjs_1.StructFieldDefinition('to', '', new erdjs_1.ListType(new erdjs_1.U8Type())),
    new erdjs_1.StructFieldDefinition('token', '', new erdjs_1.TokenIdentifierType()),
    new erdjs_1.StructFieldDefinition('nonce', '', new erdjs_1.U64Type())
]);
const event_t = new erdjs_1.EnumType('Event', [
    new erdjs_1.EnumVariantDefinition('Unfreeze', 0),
    new erdjs_1.EnumVariantDefinition('UnfreezeNft', 1),
    new erdjs_1.EnumVariantDefinition('Rpc', 2),
    new erdjs_1.EnumVariantDefinition('Transfer', 3),
    new erdjs_1.EnumVariantDefinition('TransferNft', 4),
]);
const event_info_rpc_t = new erdjs_1.StructType('EventInfo', [
    new erdjs_1.StructFieldDefinition('event', '', event_t),
    new erdjs_1.StructFieldDefinition('evrpc', '', rpc_event_t),
    new erdjs_1.StructFieldDefinition('read_cnt', '', new erdjs_1.BigUIntType()),
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
        this.chainIdentifier = "ELROND";
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
        else if (event instanceof chain_handler_1.ScCallEvent) {
            tx = await this.scCallVerify(event);
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
    async transferNftVerify({ action_id, to, id }) {
        await this.sender.sync(this.provider);
        const tx = new erdjs_1.Transaction({
            receiver: this.mintContract,
            nonce: this.sender.nonce,
            gasLimit: new erdjs_1.GasLimit(80000000),
            data: erdjs_1.TransactionPayload.contractCall()
                .setFunction(new erdjs_1.ContractFunction('validateSendNft'))
                .addArg(new erdjs_1.BigUIntValue(action_id))
                .addArg(new erdjs_1.AddressValue(new erdjs_1.Address(to)))
                .addArg(erdjs_1.BytesValue.fromHex(common_1.toHex(id)))
                .build()
        });
        this.signer.sign(tx);
        await tx.send(this.provider);
        return tx;
    }
    async transferMintVerify({ action_id, to, value, }) {
        await this.sender.sync(this.provider);
        const tx = new erdjs_1.Transaction({
            receiver: this.mintContract,
            nonce: this.sender.nonce,
            gasLimit: new erdjs_1.GasLimit(50000000),
            data: erdjs_1.TransactionPayload.contractCall()
                .setFunction(new erdjs_1.ContractFunction('validateSendXp'))
                .addArg(new erdjs_1.BigUIntValue(action_id))
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
                return new chain_handler_1.UnfreezeEvent(new bignumber_js_1.default(id), Buffer.from(unfreeze['to']).toString(), new bignumber_js_1.default(Number(unfreeze['value'])));
            }
            case 1: {
                const unfreeze_nft = this.codec
                    .decodeNested(data[0], event_info_nft_t)[0]
                    .valueOf().evunfreezenft;
                return new chain_handler_1.UnfreezeUniqueEvent(new bignumber_js_1.default(id), Buffer.from(unfreeze_nft['to']).toString(), Buffer.from(unfreeze_nft['id']));
            }
            case 2: {
                const rpc = this.codec
                    .decodeNested(data[0], event_info_rpc_t)[0]
                    .valueOf().evrpc;
                return new chain_handler_1.ScCallEvent(new bignumber_js_1.default(id), Buffer.from(rpc['to']).toString(), new bignumber_js_1.default(Number(rpc['value'])), Buffer.from(rpc['endpoint']).toString(), 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                rpc['args'].map((s) => Buffer.from(s).toString()));
            }
            case 3: {
                const transfer = this.codec
                    .decodeNested(data[0], event_info_transfer_t)[0]
                    .valueOf().evtransfer;
                return new chain_handler_1.TransferEvent(new bignumber_js_1.default(id), Buffer.from(transfer['to']).toString(), new bignumber_js_1.default(Number(transfer['value'])));
            }
            case 4: {
                const transfer_nft = this.codec
                    .decodeNested(data[0], event_info_transfer_nft_t)[0]
                    .valueOf().evtransfernft;
                const nft_info = new erdjs_1.Struct(nft_info_encoded_t, [
                    new erdjs_1.StructField(new erdjs_1.TokenIdentifierValue(transfer_nft['token']), 'token'),
                    new erdjs_1.StructField(new erdjs_1.U64Value(transfer_nft['nonce']), 'nonce')
                ]);
                const encoded_info = this.codec.encodeNested(nft_info);
                console.log(common_1.toHex(encoded_info));
                return new chain_handler_1.TransferUniqueEvent(new bignumber_js_1.default(id), Buffer.from(transfer_nft['to']).toString(), Uint8Array.from(encoded_info));
            }
            default:
                throw Error('unhandled event!!!');
        }
    }
    async scCallVerify({ action_id, to, value, endpoint, args, }) {
        await this.sender.sync(this.provider);
        // fn validate_sc_call(action_id: BigUint, to: Address, endpoint: BoxedBytes, #[var_args] args: VarArgs<BoxedBytes>,)
        let payloadBuilder = erdjs_1.TransactionPayload.contractCall()
            .setFunction(new erdjs_1.ContractFunction('validateSCCall'))
            .addArg(new erdjs_1.BigUIntValue(action_id))
            .addArg(new erdjs_1.AddressValue(new erdjs_1.Address(to)))
            .addArg(erdjs_1.BytesValue.fromUTF8(endpoint));
        for (const buf of args !== null && args !== void 0 ? args : []) {
            payloadBuilder = payloadBuilder.addArg(erdjs_1.BytesValue.fromHex(buf));
        }
        console.log(`args: ${JSON.stringify(payloadBuilder)}`);
        const tx = new erdjs_1.Transaction({
            receiver: this.mintContract,
            nonce: this.sender.nonce,
            gasLimit: new erdjs_1.GasLimit(80000000),
            data: payloadBuilder.build(),
            value: erdjs_1.Balance.egld(value),
        });
        this.signer.sign(tx);
        await tx.send(this.provider);
        return tx;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxyb25kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hhbmRsZXJzL2Vscm9uZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxnREFpQzhCO0FBQzlCLGdFQUFxQztBQUVyQyxvREFTMEI7QUFFMUIscUNBQWlDO0FBRWpDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxrQkFBVSxDQUFDLFVBQVUsRUFBRTtJQUNoRCxJQUFJLDZCQUFxQixDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxnQkFBUSxDQUFDLElBQUksY0FBTSxFQUFFLENBQUMsQ0FBQztJQUMvRCxJQUFJLDZCQUFxQixDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsSUFBSSxtQkFBVyxFQUFFLENBQUM7Q0FDNUQsQ0FBQyxDQUFDO0FBRUgsTUFBTSxXQUFXLEdBQUcsSUFBSSxrQkFBVSxDQUFDLEtBQUssRUFBRTtJQUN0QyxJQUFJLDZCQUFxQixDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxnQkFBUSxDQUFDLElBQUksY0FBTSxFQUFFLENBQUMsQ0FBQztJQUMvRCxJQUFJLDZCQUFxQixDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsSUFBSSxtQkFBVyxFQUFFLENBQUM7SUFDekQsSUFBSSw2QkFBcUIsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLElBQUksZ0JBQVEsQ0FBQyxJQUFJLGNBQU0sRUFBRSxDQUFDLENBQUM7SUFDckUsSUFBSSw2QkFBcUIsQ0FDckIsTUFBTSxFQUNOLEVBQUUsRUFDRixJQUFJLGdCQUFRLENBQUMsSUFBSSxnQkFBUSxDQUFDLElBQUksY0FBTSxFQUFFLENBQUMsQ0FBQyxDQUMzQztDQUNKLENBQUMsQ0FBQztBQUVILE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxrQkFBVSxDQUFDLFVBQVUsRUFBRTtJQUNoRCxJQUFJLDZCQUFxQixDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxnQkFBUSxDQUFDLElBQUksY0FB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