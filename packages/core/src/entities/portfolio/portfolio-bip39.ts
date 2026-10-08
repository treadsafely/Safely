import type { Logger } from '@safely/sync';
import {
    sDerivation,
    type SDerivation,
    type SPortfolioBip39,
    sPortfolioBip39
} from '@safely/sync-storage';

import type { ReadOnlyCredential } from '../auth-cert';
import {
    Bip39Derivation,
    DerivationChainItemBtcSeed,
    DerivationChainItemFlame
} from '../derivation';
import type { IPortfolioBip39, PortfolioSecretRevealedStatus } from './I-portfolio';
import { PortfolioType } from './I-portfolio';
import type { PortfolioIdBip39 } from './portfolio-id-bip39';
import { toPortfolioIdBip39 } from './portfolio-id-bip39';
import type { PortfolioMeta } from './portfolio-meta';
import { PortfolioNetworkType } from './portfolio-network-type';
import type { ISecretEncryptor } from '../../di';
import type { Id } from '../../utils';
import { BtcWalletType, flameNetworkByPortfolioNetworkType } from '../blockchain';
import { InvalidMnemonicError, PortfolioGenerationFailedError } from '../errors';
import type {
    IMnemonicAccessor,
    IMnemonicVault,
    IMnemonicVaultEncryptedSecretStored
} from '../mnemonic';
import { MNEMONIC_TYPE, validateMnemonic } from '../mnemonic';
import { MnemonicResource, MnemonicVault } from '../mnemonic';
import { BtcBip39SeedProducer } from '../seed';

const FLAME_NETWORK_TYPE = PortfolioNetworkType.TESTNET;

export class PortfolioBip39 implements IPortfolioBip39 {
    public static async createSerializedPortfolio({
        encryptor,
        mnemonicAccessor,
        id,
        options,
        logger,
        meta
    }: {
        encryptor: ISecretEncryptor;
        mnemonicAccessor: IMnemonicAccessor & IMnemonicVault;
        id: PortfolioIdBip39;
        meta: PortfolioMeta;
        options?: {
            seedRevealedFromDevice?: string;
        };
        logger?: Logger;
    }): Promise<SPortfolioBip39> {
        const log = logger?.child('PortfolioBip39');
        log?.info('creating portfolio', { id: id.toJSON() });
        try {
            validateMnemonic(MNEMONIC_TYPE.BIP39, mnemonicAccessor.value);

            const derivationIndex = 0;
            const seedProducer = new BtcBip39SeedProducer(mnemonicAccessor);
            const xpub = await DerivationChainItemBtcSeed.getXpub({
                seedProducer,
                walletType: BtcWalletType.NATIVE_SEGWIT,
                network: id.network,
                derivationIndex
            });
            const flame =
                id.network === FLAME_NETWORK_TYPE
                    ? await DerivationChainItemFlame.createSChainItem(
                          seedProducer,
                          flameNetworkByPortfolioNetworkType(id.network)
                      )
                    : null;

            const encryptedSecret = (
                await MnemonicVault.fromMnemonicAccessor(encryptor, mnemonicAccessor)
            ).encryptedSecret;

            const secretRevealedStatus = options?.seedRevealedFromDevice
                ? {
                      revealedAt: Date.now(),
                      revealedFromDevice: options.seedRevealedFromDevice
                  }
                : null;

            log?.info('portfolio created', { id: id.toJSON() });

            return sPortfolioBip39.toJson({
                type: PortfolioType.BIP39,
                id: id.toJSON(),
                meta,
                encryptedSecret,
                secretRevealedStatus,
                derivations: [
                    sDerivation.toJson({ index: derivationIndex, chains: { btc: { xpub }, flame } })
                ]
            });
        } catch (error) {
            if (error instanceof InvalidMnemonicError) {
                throw error;
            }

            throw new PortfolioGenerationFailedError(undefined, { cause: error });
        }
    }

    public static restore(secureEncryptor: ISecretEncryptor, sPortfolio: SPortfolioBip39) {
        const mnemonicVault = new MnemonicVault(secureEncryptor, sPortfolio.encryptedSecret);
        return new PortfolioBip39({
            id: toPortfolioIdBip39(sPortfolio.id),
            meta: sPortfolio.meta,
            secretRevealedStatus: sPortfolio.secretRevealedStatus
                ? {
                      revealedAt: new Date(sPortfolio.secretRevealedStatus.revealedAt),
                      revealedFromDevice: sPortfolio.secretRevealedStatus.revealedFromDevice
                  }
                : null,
            derivations: self =>
                sPortfolio.derivations.map(d => this.restoreDerivation(mnemonicVault, self, d)),
            mnemonicVault
        });
    }

