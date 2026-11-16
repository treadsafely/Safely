import { useNavigation } from '@react-navigation/core';
import { StackActions } from '@react-navigation/native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { getLedgerModelName, useLedgerSession } from '@safely/ux';

import { LedgerStatusScreen, useExitToConnectLedger } from '@mobile/features/ledger';
import { Checkmark96, Icon } from '@mobile/shared/ui';

export const LedgerPairingSuccessScreen = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const exitToConnect = useExitToConnectLedger();
    const { selectedDevice } = useLedgerSession();
    const device = getLedgerModelName(selectedDevice?.deviceModel.model);

    const handlePairingSuccess = useCallback(() => {
        navigation.dispatch(StackActions.replace('LedgerImportAccountsModal'));
    }, [navigation]);

    return (
        <LedgerStatusScreen
            media={<Icon icon={Checkmark96} />}
            title={t('addWallet.connectLedger.pairingSuccess.title')}
            subtitle={t('addWallet.connectLedger.pairingSuccess.subtitle', { device })}
            buttonLabel={t('common.continue')}
            onButtonPress={handlePairingSuccess}
            onBackPress={exitToConnect}
        />
    );
};
