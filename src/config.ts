const config = {
    tx_port: 3001,
    // Substrate Node Uri
    xnode: 'ws://localhost:9944',
    // Elrond Node Proxy Uri
    elrond_node: 'https://devnet-api.elrond.com',
    // Private Key File
    private_key:
        './validator2.pem',
    // Elrond minter contract address
    elrond_minter:
        'erd1qqqqqqqqqqqqqpgquvs7p7lj2th4rge03rfpa8trlthwekd4k4as966la8',
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
			node: "https://data-seed-prebsc-1-s2.binance.org:8545",
			pkey: "0x5dca57fe4b6ed2572052efa01b37cc7e20ec1eee3dc3088ca0f5ebb59f875756",
			minter: "0x1D6D4c33b58317Ca09A900737b6c24D2e1d1aBe6",
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
