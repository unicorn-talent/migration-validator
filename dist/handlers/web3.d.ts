import { Networkish } from "@ethersproject/networks";
import { Interface } from "ethers/lib/utils";
import { ChainEmitter, ChainIdentifier, ChainListener, NftUpdate, TransferEvent, TransferUniqueEvent, UnfreezeEvent, UnfreezeUniqueEvent } from "../chain_handler";
declare type SupportedEvs = TransferEvent | UnfreezeEvent | TransferUniqueEvent | UnfreezeUniqueEvent;
export declare class Web3Helper implements ChainEmitter<SupportedEvs, void, SupportedEvs>, ChainListener<SupportedEvs, string>, ChainIdentifier {
    private readonly mintContract;
    readonly chainIdent: string;
    readonly chainNonce: number;
    private readonly w3;
    private readonly erc1155;
    private constructor();
    static new: (provider_uri: string, pkey: string, minter: string, minterAbi: Interface, erc1155: string, chainIdent: string, chainNonce: number, networkOpts?: Networkish | undefined) => Promise<Web3Helper>;
    private nftUriErc721;
    private nftUriErc1155;
    eventIter(cb: ((event: SupportedEvs) => Promise<void>)): Promise<void>;
    eventHandler: (ev: SupportedEvs) => Promise<SupportedEvs>;
    private extractNftUpdate;
    private extractNftUpdateErc1155;
    private extractNftUpdateErc721;
    emittedEventHandler(event: SupportedEvs, origin_nonce: number): Promise<[string, NftUpdate | undefined]>;
}
export {};
