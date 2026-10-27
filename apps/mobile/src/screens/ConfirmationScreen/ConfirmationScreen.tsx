import { useNavigation } from '@react-navigation/core';
import { CommonActions, type StaticScreenProps } from '@react-navigation/native';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { State } from 'react-native-ble-plx';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { LedgerSigningCancelledError, PortfolioType } from '@safely/core';
import type { SendFormResult } from '@safely/ux';
import {
    useActiveFiat,
    useActivePortfolio,
    useActivePortfolioLedgerIndex,
    useActivePortfolioNetworkBadge,
    useActiveWalletMeta,
    useAnalytics,
    useAppContext,
    useEstimateAssetTransfer,
    useNumberFormatter,
    selectSendChain,
    useSendAssetTransfer,
    useSendChains
} from '@safely/ux';

import { AssetLogo } from '@mobile/entities/asset';
import { getBluetoothState, useBleManager } from '@mobile/features/ledger';
import { TransactionFee } from '@mobile/screens/ConfirmationScreen/components/TransactionFee';
import { TransactionSendResult } from '@mobile/screens/ConfirmationScreen/components/TransactionSendResult';
import { Checkmark96, Icon, List, Screen, Text } from '@mobile/shared/ui';

import {
    Amount,
    ChainFeeSubvalue,
    ChainRecipientCells,
    MaxAmount,
    ConfirmationFooter,
    Wallet,
    TransactionCell
} from './components';
import { IS_ESTIMATE_ENABLED_BY_CHAIN } from './ConfirmationScreen.chains';
import { styles } from './ConfirmationScreen.styles';
import type { ConfirmationState } from './ConfirmationScreen.types';

export type SendConfirmationParams = {
    confirmationResult: SendFormResult;
    onSuccess?: () => void;
};

export type ConfirmationScreenProps = StaticScreenProps<SendConfirmationParams>;

