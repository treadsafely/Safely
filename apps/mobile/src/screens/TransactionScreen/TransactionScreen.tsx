import type { StaticScreenProps } from '@react-navigation/native';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BLOCKCHAIN_NAME, SPACE, ellipsisMiddle } from '@safely/core';
import {
    type BtcActivityItem,
    isBtcTransactionPending,
    useDateFormatter,
    useExplorer,
    useLinking,
    useNumberFormatter,
    useShowFullSentAmount,
    useTransactionHistoryAmountOrder,
    resolveSentAmount
} from '@safely/ux';

import { TransactionConfirmationStatusBtc } from '@mobile/entities/activity';
import {
    ArrowDown16,
    ArrowTop16,
    Copy16,
    Globe16,
    Icon,
    List,
    Screen,
    TableCell,
    Text,
    TouchableOpacity,
    Image
} from '@mobile/shared/ui';

import { styles } from './TransactionScreen.styles';

type TransactionScreenProps = StaticScreenProps<{
    activity: BtcActivityItem;
}>;

export const TransactionScreen = (props: TransactionScreenProps) => {
    const {
        route: {
            params: { activity }
        }
    } = props;
    const { t } = useTranslation();
    const isInitiator = activity.transaction.isInitiator;
    const isPending = isBtcTransactionPending(activity.transaction.raw);
    const formatter = useNumberFormatter();
    const rate = activity.transaction.rate;
    const explorer = useExplorer(BLOCKCHAIN_NAME.BTC);
    const dateFormatter = useDateFormatter({
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
    const { openURL } = useLinking();
    const showFullSentAmount = useShowFullSentAmount();
    const amountOrder = useTransactionHistoryAmountOrder();

    const { amount, isFullPrecision } = resolveSentAmount({
        isInitiator,
        value: activity.transaction.value,
        fee: activity.transaction.fee?.amount,
        showFullSentAmount
    });

    const formattedValue = amount.format(formatter, { fullPrecision: isFullPrecision });
    const formattedFiat = rate
        ? amount.convert(rate).format(formatter, { currencyDisplay: 'code' })
        : null;

    const isFiatFirst = amountOrder === 'fiat' && formattedFiat !== null;
    const primaryAmount = isFiatFirst ? formattedFiat : formattedValue;
    const secondaryAmount = isFiatFirst
        ? formattedValue
        : formattedFiat && `≈${SPACE.THSP}${formattedFiat}`;

    const handleOpen = useCallback(() => {
        const url = explorer.transaction(activity.transaction.raw.txid);
        openURL(url);
    }, [activity.transaction.raw.txid, explorer, openURL]);

    const confirmedAt = useMemo(
        () => dateFormatter.format(activity.timestamp),
        [dateFormatter, activity.timestamp]
    );

    const addressCell = useMemo(() => {
        return {
            address: isInitiator
                ? activity.transaction.toAddress
                : activity.transaction.fromAddress,
            label: isInitiator
                ? t('history.transactionInfo.recipient')
                : t('history.transactionInfo.sender')
        };
    }, [isInitiator, activity.transaction.toAddress, activity.transaction.fromAddress, t]);

    return (
        <Screen>
            <Screen.Header>
                <Screen.Header.BackButton />
                <Screen.Header.Title>
                    <Text variant="titleS" color="primary" textAlign="center">
                        {isInitiator
                            ? t(
                                  isPending
                                      ? 'history.transactionInfo.sending'
                                      : 'history.transactionInfo.sent'
                              )
                            : t(
                                  isPending
                                      ? 'history.transactionInfo.receiving'
                                      : 'history.transactionInfo.received'
                              )}
                    </Text>
                    {!isPending && (
                        <Text variant="bodyM" color="secondary" textAlign="center">
                            {confirmedAt}
                        </Text>
                    )}
                </Screen.Header.Title>
            </Screen.Header>
            <Screen.Scrollable>
                <View style={styles.headerContainer}>
                    <View style={styles.assetImageContainer}>
                        <Image
                            source={activity.transaction.value.asset.image}
                            style={styles.assetImage}
                        />
                        <View style={styles.assetBadge}>
                            <Icon icon={isInitiator ? ArrowTop16 : ArrowDown16} color="primary" />
                        </View>
                    </View>
                    <View style={styles.amountContainer}>
                        <Text variant="titleL" color="primary" textAlign="center">
                            {isInitiator ? '−' : '+'}
                            {SPACE.THSP}
                            {primaryAmount}
                        </Text>
                        {secondaryAmount && (
                            <Text variant="bodyL" color="secondary" textAlign="center">
                                {secondaryAmount}
                            </Text>
                        )}
                    </View>
                </View>
                <List style={styles.list}>
                    <List.Group withoutBottomMargin>
                        <TableCell copyable={addressCell.address}>
                            <TableCell.Column leading>
                                <TableCell.Label>{addressCell.label}</TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value>
                                    {ellipsisMiddle(addressCell.address, 6)}
                                </TableCell.Value>
                            </TableCell.Column>
                        </TableCell>
                        <TableCell>
                            <TransactionConfirmationStatusBtc tx={activity.transaction.raw} />
                        </TableCell>
                    </List.Group>
                    <List.Group withoutBottomMargin>
                        <TableCell>
                            <TableCell.Column leading>
                                <TableCell.Label>
                                    {t('history.transactionInfo.fee')}
                                </TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value>
                                    {!rate || !activity.transaction.fee ? (
                                        '-'
                                    ) : (
                                        <>
                                            {activity.transaction.fee.amount
                                                .convert(rate)
                                                .format(formatter)}{' '}
                                            <TableCell.Value color="secondary">
                                                {activity.transaction.fee.amount.format(formatter)}
                                            </TableCell.Value>
                                        </>
                                    )}
                                </TableCell.Value>
                            </TableCell.Column>
                        </TableCell>
                        <TableCell copyable={activity.transaction.raw?.txid}>
                            {({ handleCopy }) => (
                                <>
                                    <TableCell.Column leading>
                                        <TableCell.Label>
                                            {t('history.transactionInfo.hash')}
                                        </TableCell.Label>
                                    </TableCell.Column>
                                    <TableCell.Column>
                                        <TableCell.Value>
                                            {ellipsisMiddle(activity.transaction.raw?.txid, 8)}
                                        </TableCell.Value>
                                    </TableCell.Column>
                                    <View style={styles.iconsContainer}>
                                        <TouchableOpacity hitSlop={12} onPress={handleOpen}>
                                            <Icon icon={Globe16} color="secondary" />
                                        </TouchableOpacity>
                                        <TouchableOpacity hitSlop={12} onPress={handleCopy}>
                                            <Icon icon={Copy16} color="secondary" />
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </TableCell>
                    </List.Group>
                    {isFiatFirst && showFullSentAmount && (
                        <List.Footer>
                            <Text variant="bodyM" color="tertiary">
                                {t('history.transactionInfo.fiatRateNote')}
                            </Text>
                        </List.Footer>
                    )}
                </List>
            </Screen.Scrollable>
        </Screen>
    );
};
