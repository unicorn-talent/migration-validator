/**
 * terms used:
 * `source blockchain`: The blockchain with native tokens
 * `target blockchain`: The blockchain with wrapped tokens
 */

import BigNumber from 'bignumber.js';

/**
 * An event indicating a cross chain transfer of assets
 * indicates that X tokens were locked in source blockchain
 * 
 * @param value number of tokens locked in source blockchain
 */
export class TransferEvent {
    readonly action_id: BigNumber;
    readonly to: string;
    readonly value: BigNumber;

    constructor(action_id: BigNumber, to: string, value: BigNumber) {
        this.action_id = action_id;
        this.to = to;
        this.value = value;
    }
}

export class TransferUniqueEvent {
    readonly action_id: BigNumber;
    readonly to: string;
    readonly id: Uint8Array;

    constructor(action_id: BigNumber, to: string, id: Uint8Array) {
        this.action_id = action_id;
        this.to = to;
        this.id = id;
    }
}

/**
 * An event indicating wrapped tokens were burnt in the target blockchain
 * indicates that X tokens are ready to be released in the source blockchain
 */
export class UnfreezeEvent {
    readonly id: BigNumber;
    readonly to: string;
    readonly value: BigNumber;

    constructor(action_id: BigNumber, to: string, value: BigNumber) {
        this.id = action_id;
        this.to = to;
        this.value = value;
    }
}

export class UnfreezeUniqueEvent {
    readonly id: BigNumber;
    readonly to: string;
    readonly nft_id: Uint8Array;

    constructor(action_id: BigNumber, to: string, id: Uint8Array) {
        this.id = action_id;
        this.to = to;
        this.nft_id = id;
    }
}

/**
 * An event indicating a request to call another smart contract in target blockchain
 */
export class ScCallEvent {
    readonly action_id: BigNumber;
    readonly to: string;
    readonly value: BigNumber;
    readonly endpoint: string;
    readonly args?: string[];

    constructor(
        action_id: BigNumber,
        to: string,
        value: BigNumber,
        endpoint: string,
        args?: string[]
    ) {
        this.action_id = action_id;
        this.to = to;
        this.value = value;
        this.endpoint = endpoint;
        this.args = args;
    }
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

/**
 * Start a bridge connection between emitter & listener
 * 
 * [listener] should be able to handle all the events [emitter] emits
 */
export async function emitEvents<Event, Iter, Handlers>(
    emitter: ChainEmitter<Event, Iter, Handlers>,
    listener: ChainListener<Handlers>
): Promise<void> {
    emitter.eventIter(async (event) => {
        if (event == undefined) {
            return;
        }
        const ev = await emitter.eventHandler(event);
        ev !== undefined && (await listener.emittedEventHandler(ev));
    });
}

/**
 * A blockchain which can handle supported events
 * 
 * @template SupportedEvents Events that this blockchain handles, a subset of [[TransferEvent]], [[UnfreezeEvent]], [[ScCallEvent]]
 */
export interface ChainListener<SupportedEvents> {
    /**
     * Handle an event
     * 
     * @param event supported event
     */
    emittedEventHandler(event: SupportedEvents): Promise<void>;
}
