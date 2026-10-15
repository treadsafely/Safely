import type { StaticScreenProps } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { FlameActivityItem } from '@safely/core';
import { SPACE, ellipsisMiddle } from '@safely/core';
import { useNumberFormatter } from '@safely/ux';

import { FlameLogo } from '@mobile/entities/flame';
import {
    ArrowDown16,
    ArrowTop16,
    Copy16,
    Icon,
    List,
    Screen,
    TableCell,
    Text,
    TouchableOpacity
} from '@mobile/shared/ui';

import { styles } from './FlameTransactionScreen.styles';

type FlameTransactionScreenProps = StaticScreenProps<{
    activity: FlameActivityItem;
}>;

export const FlameTransactionScreen = (props: FlameTransactionScreenProps) => {
    const {
        route: {
            params: { activity }
        }
    } = props;
    const { t } = useTranslation();
    const formatter = useNumberFormatter();
    const { isInitiator } = activity;

    return (
        <Screen>
            <Screen.Header>
                <Screen.Header.BackButton />
                <Screen.Header.Title>
                    <Text variant="titleS" color="primary" textAlign="center">
                        {isInitiator
                            ? t('history.transactionInfo.sent')
                            : t('history.transactionInfo.received')}
                    </Text>
                </Screen.Header.Title>
            </Screen.Header>
            <Screen.Scrollable>
                <View style={styles.headerContainer}>
                    <View style={styles.assetImageContainer}>
                        <FlameLogo size="xlarge" />
                        <View style={styles.assetBadge}>
                            <Icon icon={isInitiator ? ArrowTop16 : ArrowDown16} color="primary" />
                        </View>
                    </View>
                    <Text variant="titleL" color="primary" textAlign="center">
                        {activity.hasUnreadableOutputs ? (
                            '–'
                        ) : (
                            <>
                                {isInitiator ? '−' : '+'}
                                {SPACE.THSP}
                                {activity.value.format(formatter)}
                            </>
                        )}
                    </Text>
                </View>
                <List style={styles.list}>
                    <List.Group withoutBottomMargin>
                        <TableCell>
                            <TableCell.Column leading>
                                <TableCell.Label>
                                    {isInitiator
                                        ? t('history.transactionInfo.recipient')
                                        : t('history.transactionInfo.sender')}
                                </TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value color="secondary">
                                    {t('history.transactionInfo.unknown')}
                                </TableCell.Value>
                            </TableCell.Column>
                        </TableCell>
                        {activity.memo !== null && (
                            <TableCell copyable={activity.memo}>
                                <TableCell.Column leading>
                                    <TableCell.Label>
                                        {t('history.transactionInfo.memo')}
                                    </TableCell.Label>
                                </TableCell.Column>
                                <TableCell.Column>
                                    <TableCell.Value numberOfLines={0}>
                                        {activity.memo}
                                    </TableCell.Value>
                                </TableCell.Column>
                            </TableCell>
                        )}
                    </List.Group>
                    <List.Group withoutBottomMargin>
                        <TableCell>
                            <TableCell.Column leading>
                                <TableCell.Label>
                                    {t('history.transactionInfo.block')}
                                </TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value>{activity.height}</TableCell.Value>
                            </TableCell.Column>
                        </TableCell>
                        <TableCell copyable={activity.txid}>
                            {({ handleCopy }) => (
                                <>
                                    <TableCell.Column leading>
                                        <TableCell.Label>
                                            {t('history.transactionInfo.hash')}
                                        </TableCell.Label>
                                    </TableCell.Column>
                                    <TableCell.Column>
                                        <TableCell.Value>
                                            {ellipsisMiddle(activity.txid, 8)}
                                        </TableCell.Value>
                                    </TableCell.Column>
                                    <TouchableOpacity hitSlop={12} onPress={handleCopy}>
                                        <Icon icon={Copy16} color="secondary" />
                                    </TouchableOpacity>
                                </>
                            )}
                        </TableCell>
                    </List.Group>
                </List>
            </Screen.Scrollable>
        </Screen>
    );
};
