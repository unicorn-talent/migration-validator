import { ApiPromise, WsProvider } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { KeyringPair } from '@polkadot/keyring/types';
import { EventRecord, Hash } from '@polkadot/types/interfaces';
import { Codec } from '@polkadot/types/types';
import BigNumber from 'bignumber.js';

import {
    ChainEmitter,
    ChainIdentifier,
    ChainListener,
    TransferEvent,
    TransferUniqueEvent,
    UnfreezeEvent,
    UnfreezeUniqueEvent,
} from '../chain_handler';
import { NftPacked } from '../encoding';
import { toHex } from './common';

const REPLACEMENT_CHAR = '\ufffd'

function sanitizeHexData(dat: Codec) {
	const dats = dat.toString();
    let res = Buffer.from(dats.replace('0x', ''), 'hex').toString(
        'utf-8'
    );

	if (res.includes(REPLACEMENT_CHAR)) {
		res = dats;
	}

	return res;
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
            TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent
        >,
        ChainListener<TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent, Hash>,
        ChainIdentifier
{
    private readonly api: ApiPromise;
    private readonly signer: KeyringPair; // TODO: Switch to proper keyringpair

    readonly chainNonce = 0x1;

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
                TokenId: 'u64',
                CommodityId: 'H256',
                CommodityInfo: 'Vec<u8>',
                NftId: 'H256',
                NftInfo: 'Vec<u8>',
                Erc1155Balance: 'Balance',
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
    ): Promise<TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent | undefined> {
        const event = ev.event;
        switch (event.method) {
            case 'TransferFrozen': {
                const action_id = new BigNumber(
                    event.data[0].toString() as string
                );
                const chain_nonce = parseInt(event.data[1].toString());
                const dest = sanitizeHexData(event.data[2]);
                const value = new BigNumber(event.data[3].toJSON() as string);

                return new TransferEvent(action_id, chain_nonce, dest, value);
            }
            case 'TransferUniqueFrozen': {
                const action_id = new BigNumber(
                    event.data[0].toString() as string
                );
                const chain_nonce = parseInt(event.data[1].toString())
                const to = sanitizeHexData(event.data[2]);
                const ident = event.data[3].toU8a();

                return new TransferUniqueEvent(
                    action_id,
                    chain_nonce,
                    to,
                    ident
                )
            }
            case 'UnfreezeWrapped': {
                const action_id = new BigNumber(
                    event.data[0].toString() as string
                );
                const chain_nonce = parseInt(event.data[1].toString());
                const dest = sanitizeHexData(event.data[2]);
                const value = new BigNumber(event.data[3].toJSON() as string);

                return new UnfreezeEvent(action_id, chain_nonce, dest, value);
            }
            case 'UnfreezeUniqueWrapped': {
                const action_id = new BigNumber(
                    event.data[0].toString() as string
                );
                const to = sanitizeHexData(event.data[1]);
                const data = Buffer.from(event.data[2].toString().replace('0x', ''), 'hex');
				const decoded = NftPacked.deserializeBinary(data)

                return new UnfreezeUniqueEvent(
                    action_id,
                    decoded.getChainNonce(),
                    to,
					decoded.getData_asU8()
				)
			}
            default:
                return undefined;
        }
    }

    async emittedEventHandler(
        event: TransferEvent | TransferUniqueEvent | UnfreezeEvent | UnfreezeUniqueEvent,
        origin_nonce: number
    ): Promise<Hash> {
        let block;
        if (event instanceof UnfreezeEvent) {
            block = await this.unfreeze(event);
        } else if (event instanceof TransferEvent) {
            block = await this.send_wrap(event, origin_nonce);
        } else if (event instanceof UnfreezeUniqueEvent) {
            block = await this.unfreeze_nft(event);
        } else if (event instanceof TransferUniqueEvent) {
            block = await this.send_wrap_nft(event, origin_nonce);
        } else {
            throw Error(`unhandled event ${event}` )
        }

        return block;
    }

    private async resolve_block(ext: SubmittableExtrinsic<"promise">): Promise<Hash> {
        return await new Promise((res, rej) => ext.signAndSend(this.signer, (result) => {
            result.isInBlock && res(result.status.asInBlock);
            result.isError && rej()
        }));
    }

    private async unfreeze(event: UnfreezeEvent): Promise<Hash> {
        console.log(`unfreeze! to: ${event.to}, value: ${event.value}`);
        return await this.resolve_block(
            this.api.tx.freezer
            .unfreezeVerify(
                event.id.toString(),
                event.to,
                event.value.toString()
            )
        )
    }

    private async unfreeze_nft(event: UnfreezeUniqueEvent): Promise<Hash> {
        console.log(`unfreeze_nft! to: ${event.to}`);
        return await this.resolve_block(
            this.api.tx.freezer
            .unfreezeNftVerify(
                event.id.toString(),
                event.to,
                event.nft_id
            )
        )
    }

    private async send_wrap(event: TransferEvent, origin_nonce: number): Promise<Hash> {
        console.log(`send_wrap! to: ${event.to}, value: ${event.value}`);
        return await this.resolve_block(
            this.api.tx.freezer
            .transferWrappedVerify(
				origin_nonce,
                event.action_id.toString(),
                event.to,
                event.value.toString()
            )
        );
    }

    private async send_wrap_nft(event: TransferUniqueEvent, origin_nonce: number): Promise<Hash> {
        console.log(`send wrap nft! to: ${event.to}`);
		const data = new NftPacked();
		data.setChainNonce(origin_nonce);
		data.setData(event.id);

        return await this.resolve_block(
            this.api.tx.freezer
            .transferWrappedNftVerify(
                event.action_id.toString(),
                event.to,
                `0x${toHex(data.serializeBinary())}`
            )
        )
    }
}
