import { ApiPromise, WsProvider } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { EventRecord } from '@polkadot/types/interfaces';
import { Codec } from '@polkadot/types/types';
import BigNumber from 'bignumber.js';

import {
    ChainEmitter,
    ChainListener,
    ScCallEvent,
    TransferEvent,
    UnfreezeEvent,
} from '../chain_handler';
import { scCallArgSanitize } from './polkadot';

function sanitizeDest(dest: Codec) {
    return Buffer.from(dest.toString().replace('0x', ''), 'hex').toString(
        'utf-8'
    );
}

/**
 * Polkadot Freezer Pallet Helper
 *
 * Handles [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 *
 * Emits [[TransferEvent]], [[ScCallEvent]], [[UnfreezeEvent]]
 */
export class PolkadotPalletHelper
    implements
        ChainEmitter<
            EventRecord,
            void,
            TransferEvent | ScCallEvent | UnfreezeEvent
        >,
        ChainListener<TransferEvent | UnfreezeEvent | ScCallEvent>
{
    private readonly api: ApiPromise;
    private readonly signer: KeyringPair; // TODO: Switch to proper keyringpair

    private constructor(api: ApiPromise, signer: KeyringPair) {
        this.api = api;
        this.signer = signer;
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
        signer: KeyringPair
    ): Promise<PolkadotPalletHelper> => {
        const provider = new WsProvider(node_uri);
        const api = await ApiPromise.create({
            provider: provider,
            types: {
                ActionId: 'u128',
                TokenId: 'u128',
                EgldBalance: 'Balance',
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

        const helper = new PolkadotPalletHelper(api, signer);

        return helper;
    };

    async eventHandler(
        ev: EventRecord
    ): Promise<TransferEvent | ScCallEvent | UnfreezeEvent | undefined> {
        const event = ev.event;
        switch (event.method) {
            case 'TransferFrozen': {
                const action_id = new BigNumber(
                    event.data[0].toString() as string
                );
                const dest = sanitizeDest(event.data[1]);
                const value = new BigNumber(event.data[2].toJSON() as string);

                return new TransferEvent(action_id, dest, value);
            }
            case 'ScCall': {
                const action_id = new BigNumber(
                    event.data[0].toString() as string
                );
                const to = sanitizeDest(event.data[1]);
                const endpoint = event.data[2].toJSON() as string;
                const args = event.data[3].toJSON();

                return new ScCallEvent(
                    action_id,
                    to,
                    new BigNumber(0),
                    endpoint,
                    scCallArgSanitize(args)
                );
            }
            case 'UnfreezeWrapped': {
                const action_id = new BigNumber(
                    event.data[0].toString() as string
                );
                const dest = sanitizeDest(event.data[1]);
                const value = new BigNumber(event.data[2].toJSON() as string);

                return new UnfreezeEvent(action_id, dest, value);
            }
            default:
                return undefined;
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
        await this.api.tx.freezer
            .unfreezeVerify(
                event.id.toString(),
                event.to,
                event.value.toString()
            )
            .signAndSend(this.signer, (result) => {
                console.log(`unfreeze verify:`, result.status);
            });
    }

    private async sccall(_event: ScCallEvent): Promise<void> {
        //pub fn sc_call_verify(&mut self, action_id: String, to: AccountId, value: Balance, endpoint: [u8; 4], args: Vec<Vec<u8>>)
        throw Error('unimplimented');
    }

    private async send_wrap(event: TransferEvent): Promise<void> {
        console.log(`send_wrap! to: ${event.to}, value: ${event.value}`);
        await this.api.tx.freezer
            .transferWrappedVerify(
                event.action_id.toString(),
                event.to,
                event.value.toString()
            )
            .signAndSend(this.signer, (result) => {
                console.log(`send wrap: `, result.status);
            });
    }
}
