import { EventRecord } from '@polkadot/types/interfaces';
import { ChainEmitter, ChainListener, ScCallEvent, TransferEvent, UnfreezeEvent } from '../chain_handler';
import { ConcreteJson } from '../types';
export declare class PolkadotHelper implements ChainEmitter<EventRecord, void, TransferEvent | ScCallEvent | UnfreezeEvent>, ChainListener<TransferEvent | UnfreezeEvent | ScCallEvent> {
    private readonly api;
    private readonly freezer;
    private readonly alice;
    private constructor();
    eventIter(cb: (event: EventRecord) => Promise<void>): Promise<void>;
    static new: (node_uri: string, freezer_abi: ConcreteJson, contract_addr: string) => Promise<PolkadotHelper>;
    private subscribe;
    eventHandler(ev: EventRecord): Promise<TransferEvent | ScCallEvent | UnfreezeEvent | undefined>;
    emittedEventHandler(event: TransferEvent | UnfreezeEvent | ScCallEvent): Promise<void>;
    private unfreeze;
    private sccall;
    private send_wrap;
}
