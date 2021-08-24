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
const fakeERC721_json_1 = require("../fakeERC721.json");
const fakeERC1155_json_1 = require("../fakeERC1155.json");
class Web3Helper {
    constructor(w3, mintContract, erc1155, chainIdent, chainNonce) {
        this.eventHandler = async (ev) => ev;
        this.w3 = w3;
        this.mintContract = mintContract;
        this.chainIdent = chainIdent;
        this.chainNonce = chainNonce;
        this.erc1155 = erc1155;
    }
    async nftUriErc721(contract, token) {
        const erc = new ethers_1.Contract(contract, fakeERC721_json_1.abi, this.w3);
        return await erc.tokenURI(token);
    }
    async nftUriErc1155(contract, token) {
        const erc = new ethers_1.Contract(contract, fakeERC1155_json_1.abi, this.w3);
        return await erc.tokenURI(token);
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
            const ev = new chain_handler_1.TransferUniqueEvent(new bignumber_js_1.default(action_id.toString()), chain_nonce.toNumber(), to, prot.serializeBinary(), await this.nftUriErc721(contract_addr, id));
            await cb(ev);
        });
        this.mintContract.on('TransferErc1155', async (action_id, chain_nonce, to, id, contract_addr) => {
            const prot = new encoding_1.NftEthNative();
            prot.setId(id.toString());
            prot.setNftKind(encoding_1.NftEthNative.NftKind.ERC1155);
            prot.setContractAddr(contract_addr);
            const ev = new chain_handler_1.TransferUniqueEvent(new bignumber_js_1.default(action_id.toString()), chain_nonce.toNumber(), to, prot.serializeBinary(), await this.nftUriErc1155(contract_addr, id));
            await cb(ev);
        });
    }
    extractNftUpdate(nft_data, to, receipt) {
        const ev = receipt.events.find((e) => e.event === 'TransferSingle');
        const id = ev.args[3].toString();
        return { id: nft_data, data: `${this.erc1155},${to},${id}` };
    }
    async emittedEventHandler(event, origin_nonce) {
        let kind;
        let action;
        let tx;
        let dat = undefined;
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
            const receipt = await tx.wait();
            dat = this.extractNftUpdate(event.nft_data, event.to, receipt);
            kind = "transfer_nft";
        }
        else if (event instanceof chain_handler_1.UnfreezeUniqueEvent) {
            action = event.id.toString();
            const encoded = encoding_1.NftEthNative.deserializeBinary(event.nft_id);
            let nft_data;
            switch (encoded.getNftKind()) {
                case encoding_1.NftEthNative.NftKind.ERC1155: {
                    console.log("event", event.to);
                    console.log("id", encoded.getId());
                    console.log("contract addr", encoded.getContractAddr());
                    nft_data = await this.nftUriErc1155(encoded.getContractAddr(), ethers_1.BigNumber.from(encoded.getId()));
                    tx = await this.mintContract.validate_unfreeze_erc1155(action, event.to, ethers_1.BigNumber.from(encoded.getId()), encoded.getContractAddr());
                    break;
                }
                case encoding_1.NftEthNative.NftKind.ERC721: {
                    nft_data = await this.nftUriErc721(encoded.getContractAddr(), ethers_1.BigNumber.from(encoded.getId()));
                    tx = await this.mintContract.validate_unfreeze_erc721(action, event.to, ethers_1.BigNumber.from(encoded.getId()), encoded.getContractAddr());
                    break;
                }
            }
            const receipt = await tx.wait();
            dat = this.extractNftUpdate(nft_data, event.to, receipt);
            kind = "unfreeze_nft";
        }
        else {
            throw Error("Unsupported event!");
        }
        await tx.wait();
        console.log(`web3 ${kind} action_id: ${action}, tx: ${tx.hash} executed`);
        return [tx.hash, dat];
    }
}
exports.Web3Helper = Web3Helper;
Web3Helper.new = async function (provider_uri, pkey, minter, minterAbi, erc1155, chainIdent, chainNonce, networkOpts) {
    const w3 = new ethers_1.providers.JsonRpcProvider(provider_uri, networkOpts);
    await w3.ready;
    const acc = (new ethers_1.Wallet(pkey)).connect(w3);
    const mint = new ethers_1.Contract(minter, minterAbi, acc);
    return new Web3Helper(w3, mint, erc1155, chainIdent, chainNonce);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViMy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9oYW5kbGVycy93ZWIzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBLGdFQUFxQztBQUNyQyxtQ0FBeUU7QUFHekUsb0RBQW1LO0FBQ25LLDBDQUFvRDtBQUNwRCx3REFBdUQ7QUFDdkQsMERBQXlEO0FBS3pELE1BQWEsVUFBVTtJQVduQixZQUFvQixFQUFZLEVBQUUsWUFBc0IsRUFBRSxPQUFlLEVBQUUsVUFBa0IsRUFBRSxVQUFrQjtRQThGN0csaUJBQVksR0FBRyxLQUFLLEVBQUUsRUFBZ0IsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO1FBN0ZwRCxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNQLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQzdCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQzdCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQ3JCLENBQUM7SUFXSSxLQUFLLENBQUMsWUFBWSxDQUFDLFFBQWdCLEVBQUUsS0FBWTtRQUN4RCxNQUFNLEdBQUcsR0FBRyxJQUFJLGlCQUFRLENBQUMsUUFBUSxFQUFFLHFCQUFVLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELE9BQU8sTUFBTSxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFTyxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQWdCLEVBQUUsS0FBWTtRQUN6RCxNQUFNLEdBQUcsR0FBRyxJQUFJLGlCQUFRLENBQUMsUUFBUSxFQUFFLHNCQUFXLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELE9BQU8sTUFBTSxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRCxLQUFL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