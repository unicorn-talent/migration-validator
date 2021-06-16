"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElrondHelper = void 0;
const erdjs_1 = require("@elrondnetwork/erdjs");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const chain_handler_1 = require("../chain_handler");
const unfreeze_event_t = new erdjs_1.StructType("Unfreeze", [
    new erdjs_1.StructFieldDefinition("to", "", new erdjs_1.ListType(new erdjs_1.U8Type())),
    new erdjs_1.StructFieldDefinition("value", "", new erdjs_1.BigUIntType())
]);
const rpc_event_t = new erdjs_1.StructType("Rpc", [
    new erdjs_1.StructFieldDefinition("to", "", new erdjs_1.ListType(new erdjs_1.U8Type())),
    new erdjs_1.StructFieldDefinition("value", "", new erdjs_1.BigUIntType()),
    new erdjs_1.StructFieldDefinition("endpoint", "", new erdjs_1.ListType(new erdjs_1.U8Type())),
    new erdjs_1.StructFieldDefinition("args", "", new erdjs_1.ListType(new erdjs_1.ListType(new erdjs_1.U8Type)))
]);
const transfer_event_t = new erdjs_1.StructType("Transfer", [
    new erdjs_1.StructFieldDefinition("to", "", new erdjs_1.ListType(new erdjs_1.U8Type())),
    new erdjs_1.StructFieldDefinition("value", "", new erdjs_1.BigUIntType())
]);
const event_t = new erdjs_1.EnumType("Event", [
    new erdjs_1.EnumVariantDefinition("Unfreeze", 0),
    new erdjs_1.EnumVariantDefinition("Rpc", 1),
    new erdjs_1.EnumVariantDefinition("Transfer", 2)
]);
const event_info_rpc_t = new erdjs_1.StructType("EventInfo", [
    new erdjs_1.StructFieldDefinition("event", "", event_t),
    new erdjs_1.StructFieldDefinition("evrpc", "", rpc_event_t),
    new erdjs_1.StructFieldDefinition("read_cnt", "", new erdjs_1.BigUIntType())
]);
const event_info_unfreeze_t = new erdjs_1.StructType("EventInfo", [
    new erdjs_1.StructFieldDefinition("event", "", event_t),
    new erdjs_1.StructFieldDefinition("evunfreeze", "", unfreeze_event_t),
    new erdjs_1.StructFieldDefinition("read_cnt", "", new erdjs_1.BigUIntType())
]);
const event_info_transfer_t = new erdjs_1.StructType("EventInfo", [
    new erdjs_1.StructFieldDefinition("event", "", event_t),
    new erdjs_1.StructFieldDefinition("evtransfer", "", transfer_event_t),
    new erdjs_1.StructFieldDefinition("read_cnt", "", new erdjs_1.BigUIntType())
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
        this.eventSocket.on("elrond:transfer_event", async (id) => await cb(id));
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
            throw Error("Unsupported event!");
        }
        console.log(`Elrond event hash: ${tx.getHash().toString()}`);
    }
    async unfreezeVerify({ id, to, value }) {
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
    async transferMintVerify({ action_id, to, value }) {
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
                .setFunction(new erdjs_1.ContractFunction("eventRead"))
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
            case 0:
                const unfreeze = decoder.decodeNested(data[0], event_info_unfreeze_t)[0].valueOf().evunfreeze;
                return new chain_handler_1.UnfreezeEvent(new bignumber_js_1.default(id), Buffer.from(unfreeze["to"]).toString(), new bignumber_js_1.default(Number(unfreeze["value"])));
            case 1:
                const rpc = decoder.decodeNested(data[0], event_info_rpc_t)[0].valueOf().evrpc;
                return new chain_handler_1.ScCallEvent(new bignumber_js_1.default(id), Buffer.from((rpc["to"])).toString(), new bignumber_js_1.default(Number(rpc["value"])), Buffer.from(rpc["endpoint"]).toString(), rpc["args"].map((s) => Buffer.from(s).toString()));
            case 2:
                const transfer = decoder.decodeNested(data[0], event_info_transfer_t)[0].valueOf().evtransfer;
                return new chain_handler_1.TransferEvent(new bignumber_js_1.default(id), Buffer.from(transfer["to"]).toString(), new bignumber_js_1.default(Number(transfer["value"])));
            default:
                throw Error("unhandled event!!!");
        }
    }
    async scCallVerify({ action_id, to, value, endpoint, args }) {
        await this.sender.sync(this.provider);
        // fn validate_sc_call(action_id: BigUint, to: Address, endpoint: BoxedBytes, #[var_args] args: VarArgs<BoxedBytes>,)
        let payloadBuilder = erdjs_1.TransactionPayload.contractCall()
            .setFunction(new erdjs_1.ContractFunction("validateSCCall"))
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
            value: erdjs_1.Balance.egld(value)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxyb25kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hhbmRsZXJzL2Vscm9uZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxnREEwQjhCO0FBQzlCLGdFQUFxQztBQUVyQyxvREFBMkc7QUFHM0csTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGtCQUFVLENBQUMsVUFBVSxFQUFFO0lBQ2hELElBQUksNkJBQXFCLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLGdCQUFRLENBQUMsSUFBSSxjQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELElBQUksNkJBQXFCLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxJQUFJLG1CQUFXLEVBQUUsQ0FBQztDQUM1RCxDQUFDLENBQUM7QUFFSCxNQUFNLFdBQVcsR0FBRyxJQUFJLGtCQUFVLENBQUMsS0FBSyxFQUFFO0lBQ3RDLElBQUksNkJBQXFCLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLGdCQUFRLENBQUMsSUFBSSxjQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELElBQUksNkJBQXFCLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxJQUFJLG1CQUFXLEVBQUUsQ0FBQztJQUN6RCxJQUFJLDZCQUFxQixDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsSUFBSSxnQkFBUSxDQUFDLElBQUksY0FBTSxFQUFFLENBQUMsQ0FBQztJQUNyRSxJQUFJLDZCQUFxQixDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsSUFBSSxnQkFBUSxDQUFDLElBQUksZ0JBQVEsQ0FBQyxJQUFJLGNBQU0sQ0FBQyxDQUFDLENBQUM7Q0FDaEYsQ0FBQyxDQUFDO0FBRUgsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGtCQUFVLENBQUMsVUFBVSxFQUFFO0lBQ2hELElBQUksNkJBQXFCLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLGdCQUFRLENBQUMsSUFBSSxjQUFNLEVBQUUsQ0FBQyxDQUFDO0lB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