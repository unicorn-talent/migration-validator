const config = {
    tx_port: 3001,
    // Substrate Node Uri
    xnode: 'ws://localhost:9944',
    // Elrond Node Proxy Uri
    elrond_node: 'http://localhost:7950',
    // Private Key File
    private_key:
        '../XP.network-Elrond-Migration/elrond-mint-contract/wallets/users/alice.pem',
    // Elrond minter contract address
    elrond_minter:
        'erd1qqqqqqqqqqqqqpgqcpnh6s5wl0aqg78vy2avkhkzvstyc62ed8ss9lk4l3',
    // Substrate Freezer Contract address
    xp_freezer: '5EzHKhoRojLTuKEetgqY7TNDTNFUeLD9cU8si2xVVGLAnbcj',
    // Workaround Elrond Event websocket
    elrond_ev_socket: 'ws://localhost:3000',
    heco_node: "http://localhost:8545",
    heco_pkey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    heco_minter: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
};

export default config
