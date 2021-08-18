import { Networkish } from "@ethersproject/networks";
import BigNumber from "bignumber.js";
import { Contract, providers, Wallet, BigNumber as EthBN } from "ethers";
import { Interface } from "ethers/lib/utils";
import { ChainEmitter, ChainIdentifier, ChainListener, TransferEvent, TransferUniqueEvent, UnfreezeEvent, UnfreezeUniqueEvent } from "../chain_handler";
import {NftEthNative, NftPacked} from "../encoding";


type SupportedEvs = TransferEvent | UnfreezeEvent | TransferUniqueEvent | UnfreezeUniqueEvent;

export class Web3Helper implements
	ChainEmitter<SupportedEvs, void, SupportedEvs>,
	ChainListener<SupportedEvs, string>,
	ChainIdentifier
{
    readonly mintContract: Contract;
	readonly chainNonce: number;

    private constructor(mintContract: Contract, chainNonce: number) {
        this.mintContract = mintContract;
		this.chainNonce = chainNonce;
    }

    public static new = async function(provider_uri: string, pkey: string, minter: string, minterAbi: Interface, chainNonce: number, networkOpts?: Networkish): Promise<Web3Helper> {
        const w3 = new providers.JsonRpcProvider(provider_uri, networkOpts);
		await w3.ready;
        const acc = (new Wallet(pkey)).connect(w3);
        const mint = new Contract(minter, minterAbi, acc);

        return new Web3Helper(mint, chainNonce);
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
				prot.serializeBinary()
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
				prot.serializeBinary()
			)

			await cb(ev);
		})
	}

	public eventHandler = async (ev: SupportedEvs) => ev;

    async emittedEventHandler(event: SupportedEvs, origin_nonce: number): Promise<string> {
		let kind: string;
		let action: string;
		let tx: providers.TransactionResponse;
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
			kind = "transfer_nft"
		} else if (event instanceof UnfreezeUniqueEvent) {
			action = event.id.toString();
			const encoded = NftEthNative.deserializeBinary(event.nft_id);
			
			switch (encoded.getNftKind()) {
				case NftEthNative.NftKind.ERC1155: {
					console.log("event", event.to);
					console.log("id", encoded.getId());
					console.log("contract addr", encoded.getContractAddr());
					tx = await this.mintContract.validate_unfreeze_erc1155(
						action,
						event.to,
						EthBN.from(encoded.getId()),
						encoded.getContractAddr()
					)
					break;
				}
				case NftEthNative.NftKind.ERC721: {
					tx = await this.mintContract.validate_unfreeze_erc721(
						action,
						event.to,
						EthBN.from(encoded.getId()),
						encoded.getContractAddr()
					)
					break;
				}
			}
			kind = "unfreeze_nft"
		} else {
            throw Error("Unsupported event!");
        }
	
		await tx.wait();
		console.log(`web3 ${kind} action_id: ${action}, tx: ${tx.hash} executed`);

		return tx.hash;
    }
}
