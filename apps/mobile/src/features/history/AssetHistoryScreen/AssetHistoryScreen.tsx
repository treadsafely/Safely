import { useNavigation } from '@react-navigation/core';
import { StackActions } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { Screen } from '@mobile/shared/ui';

type AssetHistoryScreenProps = {
    hasChain: boolean;
    children: ReactNode;
};

export const AssetHistoryScreen = (props: AssetHistoryScreenProps) => {
    const { hasChain, children } = props;
    const navigation = useNavigation();

    useEffect(() => {
        if (!hasChain) {
            navigation.dispatch(StackActions.popToTop());
        }
    }, [hasChain, navigation]);

    return <Screen>{hasChain && children}</Screen>;
};
