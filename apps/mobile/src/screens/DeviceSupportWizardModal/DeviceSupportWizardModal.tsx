import { useNavigation } from '@react-navigation/core';
import type { StaticScreenProps } from '@react-navigation/native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { SyncedDeviceDetails } from '@safely/ux';
import {
    useActiveAccount,
    useArchiveDevice,
    useBootConfig,
    useLinking,
    useAnnounceSyncEvent,
    useSecurityCheck,
    useSyncedDeviceDetails,
    useToast
} from '@safely/ux';

import { Button, DeviceExclamationmark96, Icon, Screen, Text } from '@mobile/shared/ui';

import { WizardHint, WizardQuestion } from './components';
import { styles } from './DeviceSupportWizardModal.styles';

type DeviceSupportWizardModalProps = StaticScreenProps<{
    ikPubHex: string;
}>;

type DeviceAccessAnswer = 'has' | 'lost';
type OthersAccessAnswer = 'possible' | 'impossible';

const DEVICE_ACCESS_OPTIONS = [
    { value: 'has', labelKey: 'deviceSupportWizard.access.options.has' },
    { value: 'lost', labelKey: 'deviceSupportWizard.access.options.lost' }
] as const satisfies readonly { value: DeviceAccessAnswer; labelKey: string }[];

const OTHERS_ACCESS_OPTIONS = [
    { value: 'possible', labelKey: 'deviceSupportWizard.others.options.possible' },
    { value: 'impossible', labelKey: 'deviceSupportWizard.others.options.impossible' }
] as const satisfies readonly { value: OthersAccessAnswer; labelKey: string }[];

const WizardContent = ({ details }: { details: SyncedDeviceDetails }) => {
    const toast = useToast();
    const { t } = useTranslation();
    const check = useSecurityCheck();
    const navigation = useNavigation();
    const { accountId } = useActiveAccount();
    const announceSyncEvent = useAnnounceSyncEvent();
    const { mutateAsync: archiveDevice } = useArchiveDevice();

    const [deviceAccess, setDeviceAccess] = useState<DeviceAccessAnswer | null>(null);
    const [othersAccess, setOthersAccess] = useState<OthersAccessAnswer | null>(null);

    const deviceName = details.meta.name;

    const goToHome = () => {
        navigation.reset({
            index: 0,
            routes: [
                {
                    name: 'TabsNavigator',
                    state: { index: 0, routes: [{ name: 'HomeStack' }] }
                }
            ]
        });
    };

    const handleDeviceAccess = (value: DeviceAccessAnswer) => {
        setDeviceAccess(value);
        setOthersAccess(null);
    };

    const handleArchive = async () => {
        await check({ subtitle: t('deviceSupportWizard.archive.verify', { deviceName }) });
        await archiveDevice(details.ikPubHex);
        void announceSyncEvent(accountId, 'device-disconnected');

        navigation.goBack();
        toast(t('deviceSupportWizard.archive.done', { deviceName }));
    };

    return (
        <>
            <Icon icon={DeviceExclamationmark96} />
            <View style={styles.textContainer}>
                <Text textAlign="center" variant="titleM">
                    {t('deviceSupportWizard.intro.title', { deviceName })}
                </Text>
                <Text textAlign="center" variant="bodyL" color="secondary">
                    {t('deviceSupportWizard.intro.subtitle', { deviceName })}
                </Text>
            </View>

            <WizardQuestion
                titleKey="deviceSupportWizard.access.title"
                options={DEVICE_ACCESS_OPTIONS}
                answer={deviceAccess}
                onAnswer={handleDeviceAccess}
                hasActionBelow={deviceAccess === 'has'}
            >
                {deviceAccess === 'has' && (
                    <WizardHint
                        title={t('deviceSupportWizard.signOut.title', { deviceName })}
                        description={t('deviceSupportWizard.signOut.description')}
                    />
                )}
            </WizardQuestion>

            {deviceAccess === 'has' && (
                <Button
                    style={styles.dismissButton}
                    size="medium"
                    type="secondary"
                    onPress={navigation.goBack}
                >
                    {t('deviceSupportWizard.dismiss')}
                </Button>
            )}

            {deviceAccess === 'lost' && (
                <WizardQuestion
                    titleKey="deviceSupportWizard.others.title"
                    options={OTHERS_ACCESS_OPTIONS}
                    answer={othersAccess}
                    onAnswer={setOthersAccess}
                    hasActionBelow={othersAccess !== null}
                >
                    {othersAccess === 'possible' && (
                        <WizardHint
                            title={t('deviceSupportWizard.moveFunds.title')}
                            description={t('deviceSupportWizard.moveFunds.description')}
                        >
                            <Button
                                size="small"
                                type="primary"
                                onPress={() =>
                                    navigation.navigate('AddAccountSheet', {
                                        onAccountAdded: goToHome
                                    })
                                }
                            >
                                {t('deviceSupportWizard.moveFunds.action')}
                            </Button>
                        </WizardHint>
                    )}
                    {othersAccess === 'impossible' && (
                        <WizardHint
                            title={t('deviceSupportWizard.archive.title')}
                            description={t('deviceSupportWizard.archive.description')}
                        >
                            <Button size="small" type="tertiary" onPress={handleArchive}>
                                {t('deviceSupportWizard.archive.action', { deviceName })}
                            </Button>
                        </WizardHint>
                    )}
                </WizardQuestion>
            )}

            {othersAccess !== null && (
                <Button
                    style={styles.dismissButton}
                    size="medium"
                    type="secondary"
                    onPress={navigation.goBack}
                >
                    {t('deviceSupportWizard.dismiss')}
                </Button>
            )}
        </>
    );
};

export const DeviceSupportWizardModal = (props: DeviceSupportWizardModalProps) => {
    const { t } = useTranslation();
    const { openURL } = useLinking();
    const details = useSyncedDeviceDetails(props.route.params.ikPubHex);
    const supportEmail = useBootConfig().references.support.email;

    return (
        <Screen>
            <Screen.Header>
                <Button
                    style={styles.headerButton}
                    size="small"
                    type="secondary"
                    onPress={() => openURL(`mailto:${supportEmail}`)}
                >
                    {t('deviceSupportWizard.title')}
                </Button>
                <Screen.Header.Title />
                <Screen.Header.CloseButton />
            </Screen.Header>
            <Screen.Scrollable contentContainerStyle={styles.content}>
                {details !== null && <WizardContent details={details} />}
            </Screen.Scrollable>
        </Screen>
    );
};
