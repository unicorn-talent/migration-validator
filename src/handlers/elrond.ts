import {
    Account,
    Address,
    AddressValue,
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
    TransactionHash,
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
    ChainIdentifier,
    ChainListener,
    TransferEvent,
    TransferUniqueEvent,
    UnfreezeEvent,
    UnfreezeUniqueEvent,
} from '../chain_handler';

import { toHex } from "./common";

const unfreeze_event_t = new StructType('Unfreeze', [
    new StructFieldDefinition('chain_nonce', '', new U64Type()),
    new StructFieldDefinition('to', '', new ListType(new U8Type())),
    new StructFieldDefinition('value', '', new BigUIntType()),
]);

const transfer_event_t = new StructType('Transfer', [
    new StructFieldDefinition('chain_nonce', '', new U64Type()),
    new StructFieldDefinition('to', '', new ListType(new U8Type())),
    new StructFieldDefinition('value', '', new BigUIntType()),
]);

const unfreeze_nft_event_t = new StructType(`UnfreezeNft`, [
    new StructFieldDefinition('chain_nonce', '', new U64Type()),
    new StructFieldDefinition('to', '', new ListType(new U8Type())),
    new StructFieldDefinition('id', '', new ListType(new U8Type()))
])

const transfer_nft_event_t = new StructType('TransferNft', [
    new StructFieldDefinition('chain_nonce', '', new U64Type()),
    new StructFieldDefinition('to', '', new ListType(new U8Type())),
    new StructFieldDefinition('token', '', new TokenIdentifierType()),
    new StructFieldDefinition('nonce', '', new U64Type())
])

const event_t = new EnumType('Event', [
    new EnumVariantDefinition('Unfreeze', 0),
    new EnumVariantDefinition('UnfreezeNft', 1),
    new EnumVariantDefinition('Transfer', 2),
    new EnumVariantDefinition('TransferNft', 3),
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
        ChainListener<TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent, TransactionHash>,
        ChainEmitter<string, void, TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent>,
        ChainIdentifier
{
    private readonly provider: ProxyProvider;
    private readonly sender: Account;
    private readonly signer: ISigner;
    private readonly mintContract: Address;
    private readonly eventSocket: Socket;
    private readonly codec: BinaryCodec;

    readonly chainNonce = 0x1;

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
            async (id: string) => await cb(id)
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
    ): Promise<TransferEvent | TransferUniqueEvent | UnfreezeUniqueEvent | UnfreezeEvent | undefined> {
        const rpc_ev = await this.eventDecoder(id);
        return rpc_ev;
    }

    async emittedEventHandler(
        event: TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent
    ): Promise<TransactionHash> {
        let tx: Transaction;
        if (event instanceof TransferEvent) {
            tx = await this.transferMintVerify(event);
        } else if (event instanceof UnfreezeEvent) {
            tx = await this.unfreezeVerify(event);
        } else if (event instanceof TransferUniqueEvent) {
            tx = await this.transferNftVerify(event);
        } else if (event instanceof UnfreezeUniqueEvent) {
            tx = await this.unfreezeNftVerify(event);
        } else {
            throw Error('Unsupported event!');
        }
        const hash = tx.getHash();
        console.log(`Elrond event hash: ${hash.toString()}`);

        return hash;
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
        chain_nonce,
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
                .addArg(new U64Value(new BigNumber(chain_nonce)))
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
        chain_nonce,
        to,
        value,
    }: TransferEvent): Promise<Transaction> {
        await this.sender.sync(this.provider);

        const tx = new Transaction({
            receiver: this.mintContract,
            nonce: this.sender.nonce,
            gasLimit: new GasLimit(50000000),
            data: TransactionPayload.contractCall()
                .setFunction(new ContractFunction('validateSendWrapped'))
                .addArg(new BigUIntValue(action_id))
                .addArg(new U64Value(new BigNumber(chain_nonce)))
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
    ): Promise<TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent | undefined> {
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
                    (unfreeze['chain_nonce'].valueOf() as BigNumber).toNumber(),
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
                    (unfreeze_nft['chain_nonce'].valueOf() as BigNumber).toNumber(),
                    Buffer.from(unfreeze_nft['to']).toString(),
                    Buffer.from(unfreeze_nft['id'])
                )
            }
            case 2: {
                const transfer = this.codec
                    .decodeNested(data[0], event_info_transfer_t)[0]
                    .valueOf().evtransfer;
                return new TransferEvent(
                    new BigNumber(id),
                    (transfer['chain_nonce'].valueOf() as BigNumber).toNumber(),
                    Buffer.from(transfer['to']).toString(),
                    new BigNumber(Number(transfer['value'] as BigInt))
                );
            }
            case 3: {
                const transfer_nft = this.codec
                    .decodeNested(data[0], event_info_transfer_nft_t)[0]
                    .valueOf().evtransfernft;
                
                const nft_info = new Struct(
                    nft_info_encoded_t,
                    [
                        new StructField(new TokenIdentifierValue(transfer_nft['token']), 'token'),
                        new StructField(new U64Value(transfer_nft['nonce']), 'nonce'),
                    ]
                );

                const encoded_info = this.codec.encodeNested(nft_info);
                console.log(toHex(encoded_info));

                
                return new TransferUniqueEvent(
                    new BigNumber(id),
                    (transfer_nft['chain_nonce'].valueOf() as BigNumber).toNumber(),
                    Buffer.from(transfer_nft['to']).toString(),
                    Uint8Array.from(encoded_info)
                );
            }
            default:
                throw Error('unhandled event!!!');
        }
    }
}
