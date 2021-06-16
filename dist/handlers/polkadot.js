"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolkadotHelper = void 0;
const api_1 = require("@polkadot/api");
const api_contract_1 = require("@polkadot/api-contract");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const aliceJ = __importStar(require("../alice.json"));
const chain_handler_1 = require("../chain_handler");
function sanitizeInner(arg) {
    if (typeof arg == "string") {
        return arg.replace('0x', '');
    }
    else if (typeof arg == "number") {
        return (arg % 2 ? '0' : '') + arg.toString(16);
    }
    else if (typeof arg == "boolean") {
        return arg ? '01' : '00';
    }
    else {
        return ""; // unreachable
    }
}
function scCallArgSanitize(arg) {
    if (typeof arg == "string" || typeof arg == "boolean" || typeof arg == "number") {
        return Array.of(sanitizeInner(arg));
    }
    else if (!arg) {
        return undefined;
    }
    else {
        return arg.map((v) => sanitizeInner(v));
    }
}
class PolkadotHelper {
    constructor(api, freezer, alice) {
        this.api = api;
        this.freezer = freezer;
        this.alice = alice;
    }
    async eventIter(cb) {
        this.api.query.system.events(async (events) => {
            events.forEach((event) => cb(event));
        });
    }
    async subscribe() {
        await this.freezer.tx
            .subscribe({ value: 0, gasLimit: -1 })
            .signAndSend(this.alice, (result) => {
            console.log(`sub tx: ${result.status}`);
        });
    }
    async eventHandler(ev) {
        const event = ev.event;
        // Not a contract event
        if (event.method != 'ContractEmitted') {
            return;
        }
        // Not our contract
        if (event.data[0].toString() != this.freezer.address.toString()) {
            return;
        }
        const cev = this.freezer.abi.decodeEvent(Buffer.from(event.data[1].toString().replace('0x', ''), 'hex'));
        switch (cev.event.identifier) {
            case "Transfer": {
                const action_id = new bignumber_js_1.default(cev.args[0].toJSON());
                const to = cev.args[1].toJSON();
                //@ts-expect-error
                const value = new bignumber_js_1.default(cev.args[2].toJSON());
                return new chain_handler_1.TransferEvent(action_id, to, value);
            }
            case "ScCall": {
                const action_id = new bignumber_js_1.default(cev.args[0].toJSON());
                const to = cev.args[1].toJSON();
                const endpoint = cev.args[2].toJSON();
                const args = cev.args[3].toJSON();
                return new chain_handler_1.ScCallEvent(action_id, to, new bignumber_js_1.default(0), endpoint, scCallArgSanitize(args));
            }
            case "UnfreezeWrap": {
                const action_id = new bignumber_js_1.default(cev.args[0].toJSON());
                const to = cev.args[1].toJSON();
                //@ts-expect-error
                const value = new bignumber_js_1.default(cev.args[2].toJSON());
                return new chain_handler_1.UnfreezeEvent(action_id, to, value);
            }
            default:
                throw Error(`unhandled event: ${cev.event.identifier}`);
        }
    }
    async emittedEventHandler(event) {
        if (event instanceof chain_handler_1.UnfreezeEvent) {
            await this.unfreeze(event);
        }
        else if (event instanceof chain_handler_1.ScCallEvent) {
            await this.sccall(event);
        }
        else if (event instanceof chain_handler_1.TransferEvent) {
            await this.send_wrap(event);
        }
    }
    async unfreeze(event) {
        console.log(`unfreeze! to: ${event.to}, value: ${event.value}`);
        await this.freezer.tx
            .pop({ value: 0, gasLimit: -1 }, event.id.toString(), event.to, BigInt(event.value.toString()))
            .signAndSend(this.alice, (result) => {
            console.log("pop tx:", result.status);
        });
    }
    async sccall(event) {
        //pub fn sc_call_verify(&mut self, action_id: String, to: AccountId, value: Balance, endpoint: [u8; 4], args: Vec<Vec<u8>>)
        await this.freezer.tx
            .scCallVerify({ value: event.value.toNumber(), gasLimit: -1 }, event.action_id.toString(), event.to, BigInt(event.value.toString()), Buffer.from(event.endpoint, "hex"), event.args ? event.args[0] : undefined)
            .signAndSend(this.alice, (result) => {
            console.log("scCall tx:", result.status);
        });
    }
    async send_wrap(event) {
        console.log(`send wrap! to: ${event.to}, value: ${event.value}`);
        await this.freezer.tx
            .sendWrapperVerify({ value: 0, gasLimit: -1 }, event.action_id.toString(), event.to, BigInt(event.value.toString()))
            .signAndSend(this.alice, (result) => {
            console.log(`sendWrap tx: ${result.status}`);
        });
    }
}
exports.PolkadotHelper = PolkadotHelper;
PolkadotHelper.new = async (node_uri, freezer_abi, contract_addr) => {
    const provider = new api_1.WsProvider(node_uri);
    const api = await api_1.ApiPromise.create({ provider: provider });
    const freezer = new api_contract_1.ContractPromise(api, freezer_abi, contract_addr);
    const keyring = new api_1.Keyring({});
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const alice = keyring.addFromJson(aliceJ);
    alice.unlock("ahPQDcuGjPJDMe4");
    const helper = new PolkadotHelper(api, freezer, alice);
    await helper.subscribe();
    return helper;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9sa2Fkb3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvaGFuZGxlcnMvcG9sa2Fkb3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUFnRTtBQUNoRSx5REFBeUQ7QUFLekQsZ0VBQXFDO0FBRXJDLHNEQUF3QztBQUN4QyxvREFBMEc7QUFNMUcsU0FBUyxhQUFhLENBQUMsR0FBYTtJQUNoQyxJQUFJLE9BQU8sR0FBRyxJQUFJLFFBQVEsRUFBRTtRQUN4QixPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0tBQy9CO1NBQU0sSUFBSSxPQUFPLEdBQUcsSUFBSSxRQUFRLEVBQUU7UUFDL0IsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtLQUNqRDtTQUFNLElBQUksT0FBTyxHQUFHLElBQUksU0FBUyxFQUFFO1FBQ2hDLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtLQUMzQjtTQUFNO1FBQ0gsT0FBTyxFQUFFLENBQUMsQ0FBQyxjQUFjO0tBQzVCO0FBQ0wsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsR0FBWTtJQUNuQyxJQUFJLE9BQU8sR0FBRyxJQUFJLFFBQVEsSUFBSSxPQUFPLEdBQUcsSUFBSSxTQUFTLElBQUksT0FBTyxHQUFHLElBQUksUUFBUSxFQUFFO1FBQzdFLE9BQU8sS0FBSyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtLQUN0QztTQUFNLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDYixPQUFPLFNBQVMsQ0FBQztLQUNwQjtTQUFNO1FBQ0gsT0FBUSxHQUFpQixDQUFDLEdB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