"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web3Helper = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const ethers_1 = require("ethers");
const utils_1 = require("ethers/lib/utils");
const chain_handler_1 = require("../chain_handler");
const encoding_1 = require("../encoding");
const fakeERC721_json_1 = require("../fakeERC721.json");
const fakeERC1155_json_1 = require("../fakeERC1155.json");
const erc1155_abi = new utils_1.Interface(fakeERC1155_json_1.abi);
const erc721_abi = new utils_1.Interface(fakeERC721_json_1.abi);
class Web3Helper {
    constructor(w3, mintContract, erc1155, chainIdent, chainNonce) {
        this.eventHandler = async (ev) => ev;
        this.extractNftUpdateErc1155 = (nft_data, to, receipt) => this.extractNftUpdate(nft_data, to, receipt, erc1155_abi.parseLog.bind(erc1155_abi), "TransferSingle", 3);
        this.extractNftUpdateErc721 = (nft_data, to, receipt) => this.extractNftUpdate(nft_data, to, receipt, erc721_abi.parseLog.bind(erc721_abi), "Transfer", 2);
        this.w3 = w3;
        this.mintContract = mintContract;
        this.chainIdent = chainIdent;
        this.chainNonce = chainNonce;
        this.erc1155 = erc1155;
    }
    async nftUriErc721(contract, token) {
        const erc = new ethers_1.Contract(contract, erc721_abi, this.w3);
        return await erc.tokenURI(token);
    }
    async nftUriErc1155(contract, token) {
        const erc = new ethers_1.Contract(contract, erc1155_abi, this.w3);
        return await erc.uri(token);
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
    extractNftUpdate(nft_data, to, receipt, parser, event, arg_idx) {
        const ev = receipt.logs.map((e) => {
            try {
                return parser(e);
            }
            catch (_) {
                return undefined;
            }
        }).find((e) => e && e.name === event);
        const id = ev.args[arg_idx].toString();
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
            dat = this.extractNftUpdateErc1155(event.nft_data, event.to, receipt);
            kind = "transfer_nft";
        }
        else if (event instanceof chain_handler_1.UnfreezeUniqueEvent) {
            action = event.id.toString();
            const encoded = encoding_1.NftEthNative.deserializeBinary(event.nft_id);
            let extractor;
            let nft_data;
            switch (encoded.getNftKind()) {
                case encoding_1.NftEthNative.NftKind.ERC1155: {
                    console.log("event", event.to);
                    console.log("id", encoded.getId());
                    console.log("contract addr", encoded.getContractAddr());
                    nft_data = await this.nftUriErc1155(encoded.getContractAddr(), ethers_1.BigNumber.from(encoded.getId()));
                    tx = await this.mintContract.validate_unfreeze_erc1155(action, event.to, ethers_1.BigNumber.from(encoded.getId()), encoded.getContractAddr());
                    extractor = this.extractNftUpdateErc1155.bind(this);
                    break;
                }
                case encoding_1.NftEthNative.NftKind.ERC721: {
                    nft_data = await this.nftUriErc721(encoded.getContractAddr(), ethers_1.BigNumber.from(encoded.getId()));
                    tx = await this.mintContract.validate_unfreeze_erc721(action, event.to, ethers_1.BigNumber.from(encoded.getId()), encoded.getContractAddr());
                    extractor = this.extractNftUpdateErc721.bind(this);
                    break;
                }
            }
            const receipt = await tx.wait();
            dat = extractor(nft_data, event.to, receipt);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViMy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9oYW5kbGVycy93ZWIzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBLGdFQUFxQztBQUNyQyxtQ0FBeUU7QUFFekUsNENBQTZEO0FBQzdELG9EQUFtSztBQUNuSywwQ0FBb0Q7QUFDcEQsd0RBQXVEO0FBQ3ZELDBEQUF5RDtBQUt6RCxNQUFNLFdBQVcsR0FBRyxJQUFJLGlCQUFTLENBQUMsc0JBQVcsQ0FBQyxDQUFDO0FBQy9DLE1BQU0sVUFBVSxHQUFHLElBQUksaUJBQVMsQ0FBQyxxQkFBVSxDQUFDLENBQUM7QUFFN0MsTUFBYSxVQUFVO0lBV25CLFlBQW9CLEVBQVksRUFBRSxZQUFzQixFQUFFLE9BQWUsRUFBRSxVQUFrQixFQUFFLFVBQWtCO1FBOEY3RyxpQkFBWSxHQUFHLEtBQUssRUFBRSxFQUFnQixFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFlN0MsNEJBQXVCLEdBQUcsQ0FBQyxRQUFnQixFQUFFLEVBQVUsRUFBRSxPQUEyQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbk0sMkJBQXNCLEdBQUcsQ0FBQyxRQUFnQixFQUFFLEVBQVUsRUFBRSxPQUEyQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBN0dqTSxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNQLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBQ3ZD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