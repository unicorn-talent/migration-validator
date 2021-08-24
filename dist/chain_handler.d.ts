/**
 * terms used:
 * `source blockchain`: The blockchain with native tokens
 * `target blockchain`: The blockchain with wrapped tokens
 */
import BigNumber from 'bignumber.js';
import { TxnSocketServe } from './socket';
import { NFTMetaRepo } from "nft-db-client";
/**
 * An event indicating a cross chain transfer of assets
 * indicates that X tokens were locked in source blockchain
 *
 * @param value number of tokens locked in source blockchain
 */
export declare class TransferEvent implements MultiChainEvent {
    readonly action_id: BigNumber;
    readonly chain_nonce: number;
    readonly to: string;
    readonly value: BigNumber;
    constructor(action_id: BigNumber, chain_nonce: number, to: string, value: BigNumber);
    act_id(): BigNumber;
}
export declare class TransferUniqueEvent implements MultiChainEvent {
    readonly action_id: BigNumber;
    readonly chain_nonce: number;
    readonly to: string;
    readonly id: Uint8Array;
    readonly nft_data: string;
    constructor(action_id: BigNumber, chain_nonce: number, to: string, id: Uint8Array, nft_data: string);
    act_id(): BigNumber;
}
/**
 * An event indicating wrapped tokens were burnt in the target blockchain
 * indicates that X tokens are ready to be released in the source blockchain
 */
export declare class UnfreezeEvent implements MultiChainEvent {
    readonly id: BigNumber;
    readonly chain_nonce: number;
    readonly to: string;
    readonly value: BigNumber;
    constructor(action_id: BigNumber, chain_nonce: number, to: string, value: BigNumber);
    act_id(): BigNumber;
}
export declare class UnfreezeUniqueEvent implements MultiChainEvent {
    readonly id: BigNumber;
    readonly chain_nonce: number;
    readonly to: string;
    readonly nft_id: Uint8Array;
    constructor(action_id: BigNumber, chain_nonce: number, to: string, id: Uint8Array);
    act_id(): BigNumber;
}
export interface MultiChainEvent {
    readonly chain_nonce: number;
    act_id(): BigNumber;
}
export interface ChainIdentifier {
    readonly chainIdent: string;
    readonly chainNonce: number;
}
/**
 * A blockchain which can emit supported events
 *
 * @template EmissionEvent Raw events emitted by the chain
 * @template Iter iterator over the raw  EmissionEvent
 * @template SupportedEvents Events that this blockchain emits, a subset of [[TransferEvent]], [[UnfreezeEvent]], [[ScCallEvent]]
 */
export interface ChainEmitter<EmissionEvent, Iter, SupportedEvents> {
    /**
     *
     * Create a background raw event iterator over raw events
     *
     * @param cb Must be called inside the iterator, passing the raw event to the cb
     */
    eventIter(cb: (event: EmissionEvent) => Promise<void>): Promise<Iter>;
    /**
     * Convert a raw event to a known event
     *
     * @param event Raw event
     */
    eventHandler(event: EmissionEvent): Promise<SupportedEvents | undefined>;
}
declare type FullChain<Event, Iter, Handlers, Tx extends IntoString> = ChainEmitter<Event, Iter, Handlers> & ChainListener<Handlers, Tx> & ChainIdentifier;
/**
 * Start a bridge connection between emitter & listener
 *
 * [listener] should be able to handle all the events [emitter] emits
 */
export declare function emitEvents<Handlers extends MultiChainEvent>(io: TxnSocketServe, db: NFTMetaRepo, chains: Array<FullChain<any, any, Handlers, IntoString>>): Promise<void>;
interface IntoString {
    toString(): string;
}
export declare type NftUpdate = {
    id: string;
    data: string;
};
/**
 * A blockchain which can handle supported events
 *
 * @template SupportedEvents Events that this blockchain handles, a subset of [[TransferEvent]], [[UnfreezeEvent]], [[ScCallEvent]]
 */
export interface ChainListener<SupportedEvents, TxnHash> {
    /**
     * Handle an event
     *
     * @param event supported event
     *
     * @returns tuple of transaction hash and optional data to update in db
     */
    emittedEventHandler(event: SupportedEvents, origin_nonce: number): Promise<[TxnHash, NftUpdate | undefined]>;
}
export {};
