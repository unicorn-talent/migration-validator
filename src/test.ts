import * as fs from 'fs';
import { createServer } from "http";
import { Keyring } from '@polkadot/api';
import { waitReady } from '@polkadot/wasm-crypto';
import { io as io_client } from "socket.io-client";

import { abi } from "./Minter.json";
import config from './config';
import { txEventSocket, TxnSocketServe } from './socket';
import { ElrondHelper, emitEvents, PolkadotPalletHelper, Web3Helper } from './index';
import {networkNFTMetaRepo, nftMetaDtoMapper, NFTMetaRepo, nftMetaService} from 'nft-db-client';

async function polkadotTestHelper(): Promise<PolkadotPalletHelper> {
	await waitReady();
	const keyring = new Keyring();
	return await PolkadotPalletHelper.new(
		config.xnode,
		keyring.createFromUri("//Alice", undefined, 'sr25519')
	);
}

async function elrondTestHelper(): Promise<ElrondHelper> {
    const aliceE = await fs.promises.readFile(config.private_key, "utf-8");
	return await ElrondHelper.new(
		config.elrond_node,
		aliceE,
		config.elrond_minter,
		io_client(config.elrond_ev_socket)
	);
}

async function web3TestHelpers(): Promise<Array<Web3Helper>> {
	return Promise.all(
		config.web3.map(async ({
			node,
			pkey,
			minter,
			erc1155,
			chain_ident,
			nonce
		}) => await Web3Helper.new(
			node,
			pkey,
			minter,
			//@ts-expect-error minter abi
			abi,
			erc1155,
			chain_ident,
			nonce
		))
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

function testNFTMetaRepo(): NFTMetaRepo {
	return networkNFTMetaRepo(nftMetaService(config.db_rest), nftMetaDtoMapper());
}

const main = async () => {
	const io = testSocketServer();
	emitEvents(
		io,
		testNFTMetaRepo(),
		[
			await polkadotTestHelper(),
			await elrondTestHelper(),
			...await web3TestHelpers()
		]
	);
    console.log('READY TO LISTEN EVENTS!');
};

main();
