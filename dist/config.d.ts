declare const config: {
    tx_port: number;
    xnode: string;
    elrond_node: string;
    db_rest: string;
    private_key: string;
    elrond_minter: string;
    elrond_ev_socket: string;
    web3: {
        node: string;
        pkey: string;
        minter: string;
        erc1155: string;
        chain_ident: string;
        nonce: number;
    }[];
};
export default config;
