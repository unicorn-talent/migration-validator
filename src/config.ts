const config = {
    tx_port: 3001,
    // Substrate Node Uri
    xnode: 'ws://localhost:9944',
    // Elrond Node Proxy Uri
    elrond_node: 'https://devnet-api.elrond.com',
    // Private Key File
    private_key:
        '../XP.network-Elrond-Migration/erd1yflgh7duhhvpkqkqqjrcnz7j6pqnhy8kepglkk6k8h8dfu3as3ysdcxan8.pem',
    // Elrond minter contract address
    elrond_minter:
        'erd1qqqqqqqqqqqqqpgqfy5zmm64avweyq3rcw65xczwkwedfz5zs3ysmja8la',
    // Workaround Elrond Event websocket
    elrond_ev_socket: 'ws://localhost:3000',
    heco_node: "http://localhost:8545",
    heco_pkey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    heco_minter: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
};

export default config
