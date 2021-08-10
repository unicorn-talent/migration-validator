export type ServerEvents = {
    readonly "transfer_nft_event": (chain: number, action_id: string, hash: string) => void;
    readonly "unfreeze_nft_event": (chain: number, action_id: string, hash: string) => void;
};
