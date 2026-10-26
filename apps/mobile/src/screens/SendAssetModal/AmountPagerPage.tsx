import type { RefObject } from 'react';
import { View } from 'react-native';

import type { NumberFormatter } from '@safely/core';
import { useLastSeen, type SendFormView } from '@safely/ux';

import { styles } from './SendAssetModal.styles';
import { AmountStep } from './steps';
import type { MaskedInputRef } from '../../../modules/safely-masked-input/src';

interface AmountPagerPageProps {
    view: SendFormView;
    inputRef: RefObject<MaskedInputRef | null>;
    decimalSeparator: string;
    fiatSymbol: string;
    formatter: NumberFormatter;
}

export const AmountPagerPage = (props: AmountPagerPageProps) => {
    const { view, inputRef, decimalSeparator, fiatSymbol, formatter } = props;

    const lastView = useLastSeen(view.state === 'amount' ? view : null);

    return (
        <View key="amount" style={styles.page}>
            {lastView && (
                <AmountStep
                    view={lastView}
                    inputRef={inputRef}
                    decimalSeparator={decimalSeparator}
                    fiatSymbol={fiatSymbol}
                    formatter={formatter}
                />
            )}
        </View>
    );
};
