import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BtcAssetAmount, btcBlockWaitingTimeMinutes } from '@safely/core';
import { useActiveBtcWalletUtxo, useActiveWalletBtcBalance, useNumberFormatter } from '@safely/ux';

import { BottomSheetScreen } from '@mobile/shared/navigation';
import { Button, List, TableCell, Text, useBottomSheet } from '@mobile/shared/ui';

import { styles } from './PendingFundsSheet.styles';

const PendingFundsContent = () => {
    const { t } = useTranslation();
    const { close } = useBottomSheet();
    const formatter = useNumberFormatter();
    const { data: btcUtxo } = useActiveBtcWalletUtxo();
    const { data: availableBalance } = useActiveWalletBtcBalance();

    const totalBalance = availableBalance?.display.amountAdd(
        availableBalance?.pending ?? BtcAssetAmount.fromWeiAmount('0')
    );

    const pending = useMemo(
        () =>
            btcUtxo?.unconfirmedUnsafe.utxos.map(item => ({
                value: BtcAssetAmount.fromWeiAmount(item.value),
                confirmationETABlocks: item.tx.confirmationETABlocks,
                timestamp: item.tx.blockTime,
                id: item.tx.txid
            })),
        [btcUtxo]
    );

    return (
        <View>
            <View style={styles.titleBox}>
                <Text textAlign="center" variant="titleM">
                    {t('pendingFunds.title')}
                </Text>
                <Text textAlign="center" variant="bodyL" color="secondary">
                    {t('pendingFunds.subtitle')}
                </Text>
            </View>

            <View style={styles.table}>
                <List.Group withoutBottomMargin>
                    <TableCell>
                        <TableCell.Column leading>
                            <TableCell.Label>{t('pendingFunds.pending')}</TableCell.Label>
                        </TableCell.Column>
                        <TableCell.Column>
                            {pending?.map(item => (
                                <>
                                    <TableCell.Value monospace key={item.id}>
                                        + {item.value.format(formatter, { showPositiveSign: true })}
                                    </TableCell.Value>
                                    <TableCell.Label>
                                        {t('pendingFunds.estimatedTime', {
                                            minutes:
                                                (item.confirmationETABlocks ?? 1) *
                                                btcBlockWaitingTimeMinutes
                                        })}
                                    </TableCell.Label>
                                </>
                            ))}
                        </TableCell.Column>
                    </TableCell>
                    <TableCell>
                        <TableCell.Column leading>
                            <TableCell.Label>{t('pendingFunds.available')}</TableCell.Label>
                        </TableCell.Column>
                        <TableCell.Column>
                            <TableCell.Value monospace>
                                {availableBalance?.display.format(formatter)}
                            </TableCell.Value>
                        </TableCell.Column>
                    </TableCell>
                    <TableCell>
                        <TableCell.Column leading>
                            <TableCell.Label>{t('pendingFunds.total')}</TableCell.Label>
                        </TableCell.Column>
                        <TableCell.Column>
                            <TableCell.Value monospace>
                                {totalBalance?.format(formatter)}
                            </TableCell.Value>
                        </TableCell.Column>
                    </TableCell>
                </List.Group>
            </View>

            <View style={styles.footer}>
                <Button type="secondary" size="large" onPress={close}>
                    {t('pendingFunds.ok')}
                </Button>
            </View>
        </View>
    );
};

export const PendingFundsSheet = () => {
    return (
        <BottomSheetScreen>
            <PendingFundsContent />
        </BottomSheetScreen>
    );
};
