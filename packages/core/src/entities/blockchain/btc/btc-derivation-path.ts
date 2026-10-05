import { BtcNetwork, BtcWalletType } from './btc-network';
import { assertUnreachable } from '../../../utils/types';

const HARDENED_OFFSET = 0x80000000;

export class BtcDerivationPath {
    constructor(
        private readonly walletType: BtcWalletType,
        private readonly network: BtcNetwork,
        private readonly accountIndex: number
    ) {}

    public account(): string {
        return `m/${this.purpose()}'/${this.coinType()}'/${this.accountIndex}'`;
    }

    public accountIndexes(): number[] {
        return [this.purpose(), this.coinType(), this.accountIndex].map(
            index => index + HARDENED_OFFSET
        );
    }

    public address(change: number, addressIndex: number): string {
        return `${this.account()}/${change}/${addressIndex}`;
    }

    private purpose(): number {
        switch (this.walletType) {
            case BtcWalletType.NATIVE_SEGWIT:
                return 84;
            default:
                assertUnreachable(this.walletType);
        }
    }

    private coinType(): number {
        switch (this.network) {
            case BtcNetwork.MAINNET:
                return 0;
            case BtcNetwork.TESTNET:
                return 1;
            default:
                assertUnreachable(this.network);
        }
    }
}
