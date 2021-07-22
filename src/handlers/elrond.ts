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
    Struct,
    StructField,
    StructFieldDefinition,
    StructType,
    TokenIdentifierType,
    TokenIdentifierValue,
    Transaction,
    TransactionPayload,
    U32Value,
    U64Type,
    U64Value,
    U8Type,
    UserSigner,
} from '@elrondnetwork/erdjs';
import BigNumber from 'bignumber.js';
import { Socket } from 'socket.io-client';
import {
    ChainEmitter,
    ChainListener,
    ScCallEvent,
    TransferEvent,
    TransferUniqueEvent,
    UnfreezeEvent,
    UnfreezeUniqueEvent,
} from '../chain_handler';

import { toHex } from "./common";

const unfreeze_event_t = new StructType('Unfreeze', [
    new StructFieldDefinition('to', '', new ListType(new U8Type())),
    new StructFieldDefinition('value', '', new BigUIntType()),
]);

const rpc_event_t = new StructType('Rpc', [
    new StructFieldDefinition('to', '', new ListType(new U8Type())),
    new StructFieldDefinition('value', '', new BigUIntType()),
    new StructFieldDefinition('endpoint', '', new ListType(new U8Type())),
    new StructFieldDefinition(
        'args',
        '',
        new ListType(new ListType(new U8Type()))
    ),
]);

const transfer_event_t = new StructType('Transfer', [
    new StructFieldDefinition('to', '', new ListType(new U8Type())),
    new StructFieldDefinition('value', '', new BigUIntType()),
]);

const unfreeze_nft_event_t = new StructType(`UnfreezeNft`, [
    new StructFieldDefinition('to', '', new ListType(new U8Type())),
    new StructFieldDefinition('id', '', new ListType(new U8Type()))
])

const transfer_nft_event_t = new StructType('TransferNft', [
    new StructFieldDefinition('to', '', new ListType(new U8Type())),
    new StructFieldDefinition('token', '', new TokenIdentifierType()),
    new StructFieldDefinition('nonce', '', new U64Type())
])

const event_t = new EnumType('Event', [
    new EnumVariantDefinition('Unfreeze', 0),
    new EnumVariantDefinition('UnfreezeNft', 1),
    new EnumVariantDefinition('Rpc', 2),
    new EnumVariantDefinition('Transfer', 3),
    new EnumVariantDefinition('TransferNft', 4),
]);

const event_info_rpc_t = new StructType('EventInfo', [
    new StructFieldDefinition('event', '', event_t),
    new StructFieldDefinition('evrpc', '', rpc_event_t),
    new StructFieldDefinition('read_cnt', '', new BigUIntType()),
]);

const event_info_unfreeze_t = new StructType('EventInfo', [
    new StructFieldDefinition('event', '', event_t),
    new StructFieldDefinition('evunfreeze', '', unfreeze_event_t),
    new StructFieldDefinition('read_cnt', '', new BigUIntType()),
]);

const event_info_transfer_t = new StructType('EventInfo', [
    new StructFieldDefinition('event', '', event_t),
    new StructFieldDefinition('evtransfer', '', transfer_event_t),
    new StructFieldDefinition('read_cnt', '', new BigUIntType()),
]);

const event_info_nft_t = new StructType('EventInfo', [
    new StructFieldDefinition('event', '', event_t),
    new StructFieldDefinition('evunfreezenft', '', unfreeze_nft_event_t),
    new StructFieldDefinition('read_cnt', '', new BigUIntType())
]);

const event_info_transfer_nft_t = new StructType('EventInfo', [
    new StructFieldDefinition('event', '', event_t),
    new StructFieldDefinition('evtransfernft', '', transfer_nft_event_t),
    new StructFieldDefinition('read_cnt', '', new BigUIntType())
]);

const nft_info_encoded_t = new StructType('EncodedNft', [
    new StructFieldDefinition('token', '', new TokenIdentifierType()),
    new StructFieldDefinition('nonce', '', new U64Type())
])


/**
 * Elrond helper
 * 
 * Handles [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 * 
 * Emits [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 */
