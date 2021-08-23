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
        'erd1qqqqqqqqqqqqqpgq3m3nkcahd94c0wcp86nu2pnen7pjs0e5s3ysj5czvv',
    // Workaround Elrond Event websocket
    elrond_ev_socket: 'ws://localhost:3000',
	web3: [
		{
			node: "https://http-testnet.hecochain.com",
			pkey: "0xb43ddd27cfb99201cb94c11cf5982c9c04582dfd2b64f656cc01bbf96eec0cf6",
			minter: "0x9d9061EE73832C016BF74282AD63D0F4DC784d9d",
			nonce: 0x3
		},
		{
			node: "https://data-seed-prebsc-2-s1.binance.org:8545",
			pkey: "0xb43ddd27cfb99201cb94c11cf5982c9c04582dfd2b64f656cc01bbf96eec0cf6",
			minter: "0x158D8366a2dfFEdCaC1e1B3ACDcC59a9941dd625",
			nonce: 0x4
		},
		{
			node: "https://ropsten.infura.io/v3/182b3d3fb2d14d5fbe7421348624d1ce",
			pkey: "0xb43ddd27cfb99201cb94c11cf5982c9c04582dfd2b64f656cc01bbf96eec0cf6",
			minter: "0x57Fd7b0F4b2174B1B7B54D657226c3a6C5F49236",
			nonce: 0x5
		}
	]
};

export default config
