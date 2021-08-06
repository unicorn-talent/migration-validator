import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';
import { DecodedEvent } from '@polkadot/api-contract/types';
import { KeyringPair, KeyringPair$Json } from '@polkadot/keyring/types';
import { EventRecord } from '@polkadot/types/interfaces';
import { AnyJson } from '@polkadot/types/types';
import BigNumber from 'bignumber.js';

import * as aliceJ from '../alice.json';
import {
    ChainEmitter,
    ChainListener,
    ScCallEvent,
    TransferEvent,
    UnfreezeEvent,
} from '../chain_handler';
import { ConcreteJson } from '../types';

type AnyJsonE = string | boolean | number;

function sanitizeInner(arg: AnyJsonE): string {
    if (typeof arg == 'string') {
        return arg.replace('0x', '');
    } else if (typeof arg == 'number') {
        return (arg % 2 ? '0' : '') + arg.toString(16);
    } else if (typeof arg == 'boolean') {
        return arg ? '01' : '00';
    } else {
        return ''; // unreachable
    }
}

export function scCallArgSanitize(arg: AnyJson): string[] | undefined {
    if (
        typeof arg == 'string' ||
        typeof arg == 'boolean' ||
        typeof arg == 'number'
    ) {
        return Array.of(sanitizeInner(arg));
    } else if (!arg) {
        return undefined;
    } else {
        return (arg as AnyJson[]).map((v) => sanitizeInner(v as AnyJsonE));
    }
}

/**
 * Polkadot Helper
 * 
 * Handles [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 * 
 * Emits [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 */
