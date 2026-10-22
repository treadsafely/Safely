import { useNavigation } from '@react-navigation/core';
import type { StaticScreenProps } from '@react-navigation/native';
import { useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextInput } from 'react-native';
import { View } from 'react-native';
import PagerView from 'react-native-pager-view';

import { assertUnreachable } from '@safely/core';
import type { SendFormResult } from '@safely/ux';
import {
    useSendForm,
    useNumberFormatter,
    useActiveFiat,
    useAppContext,
    type SendFormView
} from '@safely/ux';

import { TEST_ID } from '@mobile/shared/constants';
import { Button, Screen, Text } from '@mobile/shared/ui';
import { ArrowLeft16, Icon } from '@mobile/shared/ui/Icon';

import { AmountPagerPage } from './AmountPagerPage';
import { AmountHeaderSubtitle, RecipientHeaderSubtitle } from './components';
import { RecipientPagerPage } from './RecipientPagerPage';
import { styles } from './SendAssetModal.styles';
import { useLastSeen } from './useLastSeen';
import { useResetSubmittedOnFocus } from './useResetSubmittedOnFocus';
import type { MaskedInputRef } from '../../../modules/safely-masked-input/src';

type SendAssetModalProps = StaticScreenProps<{
    address?: string;
    amount?: string;
}>;

export const SendAssetModal = (props: SendAssetModalProps) => {
    const { address, amount } = props.route.params ?? {};
    const { t } = useTranslation();
    const navigation = useNavigation();
    const pagerRef = useRef<PagerView>(null);
    const formatter = useNumberFormatter();
    const { numberFormatLocale } = useAppContext();
    const activeFiat = useActiveFiat();
    const handleSubmit = useCallback(
        (confirmationResult: SendFormResult, onSuccess: () => void) => {
            navigation.navigate('SendAssetModal', {
                screen: 'ConfirmationModal',
                params: {
                    confirmationResult,
                    onSuccess
                }
            });
        },
        [navigation]
    );

    const recipientInputRef = useRef<TextInput>(null);
    const amountInputRef = useRef<MaskedInputRef>(null);

    const view = useSendForm({
        onSubmit: handleSubmit,
        shouldResetForm: false,
        initialValues: {
            recipient: address,
            amount
        }
    });

    useResetSubmittedOnFocus(view);

    const lastAmountView = useLastSeen(view.state === 'amount' ? view : null);

    const stepIndex = computeStepIndex(view);
    const isMaxApplied = view.state === 'amount' && view.status === 'max';

    useEffect(() => {
        pagerRef.current?.setPage(stepIndex);
        if (view.state === 'submitted') return;

        const timer =
            isMaxApplied && stepIndex === 1
                ? setTimeout(() => amountInputRef.current?.blur(), 250)
                : setTimeout(
                      () => [recipientInputRef, amountInputRef][stepIndex]?.current?.focus(),
                      250
                  );

        return () => clearTimeout(timer);
    }, [stepIndex, isMaxApplied, view.state]);

    const next = 'next' in view ? view.next : undefined;
    const prev = view.state === 'amount' ? view.prev : undefined;
    const isOnAmountStep = stepIndex === 1;
    const recipientFromMeta = view.state === 'recipient' ? view.fromMeta : undefined;

    return (
        <Screen>
            <Screen.Header variant="left">
                {isOnAmountStep ? (
                    <Screen.Header.Button onPress={prev}>
                        <Icon icon={ArrowLeft16} />
                    </Screen.Header.Button>
                ) : (
                    <Screen.Header.CloseButton />
                )}
                <Screen.Header.Title>
                    <Text variant="titleS" textAlign="center">
                        {t('send.title')}
                    </Text>
                    {isOnAmountStep && lastAmountView && (
                        <AmountHeaderSubtitle view={lastAmountView} />
                    )}
                    {!isOnAmountStep && recipientFromMeta && (
                        <RecipientHeaderSubtitle fromMeta={recipientFromMeta} />
                    )}
                </Screen.Header.Title>
                <View style={styles.nextButton}>
                    <Button
                        testID={TEST_ID.send.nextButton}
                        size="small"
                        type="primary"
                        disabled={!next}
                        onPress={next}
                    >
                        {t('common.next')}
                    </Button>
                </View>
            </Screen.Header>
            <PagerView
                ref={pagerRef}
                scrollEnabled={false}
                initialPage={stepIndex}
                style={styles.pagerView}
            >
                <RecipientPagerPage view={view} inputRef={recipientInputRef} />
                <AmountPagerPage
                    view={view}
                    inputRef={amountInputRef}
                    decimalSeparator={numberFormatLocale.decimalSeparator}
                    fiatSymbol={activeFiat.id.symbol}
                    formatter={formatter}
                />
            </PagerView>
        </Screen>
    );
};

function computeStepIndex(view: SendFormView): number {
    switch (view.state) {
        case 'amount':
        case 'submitted':
            return 1;
        case 'recipient':
        case 'creatingContact':
        case 'restoring':
            return 0;
        default:
            return assertUnreachable(view);
    }
}
