import { Networkish } from "@ethersproject/networks";
import { Contract } from "ethers";
import { Interface } from "ethers/lib/utils";
import { ChainEmitter, ChainIdentifier, ChainListener, TransferEvent, TransferUniqueEvent, UnfreezeEvent, UnfreezeUniqueEvent } from "../chain_handler";
declare type SupportedEvs = TransferEvent | UnfreezeEvent | TransferUniqueEvent | UnfreezeUniqueEvent;
export declare class Web3Helper implements ChainEmitter<SupportedEvs, void, SupportedEvs>, ChainListener<SupportedEvs, string>, ChainIdentifier {
    readonly mintContract: Contract;
    readonly chainNonce: number;
    private constructor();
    static new: (provider_uri: string, pkey: string, minter: string, minterAbi: Interface, chainNonce: number, networkOpts?: Networkish | undefined) => Promise<Web3Helper>;
    eventIter(cb: ((event: SupportedEvs) => Promise<void>)): Promise<void>;
    eventHandler: (ev: SupportedEvs) => Promise<SupportedEvs>;
    emittedEventHandler(event: SupportedEvs, origin_nonce: number): Promise<string>;
}
export {};
