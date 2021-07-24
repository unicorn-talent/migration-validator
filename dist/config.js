"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    // Substrate Node Uri
    xnode: 'ws://localhost:9944',
    // Elrond Node Proxy Uri
    elrond_node: 'http://localhost:7950',
    // Private Key File
    private_key: '../XP.network-Elrond-Migration/elrond-mint-contract/wallets/users/alice.pem',
    // Elrond Address (TODO: Derive from pk automatically)
    elrond_sender: 'erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th',
    // Elrond minter contract address
    elrond_minter: 'erd1qqqqqqqqqqqqqpgqygvvtlty3v7cad507v5z793duw9jjmlxd8sszs8a2y',
    // Substrate Freezer Contract address
    xp_freezer: '5EzHKhoRojLTuKEetgqY7TNDTNFUeLD9cU8si2xVVGLAnbcj',
    // Workaround Elrond Event websocket
    elrond_ev_socket: 'ws://localhost:3000',
    heco_node: "https://http-testnet.hecochain.com",
    heco_pkey: "0xb43ddd27cfb99201cb94c11cf5982c9c04582dfd2b64f656cc01bbf96eec0cf6",
    heco_minter: "0x58c84A7d3B3b019A24Faf578E82aC6B642441931",
};
exports.default = config;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLE1BQU0sTUFBTSxHQUFHO0lBQ1gscUJBQXFCO0lBQ3JCLEtBQUssRUFBRSxxQkFBcUI7SUFDNUIsd0JBQXdCO0lBQ3hCLFdBQVcsRUFBRSx1QkFBdUI7SUFDcEMsbUJBQW1CO0lBQ25CLFdBQVcsRUFDUCw2RUFBNkU7SUFDakYsc0RBQXNEO0lBQ3RELGFBQWEsRUFDVCxnRUFBZ0U7SUFDcEUsaUNBQWlDO0lBQ2pDLGFBQWEsRUFDVCxnRUFBZ0U7SUFDcEUscUNBQXFDO0lBQ3JDLFVBQVUsRUFBRSxrREFBa0Q7SUFDOUQsb0NBQW9DO0lBQ3BDLGdCQUFnQixFQUFFLHFCQUFxQjtJQUMxQyxTQUFTLEVBQUUsb0NBQW9DO0lBQy9DLFNBQVMsRUFBRSxvRUFBb0U7SUFDL0UsV0FBVyxFQUFFLDRDQUE0QztDQUN6RCxDQUFDO0FBRUYsa0JBQWUsTUFBTSxDQUFDIn0=