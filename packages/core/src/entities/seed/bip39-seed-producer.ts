import { mnemonicToSeed } from './bip39-seed';
import type { IMnemonicVault } from '../mnemonic';
import type { ISeedProducer } from './I-seed-producer';

export class BtcBip39SeedProducer implements ISeedProducer {
    constructor(private readonly vault: IMnemonicVault) {}

    public async getSeed(): Promise<Buffer> {
        const mnemonic = await this.vault.getMnemonic();
        const seed = await mnemonicToSeed(mnemonic.join(' '));

        try {
            return Buffer.from(seed);
        } finally {
            seed.fill(0);
        }
    }
}