export const ConfirmationScreen = (props: ConfirmationScreenProps) => {
    const { confirmationResult, onSuccess } = props.route.params;
    const { blockchain } = confirmationResult;

    const [confirmationState, setConfirmationState] = useState<ConfirmationState>({ type: 'idle' });
    const fromAddress = selectSendChain(useSendChains(), blockchain)?.address ?? '';

    const { data: txTemplate, error: estimateQueryError } = useEstimateAssetTransfer(
        confirmationResult,
        { enabled: IS_ESTIMATE_ENABLED_BY_CHAIN[blockchain](confirmationState.type) }
    );
    const estimateError = confirmationState.type === 'idle' ? estimateQueryError : null;
    const { mutateAsync: send, data: sendResult } = useSendAssetTransfer();

    const { t } = useTranslation();
    const analytics = useAnalytics();
    const fiat = useActiveFiat();
    const navigation = useNavigation();
    const getBleManager = useBleManager();
    const activePortfolio = useActivePortfolio();
    const activeWalletMeta = useActiveWalletMeta();
    const networkBadge = useActivePortfolioNetworkBadge();
    const activeLedgerIndex = useActivePortfolioLedgerIndex();
    const { logger } = useAppContext();
    const formatter = useNumberFormatter();

    const onSend = useCallback(async () => {
        const fiatAmount = confirmationResult.amount.fiatAssetAmount.amount.toNumber();
        const cryptoCurrency = confirmationResult.amount.cryptoAssetAmount.asset.symbol;

        try {
            setConfirmationState({ type: 'sending' });
            await send(txTemplate);
            onSuccess?.();
            notificationAsync(NotificationFeedbackType.Success);
            setConfirmationState({ type: 'success' });
            void analytics.trackSendFinish({
                cryptoCurrency,
                fiatAmount,
                fiatSymbol: fiat.id.symbol
            });
        } catch (error) {
            if (error instanceof LedgerSigningCancelledError) {
                setConfirmationState({ type: 'idle' });

                return;
            }

            logger.error('[ConfirmationScreen] send failed', error);
            notificationAsync(NotificationFeedbackType.Error);
            setConfirmationState({ type: 'error', error });
            void analytics.trackSendFinish({
                cryptoCurrency,
                fiatAmount,
                fiatSymbol: fiat.id.symbol,
                error
            });
        }
    }, [send, txTemplate, onSuccess, logger, confirmationResult, analytics, fiat.id.symbol]);

    const isLedger = activePortfolio.type === PortfolioType.LEDGER;

    const onLedgerContinue = useCallback(async () => {
        const state = await getBluetoothState(getBleManager());

        if (state === State.PoweredOn) {
            void onSend();

            return;
        }

        navigation.dispatch(
            CommonActions.navigate(
                state === State.PoweredOff
                    ? 'BluetoothDisabledModal'
                    : 'BluetoothAccessRequiredModal',
                {
                    onReady: () => {
                        void onSend();
                    }
                }
            )
        );
    }, [navigation, onSend, getBleManager]);

    const displayState = useMemo(() => {
        if (estimateError) {
            return { type: 'estimateError' as const, error: estimateError };
        }

        return confirmationState;
    }, [confirmationState, estimateError]);

    const onGoBack = useCallback(() => {
        navigation.getParent()?.goBack();
    }, [navigation]);

    const asset = confirmationResult.amount.cryptoAssetAmount.asset;

    const TitleComponent = useMemo(() => {
        switch (confirmationState.type) {
            case 'idle':
            case 'sending':
            case 'error':
            case 'estimateError':
                return (
                    <Animated.View
                        key={confirmationState.type}
                        exiting={FadeOut.duration(150)}
                        style={styles.titleWithLogoContainer}
                    >
                        <View style={styles.assetLogoContainer}>
                            <AssetLogo asset={asset} size="xlarge" />
                        </View>
                        <Text style={styles.title} variant="titleM">
                            {t('confirmation.title', {
                                symbol: asset.symbol
                            })}
                        </Text>
                    </Animated.View>
                );
            case 'success':
                return (
                    <Animated.View
                        key={confirmationState.type}
                        entering={FadeIn.duration(150).delay(150)}
                        exiting={FadeOut.duration(150)}
                        style={styles.titleWithLogoContainer}
                    >
                        <Icon icon={Checkmark96} color="accentGreen" />
                        <Text style={styles.title} variant="titleM">
                            {t('confirmation.success')}
                        </Text>
                    </Animated.View>
                );
            default:
                return null;
        }
    }, [confirmationState.type, asset, t]);

    return (
        <Screen>
            <Screen.Header>
                {confirmationState.type !== 'success' && <Screen.Header.BackButton />}
                <Screen.Header.Title />
            </Screen.Header>
            <View style={styles.container}>
                {TitleComponent}
                <List style={styles.list}>
                    <List.Group style={styles.listGroup}>
                        <TransactionCell
                            title={t('confirmation.from')}
                            value={
                                <Wallet
                                    address={fromAddress}
                                    meta={{
                                        kind: 'portfolio',
                                        meta: activeWalletMeta,
                                        tag:
                                            activeLedgerIndex !== undefined
                                                ? activeLedgerIndex + 1
                                                : undefined
                                    }}
                                    networkBadge={networkBadge}
                                />
                            }
                        />
                        <TransactionCell
                            title={t('confirmation.to')}
                            value={
                                <Wallet
                                    address={confirmationResult.recipient.address}
                                    meta={confirmationResult.recipientMeta}
                                    networkBadge={networkBadge}
                                />
                            }
                        />
                        <ChainRecipientCells form={confirmationResult} />
                    </List.Group>
                    <List.Group style={styles.listGroup}>
                        {confirmationResult.isMax ? (
                            <MaxAmount amount={txTemplate?.request.amount} />
                        ) : (
                            <Amount
                                fiatAmount={confirmationResult.amount.fiatAssetAmount.format(
                                    formatter
                                )}
                                cryptoAmount={confirmationResult.amount.cryptoAssetAmount.format(
                                    formatter,
                                    { fullPrecision: true }
                                )}
                                inputType={confirmationResult.amount.inputType}
                            />
                        )}
                        <TransactionFee
                            estimation={txTemplate?.estimation}
                            subvalue={
                                <ChainFeeSubvalue
                                    form={confirmationResult}
                                    estimation={txTemplate?.estimation}
                                />
                            }
                        />
                    </List.Group>
                    {!!sendResult && (
                        <List.Group style={styles.listGroup}>
                            <TransactionSendResult sendResult={sendResult} />
                        </List.Group>
                    )}
                </List>
                <ConfirmationFooter
                    onSend={onSend}
                    onGoBack={onGoBack}
                    state={displayState}
                    isEstimating={!txTemplate}
                    onLedgerContinue={isLedger ? onLedgerContinue : undefined}
                />
            </View>
        </Screen>
    );
};
