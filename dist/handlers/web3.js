"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web3Helper = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const ethers_1 = require("ethers");
const chain_handler_1 = require("../chain_handler");
const encoding_1 = require("../encoding");
class Web3Helper {
    constructor(mintContract, chainNonce) {
        this.eventHandler = async (ev) => ev;
        this.mintContract = mintContract;
        this.chainNonce = chainNonce;
    }
    async eventIter(cb) {
        this.mintContract.on('Unfreeze', async (action_id, chain_nonce, to, value) => {
            const ev = new chain_handler_1.UnfreezeEvent(new bignumber_js_1.default(action_id.toString()), chain_nonce.toNumber(), to, new bignumber_js_1.default(value.toString()));
            await cb(ev);
        });
        this.mintContract.on('Transfer', async (action_id, chain_nonce, to, value) => {
            const ev = new chain_handler_1.TransferEvent(new bignumber_js_1.default(action_id.toString()), chain_nonce.toNumber(), to, new bignumber_js_1.default(value.toString()));
            await cb(ev);
        });
        this.mintContract.on('UnfreezeNft', async (action_id, to, data) => {
            const prot = encoding_1.NftPacked.deserializeBinary(Buffer.from(data, 'base64'));
            const ev = new chain_handler_1.UnfreezeUniqueEvent(new bignumber_js_1.default(action_id.toString()), prot.getChainNonce(), to, prot.getData_asU8());
            await cb(ev);
        });
        this.mintContract.on('TransferErc721', async (action_id, chain_nonce, to, id, contract_addr) => {
            const prot = new encoding_1.NftEthNative();
            prot.setId(id.toString());
            prot.setNftKind(encoding_1.NftEthNative.NftKind.ERC721);
            prot.setContractAddr(contract_addr);
            const ev = new chain_handler_1.TransferUniqueEvent(new bignumber_js_1.default(action_id.toString()), chain_nonce.toNumber(), to, prot.serializeBinary());
            await cb(ev);
        });
        this.mintContract.on('TransferErc1155', async (action_id, chain_nonce, to, id, contract_addr) => {
            const prot = new encoding_1.NftEthNative();
            prot.setId(id.toString());
            prot.setNftKind(encoding_1.NftEthNative.NftKind.ERC1155);
            prot.setContractAddr(contract_addr);
            const ev = new chain_handler_1.TransferUniqueEvent(new bignumber_js_1.default(action_id.toString()), chain_nonce.toNumber(), to, prot.serializeBinary());
            await cb(ev);
        });
    }
    async emittedEventHandler(event, origin_nonce) {
        let kind;
        let action;
        let tx;
        if (event instanceof chain_handler_1.TransferEvent) {
            action = event.action_id.toString();
            tx = await this.mintContract.validate_transfer(action, origin_nonce, event.to, event.value.toString());
            kind = "transfer";
        }
        else if (event instanceof chain_handler_1.UnfreezeEvent) {
            action = event.id.toString();
            tx = await this.mintContract.validate_unfreeze(action, event.to, event.value.toString());
            kind = "unfreeze";
        }
        else if (event instanceof chain_handler_1.TransferUniqueEvent) {
            action = event.action_id.toString();
            const encoded = new encoding_1.NftPacked();
            encoded.setChainNonce(origin_nonce);
            encoded.setData(event.id);
            const buf = Buffer.from(encoded.serializeBinary());
            console.log("data", buf.toString('base64'));
            tx = await this.mintContract.validate_transfer_nft(action, event.to, buf.toString('base64'));
            kind = "transfer_nft";
        }
        else if (event instanceof chain_handler_1.UnfreezeUniqueEvent) {
            action = event.id.toString();
            const encoded = encoding_1.NftEthNative.deserializeBinary(event.nft_id);
            switch (encoded.getNftKind()) {
                case encoding_1.NftEthNative.NftKind.ERC1155: {
                    console.log("event", event.to);
                    console.log("id", encoded.getId());
                    console.log("contract addr", encoded.getContractAddr());
                    tx = await this.mintContract.validate_unfreeze_erc1155(action, event.to, ethers_1.BigNumber.from(encoded.getId()), encoded.getContractAddr());
                    break;
                }
                case encoding_1.NftEthNative.NftKind.ERC721: {
                    tx = await this.mintContract.validate_unfreeze_erc721(action, event.to, ethers_1.BigNumber.from(encoded.getId()), encoded.getContractAddr());
                    break;
                }
            }
            kind = "unfreeze_nft";
        }
        else {
            throw Error("Unsupported event!");
        }
        await tx.wait();
        console.log(`web3 ${kind} action_id: ${action}, tx: ${tx.hash} executed`);
        return tx.hash;
    }
}
exports.Web3Helper = Web3Helper;
Web3Helper.new = async function (provider_uri, pkey, minter, minterAbi, chainNonce, networkOpts) {
    const w3 = new ethers_1.providers.JsonRpcProvider(provider_uri, networkOpts);
    await w3.ready;
    const acc = (new ethers_1.Wallet(pkey)).connect(w3);
    const mint = new ethers_1.Contract(minter, minterAbi, acc);
    return new Web3Helper(mint, chainNonce);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViMy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9oYW5kbGVycy93ZWIzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBLGdFQUFxQztBQUNyQyxtQ0FBeUU7QUFFekUsb0RBQXdKO0FBQ3hKLDBDQUFvRDtBQUtwRCxNQUFhLFVBQVU7SUFRbkIsWUFBb0IsWUFBc0IsRUFBRSxVQUFrQjtRQStFMUQsaUJBQVksR0FBRyxLQUFLLEVBQUUsRUFBZ0IsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO1FBOUU5QyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztRQUN2QyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztJQUMzQixDQUFDO0lBV0osS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUE0QztRQUMzRCxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFNBQWdCLEVBQUUsV0FBa0IsRUFBRSxFQUFVLEVBQUUsS0FBWSxFQUFFLEVBQUU7WUFDekcsTUFBTSxFQUFFLEdBQUcsSUFBSSw2QkFBYSxDQUMzQixJQUFJLHNCQUFTLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQ25DLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFDdEIsRUFBRSxFQUNGLElBQUksc0JBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FDL0IsQ0FBQztZQUNGLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFNBQWdCLEVBQUUsV0FBa0IsRUFBRSxFQUFVLEVBQUUsS0FBWSxFQUFFLEVBQUU7WUFDekcsTUFBTSxFQUFFLEdBQUcsSUFBSSw2QkFBYSxDQUMzQixJQUFJLHNCQUFTLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVB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