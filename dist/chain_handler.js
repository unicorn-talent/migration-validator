"use strict";
/**
 * terms used:
 * `source blockchain`: The blockchain with native tokens
 * `target blockchain`: The blockchain with wrapped tokens
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvents = exports.ScCallEvent = exports.UnfreezeUniqueEvent = exports.UnfreezeEvent = exports.TransferUniqueEvent = exports.TransferEvent = void 0;
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
class TransferUniqueEvent {
    constructor(action_id, to, id) {
        this.action_id = action_id;
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
    constructor(action_id, to, value) {
        this.id = action_id;
        this.to = to;
        this.value = value;
    }
}
exports.UnfreezeEvent = UnfreezeEvent;
class UnfreezeUniqueEvent {
    constructor(action_id, to, id) {
        this.id = action_id;
        this.to = to;
        this.nft_id = id;
    }
}
exports.UnfreezeUniqueEvent = UnfreezeUniqueEvent;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhaW5faGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jaGFpbl9oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7OztHQUlHOzs7QUFJSDs7Ozs7R0FLRztBQUNILE1BQWEsYUFBYTtJQUt0QixZQUFZLFNBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQWdCO1FBQzFELElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDdkIsQ0FBQztDQUNKO0FBVkQsc0NBVUM7QUFFRCxNQUFhLG1CQUFtQjtJQUs1QixZQUFZLFNBQW9CLEVBQUUsRUFBVSxFQUFFLEVBQWM7UUFDeEQsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDYixJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztJQUNqQixDQUFDO0NBQ0o7QUFWRCxrREFVQztBQUVEOzs7R0FHRztBQUNILE1BQWEsYUFBYTtJQUt0QixZQUFZLFNBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQWdCO1FBQzFELElBQUksQ0FBQyxFQUFFLEdBQUcsU0FBUyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDdkIsQ0FBQztDQUNKO0FBVkQsc0NBVUM7QUFFRCxNQUFhLG1CQUFtQjtJQUs1QixZQUFZLFNBQW9CLEVBQUUsRUFBVSxFQUFFLEVBQWM7UUFDeEQsSUFBSSxDQUFDLEVBQUUsR0FBRyxTQUFTLENBQUM7UUFDcEIsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDYixJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztJQUNyQixDQUFDO0NBQ0o7QUFWRCxrREFVQztBQUVEOztHQUVHO0FBQ0gsTUFBYSxXQUFXO0lBT3BCLFlBQ0ksU0FBb0IsRUFDcEIsRUFBVSxFQUNWLEtBQWdCLEVBQ2hCLFFBQWdCLEVBQ2hCLElBQWU7UUFFZixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNiLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ3JCLENBQUM7Q0FDSjtBQXBCRCxrQ0FvQkM7QUF5QkQ7Ozs7R0FJRztBQUNJLEtBQUssVUFBVSxVQUFVLENBQzVCLE9BQTRDLEVBQzVDLFFBQWlDO0lBRWpDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO1FBQzlCLElBQUksS0FBSyxJQUFJLFNBQVMsRUFBRTtZQUNwQixPQUFPO1NBQ1Y7UUFDRCxNQUFNLEVBQUUsR0FBRyxNQUFNLE9BQU8sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0MsRUFBRSxLQUFLLFNBQVMsSUFBSSxDQUFDLE1BQU0sUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDakUsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBWEQsZ0NBV0MifQ==