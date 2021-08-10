import { Networkish } from "@ethersproject/networks";
import BigNumber from "bignumber.js";
import { Contract, providers, Wallet } from "ethers";
import { Interface } from "ethers/lib/utils";
import { ChainEmitter, ChainIdentifier, ChainListener, TransferEvent, UnfreezeEvent } from "../chain_handler";

enum SolEventT {
	Unfreeze,
	Transfer
}

type SolEvent = {
	readonly type: SolEventT;
	readonly action_id: BigNumber;
	readonly chain_nonce: BigNumber,
	readonly to: string;
	readonly value: BigNumber;
};

export class Web3Helper implements ChainEmitter<SolEvent, void, TransferEvent | UnfreezeEvent>, ChainListener<TransferEvent | UnfreezeEvent, string>, ChainIdentifier {
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

	async eventIter(cb: ((event: SolEvent) => Promise<void>)): Promise<void> {
		this.mintContract.on('Unfreeze', async (action_id: BigNumber, chain_nonce: BigNumber, to: string, value: BigNumber) => {
			const ev = { type: SolEventT.Unfreeze, action_id, chain_nonce,  to, value };
			await cb(ev);
		});
		this.mintContract.on('Transfer', async (action_id: BigNumber, chain_nonce: BigNumber, to: string, value: BigNumber) => {
			const ev = { type: SolEventT.Transfer, action_id, chain_nonce, to, value };
			await cb(ev);
		});
	}

	async eventHandler(ev: SolEvent): Promise<TransferEvent | UnfreezeEvent | undefined> {
		switch (ev.type) {
			case SolEventT.Unfreeze:
				return new UnfreezeEvent(ev.action_id, ev.chain_nonce.toNumber(), ev.to, ev.value);
			case SolEventT.Transfer:
				return new TransferEvent(ev.action_id, ev.chain_nonce.toNumber(), ev.to, ev.value);
		}
	}

    async emittedEventHandler(event: TransferEvent | UnfreezeEvent): Promise<string> {
		let kind: string;
		let action: string;
		let tx: providers.TransactionResponse;
		if (event instanceof TransferEvent) {
			action = event.action_id.toString();
			console.log(`target: ${event.to}, value: ${event.value}`)
            tx = await this.mintContract.validate_transfer(action, event.chain_nonce, event.to, event.value.toString());
			kind = "transfer"
        } else if (event instanceof UnfreezeEvent) {
			action = event.id.toString();
            tx = await this.mintContract.validate_unfreeze(action, event.to, event.value.toString());
			kind = "unfreeze"
        } else {
            throw Error("Unsupported event!");
        }
	
		await tx.wait();
		console.log(`web3 ${kind} action_id: ${action}, executed`);

		return tx.hash;
    }
}
