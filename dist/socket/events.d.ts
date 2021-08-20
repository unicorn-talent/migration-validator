export declare type ServerEvents = {
    readonly "tx_executed_event": (chain: number, action_id: string, hash: string) => void;
};
