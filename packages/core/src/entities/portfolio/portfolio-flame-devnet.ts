import type { Logger } from '@safely/sync';
import { sPortfolioFlameDevnet, type SPortfolioFlameDevnet } from '@safely/sync-storage';

import type { IPortfolioFlameDevnet } from './I-portfolio';
import { PortfolioType } from './I-portfolio';
import { PortfolioIdFlameDevnet } from './portfolio-id-flame-devnet';
import type { PortfolioMeta } from './portfolio-meta';
import type { ISecureSecretEncryptor, ISilentSecretEncryptor } from '../../di';
import { FLAME_DEVNET_NETWORK } from '../blockchain';
import type { FlameWallet } from '../derivation';
import { DerivationChainItemFlame, ViewKeyFlameWallet } from '../derivation';
import { InvalidMnemonicError, PortfolioGenerationFailedError } from '../errors';
import type {
    IMnemonicAccessor,
    IMnemonicVault,
    IMnemonicVaultEncryptedSecretStored
} from '../mnemonic';
import { MNEMONIC_TYPE, MnemonicVault, validateMnemonic } from '../mnemonic';
import { BtcBip39SeedProducer } from '../seed';

export class PortfolioFlameDevnet implements IPortfolioFlameDevnet {
    public static async createSerializedPortfolio({
        encryptor,
        viewKeyEncryptor,
        mnemonicAccessor,
        meta,
        logger
    }: {
        encryptor: ISecureSecretEncryptor;
        viewKeyEncryptor: ISilentSecretEncryptor;
        mnemonicAccessor: IMnemonicAccessor & IMnemonicVault;
        meta: PortfolioMeta;
        logger?: Logger;
    }): Promise<SPortfolioFlameDevnet> {
        const log = logger?.child('PortfolioFlameDevnet');
        try {
            validateMnemonic(MNEMONIC_TYPE.BIP39, mnemonicAccessor.value);

            const id = PortfolioIdFlameDevnet.create(mnemonicAccessor);
            log?.info('creating portfolio', { id: id.toJSON() });

            const flame = await DerivationChainItemFlame.createSChainItem(
                new BtcBip39SeedProducer(mnemonicAccessor),
                FLAME_DEVNET_NETWORK,
                viewKeyEncryptor
            );
            const { encryptedSecret } = await MnemonicVault.fromMnemonicAccessor(
                encryptor,
                mnemonicAccessor
            );

            log?.info('portfolio created', { id: id.toJSON() });

            return sPortfolioFlameDevnet.toJson({
                type: PortfolioType.FLAME_DEVNET,
                id: id.toJSON(),
                meta,
                encryptedSecret,
                flame
            });
        } catch (error) {
            if (error instanceof InvalidMnemonicError) {
                throw error;
            }

            throw new PortfolioGenerationFailedError(undefined, { cause: error });
        }
    }

    // reads amounts from the view key alone; `buildTransfer` needs the accessor still open
    public static async createPreviewFlameWallet(
        mnemonicAccessor: IMnemonicAccessor & IMnemonicVault
    ): Promise<FlameWallet> {
        try {
            validateMnemonic(MNEMONIC_TYPE.BIP39, mnemonicAccessor.value);

            const seedProducer = new BtcBip39SeedProducer(mnemonicAccessor);
            const { viewKey, addresses } = await DerivationChainItemFlame.derive(
                seedProducer,
                FLAME_DEVNET_NETWORK
            );
            return new ViewKeyFlameWallet(
                PortfolioIdFlameDevnet.create(mnemonicAccessor),
                FLAME_DEVNET_NETWORK,
                addresses,
                () => Promise.resolve(viewKey),
                seedProducer
            );
        } catch (error) {
            if (error instanceof InvalidMnemonicError) {
                throw error;
            }

            throw new PortfolioGenerationFailedError(undefined, { cause: error });
        }
    }

    public static restore(
        encryptor: ISecureSecretEncryptor,
        viewKeyEncryptor: ISilentSecretEncryptor,
        sPortfolio: SPortfolioFlameDevnet
    ) {
        const mnemonicVault = new MnemonicVault(encryptor, sPortfolio.encryptedSecret);
        const id = new PortfolioIdFlameDevnet(sPortfolio.id);

        return new PortfolioFlameDevnet({
            id,
            meta: sPortfolio.meta,
            mnemonicVault,
            flame: new DerivationChainItemFlame({
                ownerId: id,
                network: FLAME_DEVNET_NETWORK,
                sChainItem: sPortfolio.flame,
                viewKeyEncryptor,
                seedProducer: new BtcBip39SeedProducer(mnemonicVault)
            })
        });
    }

    public readonly id: PortfolioIdFlameDevnet;

    public readonly meta: PortfolioMeta;

    public readonly type = PortfolioType.FLAME_DEVNET;

    public readonly flame: DerivationChainItemFlame;

    private readonly mnemonicVault: IMnemonicVaultEncryptedSecretStored;

    public get networkType() {
        return this.id.network;
    }

    constructor(params: {
        id: PortfolioIdFlameDevnet;
        meta: PortfolioMeta;
        mnemonicVault: IMnemonicVaultEncryptedSecretStored;
        flame: DerivationChainItemFlame;
    }) {
        this.id = params.id;
        this.meta = params.meta;
        this.mnemonicVault = params.mnemonicVault;
        this.flame = params.flame;
    }

    public getMnemonic(): Promise<string[]> {
        return this.mnemonicVault.getMnemonic();
    }

    public toJSON(): SPortfolioFlameDevnet {
        return sPortfolioFlameDevnet.toJson({
            type: this.type,
            id: this.id.toJSON(),
            meta: this.meta,
            encryptedSecret: this.mnemonicVault.encryptedSecret,
            flame: this.flame.toJSON()
        });
    }

    public jsonArrayId(): string {
        return sPortfolioFlameDevnet.jsonArrayId(this.toJSON());
    }
}