    private static restoreDerivation(
        mnemonicVault: MnemonicVault,
        portfolioRef: PortfolioBip39,
        sDerivationVal: SDerivation
    ): Bip39Derivation {
        return new Bip39Derivation(portfolioRef, sDerivationVal.index, derivationRef => ({
            btc: new DerivationChainItemBtcSeed({
                sDerivation: sDerivationVal.chains.btc,
                derivationIndex: sDerivationVal.index,
                seedProducer: new BtcBip39SeedProducer(mnemonicVault),
                derivationRef
            }),
            ...(sDerivationVal.chains.flame && {
                flame: new DerivationChainItemFlame({
                    derivationRef,
                    sChainItem: sDerivationVal.chains.flame
                })
            })
        }));
    }

    public readonly id: PortfolioIdBip39;

    public readonly meta: PortfolioMeta;

    public readonly secretRevealedStatus: PortfolioSecretRevealedStatus;

    public readonly type = PortfolioType.BIP39;

    public get networkType() {
        return this.id.network;
    }

    public readonly derivations: Bip39Derivation[];

    private readonly mnemonicVault: IMnemonicVaultEncryptedSecretStored;

    constructor(params: {
        id: PortfolioIdBip39;
        meta: PortfolioMeta;
        secretRevealedStatus: PortfolioSecretRevealedStatus;
        derivations: Bip39Derivation[] | ((self: PortfolioBip39) => Bip39Derivation[]);
        mnemonicVault: IMnemonicVaultEncryptedSecretStored;
    }) {
        this.id = params.id;
        this.meta = params.meta;
        this.secretRevealedStatus = params.secretRevealedStatus;
        this.derivations = Array.isArray(params.derivations)
            ? params.derivations
            : params.derivations(this);
        this.mnemonicVault = params.mnemonicVault;

        if (!this.derivations.length) {
            throw new Error('Derivations cannot be empty.');
        }
    }

    public withoutDerivation(index: number): PortfolioBip39 {
        if (this.derivations.length === 1) {
            throw new Error('Cannot remove last derivation.');
        }

        return new PortfolioBip39({
            id: this.id,
            meta: this.meta,
            secretRevealedStatus: this.secretRevealedStatus,
            mnemonicVault: this.mnemonicVault,
            derivations: this.derivations.filter(d => d.index !== index)
        });
    }

    public async withAddedNextDerivation(): Promise<PortfolioBip39> {
        const nextIndex = Math.max(...this.derivations.map(d => d.index)) + 1;
        return this.withAddedDerivation(nextIndex);
    }

    public async withAddedDerivation(index: number): Promise<PortfolioBip39> {
        const mnemonic = await this.mnemonicVault.getMnemonic();
        using mnemonicResource = new MnemonicResource(mnemonic);

        const seedProducer = new BtcBip39SeedProducer(mnemonicResource);

        const xpub = await DerivationChainItemBtcSeed.getXpub({
            seedProducer,
            network: this.networkType,
            derivationIndex: index,
            walletType: BtcWalletType.NATIVE_SEGWIT
        });

        return new PortfolioBip39({
            id: this.id,
            meta: this.meta,
            secretRevealedStatus: this.secretRevealedStatus,
            mnemonicVault: this.mnemonicVault,
            derivations: self => {
                const newDerivation = new Bip39Derivation(self, index, derivationRef => ({
                    btc: DerivationChainItemBtcSeed.generate({
                        xpub,
                        seedProducer,
                        derivationIndex: index,
                        derivationRef
                    })
                }));
                return [...this.derivations, newDerivation].sort((a, b) => a.index - b.index);
            }
        });
    }

    public getDerivation(id: Id): Bip39Derivation | undefined {
        return this.derivations.find(d => d.id.isEq(id));
    }

    public getDerivations(): Bip39Derivation[] {
        return this.derivations;
    }

    public getMnemonic(): Promise<string[]> {
        return this.mnemonicVault.getMnemonic();
    }

    public async createReadOnlyCredential(
        encryptor: ISecretEncryptor,
        derivationIndex: number = this.derivations[0].index
    ): Promise<ReadOnlyCredential> {
        const vault = new MnemonicVault(encryptor, this.mnemonicVault.encryptedSecret);
        const seedProducer = new BtcBip39SeedProducer(vault);

        return DerivationChainItemBtcSeed.createReadOnlyCredential({
            seedProducer,
            walletType: BtcWalletType.NATIVE_SEGWIT,
            network: this.networkType,
            derivationIndex
        });
    }

    public toJSON(): SPortfolioBip39 {
        return sPortfolioBip39.toJson({
            type: this.type,
            id: this.id.toJSON(),
            encryptedSecret: this.mnemonicVault.encryptedSecret,
            meta: this.meta,
            secretRevealedStatus: this.secretRevealedStatus
                ? {
                      revealedAt: this.secretRevealedStatus.revealedAt.getTime(),
                      revealedFromDevice: this.secretRevealedStatus.revealedFromDevice
                  }
                : null,
            derivations: this.derivations.map(d => d.toJSON())
        });
    }

    public jsonArrayId(): string {
        return sPortfolioBip39.jsonArrayId(this.toJSON());
    }
}
