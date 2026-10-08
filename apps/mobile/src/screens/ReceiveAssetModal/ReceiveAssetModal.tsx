import type { StaticScreenProps } from '@react-navigation/native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

import { BTC_ASSET, FLAME_ASSET } from '@safely/core';
import {
    useActiveFlameSource,
    useIsActivePortfolioTestnet,
    useIsActivePortfolioWatchOnly,
    useReceiveInfo
} from '@safely/ux';

import { FlameLogo } from '@mobile/entities/flame';
import { GradientBackground, Image, Screen, SegmentedControl, Text } from '@mobile/shared/ui';

import { QRCodeBlock } from './components/QRCodeBlock/QRCodeBlock';
import { ReceiveActions } from './components/ReceiveActions';
import { ReceiveCopyToastProvider } from './components/ReceiveCopyToastProvider';
import { styles } from './ReceiveAssetModal.styles';

type ReceiveTab = 'btc' | 'flm';

const GRADIENT_HEIGHT = 600;
const FLAME_ADDRESS_LINES = 2;

const TABS = [
    { value: 'btc', title: BTC_ASSET.symbol },
    { value: 'flm', title: FLAME_ASSET.symbol }
] as const satisfies readonly { value: ReceiveTab; title: string }[];

type ReceiveAssetModalProps = StaticScreenProps<{ initialTab?: ReceiveTab } | undefined>;

export const ReceiveAssetModal = (props: ReceiveAssetModalProps) => {
    const { route } = props;
    const flameSource = useActiveFlameSource();
    const hasFlame = flameSource !== null;
    const [selectedTab, setTab] = useState<ReceiveTab>(route.params?.initialTab ?? 'btc');
    const tab = hasFlame ? selectedTab : 'btc';
    const { t } = useTranslation();
    const { theme } = useUnistyles();

    const receiveInfo = useReceiveInfo();
    const isWatchOnly = useIsActivePortfolioWatchOnly();
    const isPortfolioTestnet = useIsActivePortfolioTestnet();

    const isBtc = tab === 'btc';
    const symbol = isBtc ? BTC_ASSET.symbol : FLAME_ASSET.symbol;
    const name = isBtc ? BTC_ASSET.name : FLAME_ASSET.name;
    const address = isBtc ? receiveInfo.displayAddress : flameSource?.chain.wallet.address;

    return (
        <Screen>
            <GradientBackground
                color={isBtc ? theme.colors.brand.bitcoin : theme.colors.brand.flame}
                position="bottom"
                height={GRADIENT_HEIGHT}
            />
            <Screen.Header>
                <Screen.Header.Title>
                    {hasFlame && <SegmentedControl segments={TABS} value={tab} onChange={setTab} />}
                </Screen.Header.Title>
                <Screen.Header.CloseButton />
            </Screen.Header>
            <Screen.Content>
                <ReceiveCopyToastProvider>
                    <View style={styles.textContainer}>
                        <Text textAlign="center" variant="titleM">
                            {t('receiveAsset.title', { symbol })}
                        </Text>
                        <Text textAlign="center" variant="bodyL" color="secondary">
                            {t('receiveAsset.description', { name })}
                        </Text>
                    </View>
                    {address !== undefined && (
                        <>
                            <QRCodeBlock
                                address={address}
                                logo={
                                    isBtc ? (
                                        <Image source={BTC_ASSET.image} style={styles.logo} />
                                    ) : (
                                        <FlameLogo background="black" size="large" />
                                    )
                                }
                                isWatchOnly={isBtc && isWatchOnly}
                                isTestnet={isPortfolioTestnet}
                                addressLines={isBtc ? undefined : FLAME_ADDRESS_LINES}
                            />
                            <ReceiveActions address={address} />
                        </>
                    )}
                </ReceiveCopyToastProvider>
            </Screen.Content>
        </Screen>
    );
};
