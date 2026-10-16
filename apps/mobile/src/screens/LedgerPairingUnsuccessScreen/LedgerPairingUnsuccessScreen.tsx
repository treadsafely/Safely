import { useNavigation } from '@react-navigation/core';
import type { StaticScreenProps } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useLedgerSession } from '@safely/ux';

import {
    getLedgerModelName,
    LedgerStatusScreen,
    useExitToConnectLedger
} from '@mobile/features/ledger';
import { ExclamationmarkCircle96, Icon } from '@mobile/shared/ui';

type LedgerPairingUnsuccessScreenProps = StaticScreenProps<{ isAppNotInstalled?: boolean }>;

export const LedgerPairingUnsuccessScreen = ({ route }: LedgerPairingUnsuccessScreenProps) => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const exitToConnect = useExitToConnectLedger();
    const { getLedgerKit, sessionId, setSessionId, selectedDevice } = useLedgerSession();
    const device = getLedgerModelName(selectedDevice?.deviceModel.model);

    const handleRetry = async () => {
        if (sessionId) {
            await getLedgerKit()
                .disconnect({ sessionId })
                .catch(() => {});
            setSessionId(null);
        }

        navigation.dispatch(CommonActions.navigate('LedgerDiscoveryModal'));
    };

    return (
        <LedgerStatusScreen
            media={<Icon icon={ExclamationmarkCircle96} />}
            title={t('addWallet.connectLedger.pairingUnsuccess.title')}
            subtitle={
                route.params?.isAppNotInstalled
                    ? t('addWallet.connectLedger.pairingUnsuccess.appNotInstalled', { device })
                    : t('addWallet.connectLedger.pairingUnsuccess.subtitle', { device })
            }
            buttonLabel={t('addWallet.connectLedger.pairingUnsuccess.retry')}
            onButtonPress={handleRetry}
            onBackPress={exitToConnect}
        />
    );
};
