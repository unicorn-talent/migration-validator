import {
    Account,
    Address,
    AddressValue,
    Balance,
    BigUIntType,
    BigUIntValue,
    BinaryCodec,
    BytesValue,
    ContractFunction,
    EnumType,
    EnumVariantDefinition,
    //decodeString,
    GasLimit,
    ISigner,
    ListType,
    NetworkConfig,
    parseUserKey,
    ProxyProvider,
    StructFieldDefinition,
    StructType,
    Transaction,
    TransactionPayload,
    U32Value,
    U8Type,
    UserSigner,
} from '@elrondnetwork/erdjs';
import BigNumber from 'bignumber.js';
import { Socket } from 'socket.io-client';
import { ChainEmitter, ChainListener, ScCallEvent , TransferEvent, UnfreezeEvent } from '../chain_handler';


const unfreeze_event_t = new StructType("Unfreeze", [
    new StructFieldDefinition("to", "", new ListType(new U8Type())),
    new StructFieldDefinition("value", "", new BigUIntType())
]);

const rpc_event_t = new StructType("Rpc", [
    new StructFieldDefinition("to", "", new ListType(new U8Type())),
    new StructFieldDefinition("value", "", new BigUIntType()),
    new StructFieldDefinition("endpoint", "", new ListType(new U8Type())),
    new StructFieldDefinition("args", "", new ListType(new ListType(new U8Type)))
]);

const transfer_event_t = new StructType("Transfer", [
    new StructFieldDefinition("to", "", new ListType(new U8Type())),
    new StructFieldDefinition("value", "", new BigUIntType())
])

const event_t = new EnumType("Event", [
    new EnumVariantDefinition("Unfreeze", 0),
    new EnumVariantDefinition("Rpc", 1),
    new EnumVariantDefinition("Transfer", 2)
])

const event_info_rpc_t = new StructType("EventInfo", [
    new StructFieldDefinition("event", "", event_t),
    new StructFieldDefinition("evrpc", "", rpc_event_t),
    new StructFieldDefinition("read_cnt", "", new BigUIntType())
]);

const event_info_unfreeze_t = new StructType("EventInfo", [
    new StructFieldDefinition("event", "", event_t),
    new StructFieldDefinition("evunfreeze", "", unfreeze_event_t),
    new StructFieldDefinition("read_cnt", "", new BigUIntType())
]);

const event_info_transfer_t = new StructType("EventInfo", [
    new StructFieldDefinition("event", "", event_t),
    new StructFieldDefinition("evtransfer", "", transfer_event_t),
    new StructFieldDefinition("read_cnt", "", new BigUIntType())
])

export class ElrondHelper implements ChainListener<TransferEvent | ScCallEvent | UnfreezeEvent>, ChainEmitter<string, void, TransferEvent | UnfreezeEvent | ScCallEvent> {
    private readonly provider: ProxyProvider;
    private readonly sender: Account;
    private readonly signer: ISigner;
    private readonly mintContract: Address;
    private readonly eventSocket: Socket;

    private constructor(provider: ProxyProvider, sender: Account, signer: ISigner, mintContract: Address, eventSocket: Socket) {
        this.provider = provider;
        this.sender = sender;
        this.signer = signer;
        this.mintContract = mintContract;
        this.eventSocket = eventSocket;
    }

    async eventIter(cb: (event: string) => Promise<void>): Promise<void> {
        this.eventSocket.on("elrond:transfer_event", async (id) => await cb(id))
    }

    public static new = async (node_uri: string, secret_key: string, sender: string, minter: string, socket: Socket): Promise<ElrondHelper> => {
        const provider = new ProxyProvider(node_uri);
        await NetworkConfig.getDefault().sync(provider);
        const eMinterAddr = new Address(sender);
        const senderac = new Account(eMinterAddr);
        const signer = new UserSigner(parseUserKey(secret_key));
    
        return new ElrondHelper(
            provider,
            senderac,
            signer,
            new Address(minter),
            socket
        );
    }

    async eventHandler(id: string): Promise<TransferEvent | ScCallEvent | UnfreezeEvent | undefined> {
        const rpc_ev = await this.eventDecoder(id);
        return rpc_ev;
    }

    async emittedEventHandler(event: TransferEvent | ScCallEvent | UnfreezeEvent): Promise<void> {
        let tx: Transaction;
        if (event instanceof TransferEvent) {
            tx = await this.transferMintVerify(event);
        } else if (event instanceof ScCallEvent) {
            tx = await this.scCallVerify(event);
        } else if (event instanceof UnfreezeEvent) {
            tx = await this.unfreezeVerify(event);
        } else {
            throw Error("Unsupported event!");
        }
        console.log(`Elrond event hash: ${tx.getHash().toString()}`)
    }

