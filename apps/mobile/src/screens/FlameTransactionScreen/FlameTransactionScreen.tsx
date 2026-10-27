import type { StaticScreenProps } from '@react-navigation/native';

import type { FlameHistoryItem } from '@safely/core';
import { useFlameTransactionDetails } from '@safely/ux';

import { AssetLogo } from '@mobile/entities/asset';
import { TransactionDetails } from '@mobile/features/transaction-details';

type FlameTransactionScreenProps = StaticScreenProps<{
    activity: FlameHistoryItem;
}>;

export const FlameTransactionScreen = (props: FlameTransactionScreenProps) => {
    const { activity } = props.route.params;
    const details = useFlameTransactionDetails(activity);

    return (
        <TransactionDetails
            details={details}
            logo={<AssetLogo asset={activity.value.asset} size="xlarge" />}
        />
    );
};
