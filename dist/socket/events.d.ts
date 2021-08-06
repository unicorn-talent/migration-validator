import { TransferUniqueEvent, UnfreezeUniqueEvent } from "../chain_handler";
export declare type ServerEvents = {
    readonly "transfer_nft_event": (chain: string, event: TransferUniqueEvent, hash: string) => void;
    readonly "unfreeze_nft_event": (chain: string, event: UnfreezeUniqueEvent, hash: string) => void;
};
