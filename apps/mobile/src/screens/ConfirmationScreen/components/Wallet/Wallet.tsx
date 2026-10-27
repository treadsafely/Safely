import type { FC } from 'react';
import { View } from 'react-native';

import { ellipsisMiddle } from '@safely/core';
import type { PortfolioNetworkBadge, RecipientMeta } from '@safely/ux';

import { ContactName } from '@mobile/entities/contact';
import { NetworkBadge, PortfolioName } from '@mobile/entities/portfolio';
import { Badge, Text } from '@mobile/shared/ui';

import { styles } from './Wallet.styles';

interface WalletProps {
    address: string;
    meta?: RecipientMeta;
    networkBadge?: PortfolioNetworkBadge | null;
}

export const Wallet: FC<WalletProps> = props => {
    const { address, meta, networkBadge } = props;

    const badge = networkBadge && <NetworkBadge badge={networkBadge} />;

    if (meta) {
        return (
            <View style={styles.container}>
                {meta.kind === 'contact' ? (
                    <View style={styles.row}>
                        <ContactName meta={meta.meta} size={12} gap={6} fontVariant="bodyM" />
                        {badge}
                    </View>
                ) : (
                    <View style={styles.row}>
                        <PortfolioName meta={meta.meta} size={12} gap={6} fontVariant="bodyM" />
                        {badge}
                        {meta.tag !== undefined && <Badge>{String(meta.tag)}</Badge>}
                    </View>
                )}
                <Text variant="bodyM" color="tertiary" numberOfLines={1}>
                    {ellipsisMiddle(address)}
                </Text>
            </View>
        );
    }

    if (badge) {
        return (
            <View style={styles.container}>
                <View style={styles.row}>
                    <Text variant="bodyM" numberOfLines={1} style={styles.address}>
                        {ellipsisMiddle(address)}
                    </Text>
                    {badge}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text variant="bodyM">{address}</Text>
        </View>
    );
};
