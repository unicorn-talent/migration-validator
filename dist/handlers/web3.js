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
    constructor(mintContract) {
        this.mintContract = mintContract;
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
    }
}
exports.Web3Helper = Web3Helper;
Web3Helper.new = async function (provider_uri, pkey, minter, minterAbi) {
    const w3 = new ethers_1.providers.JsonRpcProvider(provider_uri);
    await w3.ready;
    const acc = (new ethers_1.Wallet(pkey)).connect(w3);
    const mint = new ethers_1.Contract(minter, minterAbi, acc);
    return new Web3Helper(mint);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViMy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9oYW5kbGVycy93ZWIzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG1DQUFxRDtBQUVyRCxvREFBNkY7QUFFN0YsSUFBSyxTQUdKO0FBSEQsV0FBSyxTQUFTO0lBQ2IsaURBQVEsQ0FBQTtJQUNSLGlEQUFRLENBQUE7QUFDVCxDQUFDLEVBSEksU0FBUyxLQUFULFNBQVMsUUFHYjtBQVNELE1BQWEsVUFBVTtJQUduQixZQUFvQixZQUFzQjtRQUN0QyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztJQUNyQyxDQUFDO0lBV0osS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUF3QztRQUN2RCxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFNBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQWdCLEVBQUUsRUFBRTtZQUM3RixNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQ2xFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFNBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQWdCLEVBQUUsRUFBRTtZQUM3RixNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQ2xFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUFZO1FBQzlCLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRTtZQUNoQixLQUFLLFNBQVMsQ0FBQyxRQUFRO2dCQUN0QixPQUFPLElBQUksNkJBQWEsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3pELEtBQUssU0FBUyxDQUFDLFFBQVE7Z0JBQ3RCLE9BQU8sSUFBSSw2QkFBYSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDekQ7SUFDRixDQUFDO0lBRUUsS0FBSyxDQUFDLG1CQUFtQixDQUFDLEtBQW9DO1FBQ2hFLElBQUksSUFBWSxDQUFDO1FBQ2pCLElBQUksTUFBYyxDQUFDO1FBQ25CLElBQUksRUFBaUMsQ0FBQztRQUN0QyxJQUFJLEtBQUssWUFBWSw2QkFBYSxFQUFFO1lBQ25DLE1BQU0sR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxLQUFLLENBQUMsRUFBRSxZQUFZLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQ2hELEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ2xHLElBQUksR0FBRyxVQUFVLENBQUE7U0FDWDthQUFNLElBQUksS0FBSyxZQUFZLDZCQUFhLEVBQUU7WUFDaEQsTUFBTSxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEIsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDbEcsSUFBSSxHQUFHLFVBQVUsQ0FBQTtTQUNYO2FBQU07WUFDSCxNQUFNLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1NBQ3JDO1FBRVAsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksZUFBZSxNQUFNLFlBQVksQ0FBQyxDQUFDO0lBQ3pELENBQUM7O0FBdkRMLGdDQXdEQztBQWpEaUIsY0FBRyxHQUFHLEtBQUssV0FBVSxZQUFvQixFQUFFLElBQVksRUFBRSxNQUFjLEVBQUUsU0FBb0I7SUFDdkcsTUFBTSxFQUFFLEdBQUcsSUFBSSxrQkFBUyxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUM3RCxNQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUM7SUFDVCxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksZUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzNDLE1BQU0sSUFBSSxHQUFHLElBQUksaUJBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBRWxELE9BQU8sSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFBIn0=