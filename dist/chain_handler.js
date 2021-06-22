"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvents = exports.ScCallEvent = exports.UnfreezeEvent = exports.TransferEvent = void 0;
class TransferEvent {
    constructor(action_id, to, value) {
        this.action_id = action_id;
        this.to = to;
        this.value = value;
    }
}
exports.TransferEvent = TransferEvent;
class UnfreezeEvent {
    constructor(action_id, to, value) {
        this.id = action_id;
        this.to = to;
        this.value = value;
    }
}
exports.UnfreezeEvent = UnfreezeEvent;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhaW5faGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jaGFpbl9oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLE1BQWEsYUFBYTtJQUt0QixZQUFZLFNBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQWdCO1FBQzFELElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDdkIsQ0FBQztDQUNKO0FBVkQsc0NBVUM7QUFFRCxNQUFhLGFBQWE7SUFLdEIsWUFBWSxTQUFvQixFQUFFLEVBQVUsRUFBRSxLQUFnQjtRQUMxRCxJQUFJLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQztRQUNwQixJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNiLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQ3ZCLENBQUM7Q0FDSjtBQVZELHNDQVVDO0FBRUQsTUFBYSxXQUFXO0lBT3BCLFlBQ0ksU0FBb0IsRUFDcEIsRUFBVSxFQUNWLEtBQWdCLEVBQ2hCLFFBQWdCLEVBQ2hCLElBQWU7UUFFZixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNiLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ3JCLENBQUM7Q0FDSjtBQXBCRCxrQ0FvQkM7QUFPTSxLQUFLLFVBQVUsVUFBVSxDQUM1QixPQUE0QyxFQUM1QyxRQUFpQztJQUVqQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtRQUM5QixJQUFJLEtBQUssSUFBSSxTQUFTLEVBQUU7WUFDcEIsT0FBTztTQUNWO1FBQ0QsTUFBTSxFQUFFLEdBQUcsTUFBTSxPQUFPLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdDLEVBQUUsS0FBSyxTQUFTLElBQUksQ0FBQyxNQUFNLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2pFLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQztBQVhELGdDQVdDIn0=