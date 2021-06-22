"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElrondHelper = void 0;
const erdjs_1 = require("@elrondnetwork/erdjs");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const chain_handler_1 = require("../chain_handler");
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
const event_t = new erdjs_1.EnumType('Event', [
    new erdjs_1.EnumVariantDefinition('Unfreeze', 0),
    new erdjs_1.EnumVariantDefinition('Rpc', 1),
    new erdjs_1.EnumVariantDefinition('Transfer', 2),
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
class ElrondHelper {
    constructor(provider, sender, signer, mintContract, eventSocket) {
        this.provider = provider;
        this.sender = sender;
        this.signer = signer;
        this.mintContract = mintContract;
        this.eventSocket = eventSocket;
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
        else {
            throw Error('Unsupported event!');
        }
        console.log(`Elrond event hash: ${tx.getHash().toString()}`);
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
        await tx.awaitNotarized(this.provider);
        console.log(`tx hash: ${tx.getHash().toString()}`);
        const res = (await tx.getAsOnNetwork(this.provider)).getSmartContractResults();
        const data = res.getImmediate().outputUntyped();
        const decoder = new erdjs_1.BinaryCodec();
        switch (data[0][0]) {
            case 0: {
                const unfreeze = decoder
                    .decodeNested(data[0], event_info_unfreeze_t)[0]
                    .valueOf().evunfreeze;
                return new chain_handler_1.UnfreezeEvent(new bignumber_js_1.default(id), Buffer.from(unfreeze['to']).toString(), new bignumber_js_1.default(Number(unfreeze['value'])));
            }
            case 1: {
                const rpc = decoder
                    .decodeNested(data[0], event_info_rpc_t)[0]
                    .valueOf().evrpc;
                return new chain_handler_1.ScCallEvent(new bignumber_js_1.default(id), Buffer.from(rpc['to']).toString(), new bignumber_js_1.default(Number(rpc['value'])), Buffer.from(rpc['endpoint']).toString(), 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                rpc['args'].map((s) => Buffer.from(s).toString()));
            }
            case 2: {
                const transfer = decoder
                    .decodeNested(data[0], event_info_transfer_t)[0]
                    .valueOf().evtransfer;
                return new chain_handler_1.TransferEvent(new bignumber_js_1.default(id), Buffer.from(transfer['to']).toString(), new bignumber_js_1.default(Number(transfer['value'])));
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
ElrondHelper.new = async (node_uri, secret_key, sender, minter, socket) => {
    const provider = new erdjs_1.ProxyProvider(node_uri);
    await erdjs_1.NetworkConfig.getDefault().sync(provider);
    const eMinterAddr = new erdjs_1.Address(sender);
    const senderac = new erdjs_1.Account(eMinterAddr);
    const signer = new erdjs_1.UserSigner(erdjs_1.parseUserKey(secret_key));
    return new ElrondHelper(provider, senderac, signer, new erdjs_1.Address(minter), socket);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxyb25kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hhbmRsZXJzL2Vscm9uZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxnREEwQjhCO0FBQzlCLGdFQUFxQztBQUVyQyxvREFNMEI7QUFFMUIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGtCQUFVLENBQUMsVUFBVSxFQUFFO0lBQ2hELElBQUksNkJBQXFCLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLGdCQUFRLENBQUMsSUFBSSxjQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELElBQUksNkJBQXFCLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxJQUFJLG1CQUFXLEVBQUUsQ0FBQztDQUM1RCxDQUFDLENBQUM7QUFFSCxNQUFNLFdBQVcsR0FBRyxJQUFJLGtCQUFVLENBQUMsS0FBSyxFQUFFO0lBQ3RDLElBQUksNkJBQXFCLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLGdCQUFRLENBQUMsSUFBSSxjQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELElBQUksNkJBQXFCLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxJQUFJLG1CQUFXLEVBQUUsQ0FBQztJQUN6RCxJQUFJLDZCQUFxQixDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsSUFBSSxnQkFBUSxDQUFDLElBQUksY0FBTSxFQUFFLENBQUMsQ0FBQztJQUNyRSxJQUFJLDZCQUFxQixDQUNyQixNQUFNLEVBQ04sRUFBRSxFQUNGLElBQUksZ0JBQVEsQ0FBQyxJQUFJLGdCQUFRLENBQUMsSUFBSSxjQUFNLEVBQUUsQ0FBQyxDQUFDLENBQzNDO0NBQ0osQ0FBQyxDQUFDO0FBRUgsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGtCQUFVLENBQUMsVUFBVSxFQUFFO0lBQ2hELElBQUksNkJBQXFCLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLGdCQUFRLENBQUMsSUFBSSxjQUFNLEVBQUUsQ0FBQyxD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