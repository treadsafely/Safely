import type { ComponentType } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

import type { CryptoAsset, Recipient } from '@safely/core';
import { BLOCKCHAIN_NAME, BTC_ASSET, FLAME_ASSET, FlameAddress } from '@safely/core';
import type { PortfolioWallets } from '@safely/ux';
import {
    useActiveFlameWallet,
    useActivePortfolioWallets,
    useActivePortfolioNetworkBadge,
    useIsActivePortfolioWatchOnly,
    useReceiveInfo
} from '@safely/ux';

import { FlameLogo } from '@mobile/entities/flame';
import { GradientBackground, Image, Screen, SegmentedControl, Text } from '@mobile/shared/ui';

import { QRCodeBlock } from './components/QRCodeBlock/QRCodeBlock';
import { ReceiveActions } from './components/ReceiveActions';
import { ReceiveCopyToastProvider } from './components/ReceiveCopyToastProvider';
import { styles } from './ReceiveAssetModal.styles';

const GRADIENT_HEIGHT = 600;

const BtcReceive = () => {
    const { displayAddress } = useReceiveInfo();
    const isWatchOnly = useIsActivePortfolioWatchOnly();
    const networkBadge = useActivePortfolioNetworkBadge();

    return (
        <>
            <QRCodeBlock
                address={displayAddress}
                logo={<Image source={BTC_ASSET.image} style={styles.logo} />}
                isWatchOnly={isWatchOnly}
                networkBadge={networkBadge}
            />
            <ReceiveActions address={displayAddress} />
        </>
    );
};

const FlameReceive = () => {
    const wallet = useActiveFlameWallet();
    const networkBadge = useActivePortfolioNetworkBadge();
    const tracking = FlameAddress.toTracking(wallet.predicate, wallet.network);

    return (
        <>
            <QRCodeBlock
                address={wallet.address}
                logo={<FlameLogo background="black" size="large" />}
                isWatchOnly={false}
                networkBadge={networkBadge}
                addressParts={
                    tracking ? FlameAddress.splitByTracking(wallet.address, tracking) : undefined
                }
            />
            <ReceiveActions address={wallet.address} />
        </>
    );
};

type ChainReceive = {
    asset: CryptoAsset;
    brand: 'bitcoin' | 'flame';
    hasChain: (wallets: PortfolioWallets) => boolean;
    Content: ComponentType;
};

const RECEIVE_BY_CHAIN: Record<Recipient['blockchain'], ChainReceive> = {
    [BLOCKCHAIN_NAME.BTC]: {
        asset: BTC_ASSET,
        brand: 'bitcoin',
        hasChain: wallets => wallets.btc !== null,
        Content: BtcReceive
    },
    [BLOCKCHAIN_NAME.FLAME]: {
        asset: FLAME_ASSET,
        brand: 'flame',
        hasChain: wallets => wallets.flame !== null,
        Content: FlameReceive
    }
};

const CHAIN_ORDER: readonly Recipient['blockchain'][] = [
    BLOCKCHAIN_NAME.BTC,
    BLOCKCHAIN_NAME.FLAME
];

export const ReceiveAssetModal = () => {
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const portfolioWallets = useActivePortfolioWallets();
    const chains = CHAIN_ORDER.filter(chain => RECEIVE_BY_CHAIN[chain].hasChain(portfolioWallets));
    const [selected, setSelected] = useState(chains[0]);
    const chain = selected !== undefined && chains.includes(selected) ? selected : chains[0];

    if (chain === undefined) {
        return null;
    }

    const { asset, brand, Content } = RECEIVE_BY_CHAIN[chain];
    const tabs = chains.map(value => ({ value, title: RECEIVE_BY_CHAIN[value].asset.symbol }));

    return (
        <Screen>
            <GradientBackground
                color={theme.colors.brand[brand]}
                position="bottom"
                height={GRADIENT_HEIGHT}
            />
            <Screen.Header>
                <Screen.Header.Title>
                    {tabs.length > 1 && (
                        <SegmentedControl segments={tabs} value={chain} onChange={setSelected} />
                    )}
                </Screen.Header.Title>
                <Screen.Header.CloseButton />
            </Screen.Header>
            <Screen.Content>
                <ReceiveCopyToastProvider>
                    <View style={styles.textContainer}>
                        <Text textAlign="center" variant="titleM">
                            {t('receiveAsset.title', { symbol: asset.symbol })}
                        </Text>
                        <Text textAlign="center" variant="bodyL" color="secondary">
                            {t('receiveAsset.description', { name: asset.name })}
                        </Text>
                    </View>
                    <Content />
                </ReceiveCopyToastProvider>
            </Screen.Content>
        </Screen>
    );
};
