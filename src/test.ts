import * as fs from 'fs';
import { Keyring } from '@polkadot/api';
import { waitReady } from '@polkadot/wasm-crypto';
import { io } from 'socket.io-client';

import config from './config';
import { abi } from "./Minter.json";
import { ElrondHelper, emitEvents, PolkadotPalletHelper, Web3Helper } from './index';
import {ChainEmitter, ChainListener} from './chain_handler';

async function polkadotTestHelper(): Promise<PolkadotPalletHelper> {
	await waitReady();
	const keyring = new Keyring();
	return await PolkadotPalletHelper.new(
		config.xnode,
		keyring.createFromUri("//Alice", undefined, 'sr25519')
	);
}

//@ts-expect-error unused
async function elrondTestHelper(): Promise<ElrondHelper> {
    const aliceE = await fs.promises.readFile("../XP.network-Elrond-Migration/elrond-mint-contract/wallets/users/alice.pem", "utf-8");
	return await ElrondHelper.new(
		config.elrond_node,
		aliceE,
		config.elrond_minter,
		io(config.elrond_ev_socket)
	);
}

async function web3TestHelper(): Promise<Web3Helper> {
	return await Web3Helper.new(
		config.heco_node,
		config.heco_pkey,
		config.heco_minter,
		//@ts-expect-error minter abi
		abi
	);
}

type TwoWayChain<E, I, H> = ChainEmitter<E, I, H> & ChainListener<H>;

async function listen2way<E1, E2, I, H>(b1: TwoWayChain<E1, I, H>, b2: TwoWayChain<E2, I, H>): Promise<void> {
	emitEvents(b1, b2);
	emitEvents(b2, b1);
}

const main = async () => {
	listen2way(await polkadotTestHelper(), await web3TestHelper());

    console.log('READY TO LISTEN EVENTS!');
};

main();
