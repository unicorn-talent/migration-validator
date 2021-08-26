import v8 from 'v8';
import {
    Account,
    Address,
    AddressValue,
    BigUIntValue,
    BinaryCodec,
    BytesValue,
    ContractFunction,
    //decodeString,
    GasLimit,
    ISigner,
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
    UserSigner,
} from '@elrondnetwork/erdjs';
import axios, {AxiosInstance} from 'axios';
import BigNumber from 'bignumber.js';
import {Base64} from 'js-base64';
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

const nft_info_encoded_t = new StructType('EncodedNft', [
    new StructFieldDefinition('token', '', new TokenIdentifierType()),
    new StructFieldDefinition('nonce', '', new U64Type())
]);

type NftInfo = {
	token: string;
	nonce: number;
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

type EvResp = {
    address: string,
    identifier: string,
    topics: string[],
    data: string
};

function bigIntFromBe(buf: Uint8Array): BigNumber {
    // TODO: something better than this hack
    return new BigNumber(`0x${Buffer.from(buf).toString('hex')}`, 16)
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
        ChainEmitter<EvResp, void, TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent>,
        ChainIdentifier
{
    private readonly provider: ProxyProvider;
	private readonly providerRest: AxiosInstance;
    private readonly sender: Account;
    private readonly signer: ISigner;
    private readonly mintContract: Address;
    private readonly ws: WebSocket;
    private readonly codec: BinaryCodec;

    readonly chainNonce = 0x2;
	readonly chainIdent = "Elrond";

    private constructor(
        provider: ProxyProvider,
		providerRest: AxiosInstance,
        sender: Account,
        signer: ISigner,
        mintContract: Address,
        eventSocket: WebSocket
    ) {
        this.provider = provider;
		this.providerRest = providerRest;
        this.sender = sender;
        this.signer = signer;
        this.mintContract = mintContract;
        this.ws = eventSocket;
        this.codec = new BinaryCodec()
    }

    async eventIter(cb: (event: EvResp) => Promise<void>): Promise<void> {
        this.ws.addEventListener("open", () => {
            this.ws.send(JSON.stringify({
                "subscriptionEntries": [
                    {
                        "address": this.mintContract
                    }
                ]
            }))
        });

        this.ws.addEventListener("message", (ev) => {
            const evs: EvResp[] = JSON.parse(ev.data);
            evs.forEach(async (v) => await cb(v));
        })
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
        socket: WebSocket
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
        event: EvResp
    ): Promise<TransferEvent | TransferUniqueEvent | UnfreezeUniqueEvent | UnfreezeEvent | undefined> {
        if (event.topics.length < 4) {
            throw Error(`Invalid event: ${JSON.stringify(event)}`);
        }

        const action_id = bigIntFromBe(Base64.toUint8Array(event.topics[0]));
        const chain_nonce = (new Uint32Array(Base64.toUint8Array(event.topics[1])))[0]; // TODO: Consider LO
        const to = Base64.atob(event.topics[2]);
        switch (event.identifier) {
            case "Unfreeze": {
                const value = bigIntFromBe(Base64.toUint8Array(event.topics[3]));
                return new UnfreezeEvent(
                    action_id,
                    chain_nonce,
                    to,
                    value
                );
            }
            case "UnfreezeNft": {                
                return new UnfreezeUniqueEvent(
                    action_id,
                    chain_nonce,
                    to,
                    Base64.toUint8Array(event.topics[3])
                )
            }
            case "Transfer": {
                const value = bigIntFromBe(Base64.toUint8Array(event.topics[3]));
                return new TransferEvent(
                    action_id,
                    chain_nonce,
                    to,
                    value
                );
            }
            case "TransferNft": {
                const token = Buffer.from(Base64.toUint8Array(event.topics[3]));
                const nonce = bigIntFromBe(Base64.toUint8Array(event.topics[4]));
                const nft_info = new Struct(
                    nft_info_encoded_t,
                    [
                        new StructField(new TokenIdentifierValue(token), 'token'),
                        new StructField(new U64Value(nonce), 'nonce'),
                    ]
                );

                const encoded_info = this.codec.encodeNested(nft_info);
                console.log(toHex(encoded_info));
				const nft_data = await this.getLockedNft(
					{ token: token.toString("utf-8"), nonce: nonce.toNumber() }
				);
                if (nft_data === undefined) {
                    throw Error("Transferring Non Frozen Nft?!");
                }

                
                return new TransferUniqueEvent(
                    action_id,
                    chain_nonce,
                    to,
                    Uint8Array.from(encoded_info),
					Base64.atob(nft_data.uris[0])
                );
            }
            default:
                throw Error(`unhandled event: ${event.identifier}`);
        }
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
		const nft_data = await this.getLockedNft({ nonce: nft_info.nonce, token: nft_info.token });
        if (!nft_data) {
            throw Error("unfreezing non existent nft?!");
        }

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

        return [ex, Base64.atob(nft_data.uris[0])];
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

		return new Map(ents.filter(([, info]) => isEsdtNftInfo(info)))
	}

	private async getLockedNft({token, nonce}: NftInfo): Promise<EsdtNftInfo | undefined> {
		const nfts = await this.listNft(this.mintContract.toString());
		return nfts.get(`${token}-0${nonce.toString(16)}`);
	}
}