export class ElrondHelper
    implements
        ChainListener<TransferEvent | TransferUniqueEvent | ScCallEvent | UnfreezeEvent | UnfreezeUniqueEvent>,
        ChainEmitter<string, void, TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent | ScCallEvent>
{
    private readonly provider: ProxyProvider;
    private readonly sender: Account;
    private readonly signer: ISigner;
    private readonly mintContract: Address;
    private readonly eventSocket: Socket;
    private readonly codec: BinaryCodec;

    private constructor(
        provider: ProxyProvider,
        sender: Account,
        signer: ISigner,
        mintContract: Address,
        eventSocket: Socket
    ) {
        this.provider = provider;
        this.sender = sender;
        this.signer = signer;
        this.mintContract = mintContract;
        this.eventSocket = eventSocket;
        this.codec = new BinaryCodec()
    }

    async eventIter(cb: (event: string) => Promise<void>): Promise<void> {
        this.eventSocket.on(
            'elrond:transfer_event',
            async (id) => await cb(id)
        );
    }

    /**
     * 
     * @param node_uri uri of the local(or remote?) elrond node
     * @param secret_key String containing the pem content of validator's private key
     * @param sender Bech32 Address of the validator
     * @param minter Bech32 Address of the elrond-mint smart contract
     * @param socket uri of the elrond-event-middleware socket
     */
    public static new = async (
        node_uri: string,
        secret_key: string,
        minter: string,
        socket: Socket
    ): Promise<ElrondHelper> => {
        const provider = new ProxyProvider(node_uri);
        await NetworkConfig.getDefault().sync(provider);
        const signer = new UserSigner(parseUserKey(secret_key));
        const senderac = new Account(signer.getAddress());

        return new ElrondHelper(
            provider,
            senderac,
            signer,
            new Address(minter),
            socket
        );
    };

    async eventHandler(
        id: string
    ): Promise<TransferEvent | TransferUniqueEvent | ScCallEvent | UnfreezeUniqueEvent | UnfreezeEvent | undefined> {
        const rpc_ev = await this.eventDecoder(id);
        return rpc_ev;
    }

    async emittedEventHandler(
        event: TransferEvent | TransferUniqueEvent | ScCallEvent | UnfreezeEvent | UnfreezeUniqueEvent
    ): Promise<void> {
        let tx: Transaction;
        if (event instanceof TransferEvent) {
            tx = await this.transferMintVerify(event);
        } else if (event instanceof ScCallEvent) {
            tx = await this.scCallVerify(event);
        } else if (event instanceof UnfreezeEvent) {
            tx = await this.unfreezeVerify(event);
        } else if (event instanceof TransferUniqueEvent) {
            tx = await this.transferNftVerify(event);
        } else if (event instanceof UnfreezeUniqueEvent) {
            tx = await this.unfreezeNftVerify(event);
        } else {
            throw Error('Unsupported event!');
        }
        console.log(`Elrond event hash: ${tx.getHash().toString()}`);
    }

    private async unfreezeVerify({
        id,
        to,
        value,
    }: UnfreezeEvent): Promise<Transaction> {
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

    private async unfreezeNftVerify({
        id,
        to,
        nft_id,
    }: UnfreezeUniqueEvent): Promise<Transaction> {
        await this.sender.sync(this.provider);

        const nft_info = this.codec.decodeNested(Buffer.from(nft_id), nft_info_encoded_t)[0].valueOf();

        const tx = new Transaction({
            receiver: this.mintContract,
            nonce: this.sender.nonce,
            gasLimit: new GasLimit(70000000),
            data: TransactionPayload.contractCall()
                .setFunction(new ContractFunction("validateUnfreezeNft"))
                .addArg(new BigUIntValue(id))
                .addArg(new AddressValue(new Address(to)))
                .addArg(new TokenIdentifierValue(nft_info.token))
                .addArg(new U64Value(nft_info.nonce))
                .build()
        });

        this.signer.sign(tx);
        await tx.send(this.provider);

        return tx;
    }

    private async transferNftVerify({
        action_id,
        to,
        id
    }: TransferUniqueEvent): Promise<Transaction> {
        await this.sender.sync(this.provider);

        const tx = new Transaction({
            receiver: this.mintContract,
            nonce: this.sender.nonce,
            gasLimit: new GasLimit(80000000),
            data: TransactionPayload.contractCall()
                .setFunction(new ContractFunction('validateSendNft'))
                .addArg(new BigUIntValue(action_id))
                .addArg(new AddressValue(new Address(to)))
                .addArg(BytesValue.fromHex(toHex(id)))
                .build()
        });

        this.signer.sign(tx);
        await tx.send(this.provider);

        return tx;
    }

    private async transferMintVerify({
        action_id,
        to,
        value,
    }: TransferEvent): Promise<Transaction> {
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

    private async eventDecoder(
        id: string
    ): Promise<TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent | ScCallEvent | undefined> {
        await this.sender.sync(this.provider);

        const tx = new Transaction({
            receiver: this.mintContract,
            nonce: this.sender.nonce,
            gasLimit: new GasLimit(50000000),
            data: TransactionPayload.contractCall()
                .setFunction(new ContractFunction('eventRead'))
                .addArg(new BigUIntValue(new BigNumber(id)))
                .build(),
        });

        this.signer.sign(tx);
        await tx.send(this.provider);

		await new Promise(r => setTimeout(r, 4000));
        await tx.awaitNotarized(this.provider);
        console.log(`tx hash: ${tx.getHash().toString()}`);
        const res = (
            await tx.getAsOnNetwork(this.provider)
        ).getSmartContractResults();
        const data = res.getImmediate().outputUntyped();
        switch (data[0][0]) {
            case 0: {
                const unfreeze = this.codec
                    .decodeNested(data[0], event_info_unfreeze_t)[0]
                    .valueOf().evunfreeze;
                return new UnfreezeEvent(
                    new BigNumber(id),
                    Buffer.from(unfreeze['to']).toString(),
                    new BigNumber(Number(unfreeze['value'] as BigInt))
                );
            }
            case 1: {
                const unfreeze_nft = this.codec
                    .decodeNested(data[0], event_info_nft_t)[0]
                    .valueOf().evunfreezenft;
                
                return new UnfreezeUniqueEvent(
                    new BigNumber(id),
                    Buffer.from(unfreeze_nft['to']).toString(),
                    Buffer.from(unfreeze_nft['id'])
                )
            }
            case 2: {
                const rpc = this.codec
                    .decodeNested(data[0], event_info_rpc_t)[0]
                    .valueOf().evrpc;
                return new ScCallEvent(
                    new BigNumber(id),
                    Buffer.from(rpc['to']).toString(),
                    new BigNumber(Number(rpc['value'] as BigInt)),
                    Buffer.from(rpc['endpoint']).toString(),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    rpc['args'].map((s: any) => Buffer.from(s).toString())
                );
            }
            case 3: {
                const transfer = this.codec
                    .decodeNested(data[0], event_info_transfer_t)[0]
                    .valueOf().evtransfer;
                return new TransferEvent(
                    new BigNumber(id),
                    Buffer.from(transfer['to']).toString(),
                    new BigNumber(Number(transfer['value'] as BigInt))
                );
            }
            case 4: {
                const transfer_nft = this.codec
                    .decodeNested(data[0], event_info_transfer_nft_t)[0]
                    .valueOf().evtransfernft;
                
                const nft_info = new Struct(
                    nft_info_encoded_t,
                    [
                        new StructField(new TokenIdentifierValue(transfer_nft['token']), 'token'),
                        new StructField(new U64Value(transfer_nft['nonce']), 'nonce')
                    ]
                );

                const encoded_info = this.codec.encodeNested(nft_info);
                console.log(toHex(encoded_info));

                
                return new TransferUniqueEvent(
                    new BigNumber(id),
                    Buffer.from(transfer_nft['to']).toString(),
                    Uint8Array.from(encoded_info)
                );
            }
            default:
                throw Error('unhandled event!!!');
        }
    }

    async scCallVerify({
        action_id,
        to,
        value,
        endpoint,
        args,
    }: ScCallEvent): Promise<Transaction> {
        await this.sender.sync(this.provider);

        // fn validate_sc_call(action_id: BigUint, to: Address, endpoint: BoxedBytes, #[var_args] args: VarArgs<BoxedBytes>,)
        let payloadBuilder = TransactionPayload.contractCall()
            .setFunction(new ContractFunction('validateSCCall'))
            .addArg(new BigUIntValue(action_id))
            .addArg(new AddressValue(new Address(to)))
            .addArg(BytesValue.fromUTF8(endpoint));

        for (const buf of args ?? []) {
            payloadBuilder = payloadBuilder.addArg(BytesValue.fromHex(buf));
        }

        console.log(`args: ${JSON.stringify(payloadBuilder)}`);

        const tx = new Transaction({
            receiver: this.mintContract,
            nonce: this.sender.nonce,
            gasLimit: new GasLimit(80000000),
            data: payloadBuilder.build(),
            value: Balance.egld(value),
        });

        this.signer.sign(tx);
        await tx.send(this.provider);

        return tx;
    }
}
