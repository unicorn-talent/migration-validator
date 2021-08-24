const config = {
    tx_port: 3001,
    // Substrate Node Uri
    xnode: 'ws://localhost:9944',
    // Elrond Node Proxy Uri
    elrond_node: 'https://devnet-api.elrond.com',
	// db rest api
	db_rest: "http://localhost:5000",
    // Private Key File
    private_key:
        './validator2.pem',
    // Elrond minter contract address
    elrond_minter:
        'erd1qqqqqqqqqqqqqpgqxs3kxkru32g48meneg0279sw3cexjnyrk4asc5ywxt',
    // Workaround Elrond Event websocket
    elrond_ev_socket: 'ws://localhost:3000',
	web3: [
		{
			node: "https://http-testnet.hecochain.com",
			pkey: "0xb43ddd27cfb99201cb94c11cf5982c9c04582dfd2b64f656cc01bbf96eec0cf6",
			minter: "0x9d9061EE73832C016BF74282AD63D0F4DC784d9d",
			erc1155: "0xfEBb57AA40bE02649B374B5B091Ccd8d53Fe24A5",
			chain_ident: "HECO",
			nonce: 0x3
		},
		{
			node: "https://data-seed-prebsc-1-s2.binance.org:8545",
			pkey: "0x5dca57fe4b6ed2572052efa01b37cc7e20ec1eee3dc3088ca0f5ebb59f875756",
			minter: "0x1D6D4c33b58317Ca09A900737b6c24D2e1d1aBe6",
			erc1155: "0x18AB7860b10c648630FC6DE2CBC67ca999297F96",
			chain_ident: "BSC",
			nonce: 0x4
		},
		{
			node: "https://eth-ropsten.alchemyapi.io/v2/-x2YuopIsMFeUO2uF_FHPG73-2xk-60x",
			pkey: "0xb43ddd27cfb99201cb94c11cf5982c9c04582dfd2b64f656cc01bbf96eec0cf6",
			minter: "0x57Fd7b0F4b2174B1B7B54D657226c3a6C5F49236",
			erc1155: "0x0218B563Ee50d16b12C7CF95B9F207B69e2ED345",
			chain_ident: "Ropsten",
			nonce: 0x5
		}
	]
};

export default config
