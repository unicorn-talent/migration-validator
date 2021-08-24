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
import { TransactionWatcher } from "@elrondnetwork/erdjs/out/transactionWatcher"
import BigNumber from 'bignumber.js';
import { Socket } from 'socket.io-client';
import {
    ChainEmitter,
    ChainIdentifier,
    ChainListener,
    NftUpdate,
    TransferEvent,
    TransferUniqueEvent,
    UnfreezeEvent,
    UnfreezeUniqueEvent,
} from '../chain_handler';

import { toHex } from "./common";
import v8 from 'v8';
import axios, {AxiosInstance} from 'axios';
import {Base64} from 'js-base64';


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

type ContractRes = {
  readonly [idx: string]: number | string;
}

type NftInfo = {
	token: string;
	nonce: number;
}


function filterEventId(results: Array<ContractRes>): number {
  for (const res of results) {
    if (res["nonce"] === 0) {
      continue;
    }
    const data = (res.data as string).split("@");
    if (data[0] != "" || data[1] != "6f6b" || data.length != 3) {
      continue;
    }

    try {
      return parseInt(data[2], 16);
    } catch (NumberFormatException) {
      continue;
    }
  }

  throw Error(`invalid result: ${results.toString()}`);
}

export type EsdtTokenInfo = {
  readonly balance: string;
  readonly tokenIdentifier: string;
}

type BEsdtNftInfo = {
  readonly attributes?: string;
  readonly creator: string;
  readonly name: string;
  readonly nonce: number;
  readonly royalties: string;
  readonly uris: string[];
}

type MaybeEsdtNftInfo = EsdtTokenInfo & (BEsdtNftInfo | undefined);

/**
 * Information associated with an ESDT NFT
 */
type EsdtNftInfo = EsdtTokenInfo & BEsdtNftInfo;

