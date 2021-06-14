import { Transaction } from '@elrondnetwork/erdjs';
import { Socket } from 'socket.io-client';
import { ChainEmitter, ChainListener, ScCallEvent, TransferEvent, UnfreezeEvent } from '../chain_handler';
export declare class ElrondHelper implements ChainListener<TransferEvent | ScCallEvent | UnfreezeEvent>, ChainEmitter<string, void, TransferEvent | UnfreezeEvent | ScCallEvent> {
    private readonly provider;
    private readonly sender;
    private readonly signer;
    private readonly mintContract;
    private readonly eventSocket;
    private constructor();
    eventIter(cb: (event: string) => Promise<void>): Promise<void>;
    static new: (node_uri: string, secret_key: string, sender: string, minter: string, socket: Socket) => Promise<ElrondHelper>;
    eventHandler(id: string): Promise<TransferEvent | ScCallEvent | UnfreezeEvent | undefined>;
    emittedEventHandler(event: TransferEvent | ScCallEvent | UnfreezeEvent): Promise<void>;
    private unfreezeVerify;
    private transferMintVerify;
    private eventDecoder;
    scCallVerify({ action_id, to, value, endpoint, args }: ScCallEvent): Promise<Transaction>;
}
