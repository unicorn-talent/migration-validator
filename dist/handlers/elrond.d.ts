import { Transaction } from '@elrondnetwork/erdjs';
import { Socket } from 'socket.io-client';
import { ChainEmitter, ChainListener, ScCallEvent, TransferEvent, TransferUniqueEvent, UnfreezeEvent, UnfreezeUniqueEvent } from '../chain_handler';
/**
 * Elrond helper
 *
 * Handles [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 *
 * Emits [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 */
export declare class ElrondHelper implements ChainListener<TransferEvent | TransferUniqueEvent | ScCallEvent | UnfreezeEvent | UnfreezeUniqueEvent>, ChainEmitter<string, void, TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent | ScCallEvent> {
    private readonly provider;
    private readonly sender;
    private readonly signer;
    private readonly mintContract;
    private readonly eventSocket;
    private readonly codec;
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
    eventHandler(id: string): Promise<TransferEvent | TransferUniqueEvent | ScCallEvent | UnfreezeUniqueEvent | UnfreezeEvent | undefined>;
    emittedEventHandler(event: TransferEvent | TransferUniqueEvent | ScCallEvent | UnfreezeEvent | UnfreezeUniqueEvent): Promise<void>;
    private unfreezeVerify;
    private unfreezeNftVerify;
    private transferNftVerify;
    private transferMintVerify;
    private eventDecoder;
    scCallVerify({ action_id, to, value, endpoint, args, }: ScCallEvent): Promise<Transaction>;
}
