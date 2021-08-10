/**
 * terms used:
 * `source blockchain`: The blockchain with native tokens
 * `target blockchain`: The blockchain with wrapped tokens
 */

import BigNumber from 'bignumber.js';
import { TxnSocketServe } from './socket';

/**
 * An event indicating a cross chain transfer of assets
 * indicates that X tokens were locked in source blockchain
 * 
 * @param value number of tokens locked in source blockchain
 */
export class TransferEvent implements MultiChainEvent {
    readonly action_id: BigNumber;
    readonly chain_nonce: number;
    readonly to: string;
    readonly value: BigNumber;

    constructor(action_id: BigNumber, chain_nonce: number, to: string, value: BigNumber) {
        this.action_id = action_id;
        this.chain_nonce = chain_nonce;
        this.to = to;
        this.value = value;
    }
}

export class TransferUniqueEvent implements MultiChainEvent {
    readonly action_id: BigNumber;
    readonly chain_nonce: number;
    readonly to: string;
    readonly id: Uint8Array;

    constructor(action_id: BigNumber, chain_nonce: number, to: string, id: Uint8Array) {
        this.action_id = action_id;
        this.chain_nonce = chain_nonce;
        this.to = to;
        this.id = id;
    }
}

/**
 * An event indicating wrapped tokens were burnt in the target blockchain
 * indicates that X tokens are ready to be released in the source blockchain
 */
export class UnfreezeEvent implements MultiChainEvent {
    readonly id: BigNumber;
    readonly chain_nonce: number;
    readonly to: string;
    readonly value: BigNumber;

    constructor(action_id: BigNumber, chain_nonce: number, to: string, value: BigNumber) {
        this.id = action_id;
        this.chain_nonce = chain_nonce;
        this.to = to;
        this.value = value;
    }
}

export class UnfreezeUniqueEvent implements MultiChainEvent {
    readonly id: BigNumber;
    readonly chain_nonce: number;
    readonly to: string;
    readonly nft_id: Uint8Array;

    constructor(action_id: BigNumber, chain_nonce: number, to: string, id: Uint8Array) {
        this.id = action_id;
        this.chain_nonce = chain_nonce;
        this.to = to;
        this.nft_id = id;
    }
}

export interface MultiChainEvent {
    readonly chain_nonce: number;
}

export interface ChainIdentifier {
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

type FullChain<Event, Iter, Handlers, Tx extends IntoString> = ChainEmitter<Event, Iter, Handlers> &
    ChainListener<Handlers, Tx> &
    ChainIdentifier;

type ChainMap<Event, Iter, Handlers, Tx extends IntoString> = {
    [index: number]: FullChain<Event, Iter, Handlers, Tx>;
}

/**
 * Start a bridge connection between emitter & listener
 * 
 * [listener] should be able to handle all the events [emitter] emits
 */
export async function emitEvents<Handlers extends MultiChainEvent>(
    io: TxnSocketServe,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chains: Array<FullChain<any, any, Handlers, IntoString>>
): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map: ChainMap<any, any, Handlers, IntoString> = {};

    const handleEvent = async (listener: ChainListener<Handlers, IntoString> & ChainIdentifier, event: Handlers) => {
        const tx = await listener.emittedEventHandler(event);
        if (event instanceof TransferUniqueEvent) {
            io.emit("transfer_nft_event", listener.chainNonce, event.action_id.toString(), tx.toString());
        } else if (event instanceof UnfreezeUniqueEvent) {
            io.emit("unfreeze_nft_event", listener.chainNonce, event.id.toString(), tx.toString());
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listenEvents = (emitter: ChainEmitter<any, any, Handlers> & ChainIdentifier) => {
        emitter.eventIter(async (event) => {
            if (event === undefined) {
                return;
            }
            const ev = await emitter.eventHandler(event);
            if (ev === undefined) {
                return;
            }

            if (ev.chain_nonce === emitter.chainNonce) {
                throw Error("Chain Nonce is the same"); // TODO: Revert transaction
            }

            const target = map[ev.chain_nonce];
            if (target === undefined) {
                throw Error(`Unsupported Chain Nonce: ${ev.chain_nonce}`); // TODO: Revert transaction
            }
            handleEvent(target, ev);
        });
    }

    for (const chain of chains) {
        if (map[chain.chainNonce] !== undefined) {
            throw Error("Duplicate chain nonce!")
        }
        map[chain.chainNonce] = chain;
        listenEvents(chain);
    }
}

interface IntoString {
    toString(): string;
}

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
     */
    emittedEventHandler(event: SupportedEvents): Promise<TxnHash>;
}
