"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web3Helper = void 0;
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
            const ev = { type: SolEventT.Unfreeze, action_id, chain_nonce, to, value };
            await cb(ev);
        });
        this.mintContract.on('Transfer', async (action_id, chain_nonce, to, value) => {
            const ev = { type: SolEventT.Transfer, action_id, chain_nonce, to, value };
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
    async emittedEventHandler(event) {
        let kind;
        let action;
        let tx;
        if (event instanceof chain_handler_1.TransferEvent) {
            action = event.action_id.toString();
            console.log(`target: ${event.to}, value: ${event.value}`);
            tx = await this.mintContract.validate_transfer(action, event.chain_nonce, event.to, event.value.toString());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViMy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9oYW5kbGVycy93ZWIzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLG1DQUFxRDtBQUVyRCxvREFBOEc7QUFFOUcsSUFBSyxTQUdKO0FBSEQsV0FBSyxTQUFTO0lBQ2IsaURBQVEsQ0FBQTtJQUNSLGlEQUFRLENBQUE7QUFDVCxDQUFDLEVBSEksU0FBUyxLQUFULFNBQVMsUUFHYjtBQVVELE1BQWEsVUFBVTtJQUluQixZQUFvQixZQUFzQixFQUFFLFVBQWtCO1FBQzFELElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO0lBQzNCLENBQUM7SUFXSixLQUFLLENBQUMsU0FBUyxDQUFDLEVBQXdDO1FBQ3ZELElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsU0FBb0IsRUFBRSxXQUFzQixFQUFFLEVBQVUsRUFBRSxLQUFnQixFQUFFLEVBQUU7WUFDckgsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFHLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUM1RSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxTQUFvQixFQUFFLFdBQXNCLEVBQUUsRUFBVSxFQUFFLEtBQWdCLEVBQUUsRUFBRTtZQUNySCxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQzNFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUFZO1FBQzlCLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRTtZQUNoQixLQUFLLFNBQVMsQ0FBQyxRQUFRO2dCQUN0QixPQUFPLElBQUksNkJBQWEsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDcEYsS0FBSyxTQUFTLENBQUMsUUFBUTtnQkFDdEIsT0FBTyxJQUFJLDZCQUFhLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3BGO0lBQ0YsQ0FBQztJQUVFLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxLQUFvQztRQUNoRSxJQUFJLElBQVksQ0FBQztRQUNqQixJQUFJLE1BQWMsQ0FBQztRQUNuQixJQUFJLEVBQWlDLENBQUM7UUFDdEMsSUFBSSxLQUFLLFlBQVksNkJBQWEsRUFBRTtZQUNuQyxNQUFNLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsS0FBSyxDQUFDLEVBQUUsWUFBWSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUNoRCxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ3JILElBQUksR0FBRyxVQUFVLENBQUE7U0FDWDthQUFNLElBQUksS0FBSyxZQUFZLDZCQUFhLEVBQUU7WUFDaEQsTUFBTSxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEIsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDbEcsSUFBSSxHQUFHLFVBQVUsQ0FBQTtTQUNYO2FBQU07WUFDSCxNQUFNLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1NBQ3JDO1FBRVAsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksZUFBZSxNQUFNLFlBQVksQ0FBQyxDQUFDO1FBRTNELE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQztJQUNiLENBQUM7O0FBM0RMLGdDQTREQztBQW5EaUIsY0FBRyxHQUFHLEtBQUssV0FBVSxZQUFvQixFQUFFLElBQVksRUFBRSxNQUFjLEVBQUUsU0FBb0IsRUFBRSxVQUFrQixFQUFFLFdBQXdCO0lBQ3JKLE1BQU0sRUFBRSxHQUFHLElBQUksa0JBQVMsQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQzFFLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQztJQUNULE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxlQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDM0MsTUFBTSxJQUFJLEdBQUcsSUFBSSxpQkFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFFbEQsT0FBTyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFBIn0=