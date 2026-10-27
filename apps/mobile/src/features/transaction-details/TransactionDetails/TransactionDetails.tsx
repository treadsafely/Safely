import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { SPACE } from '@safely/core';
import type { TransactionDetailsView } from '@safely/ux';
import { useLinking } from '@safely/ux';

import { TransactionStatus } from '@mobile/entities/activity';
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
    TouchableOpacity
} from '@mobile/shared/ui';

import { styles } from './TransactionDetails.styles';

const EMPTY_VALUE = '-';

type TransactionDetailsProps = {
    details: TransactionDetailsView;
    logo: ReactNode;
};

export const TransactionDetails = (props: TransactionDetailsProps) => {
    const { details, logo } = props;
    const { t } = useTranslation();
    const { openURL } = useLinking();
    const { explorerUrl, memo } = details;

    return (
        <Screen>
            <Screen.Header>
                <Screen.Header.BackButton />
                <Screen.Header.Title>
                    <Text variant="titleS" color="primary" textAlign="center">
                        {details.title}
                    </Text>
                    {details.confirmedAtLabel !== null && (
                        <Text variant="bodyM" color="secondary" textAlign="center">
                            {details.confirmedAtLabel}
                        </Text>
                    )}
                </Screen.Header.Title>
            </Screen.Header>
            <Screen.Scrollable>
                <View style={styles.headerContainer}>
                    <View style={styles.assetImageContainer}>
                        {logo}
                        <View style={styles.assetBadge}>
                            <Icon
                                icon={details.isInitiator ? ArrowTop16 : ArrowDown16}
                                color="primary"
                            />
                        </View>
                    </View>
                    <View style={styles.amountContainer}>
                        <Text variant="titleL" color="primary" textAlign="center">
                            {details.amountSign !== null && (
                                <>
                                    {details.amountSign}
                                    {SPACE.THSP}
                                </>
                            )}
                            {details.primaryAmount}
                        </Text>
                        {details.secondaryAmount && (
                            <Text variant="bodyL" color="secondary" textAlign="center">
                                {details.secondaryAmount}
                            </Text>
                        )}
                    </View>
                </View>
                <List style={styles.list}>
                    <List.Group withoutBottomMargin>
                        <TableCell copyable={details.counterpartyAddress ?? undefined}>
                            <TableCell.Column leading>
                                <TableCell.Label>{details.counterpartyLabel}</TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value
                                    color={
                                        details.counterpartyAddress === null
                                            ? 'secondary'
                                            : undefined
                                    }
                                >
                                    {details.counterpartyName}
                                </TableCell.Value>
                            </TableCell.Column>
                        </TableCell>
                        {memo && (
                            <TableCell copyable={memo}>
                                <TableCell.Column leading>
                                    <TableCell.Label>
                                        {t('history.transactionInfo.memo')}
                                    </TableCell.Label>
                                </TableCell.Column>
                                <TableCell.Column>
                                    <TableCell.Value numberOfLines={0}>{memo}</TableCell.Value>
                                </TableCell.Column>
                            </TableCell>
                        )}
                        <TableCell>
                            <TransactionStatus status={details.status} />
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
                                    {!details.fee ? (
                                        EMPTY_VALUE
                                    ) : details.fee.formattedFiat === null ? (
                                        details.fee.formattedValue
                                    ) : (
                                        <>
                                            {details.fee.formattedFiat}{' '}
                                            <TableCell.Value color="secondary">
                                                {details.fee.formattedValue}
                                            </TableCell.Value>
                                        </>
                                    )}
                                </TableCell.Value>
                            </TableCell.Column>
                        </TableCell>
                        <TableCell copyable={details.txid}>
                            {({ handleCopy }) => (
                                <>
                                    <TableCell.Column leading>
                                        <TableCell.Label>
                                            {t('history.transactionInfo.hash')}
                                        </TableCell.Label>
                                    </TableCell.Column>
                                    <TableCell.Column>
                                        <TableCell.Value>{details.txidLabel}</TableCell.Value>
                                    </TableCell.Column>
                                    <View style={styles.iconsContainer}>
                                        {explorerUrl !== null && (
                                            <TouchableOpacity
                                                hitSlop={12}
                                                onPress={() => openURL(explorerUrl)}
                                            >
                                                <Icon icon={Globe16} color="secondary" />
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity hitSlop={12} onPress={handleCopy}>
                                            <Icon icon={Copy16} color="secondary" />
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </TableCell>
                    </List.Group>
                    {details.hasFiatRateNote && (
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
