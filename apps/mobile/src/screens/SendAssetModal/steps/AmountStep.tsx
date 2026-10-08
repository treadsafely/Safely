import type { RefObject } from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import type { NumberFormatter } from '@safely/core';
import { useAmountStepView, type AmountView } from '@safely/ux';

import { Text } from '@mobile/shared/ui/Text';

import type { MaskedInputRef } from '../../../../modules/safely-masked-input/src';
import { AmountInput, AmountStatus, AssetSelector } from '../components';
import { styles } from './AmountStep.styles';

interface AmountStepProps {
    view: AmountView;
    inputRef?: RefObject<MaskedInputRef | null>;
    decimalSeparator: string;
    fiatSymbol: string;
    formatter: NumberFormatter;
}

export const AmountStep = (props: AmountStepProps) => {
    const { view, inputRef, decimalSeparator, fiatSymbol, formatter } = props;

    const { t } = useTranslation();

    const {
        decimals,
        hasPrice,
        amountError,
        isMax,
        inputType,
        alternativeAmount,
        remainingBalance
    } = useAmountStepView({ view, formatter, fiatSymbol });

    const handleSwitchFiatMode = useCallback(() => {
        view.setAmountInputType(inputType === 'fiat' ? 'crypto' : 'fiat');
    }, [view, inputType]);

    const enterMax = 'enterMax' in view ? view.enterMax : undefined;
    const handleMaxPress = useCallback(() => {
        if (!enterMax) return;

        inputRef?.current?.blur();
        enterMax();
    }, [inputRef, enterMax]);

    const handleFocus = useCallback(() => {
        if ('exitMax' in view) view.exitMax();
    }, [view]);

    return (
        <View style={styles.container}>
            <AmountInput
                ref={inputRef}
                decimals={decimals}
                decimalSeparator={decimalSeparator}
                value={view.values.amount}
                onChangeText={view.setAmount}
                onPaste={view.pasteAmount}
                onFocus={handleFocus}
                placeholder="0"
                isMax={isMax}
                label={t('send.amount')}
                errored={!!amountError}
                formattedAlternativeAmount={alternativeAmount}
                onSwitchFiatMode={hasPrice ? handleSwitchFiatMode : undefined}
                currencySymbol={
                    inputType === 'fiat' ? fiatSymbol : view.parsed.asset?.amount.asset.symbol
                }
                RightComponent={
                    view.parsed.asset && <AssetSelector asset={view.parsed.asset.amount.asset} />
                }
            />
            <View style={styles.remainingContainer}>
                <AmountStatus
                    isMax={isMax}
                    amountError={amountError}
                    remainingBalance={remainingBalance}
                />
                {enterMax && view.isMaxAvailable && (
                    <Animated.View entering={FadeIn.duration(100)} exiting={FadeOut.duration(100)}>
                        <TouchableOpacity onPress={handleMaxPress} hitSlop={12}>
                            <Text variant="bodyM" color="secondary">
                                {t('send.max')}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>
        </View>
    );
};
