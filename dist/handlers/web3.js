"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web3Helper = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const ethers_1 = require("ethers");
const chain_handler_1 = require("../chain_handler");
var SolEventT;
(function (SolEventT) {
    SolEventT[SolEventT["Unfreeze"] = 0] = "Unfreeze";
    SolEventT[SolEventT["Transfer"] = 1] = "Transfer";
})(SolEventT || (SolEventT = {}));
class Web3Helper {
    constructor(mintContract, chainNonce) {
        this.mintContract = mintContract;
        this.chainNonce = chainNonce;
    }
    async eventIter(cb) {
        this.mintContract.on('Unfreeze', async (action_id, chain_nonce, to, value) => {
            const ev = { type: SolEventT.Unfreeze, action_id: new bignumber_js_1.default(action_id.toString()), chain_nonce: new bignumber_js_1.default(chain_nonce.toString()), to, value };
            await cb(ev);
        });
        this.mintContract.on('Transfer', async (action_id, chain_nonce, to, value) => {
            const ev = { type: SolEventT.Transfer, action_id: new bignumber_js_1.default(action_id.toString()), chain_nonce: new bignumber_js_1.default(chain_nonce.toString()), to, value };
            await cb(ev);
        });
    }
    async eventHandler(ev) {
        switch (ev.type) {
            case SolEventT.Unfreeze:
                return new chain_handler_1.UnfreezeEvent(ev.action_id, ev.chain_nonce.toNumber(), ev.to, ev.value);
            case SolEventT.Transfer:
                return new chain_handler_1.TransferEvent(ev.action_id, ev.chain_nonce.toNumber(), ev.to, ev.value);
        }
    }
    async emittedEventHandler(event, origin_nonce) {
        let kind;
        let action;
        let tx;
        if (event instanceof chain_handler_1.TransferEvent) {
            action = event.action_id.toString();
            console.log(`target: ${event.to}, value: ${event.value}`);
            tx = await this.mintContract.validate_transfer(action, origin_nonce, event.to, event.value.toString());
            kind = "transfer";
        }
        else if (event instanceof chain_handler_1.UnfreezeEvent) {
            action = event.id.toString();
            tx = await this.mintContract.validate_unfreeze(action, event.to, event.value.toString());
            kind = "unfreeze";
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViMy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9oYW5kbGVycy93ZWIzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBLGdFQUFxQztBQUNyQyxtQ0FBeUU7QUFFekUsb0RBQThHO0FBRTlHLElBQUssU0FHSjtBQUhELFdBQUssU0FBUztJQUNiLGlEQUFRLENBQUE7SUFDUixpREFBUSxDQUFBO0FBQ1QsQ0FBQyxFQUhJLFNBQVMsS0FBVCxTQUFTLFFBR2I7QUFVRCxNQUFhLFVBQVU7SUFJbkIsWUFBb0IsWUFBc0IsRUFBRSxVQUFrQjtRQUMxRCxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztRQUN2QyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztJQUMzQixDQUFDO0lBV0osS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUF3QztRQUN2RCxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFNBQWdCLEVBQUUsV0FBa0IsRUFBRSxFQUFVLEVBQUUsS0FBZ0IsRUFBRSxFQUFFO1lBQzdHLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLElBQUksc0JBQVMsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxzQkFBUyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUN2SixNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxTQUFnQixFQUFFLFdBQWtCLEVBQUUsRUFBVSxFQUFFLEtBQWdCLEVBQUUsRUFBRTtZQUM3RyxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFB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