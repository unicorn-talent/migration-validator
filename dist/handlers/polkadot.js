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
exports.PolkadotHelper = exports.scCallArgSanitize = void 0;
const api_1 = require("@polkadot/api");
const api_contract_1 = require("@polkadot/api-contract");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const aliceJ = __importStar(require("../alice.json"));
const chain_handler_1 = require("../chain_handler");
function sanitizeInner(arg) {
    if (typeof arg == 'string') {
        return arg.replace('0x', '');
    }
    else if (typeof arg == 'number') {
        return (arg % 2 ? '0' : '') + arg.toString(16);
    }
    else if (typeof arg == 'boolean') {
        return arg ? '01' : '00';
    }
    else {
        return ''; // unreachable
    }
}
function scCallArgSanitize(arg) {
    if (typeof arg == 'string' ||
        typeof arg == 'boolean' ||
        typeof arg == 'number') {
        return Array.of(sanitizeInner(arg));
    }
    else if (!arg) {
        return undefined;
    }
    else {
        return arg.map((v) => sanitizeInner(v));
    }
}
exports.scCallArgSanitize = scCallArgSanitize;
/**
 * Polkadot Helper
 *
 * Handles [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 *
 * Emits [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 */
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
            case 'Transfer': {
                const action_id = new bignumber_js_1.default(cev.args[0].toJSON());
                const to = cev.args[1].toJSON();
                //@ts-expect-error guaranteed to be bignum
                const value = new bignumber_js_1.default(cev.args[2].toJSON());
                return new chain_handler_1.TransferEvent(action_id, to, value);
            }
            case 'ScCall': {
                const action_id = new bignumber_js_1.default(cev.args[0].toJSON());
                const to = cev.args[1].toJSON();
                const endpoint = cev.args[2].toJSON();
                const args = cev.args[3].toJSON();
                return new chain_handler_1.ScCallEvent(action_id, to, new bignumber_js_1.default(0), endpoint, scCallArgSanitize(args));
            }
            case 'UnfreezeWrap': {
                const action_id = new bignumber_js_1.default(cev.args[0].toJSON());
                const to = cev.args[1].toJSON();
                //@ts-expect-error guaranteed to be bignum
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
            console.log('pop tx:', result.status);
        });
    }
    async sccall(event) {
        //pub fn sc_call_verify(&mut self, action_id: String, to: AccountId, value: Balance, endpoint: [u8; 4], args: Vec<Vec<u8>>)
        await this.freezer.tx
            .scCallVerify({ value: event.value.toNumber(), gasLimit: -1 }, event.action_id.toString(), event.to, BigInt(event.value.toString()), Buffer.from(event.endpoint, 'hex'), event.args ? event.args[0] : undefined)
            .signAndSend(this.alice, (result) => {
            console.log('scCall tx:', result.status);
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
/**
 *
 * @param node_uri uri of the local(or remote?) substrate/polkadot node
 * @param freezer_abi ABI of the freezer smart contract
 * @param contract_addr Address of the freezer smart contract
 *
 * WARN: The helper object uses an internal account as a workaround.
 */
PolkadotHelper.new = async (node_uri, freezer_abi, contract_addr) => {
    const provider = new api_1.WsProvider(node_uri);
    const api = await api_1.ApiPromise.create({ provider: provider });
    const freezer = new api_contract_1.ContractPromise(api, freezer_abi, contract_addr);
    const keyring = new api_1.Keyring({});
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const alice = keyring.addFromJson(aliceJ);
    alice.unlock('ahPQDcuGjPJDMe4');
    const helper = new PolkadotHelper(api, freezer, alice);
    await helper.subscribe();
    return helper;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9sa2Fkb3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvaGFuZGxlcnMvcG9sa2Fkb3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUFnRTtBQUNoRSx5REFBeUQ7QUFLekQsZ0VBQXFDO0FBRXJDLHNEQUF3QztBQUN4QyxvREFNMEI7QUFLMUIsU0FBUyxhQUFhLENBQUMsR0FBYTtJQUNoQyxJQUFJLE9BQU8sR0FBRyxJQUFJLFFBQVEsRUFBRTtRQUN4QixPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ2hDO1NBQU0sSUFBSSxPQUFPLEdBQUcsSUFBSSxRQUFRLEVBQUU7UUFDL0IsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNsRDtTQUFNLElBQUksT0FBTyxHQUFHLElBQUksU0FBUyxFQUFFO1FBQ2hDLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztLQUM1QjtTQUFNO1FBQ0gsT0FBTyxFQUFFLENBQUMsQ0FBQyxjQUFjO0tBQzVCO0FBQ0wsQ0FBQztBQUVELFNBQWdCLGlCQUFpQixDQUFDLEdBQVk7SUFDMUMsSUFDSSxPQUFPLEdBQUcsSUFBSSxRQUFRO1FBQ3RCLE9BQU8sR0FBRyxJQUFJLFNBQVM7UUFDdkIsT0FBTyxHQUFHLElBQUksUUFBUSxFQUN4QjtRQUNFLE9BQU8sS0FBSyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztLQUN2QztTQUFNLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDYixPQUFPLFNBQVMsQ0FBQztLQUNwQjtTQUFNO1FBQ0gsT0FBUSxHQUFpQixDQUFD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