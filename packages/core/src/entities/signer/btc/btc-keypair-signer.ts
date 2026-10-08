import type { HDKey } from '@scure/bip32';

import { assertBtcFeeIsNotAbsurd } from './assert-btc-fee';
import type { BtcSigningRequest, IBtcSigner } from './I-btc-signer';
import type { IBtcNodeProducer } from '../../derivation/btc/I-btc-node-producer';

export class BtcKeypairSigner implements IBtcSigner {
    constructor(private readonly nodeProducer: IBtcNodeProducer) {}

    public async sign({ psbt, utxos }: BtcSigningRequest): Promise<Buffer> {
        const node = await this.nodeProducer.getPortfolioDerivation();

        try {
            for (let i = 0; i < utxos.length; i++) {
                const u = utxos[i];
                let changeNode: HDKey | undefined;
                let addressNode: HDKey | undefined;

                try {
                    changeNode = node.deriveChild(u.derivationPath.change);
                    addressNode = changeNode.deriveChild(u.derivationPath.addressIndex);

                    const privateKey = addressNode.privateKey;

                    if (!privateKey) {
                        throw new Error(`Missing private key for input ${i}`);
                    }

                    if (!psbt.signIdx(privateKey, i)) {
                        throw new Error(`Invalid signature for input ${i}`);
                    }
                } finally {
                    addressNode?.wipePrivateData();
                    changeNode?.wipePrivateData();
                }
            }
        } finally {
            node.wipePrivateData();
        }

        psbt.finalize();

        assertBtcFeeIsNotAbsurd(psbt);

        return Buffer.from(psbt.extract());
    }
}
