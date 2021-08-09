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
    constructor(mintContract, chainIdentifier) {
        this.mintContract = mintContract;
        this.chainIdentifier = chainIdentifier;
    }
    async eventIter(cb) {
        this.mintContract.on('Unfreeze', async (action_id, to, value) => {
            const ev = { type: SolEventT.Unfreeze, action_id, to: to, value };
            await cb(ev);
        });
        this.mintContract.on('Transfer', async (action_id, to, value) => {
            const ev = { type: SolEventT.Transfer, action_id, to: to, value };
            await cb(ev);
        });
    }
    async eventHandler(ev) {
        switch (ev.type) {
            case SolEventT.Unfreeze:
                return new chain_handler_1.UnfreezeEvent(ev.action_id, ev.to, ev.value);
            case SolEventT.Transfer:
                return new chain_handler_1.TransferEvent(ev.action_id, ev.to, ev.value);
        }
    }
    async emittedEventHandler(event) {
        let kind;
        let action;
        let tx;
        if (event instanceof chain_handler_1.TransferEvent) {
            action = event.action_id.toString();
            console.log(`target: ${event.to}, value: ${event.value}`);
            tx = await this.mintContract.validate_transfer(action, event.to, event.value.toString());
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
Web3Helper.new = async function (provider_uri, pkey, minter, minterAbi, chainIdentifier = "WEB3", networkOpts) {
    const w3 = new ethers_1.providers.JsonRpcProvider(provider_uri, networkOpts);
    await w3.ready;
    const acc = (new ethers_1.Wallet(pkey)).connect(w3);
    const mint = new ethers_1.Contract(minter, minterAbi, acc);
    return new Web3Helper(mint, chainIdentifier);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViMy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9oYW5kbGVycy93ZWIzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG1DQUFxRDtBQUdyRCxvREFBOEc7QUFFOUcsSUFBSyxTQUdKO0FBSEQsV0FBSyxTQUFTO0lBQ2IsaURBQVEsQ0FBQTtJQUNSLGlEQUFRLENBQUE7QUFDVCxDQUFDLEVBSEksU0FBUyxLQUFULFNBQVMsUUFHYjtBQVNELE1BQWEsVUFBVTtJQUluQixZQUFvQixZQUFzQixFQUFFLGVBQXVCO1FBQy9ELElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO0lBQ3JDLENBQUM7SUFXSixLQUFLLENBQUMsU0FBUyxDQUFDLEVBQXdDO1FBQ3ZELElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsU0FBb0IsRUFBRSxFQUFVLEVBQUUsS0FBZ0IsRUFBRSxFQUFFO1lBQzdGLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDbEUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsU0FBb0IsRUFBRSxFQUFVLEVBQUUsS0FBZ0IsRUFBRSxFQUFFO1lBQzdGLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDbEUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQVk7UUFDOUIsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFO1lBQ2hCLEtBQUssU0FBUyxDQUFDLFFBQVE7Z0JBQ3RCLE9BQU8sSUFBSSw2QkFBYSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDekQsS0FBSyxTQUFTLENBQUMsUUFBUTtnQkFDdEIsT0FBTyxJQUFJLDZCQUFhLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUN6RDtJQUNGLENBQUM7SUFFRSxLQUFLLENBQUMsbUJBQW1CLENBQUMsS0FBb0M7UUFDaEUsSUFBSSxJQUFZLENBQUM7UUFDakIsSUFBSSxNQUFjLENBQUM7UUFDbkIsSUFBSSxFQUFpQyxDQUFDO1FBQ3RDLElBQUksS0FBSyxZQUFZLDZCQUFhLEVBQUU7WUFDbkMsTUFBTSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEtBQUssQ0FBQyxFQUFFLFlBQVksS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDaEQsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDbEcsSUFBSSxHQUFHLFVBQVUsQ0FBQTtTQUNYO2FBQU0sSUFBSSxLQUFLLFlBQVksNkJBQWEsRUFBRTtZQUNoRCxNQUFNLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwQixFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUNsRyxJQUFJLEdBQUcsVUFBVSxDQUFBO1NBQ1g7YUFBTTtZQUNILE1BQU0sS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7U0FDckM7UUFFUCxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNoQixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsSUFBSSxlQUFlLE1BQU0sWUFBWSxDQUFDLENBQUM7UUFFM0QsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDO0lBQ2IsQ0FBQzs7QUEzREwsZ0NBNERDO0FBbkRpQixjQUFHLEdBQUcsS0FBSyxXQUFVLFlBQW9CLEVBQUUsSUFBWSxFQUFFLE1BQWMsRUFBRSxTQUFvQixFQUFFLGtCQUEwQixNQUFNLEVBQUUsV0FBd0I7SUFDbkssTUFBTSxFQUFFLEdBQUcsSUFBSSxrQkFBUyxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDMUUsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDO0lBQ1QsTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLGVBQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMzQyxNQUFNLElBQUksR0FBRyxJQUFJLGlCQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUVsRCxPQUFPLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUEifQ==