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
const event_t = new erdjs_1.EnumType("Event", [
    new erdjs_1.EnumVariantDefinition("Unfreeze", 0),
    new erdjs_1.EnumVariantDefinition("Rpc", 1)
]);
const event_info_t = new erdjs_1.StructType("EventInfo", [
    new erdjs_1.StructFieldDefinition("event", "", event_t),
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
        console.log(JSON.stringify(rpc_ev));
        return undefined;
    }
    async emittedEventHandler(event) {
        let tx;
        if (event instanceof chain_handler_1.TransferEvent) {
            tx = await this.transferMintVerify(event);
        }
        else if (event instanceof chain_handler_1.ScCallEvent) {
            tx = await this.scCallVerify(event);
        }
        else {
            throw Error("Unsupported event!");
        }
        console.log(`Elrond event hash: ${tx.getHash().toString()}`);
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
        const evi = decoder.decodeTopLevel(data[0], event_info_t).valueOf();
        if (evi["info"][0] == 0) {
            const unfreeze = decoder.decodeTopLevel(evi["info"].slice(1), unfreeze_event_t).valueOf();
            return new chain_handler_1.UnfreezeEvent(new bignumber_js_1.default(id), Buffer.from((unfreeze["to"])).toString(), new bignumber_js_1.default(Number(unfreeze["value"])));
        }
        else if (evi["info"][0] == 1) {
            const rpc = decoder.decodeTopLevel(evi["info"].slice(1), rpc_event_t).valueOf();
            return new chain_handler_1.ScCallEvent(new bignumber_js_1.default(id), Buffer.from((rpc["to"])).toString(), new bignumber_js_1.default(Number(rpc["value"])), Buffer.from(rpc["endpoint"]).toString(), rpc["args"].map((s) => Buffer.from(s).toString()));
        }
        else {
            return undefined;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxyb25kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hhbmRsZXJzL2Vscm9uZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxnREEwQjhCO0FBQzlCLGdFQUFxQztBQUVyQyxvREFBMkc7QUFHM0csTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGtCQUFVLENBQUMsVUFBVSxFQUFFO0lBQ2hELElBQUksNkJBQXFCLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLGdCQUFRLENBQUMsSUFBSSxjQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELElBQUksNkJBQXFCLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxJQUFJLG1CQUFXLEVBQUUsQ0FBQztDQUM1RCxDQUFDLENBQUM7QUFFSCxNQUFNLFdBQVcsR0FBRyxJQUFJLGtCQUFVLENBQUMsS0FBSyxFQUFFO0lBQ3RDLElBQUksNkJBQXFCLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLGdCQUFRLENBQUMsSUFBSSxjQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELElBQUksNkJBQXFCLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxJQUFJLG1CQUFXLEVBQUUsQ0FBQztJQUN6RCxJQUFJLDZCQUFxQixDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsSUFBSSxnQkFBUSxDQUFDLElBQUksY0FBTSxFQUFFLENBQUMsQ0FBQztJQUNyRSxJQUFJLDZCQUFxQixDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsSUFBSSxnQkFBUSxDQUFDLElBQUksZ0JBQVEsQ0FBQyxJQUFJLGNBQU0sQ0FBQyxDQUFDLENBQUM7Q0FDaEYsQ0FBQyxDQUFDO0FBRUgsTUFBTSxPQUFPLEdBQUcsSUFBSSxnQkFBUSxDQUFDLE9BQU8sRUFBRTtJQUNsQyxJQUFJLDZCQUFxQixDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7SUFDeEMsSUFBSSw2QkFBcUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0NBQ3RDLENBQUMsQ0FBQTtBQUVGLE1BQU0sWUFBWSxHQUFHLElBQUksa0JBQVUsQ0FBQyxXQUFXLEVBQUU7SUFDN0MsSUFBSSw2QkFBcUIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQztJQUMvQyxJQUFJLDZCQUFxQixDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsSUFBSSxtQkFBVyxFQUFFLENBQUM7Q0FDL0QsQ0FBQyxDQUFDO0FBRUgsTUFBYSxZQUFZO0lBT3JCLFlBQW9CLFFBQXVCLEVBQUUsTUFBZSxFQUFFLE1BQWUsRUFBRSxZQUFxQixFQUFFLFdBQW1CO1FBQ3JILElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0lBQ25DLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQW9DO1FBQ2hELElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLHVCQUF1QixFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDNUUsQ0FBQztJQWtCRCxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQVU7UUFDekIsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLE9BQU8sU0FBUyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxLQUFLLENBQUMsbUJBQW1CLENBQUMsS0FBa0M7UUFDeEQsSUFBSSxFQUFlLENBQUM7UUFDcEIsSUFBSSxLQUFLLFlBQVksNkJBQWEsRUFBRTtZQUNoQyxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDN0M7YUFBTSxJQUFJLEtBQUssWUFBWSwyQkFBVyxFQUFFO1lBQ3JDLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDdkM7YUFBTTtZQUNILE1BQU0sS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7U0FDckM7UUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ2hFLENBQUM7SUFFTyxLQUFLLENBQUMsa0JBQWtCLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBaUI7UUFDcEUsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFdEMsTUFBTSxFQUFFLEdBQUcsSUFBSSxtQkFBVyxDQUFDO1lBQ3ZCLFFBQVEsRUFBRSxJQUFJLENBQUMsWUFBWTtZQUMzQixLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLFFBQVEsRUFBRSxJQUFJLGdCQUFRLENBQUMsUUFBUSxDQUFDO1lBQ2hDLElBQUksRUFBRSwwQkFBa0IsQ0FBQyxZQUFZLEVBQUU7aUJBQ2xDLFdBQVcsQ0FBQyxJQUFJLHdCQUFnQixDQUFDLGdCQUFnQixDQUFDLENBQUM7aUJBQ25ELE1BQU0sQ0FBQyxJQUFJLG9CQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7aUJBQ25DLE1BQU0sQ0FBQyxJQUFJLG9CQUFZLENBQUMsSUFBSSxlQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztpQkFDekMsTUFBTSxDQUFDLElBQUksZ0JBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDM0IsS0FBSyxFQUFFO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDckIsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU3QixPQUFPLEVBQUUsQ0FBQztJQUNkLENBQUM7SUFFTyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQVU7UUFDakMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFdEMsTUFBTSxFQUFFLEdBQUcsSUFBSSxtQkFBVyxDQUFDO1lBQ3ZCLFFBQVEsRUFBRSxJQUFJLENBQUMsWUFBWTtZQUMzQixLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLFFBQVEsRUFBRSxJQUFJLGdCQUFRLENBQUMsUUFBUSxDQUFDO1lBQ2hDLElBQUksRUFBRSwwQkFBa0IsQ0FBQyxZQUFZLEVBQUU7aUJBQ2xDLFdBQVcsQ0FBQyxJQUFJLHdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDO2lCQUM5QyxNQUFNLENBQUMsSUFBSSxvQkFBWSxDQUFDLElBQUksc0JBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2lCQUMzQyxLQUFLLEVBQUU7U0FDZixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNyQixNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTdCLE1BQU0sRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEQsTUFBTSxHQUFHLEdBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUNoRixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDaEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxtQkFBVyxFQUFFLENBQUM7UUFDbEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDcEUsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3JCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzFGLE9BQU8sSUFBSSw2QkFBYSxDQUNwQixJQUFJLHNCQUFTLENBQUMsRUFBRSxDQUFDLEVBQ2pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUN4QyxJQUFJLHNCQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQVcsQ0FBQyxDQUFDLENBQ3JELENBQUE7U0FDSjthQUFNLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM1QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDaEYsT0FBTyxJQUFJLDJCQUFXLENBQ2xCLElBQUksc0JBQVMsQ0FBQyxFQUFFLENBQUMsRUFDakIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQ25DLElBQUksc0JBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBVyxDQUFDLENBQUMsRUFDN0MsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFDdkMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUN6RCxDQUFBO1NBQ0o7YUFBTTtZQUNILE9BQU8sU0FBUyxDQUFDO1NBQ3BCO0lBQ0wsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUMsRUFDZixTQUFTLEVBQ1QsRUFBRSxFQUNGLEtBQUssRUFDTCxRQUFRLEVBQ1IsSUFBSSxFQUNNO1FBQ1YsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFckMscUhBQXFIO1FBQ3JILElBQUksY0FBYyxHQUFHLDBCQUFrQixDQUFDLFlBQVksRUFBRTthQUNqRCxXQUFXLENBQUMsSUFBSSx3QkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2FBQ25ELE1BQU0sQ0FBQyxJQUFJLG9CQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDbkMsTUFBTSxDQUFDLElBQUksb0JBQVksQ0FBQyxJQUFJLGVBQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3pDLE1BQU0sQ0FBQyxrQkFBVSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBRTFDLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxhQUFKLElBQUksY0FBSixJQUFJLEdBQUksRUFBRSxFQUFFO1lBQzFCLGNBQWMsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDLGtCQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDbkU7UUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFdEQsTUFBTSxFQUFFLEdBQUcsSUFBSSxtQkFBVyxDQUFDO1lBQ3ZCLFFBQVEsRUFBRSxJQUFJLENBQUMsWUFBWTtZQUMzQixLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLFFBQVEsRUFBRSxJQUFJLGdCQUFRLENBQUMsUUFBUSxDQUFDO1lBQ2hDLElBQUksRUFBRSxjQUFjLENBQUMsS0FBSyxFQUFFO1lBQzVCLEtBQUssRUFBRSxlQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztTQUM3QixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNyQixNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTdCLE9BQU8sRUFBRSxDQUFDO0lBQ2QsQ0FBQzs7QUF2Skwsb0NBd0pDO0FBcklpQixnQkFBRyxHQUFHLEtBQUssRUFBRSxRQUFnQixFQUFFLFVBQWtCLEVBQUUsTUFBYyxFQUFFLE1BQWMsRUFBRSxNQUFjLEVBQXlCLEVBQUU7SUFDdEksTUFBTSxRQUFRLEdBQUcsSUFBSSxxQkFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzdDLE1BQU0scUJBQWEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDaEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDeEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxlQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDMUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxrQkFBVSxDQUFDLG9CQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUV4RCxPQUFPLElBQUksWUFBWSxDQUNuQixRQUFRLEVBQ1IsUUFBUSxFQUNSLE1BQU0sRUFDTixJQUFJLGVBQU8sQ0FBQyxNQUFNLENBQUMsRUFDbkIsTUFBTSxDQUNULENBQUM7QUFDTixDQUFDLENBQUEifQ==