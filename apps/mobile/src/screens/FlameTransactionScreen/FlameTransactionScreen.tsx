import type { StaticScreenProps } from '@react-navigation/native';
import { useIsFocused } from '@react-navigation/native';

import type { FlameHistoryItem } from '@safely/core';
import { useFlameHistoryPolling, useFlameTransactionDetails } from '@safely/ux';

import { AssetLogo } from '@mobile/entities/asset';
import { TransactionDetails } from '@mobile/features/transaction-details';

type FlameTransactionScreenProps = StaticScreenProps<{
    activity: FlameHistoryItem;
}>;

export const FlameTransactionScreen = (props: FlameTransactionScreenProps) => {
    const { activity } = props.route.params;
    const details = useFlameTransactionDetails(activity);

    useFlameHistoryPolling({ isEnabled: useIsFocused(), onNewActivity: () => undefined });

    return (
        <TransactionDetails
            details={details}
            logo={<AssetLogo asset={activity.value.asset} size="xlarge" />}
        />
    );
};
