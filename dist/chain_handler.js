"use strict";
/**
 * terms used:
 * `source blockchain`: The blockchain with native tokens
 * `target blockchain`: The blockchain with wrapped tokens
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvents = exports.UnfreezeUniqueEvent = exports.UnfreezeEvent = exports.TransferUniqueEvent = exports.TransferEvent = void 0;
/**
 * An event indicating a cross chain transfer of assets
 * indicates that X tokens were locked in source blockchain
 *
 * @param value number of tokens locked in source blockchain
 */
class TransferEvent {
    constructor(action_id, chain_nonce, to, value) {
        this.action_id = action_id;
        this.chain_nonce = chain_nonce;
        this.to = to;
        this.value = value;
    }
}
exports.TransferEvent = TransferEvent;
class TransferUniqueEvent {
    constructor(action_id, chain_nonce, to, id) {
        this.action_id = action_id;
        this.chain_nonce = chain_nonce;
        this.to = to;
        this.id = id;
    }
}
exports.TransferUniqueEvent = TransferUniqueEvent;
/**
 * An event indicating wrapped tokens were burnt in the target blockchain
 * indicates that X tokens are ready to be released in the source blockchain
 */
class UnfreezeEvent {
    constructor(action_id, chain_nonce, to, value) {
        this.id = action_id;
        this.chain_nonce = chain_nonce;
        this.to = to;
        this.value = value;
    }
}
exports.UnfreezeEvent = UnfreezeEvent;
class UnfreezeUniqueEvent {
    constructor(action_id, chain_nonce, to, id) {
        this.id = action_id;
        this.chain_nonce = chain_nonce;
        this.to = to;
        this.nft_id = id;
    }
}
exports.UnfreezeUniqueEvent = UnfreezeUniqueEvent;
/**
 * Start a bridge connection between emitter & listener
 *
 * [listener] should be able to handle all the events [emitter] emits
 */
async function emitEvents(io, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
chains) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = {};
    const handleEvent = async (listener, event, origin_nonce) => {
        const tx = await listener.emittedEventHandler(event, origin_nonce);
        if (event instanceof TransferUniqueEvent) {
            io.emit("transfer_nft_event", listener.chainNonce, event.action_id.toString(), tx.toString());
        }
        else if (event instanceof UnfreezeUniqueEvent) {
            io.emit("unfreeze_nft_event", listener.chainNonce, event.id.toString(), tx.toString());
        }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listenEvents = (emitter) => {
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
            handleEvent(target, ev, emitter.chainNonce);
        });
    };
    for (const chain of chains) {
        if (map[chain.chainNonce] !== undefined) {
            throw Error("Duplicate chain nonce!");
        }
        map[chain.chainNonce] = chain;
        listenEvents(chain);
    }
}
exports.emitEvents = emitEvents;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhaW5faGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jaGFpbl9oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7OztHQUlHOzs7QUFLSDs7Ozs7R0FLRztBQUNILE1BQWEsYUFBYTtJQU10QixZQUFZLFNBQW9CLEVBQUUsV0FBbUIsRUFBRSxFQUFVLEVBQUUsS0FBZ0I7UUFDL0UsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0IsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDYixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUN2QixDQUFDO0NBQ0o7QUFaRCxzQ0FZQztBQUVELE1BQWEsbUJBQW1CO0lBTTVCLFlBQVksU0FBb0IsRUFBRSxXQUFtQixFQUFFLEVBQVUsRUFBRSxFQUFjO1FBQzdFLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQy9CLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7SUFDakIsQ0FBQztDQUNKO0FBWkQsa0RBWUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFhLGFBQWE7SUFNdEIsWUFBWSxTQUFvQixFQUFFLFdBQW1CLEVBQUUsRUFBVSxFQUFFLEtBQWdCO1FBQy9FLElBQUksQ0FBQyxFQUFFLEdBQUcsU0FBUyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQy9CLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDdkIsQ0FBQztDQUNKO0FBWkQsc0NBWUM7QUFFRCxNQUFhLG1CQUFtQjtJQU01QixZQUFZLFNBQW9CLEVBQUUs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