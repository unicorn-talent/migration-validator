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
    TransferUniqueEvent,
    UnfreezeEvent,
    UnfreezeUniqueEvent,
} from '../chain_handler';
import { toHex } from './common';
import { scCallArgSanitize } from './polkadot';

function sanitizeHexData(dest: Codec) {
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
            TransferEvent | TransferUniqueEvent | ScCallEvent | UnfreezeEvent | UnfreezeUniqueEvent
        >,
        ChainListener<TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent | ScCallEvent>
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

        const helper = new PolkadotPalletHelper(api, signer);

        return helper;
    };

    async eventHandler(
        ev: EventRecord
    ): Promise<TransferEvent | TransferUniqueEvent | ScCallEvent | UnfreezeEvent | UnfreezeUniqueEvent | undefined> {
        const event = ev.event;
        switch (event.method) {
            case 'TransferFrozen': {
                const action_id = new BigNumber(
                    event.data[0].toString() as string
                );
                const dest = sanitizeHexData(event.data[1]);
                const value = new BigNumber(event.data[2].toJSON() as string);

                return new TransferEvent(action_id, dest, value);
            }
            case 'TransferUniqueFrozen': {
                const action_id = new BigNumber(
                    event.data[0].toString() as string
                );
                const to = sanitizeHexData(event.data[1]);
                const ident = event.data[2].toU8a();

                return new TransferUniqueEvent(
                    action_id,
                    to,
                    ident
                )
            }
            case 'ScCall': {
                const action_id = new BigNumber(
                    event.data[0].toString() as string
                );
                const to = sanitizeHexData(event.data[1]);
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
                const dest = sanitizeHexData(event.data[1]);
                const value = new BigNumber(event.data[2].toJSON() as string);

                return new UnfreezeEvent(action_id, dest, value);
            }
            case 'UnfreezeUniqueWrapped': {
                const action_id = new BigNumber(
                    event.data[0].toString() as string
                );
                const to = sanitizeHexData(event.data[1]);
                const data = sanitizeHexData(event.data[2]);

                return new UnfreezeUniqueEvent(
                    action_id,
                    to,
                    Buffer.from(data, 'hex')
                )
            }
            default:
                return undefined;
        }
    }

    async emittedEventHandler(
        event: TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent | ScCallEvent
    ): Promise<void> {
        if (event instanceof UnfreezeEvent) {
            await this.unfreeze(event);
        } else if (event instanceof ScCallEvent) {
            await this.sccall(event);
        } else if (event instanceof TransferEvent) {
            await this.send_wrap(event);
        } else if (event instanceof UnfreezeUniqueEvent) {
            await this.unfreeze_nft(event);
        } else if (event instanceof TransferUniqueEvent) {
            await this.send_wrap_nft(event);
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

    private async unfreeze_nft(event: UnfreezeUniqueEvent): Promise<void> {
        console.log(`unfreeze_nft! to: ${event.to}`);
        await this.api.tx.freezer
            .unfreezeNftVerify(
                event.id.toString(),
                event.to,
                event.nft_id
            )
            .signAndSend(this.signer, (result) => {
                console.log(`unfreeze nft: ${result.status}`)
            })
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

    private async send_wrap_nft(event: TransferUniqueEvent): Promise<void> {
        console.log(`send wrap nft! to: ${event.to}`);
        await this.api.tx.freezer
            .transferWrappedNftVerify(
                event.action_id.toString(),
                event.to,
                toHex(event.id)
            )
            .signAndSend(this.signer, (result) => {
                console.log(`send wrap nft: ${result.status}`);
            });
    }
}