function isEsdtNftInfo(maybe: MaybeEsdtNftInfo): maybe is EsdtNftInfo {
  return maybe.creator != undefined && maybe.balance == "1";
}


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
	private readonly providerRest: AxiosInstance;
    private readonly sender: Account;
    private readonly signer: ISigner;
    private readonly mintContract: Address;
    private readonly eventSocket: Socket;
    private readonly codec: BinaryCodec;

    readonly chainNonce = 0x2;
	readonly chainIdent = "Elrond";

    private constructor(
        provider: ProxyProvider,
		providerRest: AxiosInstance,
        sender: Account,
        signer: ISigner,
        mintContract: Address,
        eventSocket: Socket
    ) {
        this.provider = provider;
		this.providerRest = providerRest;
        this.sender = sender;
        this.signer = signer;
        this.mintContract = mintContract;
        this.eventSocket = eventSocket;
        this.codec = new BinaryCodec()
    }

	private transactionResult = async (tx_hash: TransactionHash) => {
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
	}

    async eventIter(cb: (event: string) => Promise<void>): Promise<void> {
        this.eventSocket.on(
            'elrond:transfer_tx',
            async (tx_hash: string) => {
				let txh;
				try {
					txh = new TransactionHash(tx_hash);
				} catch (_) {
					return;
				}
				await new Promise(r => setTimeout(r, 3000));
				const watcher = new TransactionWatcher(txh, this.provider);
				await watcher.awaitNotarized()
				const res: Array<ContractRes> = (await this.transactionResult(txh))["smartContractResults"]
				const id = filterEventId(res).toString();

				await cb(id)
			}
        );
    }


	private async sendWrapper(tx: Transaction): Promise<Transaction> {
		const orig: Transaction = v8.deserialize(v8.serialize(tx));
		
		tx.setNonce(this.sender.nonce);
		this.signer.sign(tx);
		this.sender.incrementNonce();

		try {
			await tx.send(this.provider);
		} catch (e) {
			if (e.message.includes("lowerNonceInTx")) {
				this.sender.sync(this.provider);
				return await this.sendWrapper(orig);
			}
			throw e;
		}

		return tx;
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
		const providerRest = axios.create({
			baseURL: node_uri
		})
        await NetworkConfig.getDefault().sync(provider);
        const signer = new UserSigner(parseUserKey(secret_key));
        const senderac = new Account(signer.getAddress());

		await senderac.sync(provider);

        return new ElrondHelper(
            provider,
			providerRest,
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
        event: TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent,
        origin_nonce: number
    ): Promise<[TransactionHash, NftUpdate | undefined]> {
        let tx: Transaction;
		let dat: NftUpdate | undefined = undefined;
        if (event instanceof TransferEvent) {
            tx = await this.transferMintVerify(event, origin_nonce);
        } else if (event instanceof UnfreezeEvent) {
            tx = await this.unfreezeVerify(event);
        } else if (event instanceof TransferUniqueEvent) {
            tx = await this.transferNftVerify(event, origin_nonce);
			dat = { id: event.nft_data, data: event.to };
        } else if (event instanceof UnfreezeUniqueEvent) {
            const res = await this.unfreezeNftVerify(event);
			tx = res[0];
			dat = { id: res[1], data: event.to };
        } else {
            throw Error('Unsupported event!');
        }
        const hash = tx.getHash();
        console.log(`Elrond event hash: ${hash.toString()}`);

        return [hash, dat];
    }

    private async unfreezeVerify({
        id,
        to,
        value,
    }: UnfreezeEvent): Promise<Transaction> {
        const tx = new Transaction({
            receiver: this.mintContract,
            gasLimit: new GasLimit(50000000),
            data: TransactionPayload.contractCall()
                .setFunction(new ContractFunction('validateUnfreeze'))
                .addArg(new BigUIntValue(id))
                .addArg(new AddressValue(new Address(to)))
                .addArg(new U32Value(value))
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
    private async unfreezeNftVerify({
        id,
        to,
        nft_id,
    }: UnfreezeUniqueEvent): Promise<[Transaction, string]> {
        const nft_info = this.codec.decodeNested(Buffer.from(nft_id), nft_info_encoded_t)[0].valueOf();
		const nft_data = await this.getLockedNft({ nonce: nft_info.nonce, token: nft_info.token })

        const tx = new Transaction({
            receiver: this.mintContract,
            gasLimit: new GasLimit(70000000),
            data: TransactionPayload.contractCall()
                .setFunction(new ContractFunction("validateUnfreezeNft"))
                .addArg(new BigUIntValue(id))
                .addArg(new AddressValue(new Address(to)))
                .addArg(new TokenIdentifierValue(nft_info.token))
                .addArg(new U64Value(nft_info.nonce))
                .build()
        });

        const ex = await this.sendWrapper(tx);

        return [ex, Base64.atob(nft_data!.uris[0])];
    }

    private async transferNftVerify({
        action_id,
        to,
        id
    }: TransferUniqueEvent, origin_nonce: number): Promise<Transaction> {
        const tx = new Transaction({
            receiver: this.mintContract,
            gasLimit: new GasLimit(80000000),
            data: TransactionPayload.contractCall()
                .setFunction(new ContractFunction('validateSendNft'))
                .addArg(new BigUIntValue(action_id))
                .addArg(new U64Value(new BigNumber(origin_nonce)))
                .addArg(new AddressValue(new Address(to)))
                .addArg(BytesValue.fromHex(toHex(id)))
                .build()
        });

        const ex = await this.sendWrapper(tx); 

        return ex;
    }

    private async transferMintVerify({
        action_id,
        to,
        value,
    }: TransferEvent, origin_nonce: number): Promise<Transaction> {
        const tx = new Transaction({
            receiver: this.mintContract,
            gasLimit: new GasLimit(70000000), // TODO: estimate this
            data: TransactionPayload.contractCall()
                .setFunction(new ContractFunction('validateSendWrapped'))
                .addArg(new BigUIntValue(action_id))
                .addArg(new U64Value(new BigNumber(origin_nonce)))
                .addArg(new AddressValue(new Address(to)))
                .addArg(new U32Value(value))
                .build(),
        });

        const ex = await this.sendWrapper(tx);

        return ex;
    }

	private async listEsdt(owner: string): Promise<{ [index: string]: MaybeEsdtNftInfo }> {
		const raw = await this.providerRest.get(`/address/${owner}/esdt`);
		const dat = raw.data.data.esdts as { [index: string]: MaybeEsdtNftInfo };

		return dat;
	}

	private async listNft(owner: string): Promise<Map<string, EsdtNftInfo>> {
		const ents: [string, MaybeEsdtNftInfo][] = Object.entries(await this.listEsdt(owner));

		return new Map(ents.filter(([_ident, info]) => isEsdtNftInfo(info)))
	}

	private async getLockedNft({token, nonce}: NftInfo): Promise<EsdtNftInfo | undefined> {
		const nfts = await this.listNft(this.mintContract.toString());
		return nfts.get(`${token}-0${nonce.toString(16)}`);
	}

    private async eventDecoder(
        id: string
    ): Promise<TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent | undefined> {
        const tx = new Transaction({
            receiver: this.mintContract,
            gasLimit: new GasLimit(50000000),
            data: TransactionPayload.contractCall()
                .setFunction(new ContractFunction('eventRead'))
                .addArg(new BigUIntValue(new BigNumber(id)))
                .build(),
        });

        const ex = await this.sendWrapper(tx);

		await new Promise(r => setTimeout(r, 4000));
        await ex.awaitNotarized(this.provider);
        console.log(`tx hash: ${ex.getHash().toString()}`);
        const res = (
            await ex.getAsOnNetwork(this.provider)
        ).getSmartContractResults();
        const data = res.getImmediate().outputUntyped();
        switch (data[0][0]) {
            case 0: {
                const unfreeze = this.codec
                    .decodeNested(data[0], event_info_unfreeze_t)[0]
                    .valueOf().evunfreeze;
                return new UnfreezeEvent(
                    new BigNumber(id),
                    parseInt(unfreeze['chain_nonce'].toString()),
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
                    parseInt(unfreeze_nft['chain_nonce'].toString()),
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
                    parseInt(transfer['chain_nonce'].toString()),
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
				const nft_data = await this.getLockedNft(
					{ token: transfer_nft['token'], nonce: transfer_nft['nonce'] }
				);

                
                return new TransferUniqueEvent(
                    new BigNumber(id),
                    parseInt(transfer_nft['chain_nonce'].toString()),
                    Buffer.from(transfer_nft['to']).toString(),
                    Uint8Array.from(encoded_info),
					Base64.atob(nft_data!.uris[0])
                );
            }
            default:
                throw Error('unhandled event!!!');
        }
    }
}
