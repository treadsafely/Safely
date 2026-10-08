import { useNavigation } from '@react-navigation/core';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Actions, ArrowDown28, ArrowTop28, QrCodeScan28 } from '@mobile/shared/ui';

import { styles } from './FlameActions.styles';

const UNAVAILABLE_OPACITY = 0.56;

const noop = () => {};

export const FlameActions = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();

    const handleReceive = useCallback(() => {
        navigation.navigate('ReceiveAssetModal', { initialTab: 'flm' });
    }, [navigation]);

    return (
        <Actions style={styles.container}>
            <Actions.Button
                title={t('home.actions.send')}
                icon={ArrowTop28}
                onPress={noop}
                opacity={UNAVAILABLE_OPACITY}
            />
            <Actions.Button
                title={t('home.actions.receive')}
                icon={ArrowDown28}
                onPress={handleReceive}
            />
            <Actions.Button
                title={t('home.actions.scan')}
                icon={QrCodeScan28}
                onPress={noop}
                opacity={UNAVAILABLE_OPACITY}
            />
        </Actions>
    );
};
