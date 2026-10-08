import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { FlameActivityItem } from '@safely/core';
import { ellipsisMiddle } from '@safely/core';
import { useActiveFlameHistory, useNumberFormatter } from '@safely/ux';

import { ActivityItem, ActivityItemSkeleton } from '@mobile/entities/activity';
import { List, Screen } from '@mobile/shared/ui';

import { HistoryEmptyPlaceholder } from '../HistoryEmptyPlaceholder';
import { styles } from './FlameHistoryList.styles';

export const FlameHistoryList = () => {
    const { t } = useTranslation();
    const formatter = useNumberFormatter();
    const { data: history } = useActiveFlameHistory();

    const renderSeparator = useCallback(() => <View style={styles.separator} />, []);

    const renderItem = useCallback(
        ({ item }: { item: FlameActivityItem }) => (
            <ActivityItem
                title={
                    item.isInitiator
                        ? t('history.transactionInfo.sent')
                        : t('history.transactionInfo.received')
                }
                amountSign={item.isInitiator ? '−' : '+'}
                formattedValue={item.hasUnreadableOutputs ? '–' : item.value.format(formatter)}
                valueColor={item.isInitiator ? 'primary' : 'accentGreen'}
                formattedFiat={null}
                timestampLabel={null}
                background="secondary"
                counterparty={{ kind: 'address', label: ellipsisMiddle(item.txid, 6) }}
            />
        ),
        [t, formatter]
    );

    if (!history) {
        return (
            <List>
                <List.Group style={styles.contentContainer} variant="separated">
                    <ActivityItemSkeleton />
                    <ActivityItemSkeleton />
                    <ActivityItemSkeleton />
                </List.Group>
            </List>
        );
    }

    if (history.length === 0) {
        return <HistoryEmptyPlaceholder />;
    }

    return (
        <Screen.List
            contentContainerStyle={styles.contentContainer}
            data={history}
            keyExtractor={item => item.txid}
            ItemSeparatorComponent={renderSeparator}
            renderItem={renderItem}
        />
    );
};
