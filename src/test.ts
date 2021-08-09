import * as fs from 'fs';
import { createServer } from "http";
import { Keyring } from '@polkadot/api';
import { waitReady } from '@polkadot/wasm-crypto';
import { io as io_client } from "socket.io-client";

import { abi } from "./Minter.json";
import {ChainEmitter, ChainIdentifier, ChainListener} from './chain_handler';
import config from './config';
import { txEventSocket, TxnSocketServe } from './socket';
import { ElrondHelper, emitEvents, PolkadotPalletHelper, Web3Helper } from './index';

async function polkadotTestHelper(): Promise<PolkadotPalletHelper> {
	await waitReady();
	const keyring = new Keyring();
	return await PolkadotPalletHelper.new(
		config.xnode,
		keyring.createFromUri("//Alice", undefined, 'sr25519')
	);
}

//@ts-expect-error stfu
async function elrondTestHelper(): Promise<ElrondHelper> {
    const aliceE = await fs.promises.readFile(config.private_key, "utf-8");
	return await ElrondHelper.new(
		config.elrond_node,
		aliceE,
		config.elrond_minter,
		io_client(config.elrond_ev_socket)
	);
}

async function web3TestHelper(): Promise<Web3Helper> {
	return await Web3Helper.new(
		config.heco_node,
		config.heco_pkey,
		config.heco_minter,
		//@ts-expect-error minter abi
		abi,
		"BSC",
	);
}

function testSocketServer(): TxnSocketServe {
	console.log("WARN: using permissive cors");
	const httpServ = createServer();

	const io = txEventSocket(httpServ, {
		path: "/txsocket/socket.io",
		cors: {
			origin: "*"
		}
	});

	httpServ.listen(config.tx_port, () => console.log(`tx socket listening @${config.tx_port}`));

	return io;
}


type TwoWayChain<E, I, H, Tx> = ChainEmitter<E, I, H> & ChainListener<H, Tx> & ChainIdentifier;

async function listen2way<E1, E2, I, H, Tx1, Tx2>(io: TxnSocketServe, b1: TwoWayChain<E1, I, H, Tx1>, b2: TwoWayChain<E2, I, H, Tx2>): Promise<void> {
	emitEvents(io, b1, b2);
	emitEvents(io, b2, b1);
}

const main = async () => {
	const io = testSocketServer();
	listen2way(io, await polkadotTestHelper(), await web3TestHelper());
    console.log('READY TO LISTEN EVENTS!');
};

main();
