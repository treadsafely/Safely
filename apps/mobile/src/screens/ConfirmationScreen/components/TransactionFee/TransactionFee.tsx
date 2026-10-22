import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { Estimation } from '@safely/core';
import { BLOCKCHAIN_NAME, btcBlockWaitingTimeMinutes } from '@safely/core';
import { useFiatEquivalent, useNumberFormatter } from '@safely/ux';

import { TransactionCell } from '@mobile/screens/ConfirmationScreen/components';
import { TEST_ID } from '@mobile/shared/constants';
import { Text } from '@mobile/shared/ui';

import { styles } from './TransactionFee.styles';

export const TransactionFee: FC<{
    estimation: Estimation | undefined;
    blockchain?: BLOCKCHAIN_NAME;
    showDivider?: boolean;
}> = ({ estimation, blockchain = BLOCKCHAIN_NAME.BTC, showDivider = true }) => {
    const { t } = useTranslation();

    const targetBlock =
        estimation && 'txTargetBlock' in estimation
            ? Math.max(estimation.txTargetBlock, 1)
            : undefined;

    return (
        <TransactionCell
            title={t('confirmation.networkFee.title')}
            value={
                estimation ? (
                    <FeeValue estimation={estimation} />
                ) : (
                    <Text variant="bodyM" skeletonVariant="transparentElement" skeletonWidth={64} />
                )
            }
            subvalue={
                blockchain === BLOCKCHAIN_NAME.BTC && (
                    <TransactionCell.Subvalue
                        skeletonVariant="transparentElement"
                        skeletonWidth={40}
                    >
                        {targetBlock !== undefined
                            ? t('confirmation.networkFee.timeMinutes', {
                                  count: targetBlock * btcBlockWaitingTimeMinutes
                              })
                            : undefined}
                    </TransactionCell.Subvalue>
                )
            }
            showDivider={showDivider}
        />
    );
};

const FeeValue: FC<{ estimation: Estimation }> = ({ estimation }) => {
    const formatter = useNumberFormatter();
    const { data: fiat } = useFiatEquivalent(estimation.fee.amount);

    return (
        // testID marks fee estimation as done — e2e waits for it before sliding to send
        <View style={styles.feeContainer} testID={TEST_ID.confirmation.fee}>
            {!!fiat && <Text variant="bodyM">{fiat.format(formatter)} </Text>}
            <Text color="secondary" variant="bodyM" skeleton>
                {estimation?.fee.amount.format(formatter)}
            </Text>
        </View>
    );
};
