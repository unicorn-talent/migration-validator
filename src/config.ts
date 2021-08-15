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
        'erd1qqqqqqqqqqqqqpgqe8lzlc2husrrthhyavhcj50kpneqzf9ms3ys4anmfd',
    // Workaround Elrond Event websocket
    elrond_ev_socket: 'ws://localhost:3000',
	web3: [
		{
			node: "https://http-testnet.hecochain.com",
			pkey: "0xb43ddd27cfb99201cb94c11cf5982c9c04582dfd2b64f656cc01bbf96eec0cf6",
			minter: "0xEf5b44491d1da9E30803d666Fb7BdD06141f0b82",
			erc1155: "0x65c823E97d61F5Db30a433612a4AF3CC26aeD4ba",
			nonce: 0x3
		},
		{
			node: "https://data-seed-prebsc-1-s1.binance.org:8545",
			pkey: "0xb43ddd27cfb99201cb94c11cf5982c9c04582dfd2b64f656cc01bbf96eec0cf6",
			minter: "0x471bF01b8C622C00652F336651747B1A5d37b5ea",
			erc1155: "0xaFFA531E294E8e4b6647F993c12216D8CFA90903",
			nonce: 0x4
		},
		{
			node: "https://ropsten.infura.io/v3/182b3d3fb2d14d5fbe7421348624d1ce",
			pkey: "0xb43ddd27cfb99201cb94c11cf5982c9c04582dfd2b64f656cc01bbf96eec0cf6",
			minter: "0x66b07bC16F499a0e835c5b277AF19555a05578c1",
			erc1155: "0x5d9f23f7253Efef3926E934829Ab65C0092E218B",
			nonce: 0x5
		}
	]
};

export default config