export class PolkadotHelper
    implements
        ChainEmitter<
            EventRecord,
            void,
            TransferEvent | ScCallEvent | UnfreezeEvent
        >,
        ChainListener<TransferEvent | UnfreezeEvent | ScCallEvent, void>
{
    private readonly api: ApiPromise;
    private readonly freezer: ContractPromise;
    private readonly alice: KeyringPair; // TODO: Switch to proper keyringpair

    private constructor(
        api: ApiPromise,
        freezer: ContractPromise,
        alice: KeyringPair
    ) {
        this.api = api;
        this.freezer = freezer;
        this.alice = alice;
    }

    async eventIter(cb: (event: EventRecord) => Promise<void>): Promise<void> {
        this.api.query.system.events(async (events) => {
            events.forEach((event) => cb(event));
        });
    }

    /**
     * 
     * @param node_uri uri of the local(or remote?) substrate/polkadot node
     * @param freezer_abi ABI of the freezer smart contract
     * @param contract_addr Address of the freezer smart contract
     * 
     * WARN: The helper object uses an internal account as a workaround.
     */
    public static new = async (
        node_uri: string,
        freezer_abi: ConcreteJson,
        contract_addr: string
    ): Promise<PolkadotHelper> => {
        const provider = new WsProvider(node_uri);
        const api = await ApiPromise.create({
			provider: provider,
			types: {
                ActionId: 'u128',
                TokenId: 'u128',
                CommodityId: 'H256',
                CommodityInfo: 'Vec<u8>',
                NftId: 'H256',
                NftInfo: 'Vec<u8>',
                EgldBalance: 'Balance',
                Commodity: '(H256, Vec<u8>)',
                LocalAction: {
                    _enum: {
                        //@ts-expect-error struct
                        Unfreeze: {
                            to: 'AccountId',
                            value: 'Balance',
                        },
                        //@ts-expect-error struct
                        RpcCall: {
                            contract: 'AccountId',
                            call_data: 'Vec<u8>',
                        },
                        //@ts-expect-error struct
                        TransferWrapped: {
                            to: 'AccountId',
                            value: 'Balance',
                        },
                    },
                },
                ActionInfo: {
                    action: 'LocalAction',
                    validators: 'BTreeSet<AccountId>',
                },
            },
		});
        const freezer = new ContractPromise(api, freezer_abi, contract_addr);

        const keyring = new Keyring({});
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        const alice = keyring.addFromJson(aliceJ as KeyringPair$Json);

        alice.unlock('ahPQDcuGjPJDMe4');

        const helper = new PolkadotHelper(api, freezer, alice);
        await helper.subscribe();

        return helper;
    };

    private async subscribe() {
        await this.freezer.tx
            .subscribe({ value: 0, gasLimit: -1 })
            .signAndSend(this.alice, (result) => {
                console.log(`sub tx: ${result.status}`);
            });
    }

    async eventHandler(
        ev: EventRecord
    ): Promise<TransferEvent | ScCallEvent | UnfreezeEvent | undefined> {
        const event = ev.event;
        // Not a contract event
        if (event.method != 'ContractEmitted') {
            return;
        }
        // Not our contract
        if (event.data[0].toString() != this.freezer.address.toString()) {
            return;
        }

        const cev: DecodedEvent = this.freezer.abi.decodeEvent(
            Buffer.from(event.data[1].toString().replace('0x', ''), 'hex')
        );
        switch (cev.event.identifier) {
            case 'Transfer': {
                const action_id = new BigNumber(cev.args[0].toJSON() as string);
                const to = cev.args[1].toJSON() as string;
                //@ts-expect-error guaranteed to be bignum
                const value = new BigNumber(cev.args[2].toJSON());

                return new TransferEvent(action_id, to, value);
            }
            case 'ScCall': {
                const action_id = new BigNumber(cev.args[0].toJSON() as string);
                const to = cev.args[1].toJSON() as string;
                const endpoint = cev.args[2].toJSON() as string;
                const args = cev.args[3].toJSON();

                return new ScCallEvent(
                    action_id,
                    to,
                    new BigNumber(0),
                    endpoint,
                    scCallArgSanitize(args)
                );
            }
            case 'UnfreezeWrap': {
                const action_id = new BigNumber(cev.args[0].toJSON() as string);
                const to = cev.args[1].toJSON() as string;
                //@ts-expect-error guaranteed to be bignum
                const value = new BigNumber(cev.args[2].toJSON());

                return new UnfreezeEvent(action_id, to, value);
            }
            default:
                throw Error(`unhandled event: ${cev.event.identifier}`);
        }
    }

    async emittedEventHandler(
        event: TransferEvent | UnfreezeEvent | ScCallEvent
    ): Promise<void> {
        if (event instanceof UnfreezeEvent) {
            await this.unfreeze(event);
        } else if (event instanceof ScCallEvent) {
            await this.sccall(event);
        } else if (event instanceof TransferEvent) {
            await this.send_wrap(event);
        }
    }

    private async unfreeze(event: UnfreezeEvent): Promise<void> {
        console.log(`unfreeze! to: ${event.to}, value: ${event.value}`);
        await this.freezer.tx
            .pop(
                { value: 0, gasLimit: -1 },
                event.id.toString(),
                event.to,
                BigInt(event.value.toString())
            )
            .signAndSend(this.alice, (result) => {
                console.log('pop tx:', result.status);
            });
    }

    private async sccall(event: ScCallEvent): Promise<void> {
        //pub fn sc_call_verify(&mut self, action_id: String, to: AccountId, value: Balance, endpoint: [u8; 4], args: Vec<Vec<u8>>)
        await this.freezer.tx
            .scCallVerify(
                { value: event.value.toNumber(), gasLimit: -1 },
                event.action_id.toString(),
                event.to,
                BigInt(event.value.toString()),
                Buffer.from(event.endpoint, 'hex'),
                event.args ? event.args[0] : undefined
            )
            .signAndSend(this.alice, (result) => {
                console.log('scCall tx:', result.status);
            });
    }

    private async send_wrap(event: TransferEvent): Promise<void> {
        console.log(`send wrap! to: ${event.to}, value: ${event.value}`);
        await this.freezer.tx
            .sendWrapperVerify(
                { value: 0, gasLimit: -1 },
                event.action_id.toString(),
                event.to,
                BigInt(event.value.toString())
            )
            .signAndSend(this.alice, (result) => {
                console.log(`sendWrap tx: ${result.status}`);
            });
    }
}
