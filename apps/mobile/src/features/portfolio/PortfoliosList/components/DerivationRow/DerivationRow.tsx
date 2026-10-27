import { View } from 'react-native';

import type { ILedgerDerivation } from '@safely/core';
import { useBtcWalletFiatBalance, useNumberFormatter } from '@safely/ux';

import { Badge, Cell, Text } from '@mobile/shared/ui';

import { styles } from './DerivationRow.styles';

type DerivationRowProps = {
    derivation: ILedgerDerivation;
    isSelected: boolean;
};

export const DerivationRow = ({ derivation, isSelected }: DerivationRowProps) => {
    const wallet = derivation.chains.btc.wallets[0];
    const { data: balance } = useBtcWalletFiatBalance(wallet);
    const formatter = useNumberFormatter();

    return (
        <Cell
            background={isSelected ? 'tertiary' : 'secondary'}
            style={styles.cell}
            showDivider={false}
        >
            <Cell.Content>
                <Cell.Row style={styles.row}>
                    <View style={styles.address}>
                        <View style={styles.badgeColumn}>
                            <Badge>{String(derivation.index + 1)}</Badge>
                        </View>
                        <Cell.Title style={styles.title}>{derivation.meta.name}</Cell.Title>
                    </View>
                    {balance !== null && (
                        <Text
                            variant="bodyM"
                            color={isSelected ? 'secondary' : 'tertiary'}
                            skeleton
                            skeletonWidth={42}
                            skeletonVariant="transparentElement"
                        >
                            {balance?.format(formatter)}
                        </Text>
                    )}
                </Cell.Row>
            </Cell.Content>
        </Cell>
    );
};
