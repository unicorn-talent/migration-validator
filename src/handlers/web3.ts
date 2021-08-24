import { Networkish } from "@ethersproject/networks";
import BigNumber from "bignumber.js";
import { Contract, providers, Wallet, BigNumber as EthBN } from "ethers";
import { Provider, TransactionReceipt, Log } from "@ethersproject/abstract-provider";
import { Interface, LogDescription } from "ethers/lib/utils";
import { ChainEmitter, ChainIdentifier, ChainListener, NftUpdate, TransferEvent, TransferUniqueEvent, UnfreezeEvent, UnfreezeUniqueEvent } from "../chain_handler";
import {NftEthNative, NftPacked} from "../encoding";
import { abi as ERC721_abi } from "../fakeERC721.json";
import { abi as ERC1155_abi } from "../fakeERC1155.json";


type SupportedEvs = TransferEvent | UnfreezeEvent | TransferUniqueEvent | UnfreezeUniqueEvent;

const erc1155_abi = new Interface(ERC1155_abi);
const erc721_abi = new Interface(ERC721_abi);

export class Web3Helper implements
	ChainEmitter<SupportedEvs, void, SupportedEvs>,
	ChainListener<SupportedEvs, string>,
	ChainIdentifier
{
    private readonly mintContract: Contract;
	readonly chainIdent: string;
	readonly chainNonce: number;
	private readonly w3: Provider;
	private readonly erc1155: string;

    private constructor(w3: Provider, mintContract: Contract, erc1155: string, chainIdent: string, chainNonce: number) {
		this.w3 = w3;
        this.mintContract = mintContract;
		this.chainIdent = chainIdent;
		this.chainNonce = chainNonce;
		this.erc1155 = erc1155;
    }

    public static new = async function(provider_uri: string, pkey: string, minter: string, minterAbi: Interface, erc1155: string, chainIdent: string, chainNonce: number, networkOpts?: Networkish): Promise<Web3Helper> {
        const w3 = new providers.JsonRpcProvider(provider_uri, networkOpts);
		await w3.ready;
        const acc = (new Wallet(pkey)).connect(w3);
        const mint = new Contract(minter, minterAbi, acc);

        return new Web3Helper(w3, mint, erc1155, chainIdent, chainNonce);
    }

	private async nftUriErc721(contract: string, token: EthBN): Promise<string> {
		const erc = new Contract(contract, erc721_abi, this.w3);
		return await erc.tokenURI(token);
	}

	private async nftUriErc1155(contract: string, token: EthBN): Promise<string> {
		const erc = new Contract(contract, erc1155_abi, this.w3);
		return await erc.tokenURI(token);
	}

	async eventIter(cb: ((event: SupportedEvs) => Promise<void>)): Promise<void> {
		this.mintContract.on('Unfreeze', async (action_id: EthBN, chain_nonce: EthBN, to: string, value: EthBN) => {
			const ev = new UnfreezeEvent(
				new BigNumber(action_id.toString()),
				chain_nonce.toNumber(),
				to,
				new BigNumber(value.toString())
			);
			await cb(ev);
		});
		this.mintContract.on('Transfer', async (action_id: EthBN, chain_nonce: EthBN, to: string, value: EthBN) => {
			const ev = new TransferEvent(
				new BigNumber(action_id.toString()),
				chain_nonce.toNumber(),
				to,
				new BigNumber(value.toString())
			)
			await cb(ev);
		});
		this.mintContract.on('UnfreezeNft', async (action_id: EthBN, to: string, data: string) => {
			const prot = NftPacked.deserializeBinary(
				Buffer.from(data, 'base64')
			);

			const ev = new UnfreezeUniqueEvent(
				new BigNumber(action_id.toString()),
				prot.getChainNonce(),
				to,
				prot.getData_asU8()
			);

			await cb(ev);
		});
		this.mintContract.on('TransferErc721', async (action_id: EthBN, chain_nonce: EthBN, to: string, id: EthBN, contract_addr: string) => {
			const prot = new NftEthNative();
			prot.setId(id.toString());
			prot.setNftKind(NftEthNative.NftKind.ERC721);
			prot.setContractAddr(contract_addr);

			const ev = new TransferUniqueEvent(
				new BigNumber(action_id.toString()),
				chain_nonce.toNumber(),
				to,
				prot.serializeBinary(),
				await this.nftUriErc721(contract_addr, id)
			)

			await cb(ev);
		});
		this.mintContract.on('TransferErc1155', async (action_id: EthBN, chain_nonce: EthBN, to: string, id: EthBN, contract_addr: string) => {
			const prot = new NftEthNative();
			prot.setId(id.toString());
			prot.setNftKind(NftEthNative.NftKind.ERC1155);
			prot.setContractAddr(contract_addr);

			const ev = new TransferUniqueEvent(
				new BigNumber(action_id.toString()),
				chain_nonce.toNumber(),
				to,
				prot.serializeBinary(),
				await this.nftUriErc1155(contract_addr, id)
			)

			await cb(ev);
		})
	}

	public eventHandler = async (ev: SupportedEvs) => ev;

	private extractNftUpdate(nft_data: string, to: string, receipt: TransactionReceipt, parser: (e: Log) => LogDescription, event: string, arg_idx: number): NftUpdate {
		const ev: LogDescription = receipt.logs.map((e) => {
			try {
				return parser(e)
			} catch (_) {
				return undefined
			}
		}).find((e) => e && e.name === event)!;

		const id = ev.args[arg_idx].toString();
		return { id: nft_data, data: `${this.erc1155},${to},${id}` };
	}

	private extractNftUpdateErc1155 = (nft_data: string, to: string, receipt: TransactionReceipt) => this.extractNftUpdate(nft_data, to, receipt, erc1155_abi.parseLog.bind(erc1155_abi), "TransferSingle", 3);
	private extractNftUpdateErc721 = (nft_data: string, to: string, receipt: TransactionReceipt) => this.extractNftUpdate(nft_data, to, receipt, erc721_abi.parseLog.bind(erc721_abi), "Transfer", 2);

    async emittedEventHandler(event: SupportedEvs, origin_nonce: number): Promise<[string, NftUpdate | undefined]> {
		let kind: string;
		let action: string;
		let tx: providers.TransactionResponse;
		let dat: NftUpdate | undefined = undefined;
		if (event instanceof TransferEvent) {
			action = event.action_id.toString();
            tx = await this.mintContract.validate_transfer(action, origin_nonce, event.to, event.value.toString());
			kind = "transfer"
        } else if (event instanceof UnfreezeEvent) {
			action = event.id.toString();
            tx = await this.mintContract.validate_unfreeze(action, event.to, event.value.toString());
			kind = "unfreeze"
        } else if (event instanceof TransferUniqueEvent) {
			action = event.action_id.toString();
			const encoded = new NftPacked();
			encoded.setChainNonce(origin_nonce);
			encoded.setData(event.id);

			const buf = Buffer.from(encoded.serializeBinary())

			console.log("data", buf.toString('base64'));

			tx = await this.mintContract.validate_transfer_nft(
				action,
				event.to,
				buf.toString('base64')
			);
			const receipt = await tx.wait();
			dat = this.extractNftUpdateErc1155(event.nft_data, event.to, receipt);
			kind = "transfer_nft"
		} else if (event instanceof UnfreezeUniqueEvent) {
			action = event.id.toString();
			const encoded = NftEthNative.deserializeBinary(event.nft_id);
			let extractor;
			let nft_data;
			
			switch (encoded.getNftKind()) {
				case NftEthNative.NftKind.ERC1155: {
					console.log("event", event.to);
					console.log("id", encoded.getId());
					console.log("contract addr", encoded.getContractAddr());
					nft_data = await this.nftUriErc1155(encoded.getContractAddr(), EthBN.from(encoded.getId()))
					tx = await this.mintContract.validate_unfreeze_erc1155(
						action,
						event.to,
						EthBN.from(encoded.getId()),
						encoded.getContractAddr()
					)
					extractor = this.extractNftUpdateErc1155.bind(this);
					break;
				}
				case NftEthNative.NftKind.ERC721: {
					nft_data = await this.nftUriErc721(encoded.getContractAddr(), EthBN.from(encoded.getId()))
					tx = await this.mintContract.validate_unfreeze_erc721(
						action,
						event.to,
						EthBN.from(encoded.getId()),
						encoded.getContractAddr()
					);
					extractor = this.extractNftUpdateErc721.bind(this);
					break;
				}
			}
			const receipt = await tx.wait();
			dat = extractor(nft_data, event.to, receipt)
			kind = "unfreeze_nft"
		} else {
            throw Error("Unsupported event!");
        }
	
		await tx.wait();
		console.log(`web3 ${kind} action_id: ${action}, tx: ${tx.hash} executed`);

		return [tx.hash, dat];
    }
}
