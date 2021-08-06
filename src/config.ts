const config = {
    tx_port: 3001,
    // Substrate Node Uri
    xnode: 'ws://localhost:9943',
    // Elrond Node Proxy Uri
    elrond_node: 'https://devnet-api.elrond.com',
    // Private Key File
    private_key:
        './erd1yflgh7duhhvpkqkqqjrcnz7j6pqnhy8kepglkk6k8h8dfu3as3ysdcxan8.pem',
    // Elrond minter contract address
    elrond_minter:
        'erd1qqqqqqqqqqqqqpgq7ysztrj922cs53e5wh2vdmeds9pd69wms3ysy3tyy9',
    // Substrate Freezer Contract address
    xp_freezer: '5EzHKhoRojLTuKEetgqY7TNDTNFUeLD9cU8si2xVVGLAnbcj',
    // Workaround Elrond Event websocket
    elrond_ev_socket: 'ws://localhost:3000',
        heco_node: "https://http-testnet.hecochain.com",
        heco_pkey: "0xb43ddd27cfb99201cb94c11cf5982c9c04582dfd2b64f656cc01bbf96eec0cf6",
        heco_minter: "0x58c84A7d3B3b019A24Faf578E82aC6B642441931",
};

export default config
