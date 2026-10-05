import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';
import { GetAppAndVersionCommand, isSuccessCommandResult } from '@ledgerhq/device-management-kit';
import { SignerBtcBuilder } from '@ledgerhq/device-signer-kit-bitcoin';

import { awaitDeviceAction } from './await-device-action';
import { buildLedgerAccountPath } from './ledger-account-path';
import { BtcXpub } from '../blockchain-api';
import { BtcNetwork, BtcWalletType } from '../entities/blockchain';
import { BtcWalletId } from '../entities/derivation/btc/btc-wallet-id';
import type { BtcWalletReadOnly } from '../entities/derivation/btc/I-btc-wallet';
import { LedgerAppVersionUnknownError } from '../entities/errors';

export type LedgerAccount = {
    index: number;
    xpub: string;
    address: string;
};

export type DiscoverLedgerAccountsOptions = {
    startIndex?: number;
    count?: number;
};

const LEDGER_DISCOVERY_OWNER = 'ledger-discovery';
const APP_VERSION_PATTERN = /^\d+\.\d+/;

export class LedgerController {
    constructor(
        private readonly ledgerKit: DeviceManagementKit,
        private readonly sessionId: string
    ) {}

    public async discoverAccounts(
        options: DiscoverLedgerAccountsOptions = {}
    ): Promise<LedgerAccount[]> {
        const { startIndex = 0, count = 10 } = options;
        const bitcoinApp = this.buildBitcoinApp();

        const accounts: LedgerAccount[] = [];

        for (let index = startIndex; index < startIndex + count; index++) {
            const path = buildLedgerAccountPath(BtcNetwork.MAINNET, index);

            const { extendedPublicKey } = await awaitDeviceAction(
                bitcoinApp.getExtendedPublicKey(path, {
                    checkOnDevice: false,
                    skipOpenApp: true
                })
            );

            accounts.push({
                index,
                xpub: extendedPublicKey,
                address: BtcXpub.deriveAddress(
                    extendedPublicKey,
                    BtcNetwork.MAINNET,
                    BtcWalletType.NATIVE_SEGWIT
                )
            });
        }

        return accounts;
    }

    public async getMasterFingerprint(): Promise<Buffer> {
        const { masterFingerprint } = await awaitDeviceAction(
            this.buildBitcoinApp().getMasterFingerprint({ skipOpenApp: true })
        );

        return Buffer.from(masterFingerprint);
    }

    public async getAppVersion(): Promise<string> {
        const result = await this.ledgerKit.sendCommand({
            sessionId: this.sessionId,
            command: new GetAppAndVersionCommand()
        });

        if (!isSuccessCommandResult(result) || !APP_VERSION_PATTERN.test(result.data.version)) {
            throw new LedgerAppVersionUnknownError();
        }

        return result.data.version;
    }

    private buildBitcoinApp() {
        return new SignerBtcBuilder({ dmk: this.ledgerKit, sessionId: this.sessionId }).build();
    }
}

export const ledgerAccountToBtcWallet = (
    account: LedgerAccount,
    network: BtcNetwork
): BtcWalletReadOnly => ({
    id: new BtcWalletId(LEDGER_DISCOVERY_OWNER, account.address),
    type: BtcWalletType.NATIVE_SEGWIT,
    address: account.address,
    network,
    xpub: account.xpub
});
