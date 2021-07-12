import { Transaction } from '@elrondnetwork/erdjs';
import { Socket } from 'socket.io-client';
import { ChainEmitter, ChainListener, ScCallEvent, TransferEvent, UnfreezeEvent } from '../chain_handler';
/**
 * Elrond helper
 *
 * Handles [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 *
 * Emits [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 */
export declare class ElrondHelper implements ChainListener<TransferEvent | ScCallEvent | UnfreezeEvent>, ChainEmitter<string, void, TransferEvent | UnfreezeEvent | ScCallEvent> {
    private readonly provider;
    private readonly sender;
    private readonly signer;
    private readonly mintContract;
    private readonly eventSocket;
    private constructor();
    eventIter(cb: (event: string) => Promise<void>): Promise<void>;
    /**
     *
     * @param node_uri uri of the local(or remote?) elrond node
     * @param secret_key String containing the pem content of validator's private key
     * @param sender Bech32 Address of the validator
     * @param minter Bech32 Address of the elrond-mint smart contract
     * @param socket uri of the elrond-event-middleware socket
     */
    static new: (node_uri: string, secret_key: string, minter: string, socket: Socket) => Promise<ElrondHelper>;
    eventHandler(id: string): Promise<TransferEvent | ScCallEvent | UnfreezeEvent | undefined>;
    emittedEventHandler(event: TransferEvent | ScCallEvent | UnfreezeEvent): Promise<void>;
    private unfreezeVerify;
    private transferMintVerify;
    private eventDecoder;
    scCallVerify({ action_id, to, value, endpoint, args, }: ScCallEvent): Promise<Transaction>;
}
