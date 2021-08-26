import { TransactionHash } from '@elrondnetwork/erdjs';
import { ChainEmitter, ChainIdentifier, ChainListener, NftUpdate, TransferEvent, TransferUniqueEvent, UnfreezeEvent, UnfreezeUniqueEvent } from '../chain_handler';
export declare type EsdtTokenInfo = {
    readonly balance: string;
    readonly tokenIdentifier: string;
};
declare type EvResp = {
    address: string;
    identifier: string;
    topics: string[];
    data: string;
};
/**
 * Elrond helper
 *
 * Handles [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 *
 * Emits [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 */
export declare class ElrondHelper implements ChainListener<TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent, TransactionHash>, ChainEmitter<EvResp, void, TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent>, ChainIdentifier {
    private readonly provider;
    private readonly providerRest;
    private readonly sender;
    private readonly signer;
    private readonly mintContract;
    private readonly ws;
    private readonly codec;
    readonly chainNonce = 2;
    readonly chainIdent = "Elrond";
    private constructor();
    eventIter(cb: (event: EvResp) => Promise<void>): Promise<void>;
    private sendWrapper;
    /**
     *
     * @param node_uri uri of the local(or remote?) elrond node
     * @param secret_key String containing the pem content of validator's private key
     * @param sender Bech32 Address of the validator
     * @param minter Bech32 Address of the elrond-mint smart contract
     * @param socket uri of the elrond-event-middleware socket
     */
    static new: (node_uri: string, secret_key: string, minter: string, socket: WebSocket) => Promise<ElrondHelper>;
    eventHandler(event: EvResp): Promise<TransferEvent | TransferUniqueEvent | UnfreezeUniqueEvent | UnfreezeEvent | undefined>;
    emittedEventHandler(event: TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent, origin_nonce: number): Promise<[TransactionHash, NftUpdate | undefined]>;
    private unfreezeVerify;
    /**
    * Unfreeze a frozen nft
    *
    *
    * @returns Transaction hash and original data in the nft
    */
    private unfreezeNftVerify;
    private transferNftVerify;
    private transferMintVerify;
    private listEsdt;
    private listNft;
    private getLockedNft;
}
export {};
