import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useParseError } from '@safely/ux';

import { TEST_ID } from '@mobile/shared/constants';
import { Button, SlideButton, Text } from '@mobile/shared/ui';

import { styles } from './ConfirmationFooter.styles';
import type { ConfirmationState } from '../../ConfirmationScreen.types';

interface Props {
    onSend: () => void;
    onGoBack: () => void;
    state: ConfirmationState;
    isEstimating: boolean;
    onLedgerContinue?: () => void;
}

export const ConfirmationFooter = (props: Props) => {
    const { onSend, onGoBack, state, isEstimating, onLedgerContinue } = props;
    const { t } = useTranslation();

    const parseSendError = useParseError(
        {
            BtcSendDustError: 'confirmation.sendError.btc.dust',
            FlameInputsSpentError: 'confirmation.sendError.flame.inputsSpent'
        },
        { fallback: 'confirmation.sendError.default' }
    );

    const parseEstimateError = useParseError(
        {
            OutputsAreSpendingMoreThanInputsError:
                'confirmation.estimateError.btc.outputsAreSpendingMoreThanInputs',
            BtcInsufficientFundsForFeeError:
                'confirmation.estimateError.btc.insufficientFundsForFee',
            FlameInsufficientBalanceError: 'confirmation.estimateError.flame.insufficientBalance'
        },
        { fallback: 'confirmation.estimateError.default' }
    );

    const errorInfo = (() => {
        switch (state.type) {
            case 'error':
                return {
                    title: t('confirmation.sendError.title'),
                    message: parseSendError(state.error)
                };
            case 'estimateError':
                return {
                    title: t('confirmation.estimateError.title'),
                    message: parseEstimateError(state.error)
                };
            default:
                return null;
        }
    })();

    return (
        <View style={styles.container}>
            {(state.type === 'idle' || state.type === 'sending') &&
                (onLedgerContinue ? (
                    <Animated.View exiting={FadeOut.duration(150)}>
                        <Button
                            type="primary"
                            size="large"
                            disabled={isEstimating}
                            isLoading={state.type === 'sending'}
                            onPress={onLedgerContinue}
                        >
                            {t('confirmation.continueWithLedger')}
                        </Button>
                    </Animated.View>
                ) : (
                    <Animated.View exiting={FadeOut.duration(150)}>
                        <SlideButton
                            knobTestID={TEST_ID.confirmation.sliderKnob}
                            label={t('confirmation.slider.send')}
                            description={
                                isEstimating
                                    ? t('confirmation.slider.estimatingFee')
                                    : t('confirmation.slider.slideToConfirm')
                            }
                            disabled={isEstimating}
                            loading={state.type === 'sending'}
                            onSlideComplete={onSend}
                        />
                    </Animated.View>
                ))}
            {state.type === 'success' && (
                <Animated.View
                    style={styles.buttonContainer}
                    entering={FadeIn.duration(150)}
                    exiting={FadeOut.duration(150)}
                >
                    <Button
                        testID={TEST_ID.confirmation.backToWallet}
                        size="large"
                        type="secondary"
                        onPress={onGoBack}
                    >
                        {t('confirmation.slider.backToWallet')}
                    </Button>
                </Animated.View>
            )}
            {errorInfo && (
                <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
                    <View style={styles.errorTextBlock}>
                        <Text variant="labelL" color="accentRed" style={styles.errorText}>
                            {errorInfo.title}
                        </Text>
                        <Text variant="bodyM" color="accentRed" style={styles.errorText}>
                            {errorInfo.message}
                        </Text>
                    </View>
                </Animated.View>
            )}
        </View>
    );
};
