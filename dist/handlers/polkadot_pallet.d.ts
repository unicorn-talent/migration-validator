import { KeyringPair } from '@polkadot/keyring/types';
import { EventRecord } from '@polkadot/types/interfaces';
import { ChainEmitter, ChainListener, ScCallEvent, TransferEvent, TransferUniqueEvent, UnfreezeEvent, UnfreezeUniqueEvent } from '../chain_handler';
/**
 * Polkadot Freezer Pallet Helper
 *
 * Handles [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 *
 * Emits [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 */
export declare class PolkadotPalletHelper implements ChainEmitter<EventRecord, void, TransferEvent | TransferUniqueEvent | ScCallEvent | UnfreezeEvent | UnfreezeUniqueEvent>, ChainListener<TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent | ScCallEvent> {
    private readonly api;
    private readonly signer;
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
    static new: (node_uri: string, signer: KeyringPair) => Promise<PolkadotPalletHelper>;
    eventHandler(ev: EventRecord): Promise<TransferEvent | TransferUniqueEvent | ScCallEvent | UnfreezeEvent | UnfreezeUniqueEvent | undefined>;
    emittedEventHandler(event: TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent | ScCallEvent): Promise<void>;
    private unfreeze;
    private sccall;
    private unfreeze_nft;
    private send_wrap;
    private send_wrap_nft;
}
