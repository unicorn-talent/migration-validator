import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { KeyringPair, KeyringPair$Json } from '@polkadot/keyring/types';
import { EventRecord } from '@polkadot/types/interfaces';
import BigNumber from 'bignumber.js';

import * as aliceJ from '../alice.json';
import {
    ChainEmitter,
    ChainListener,
    ScCallEvent,
    TransferEvent,
    UnfreezeEvent,
} from '../chain_handler';
import { scCallArgSanitize } from './polkadot';

/**
 * Polkadot Freezer Pallet Helper
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
        ChainListener<TransferEvent | UnfreezeEvent | ScCallEvent>
{
    private readonly api: ApiPromise;
    private readonly alice: KeyringPair; // TODO: Switch to proper keyringpair

    private constructor(
        api: ApiPromise,
        alice: KeyringPair
    ) {
        this.api = api;
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
    ): Promise<PolkadotHelper> => {
        const provider = new WsProvider(node_uri);
        const api = await ApiPromise.create({ provider: provider });

        const keyring = new Keyring({});
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        const alice = keyring.addFromJson(aliceJ as KeyringPair$Json);

        alice.unlock('ahPQDcuGjPJDMe4');

        const helper = new PolkadotHelper(api, alice);
        await helper.subscribe();

        return helper;
    };

    private async subscribe() {
        // TODO
        /*await this.freezer.tx
            .subscribe({ value: 0, gasLimit: -1 })
            .signAndSend(this.alice, (result) => {
                console.log(`sub tx: ${result.status}`);
            });*/
    }

    async eventHandler(
        ev: EventRecord
    ): Promise<TransferEvent | ScCallEvent | UnfreezeEvent | undefined> {
        const event = ev.event;
        switch (event.method) {
            case 'Transfer': {
                const action_id = new BigNumber(event.data[0].toString() as string);
                const dest = event.data[1].toJSON() as string;
                const value = new BigNumber(event.data[2].toJSON() as string)

                return new TransferEvent(action_id, dest, value);
            }
            case 'ScCall': {
                const action_id = new BigNumber(event.data[0].toString() as string);
                const to = event.data[1].toJSON() as string;
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
                const action_id = new BigNumber(event.data[0].toString() as string);
                const dest = event.data[1].toJSON() as string;
                const value = new BigNumber(event.data[2].toJSON() as string)

                return new UnfreezeEvent(
                    action_id,
                    dest,
                    value
                );
            }
            default:
                return undefined
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
        .unfreezeVerify(event.id, event.to, event.value)
        .signAndSend(this.alice, (result) => {
            console.log(`unfreeze verify:`, result)
        })
    }

    private async sccall(_event: ScCallEvent): Promise<void> {
        //pub fn sc_call_verify(&mut self, action_id: String, to: AccountId, value: Balance, endpoint: [u8; 4], args: Vec<Vec<u8>>)
        throw Error("unimplimented");
    }

    private async send_wrap(_event: TransferEvent): Promise<void> {
        throw Error("unimplimented")
    }
}