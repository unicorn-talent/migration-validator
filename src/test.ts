import * as fs from 'fs';
import { Keyring } from '@polkadot/api';
import { waitReady } from '@polkadot/wasm-crypto';
import { io } from 'socket.io-client';

import config from './config';
import { ElrondHelper, emitEvents, PolkadotPalletHelper } from './index';

const main = async () => {
    //const private_key = await fs.promises.readFile(config.private_key, "utf-8");

    const keyring = new Keyring();
    await waitReady();
    const signersP = [keyring.addFromUri("//Alice", undefined, 'sr25519'), keyring.addFromUri("//Bob", undefined, 'sr25519'), keyring.addFromUri("//Charlie", undefined, 'sr25519')];
    console.log(signersP[0].address);

    const aliceE = await fs.promises.readFile("../XP.network-Elrond-Migration/elrond-mint-contract/wallets/users/alice.pem", "utf-8");
    const bobE = await fs.promises.readFile("../XP.network-Elrond-Migration/elrond-mint-contract/wallets/users/bob.pem", "utf-8");
    const carolE = await fs.promises.readFile("../XP.network-Elrond-Migration/elrond-mint-contract/wallets/users/carol.pem", "utf-8")
    const signersE = [aliceE, bobE, carolE];

    for (let i = 0; i < 2; i += 1) {
        const polka = await PolkadotPalletHelper.new(
            config.xnode,
            signersP[i]
        );

        const elrd = await ElrondHelper.new(
            config.elrond_node,
            signersE[i],
            config.elrond_minter,
            io(config.elrond_ev_socket)
        );


        emitEvents(polka, elrd);
        emitEvents(elrd, polka);
    }

    console.log('READY TO LISTEN EVENTS!');
};

main();
