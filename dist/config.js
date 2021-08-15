"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    tx_port: 3001,
    // Substrate Node Uri
    xnode: 'ws://localhost:9944',
    // Elrond Node Proxy Uri
    elrond_node: 'https://devnet-api.elrond.com',
    // Private Key File
    private_key: '../XP.network-Elrond-Migration/erd1yflgh7duhhvpkqkqqjrcnz7j6pqnhy8kepglkk6k8h8dfu3as3ysdcxan8.pem',
    // Elrond minter contract address
    elrond_minter: 'erd1qqqqqqqqqqqqqpgqe8lzlc2husrrthhyavhcj50kpneqzf9ms3ys4anmfd',
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
exports.default = config;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLE1BQU0sTUFBTSxHQUFHO0lBQ1gsT0FBTyxFQUFFLElBQUk7SUFDYixxQkFBcUI7SUFDckIsS0FBSyxFQUFFLHFCQUFxQjtJQUM1Qix3QkFBd0I7SUFDeEIsV0FBVyxFQUFFLCtCQUErQjtJQUM1QyxtQkFBbUI7SUFDbkIsV0FBVyxFQUNQLG1HQUFtRztJQUN2RyxpQ0FBaUM7SUFDakMsYUFBYSxFQUNULGdFQUFnRTtJQUNwRSxvQ0FBb0M7SUFDcEMsZ0JBQWdCLEVBQUUscUJBQXFCO0lBQzFDLElBQUksRUFBRTtRQUNMO1lBQ0MsSUFBSSxFQUFFLG9DQUFvQztZQUMxQyxJQUFJLEVBQUUsb0VBQW9FO1lBQzFFLE1BQU0sRUFBRSw0Q0FBNEM7WUFDcEQsT0FBTyxFQUFFLDRDQUE0QztZQUNyRCxLQUFLLEVBQUUsR0FBRztTQUNWO1FBQ0Q7WUFDQyxJQUFJLEVBQUUsZ0RBQWdEO1lBQ3RELElBQUksRUFBRSxvRUFBb0U7WUFDMUUsTUFBTSxFQUFFLDRDQUE0QztZQUNwRCxPQUFPLEVBQUUsNENBQTRDO1lBQ3JELEtBQUssRUFBRSxHQUFHO1NBQ1Y7UUFDRDtZQUNDLElBQUksRUFBRSwrREFBK0Q7WUFDckUsSUFBSSxFQUFFLG9FQUFvRTtZQUMxRSxNQUFNLEVBQUUsNENBQTRDO1lBQ3BELE9BQU8sRUFBRSw0Q0FBNEM7WUFDckQsS0FBSyxFQUFFLEdBQUc7U0FDVjtLQUNEO0NBQ0QsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQSJ9