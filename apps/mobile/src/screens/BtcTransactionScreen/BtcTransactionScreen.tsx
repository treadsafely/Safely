import type { StaticScreenProps } from '@react-navigation/native';

import type { BtcActivityItem } from '@safely/ux';
import { useBtcTransactionDetails } from '@safely/ux';

import { AssetLogo } from '@mobile/entities/asset';
import { TransactionDetails } from '@mobile/features/transaction-details';

type BtcTransactionScreenProps = StaticScreenProps<{
    activity: BtcActivityItem;
}>;

export const BtcTransactionScreen = (props: BtcTransactionScreenProps) => {
    const { activity } = props.route.params;
    const details = useBtcTransactionDetails(activity);

    return (
        <TransactionDetails
            details={details}
            logo={<AssetLogo asset={activity.transaction.value.asset} size="xlarge" />}
        />
    );
};
