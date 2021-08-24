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
    act_id() {
        return this.action_id;
    }
    ;
}
exports.TransferEvent = TransferEvent;
class TransferUniqueEvent {
    constructor(action_id, chain_nonce, to, id, nft_data) {
        this.action_id = action_id;
        this.chain_nonce = chain_nonce;
        this.to = to;
        this.id = id;
        this.nft_data = nft_data;
    }
    act_id() {
        return this.action_id;
    }
    ;
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
    act_id() {
        return this.id;
    }
    ;
}
exports.UnfreezeEvent = UnfreezeEvent;
class UnfreezeUniqueEvent {
    constructor(action_id, chain_nonce, to, id) {
        this.id = action_id;
        this.chain_nonce = chain_nonce;
        this.to = to;
        this.nft_id = id;
    }
    act_id() {
        return this.id;
    }
    ;
}
exports.UnfreezeUniqueEvent = UnfreezeUniqueEvent;
/**
 * Start a bridge connection between emitter & listener
 *
 * [listener] should be able to handle all the events [emitter] emits
 */
async function emitEvents(io, db, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
chains) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = {};
    const handleEvent = async (listener, event, origin_nonce) => {
        const [tx, updateDat] = await listener.emittedEventHandler(event, origin_nonce);
        if (updateDat != undefined) {
            await db.updateById(updateDat.id, null, null, null, `${listener.chainIdent},${updateDat}`);
        }
        io.emit("tx_executed_event", listener.chainNonce, event.act_id().toString(), tx.toString());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhaW5faGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jaGFpbl9oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7OztHQUlHOzs7QUFNSDs7Ozs7R0FLRztBQUNILE1BQWEsYUFBYTtJQU10QixZQUFZLFNBQW9CLEVBQUUsV0FBbUIsRUFBRSxFQUFVLEVBQUUsS0FBZ0I7UUFDL0UsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0IsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDYixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUN2QixDQUFDO0lBRUcsTUFBTTtRQUNaLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUN0QixDQUFDO0lBQUEsQ0FBQztDQUNGO0FBaEJELHNDQWdCQztBQUVELE1BQWEsbUJBQW1CO0lBTzVCLFlBQVksU0FBb0IsRUFBRSxXQUFtQixFQUFFLEVBQVUsRUFBRSxFQUFjLEVBQUUsUUFBZ0I7UUFDL0YsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0IsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDYixJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztJQUN2QixDQUFDO0lBRUcsTUFBTTtRQUNaLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN2QixDQUFDO0lBQUEsQ0FBQztDQUNGO0FBbEJELGtEQWtCQztBQUVEOzs7R0FHRztBQUNILE1BQWEsYUFBYTtJQU10QixZQUFZLFNBQW9CLEVBQUUsV0FBbUIsRUFBRSxFQUFVLEVBQUUsS0FBZ0I7UUFDL0UsSUFBSSxDQUFDLEVBQUUsR0FBRyxTQUFTLENBQUM7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