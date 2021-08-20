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
    constructor(action_id, chain_nonce, to, id) {
        this.action_id = action_id;
        this.chain_nonce = chain_nonce;
        this.to = to;
        this.id = id;
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
async function emitEvents(io, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
chains) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = {};
    const handleEvent = async (listener, event, origin_nonce) => {
        const tx = await listener.emittedEventHandler(event, origin_nonce);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhaW5faGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jaGFpbl9oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7OztHQUlHOzs7QUFLSDs7Ozs7R0FLRztBQUNILE1BQWEsYUFBYTtJQU10QixZQUFZLFNBQW9CLEVBQUUsV0FBbUIsRUFBRSxFQUFVLEVBQUUsS0FBZ0I7UUFDL0UsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0IsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDYixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUN2QixDQUFDO0lBRUcsTUFBTTtRQUNaLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUN0QixDQUFDO0lBQUEsQ0FBQztDQUNGO0FBaEJELHNDQWdCQztBQUVELE1BQWEsbUJBQW1CO0lBTTVCLFlBQVksU0FBb0IsRUFBRSxXQUFtQixFQUFFLEVBQVUsRUFBRSxFQUFjO1FBQzdFLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQy9CLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7SUFDakIsQ0FBQztJQUVHLE1BQU07UUFDWixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7SUFDdkIsQ0FBQztJQUFBLENBQUM7Q0FDRjtBQWhCRCxrREFnQkM7QUFFRDs7O0dBR0c7QUFDSCxNQUFhLGFBQWE7SUFNdEIsWUFBWSxTQUFvQixFQUFFLFdBQW1CLEVBQUUsRUFBVSxFQUFFLEtBQWdCO1FBQy9FLElBQUksQ0FBQyxFQUFFLEdBQUcsU0FBUyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQy9CLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDdkIsQ0FBQztJQUVHLE1BQU07UUFDWixPQUFPLElBQUksQ0FBQyxFQUFFLENBQUE7SUFDZixDQUFDO0lBQUEsQ0FBQztDQUNGO0FBaEJELHNDQWdCQztBQUVELE1BQWEsbUJBQW1CO0lBTTVCLFlBQVksU0FBb0IsRUFBRSxXQUFtQixFQUFFLEVBQVUsRUFBRSxFQUFjO1FBQzdFLElBQUksQ0FBQyxFQUFFLEdBQUcsU0FBUyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQy9CLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7SUFDckIsQ0FBQztJQUVHLE1BQU07UUFDWixPQUFPLElBQUksQ0FBQyxFQUFFLENBQUE7SUFDZixDQUFDO0lBQUEsQ0FBQztDQUNGO0FBaEJELGtEQWdCQztBQTBDRDs7OztHQUlHO0FBQ0ksS0FBSyxVQUFVLFVBQVUsQ0FDNUIsRUFBa0I7QUFDbEIsOERBQThEO0FBQzlELE1BQXdEO0lBRXhELDhEQUE4RDtJQUM5RCxNQUFNLEdBQUcsR0FBNkMsRUFBRSxDQUFDO0lBRXpELE1BQU0sV0FBVyxHQUFHLEtBQUssRUFBRSxRQUErRCxFQUFFLEtBQWUsRUFBRSxZQUFvQixFQUFFLEVBQUU7UUFDakksTUFBTSxFQUFFLEdBQUcsTUFBTSxRQUFRLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3pFLEVBQUUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDekYsQ0FBQyxDQUFBO0lBRUQsOERBQThEO0lBQzlELE1BQU0sWUFBWSxHQUFHLENBQUMsT0FBMkQsRUFBRSxFQUFFO1FBQ2pGLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQzlCLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRTtnQkFDckIsT0FBTzthQUNWO1lBQ0QsTUFBTSxFQUFFLEdBQUcsTUFBTSxPQUFPLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzdDLElBQUksRUFBRSxLQUFLLFNBQVMsRUFBRTtnQkFDbEIsT0FBTzthQUNWO1lBRUQsSUFBSSxFQUFFLENBQUMsV0FBVyxLQUFLLE9BQU8sQ0FBQyxVQUFVLEVBQUU7Z0JBQ3ZDLE1BQU0sS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQywyQkFBMkI7YUFDdEU7WUFFRCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ25DLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRTtnQkFDdEIsTUFBTSxLQUFLLENBQUMsNEJBQTRCLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsMkJBQTJCO2FBQ3pGO1lBQ0QsV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2hELENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFBO0lBRUQsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7UUFDeEIsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLFNBQVMsRUFBRTtZQUNyQyxNQUFNLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1NBQ3hDO1FBQ0QsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDOUIsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ3ZCO0FBQ0wsQ0FBQztBQTNDRCxnQ0EyQ0MifQ==