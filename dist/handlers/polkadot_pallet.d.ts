import { EventRecord } from '@polkadot/types/interfaces';
import { ChainEmitter, ChainListener, ScCallEvent, TransferEvent, UnfreezeEvent } from '../chain_handler';
/**
 * Polkadot Freezer Pallet Helper
 *
 * Handles [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 *
 * Emits [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 */
export declare class PolkadotHelper implements ChainEmitter<EventRecord, void, TransferEvent | ScCallEvent | UnfreezeEvent>, ChainListener<TransferEvent | UnfreezeEvent | ScCallEvent> {
    private readonly api;
    private readonly alice;
    private constructor();
    eventIter(cb: (event: EventRecord) => Promise<void>): Promise<void>;
    /**
     *
     * @param node_uri uri of the local(or remote?) substrate/polkadot node
     * @param freezer_abi ABI of the freezer smart contract
     * @param contract_addr Address of the freezer smart contract
     *
     * WARN: The helper object uses an internal account as a workaround.
     */
    static new: (node_uri: string) => Promise<PolkadotHelper>;
    private subscribe;
    eventHandler(ev: EventRecord): Promise<TransferEvent | ScCallEvent | UnfreezeEvent | undefined>;
    emittedEventHandler(event: TransferEvent | UnfreezeEvent | ScCallEvent): Promise<void>;
    private unfreeze;
    private sccall;
    private send_wrap;
}
