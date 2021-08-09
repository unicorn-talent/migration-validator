import BigNumber from "bignumber.js";
import { Contract, providers } from "ethers";
import { Interface } from "ethers/lib/utils";
import { ChainEmitter, ChainListener, ChainIdentifier, TransferEvent, UnfreezeEvent } from "../chain_handler";
declare enum SolEventT {
    Unfreeze = 0,
    Transfer = 1
}
declare type SolEvent = {
    readonly type: SolEventT;
    readonly action_id: BigNumber;
    readonly to: string;
    readonly value: BigNumber;
};
export declare class Web3Helper implements ChainEmitter<SolEvent, void, TransferEvent | UnfreezeEvent>, ChainListener<TransferEvent | UnfreezeEvent, string>, ChainIdentifier {
    readonly mintContract: Contract;
    readonly chainIdentifier: string;
    private constructor();
    static new: (provider_uri: string, pkey: string, minter: string, minterAbi: Interface, chainIdentifier?: string, networkOpts?: providers.Networkish | undefined) => Promise<Web3Helper>;
    eventIter(cb: ((event: SolEvent) => Promise<void>)): Promise<void>;
    eventHandler(ev: SolEvent): Promise<TransferEvent | UnfreezeEvent | undefined>;
    emittedEventHandler(event: TransferEvent | UnfreezeEvent): Promise<string>;
}
export {};
