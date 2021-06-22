"use strict";
/**
 * terms used:
 * `source blockchain`: The blockchain with native tokens
 * `target blockchain`: The blockchain with wrapped tokens
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvents = exports.ScCallEvent = exports.UnfreezeEvent = exports.TransferEvent = void 0;
/**
 * An event indicating a cross chain transfer of assets
 * indicates that X tokens were locked in source blockchain
 *
 * @param value number of tokens locked in source blockchain
 */
class TransferEvent {
    constructor(action_id, to, value) {
        this.action_id = action_id;
        this.to = to;
        this.value = value;
    }
}
exports.TransferEvent = TransferEvent;
/**
 * An event indicating wrapped tokens were burnt in the target blockchain
 * indicates that X tokens are ready to be released in the source blockchain
 */
class UnfreezeEvent {
    constructor(action_id, to, value) {
        this.id = action_id;
        this.to = to;
        this.value = value;
    }
}
exports.UnfreezeEvent = UnfreezeEvent;
/**
 * An event indicating a request to call another smart contract in target blockchain
 */
class ScCallEvent {
    constructor(action_id, to, value, endpoint, args) {
        this.action_id = action_id;
        this.to = to;
        this.value = value;
        this.endpoint = endpoint;
        this.args = args;
    }
}
exports.ScCallEvent = ScCallEvent;
/**
 * Start a bridge connection between emitter & listener
 *
 * [listener] should be able to handle all the events [emitter] emits
 */
async function emitEvents(emitter, listener) {
    emitter.eventIter(async (event) => {
        if (event == undefined) {
            return;
        }
        const ev = await emitter.eventHandler(event);
        ev !== undefined && (await listener.emittedEventHandler(ev));
    });
}
exports.emitEvents = emitEvents;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhaW5faGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jaGFpbl9oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7OztHQUlHOzs7QUFJSDs7Ozs7R0FLRztBQUNILE1BQWEsYUFBYTtJQUt0QixZQUFZLFNBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQWdCO1FBQzFELElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDdkIsQ0FBQztDQUNKO0FBVkQsc0NBVUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFhLGFBQWE7SUFLdEIsWUFBWSxTQUFvQixFQUFFLEVBQVUsRUFBRSxLQUFnQjtRQUMxRCxJQUFJLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQztRQUNwQixJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNiLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQ3ZCLENBQUM7Q0FDSjtBQVZELHNDQVVDO0FBRUQ7O0dBRUc7QUFDSCxNQUFhLFdBQVc7SUFPcEIsWUFDSSxTQUFvQixFQUNwQixFQUFVLEVBQ1YsS0FBZ0IsRUFDaEIsUUFBZ0IsRUFDaEIsSUFBZTtRQUVmLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDckIsQ0FBQztDQUNKO0FBcEJELGtDQW9CQztBQXlCRDs7OztHQUlHO0FBQ0ksS0FBSyxVQUFVLFVBQVUsQ0FDNUIsT0FBNEMsRUFDNUMsUUFBaUM7SUFFakMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUU7UUFDOUIsSUFBSSxLQUFLLElBQUksU0FBUyxFQUFFO1lBQ3BCLE9BQU87U0FDVjtRQUNELE1BQU0sRUFBRSxHQUFHLE1BQU0sT0FBTyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxFQUFFLEtBQUssU0FBUyxJQUFJLENBQUMsTUFBTSxRQUFRLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNqRSxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUM7QUFYRCxnQ0FXQyJ9