    private async unfreezeVerify({ id, to, value }: UnfreezeEvent): Promise<Transaction> {
        await this.sender.sync(this.provider);

        const tx = new Transaction({
            receiver: this.mintContract,
            nonce: this.sender.nonce,
            gasLimit: new GasLimit(50000000),
            data: TransactionPayload.contractCall()
                .setFunction(new ContractFunction('validateUnfreeze'))
                .addArg(new BigUIntValue(id))
                .addArg(new AddressValue(new Address(to)))
                .addArg(new U32Value(value))
                .build(),
        });

        this.signer.sign(tx);
        await tx.send(this.provider);

        return tx;
    }

    private async transferMintVerify({ action_id, to, value }: TransferEvent): Promise<Transaction> {
        await this.sender.sync(this.provider);

        const tx = new Transaction({
            receiver: this.mintContract,
            nonce: this.sender.nonce,
            gasLimit: new GasLimit(50000000),
            data: TransactionPayload.contractCall()
                .setFunction(new ContractFunction('validateSendXp'))
                .addArg(new BigUIntValue(action_id))
                .addArg(new AddressValue(new Address(to)))
                .addArg(new U32Value(value))
                .build(),
        });
    
        this.signer.sign(tx);
        await tx.send(this.provider);

        return tx;
    }

    private async eventDecoder(id: string): Promise<TransferEvent | UnfreezeEvent | ScCallEvent | undefined> {
        await this.sender.sync(this.provider);
    
        const tx = new Transaction({
            receiver: this.mintContract,
            nonce: this.sender.nonce,
            gasLimit: new GasLimit(50000000),
            data: TransactionPayload.contractCall()
                .setFunction(new ContractFunction("eventRead"))
                .addArg(new BigUIntValue(new BigNumber(id)))
                .build(),
        });
    
        this.signer.sign(tx);
        await tx.send(this.provider);
    
        await tx.awaitNotarized(this.provider);
        console.log(`tx hash: ${tx.getHash().toString()}`)
        const res =  (await tx.getAsOnNetwork(this.provider)).getSmartContractResults();
        const data = res.getImmediate().outputUntyped();
        const decoder = new BinaryCodec();
        switch (data[0][0]) {
            case 0:
                const unfreeze = decoder.decodeNested(data[0], event_info_unfreeze_t)[0].valueOf().evunfreeze;
                return new UnfreezeEvent(
                    new BigNumber(id),
                    Buffer.from(unfreeze["to"]).toString(),
                    new BigNumber(Number(unfreeze["value"] as BigInt))
                )
            case 1:
                const rpc = decoder.decodeNested(data[0], event_info_rpc_t)[0].valueOf().evrpc;
                return new ScCallEvent(
                    new BigNumber(id),
                    Buffer.from((rpc["to"])).toString(),
                    new BigNumber(Number(rpc["value"] as BigInt)),
                    Buffer.from(rpc["endpoint"]).toString(),
                    rpc["args"].map((s: any) => Buffer.from(s).toString())
                )
            case 2:
                const transfer = decoder.decodeNested(data[0], event_info_transfer_t)[0].valueOf().evtransfer;
                return new TransferEvent(
                    new BigNumber(id),
                    Buffer.from(transfer["to"]).toString(),
                    new BigNumber(Number(transfer["value"] as BigInt))
                )
            default:
                throw Error("unhandled event!!!")
        }
    }

    async scCallVerify({
        action_id,
        to,
        value,
        endpoint,
        args
    }: ScCallEvent): Promise<Transaction> {
        await this.sender.sync(this.provider)
    
        // fn validate_sc_call(action_id: BigUint, to: Address, endpoint: BoxedBytes, #[var_args] args: VarArgs<BoxedBytes>,)
        let payloadBuilder = TransactionPayload.contractCall()
            .setFunction(new ContractFunction("validateSCCall"))
            .addArg(new BigUIntValue(action_id))
            .addArg(new AddressValue(new Address(to)))
            .addArg(BytesValue.fromUTF8(endpoint))
    
        for (const buf of args ?? []) {
            payloadBuilder = payloadBuilder.addArg(BytesValue.fromHex(buf));
        }
    
        console.log(`args: ${JSON.stringify(payloadBuilder)}`)
    
        const tx = new Transaction({
            receiver: this.mintContract,
            nonce: this.sender.nonce,
            gasLimit: new GasLimit(80000000),
            data: payloadBuilder.build(),
            value: Balance.egld(value)
        });
    
        this.signer.sign(tx);
        await tx.send(this.provider);
    
        return tx;
    }
}
