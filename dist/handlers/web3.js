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
                    tx = await this.mintContract.validate_unfreeze_erc1155(action, event.to, new bignumber_js_1.default(encoded.getId()), encoded.getContractAddr());
                    break;
                }
                case encoding_1.NftEthNative.NftKind.ERC721: {
                    tx = await this.mintContract.validate_unfreeze_erc721(action, event.to, new bignumber_js_1.default(encoded.getId()), encoded.getContractAddr());
                    break;
                }
            }
            kind = "unfreeze_nft";
        }
        else {
            throw Error("Unsupported event!");
        }
        await tx.wait();
        console.log(`web3 ${kind} action_id: ${action}, executed`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViMy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9oYW5kbGVycy93ZWIzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBLGdFQUFxQztBQUNyQyxtQ0FBeUU7QUFFekUsb0RBQXdKO0FBQ3hKLDBDQUFvRDtBQUtwRCxNQUFhLFVBQVU7SUFRbkIsWUFBb0IsWUFBc0IsRUFBRSxVQUFrQjtRQStFMUQsaUJBQVksR0FBRyxLQUFLLEVBQUUsRUFBZ0IsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO1FBOUU5QyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztRQUN2QyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztJQUMzQixDQUFDO0lBV0osS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUE0QztRQUMzRCxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFNBQWdCLEVBQUUsV0FBa0IsRUFBRSxFQUFVLEVBQUUsS0FBWSxFQUFFLEVBQUU7WUFDekcsTUFBTSxFQUFFLEdBQUcsSUFBSSw2QkFBYSxDQUMzQixJQUFJLHNCQUFTLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQ25DLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFDdEIsRUFBRSxFQUNGLElBQUksc0JBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FDL0IsQ0FBQztZQUNGLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFNBQWdCLEVBQUUsV0FBa0IsRUFBRSxFQUFVLEVBQUUsS0FBZ0IsRUFBRSxFQUFFO1lBQzdHLE1BQU0sRUFBRSxHQUFHLElBQUksNkJBQWEsQ0FDM0IsSUFBSSxzQkFBUyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxF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