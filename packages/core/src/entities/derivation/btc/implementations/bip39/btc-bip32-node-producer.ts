import { HDKey } from '@scure/bip32';

import type { BtcNetwork, BtcWalletType } from '../../../../blockchain';
import { BtcDerivationPath } from '../../../../blockchain';
import type { ISeedProducer } from '../../../../seed/I-seed-producer';
import type { IBtcNodeProducer } from '../../I-btc-node-producer';

export class BtcBip32NodeProducer implements IBtcNodeProducer {
    constructor(
        protected readonly seedProducer: ISeedProducer,
        private readonly walletType: BtcWalletType,
        private readonly network: BtcNetwork,
        private readonly derivationIndex: number
    ) {}

    private getDerivationIndexes(): number[] {
        return new BtcDerivationPath(
            this.walletType,
            this.network,
            this.derivationIndex
        ).accountIndexes();
    }

    public async getPortfolioDerivation(): Promise<HDKey> {
        const seed = await this.seedProducer.getSeed();
        const chain: HDKey[] = [];

        try {
            chain.push(HDKey.fromMasterSeed(seed));

            for (const index of this.getDerivationIndexes()) {
                const parent = chain[chain.length - 1];

                chain.push(parent.deriveChild(index));
                parent.wipePrivateData();
            }

            const account = chain[chain.length - 1];

            if (!account.privateKey || !account.publicKey) {
                throw new Error('Derived node has no private key (invalid derivation or seed).');
            }
            return account;
        } catch (error) {
            chain.forEach(node => node.wipePrivateData());
            throw error;
        } finally {
            seed.fill(0);
        }
    }
}
