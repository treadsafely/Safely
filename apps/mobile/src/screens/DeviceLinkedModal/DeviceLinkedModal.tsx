import { useNavigation } from '@react-navigation/core';
import type { StaticScreenProps } from '@react-navigation/native';
import { setStringAsync } from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { ellipsisMiddle } from '@safely/core';
import {
    useActiveAccount,
    useActiveAccountMeta,
    useContacts,
    usePortfolios,
    useSyncedDeviceName,
    useToast
} from '@safely/ux';

import { Button, Checkmark96, Icon, List, Screen, TableCell, Text } from '@mobile/shared/ui';

import { styles } from './DeviceLinkedModal.styles';

type DeviceLinkedModalProps = StaticScreenProps<{ ikPubHex: string }>;

export const DeviceLinkedModal = (props: DeviceLinkedModalProps) => {
    const { ikPubHex } = props.route.params;

    const { t } = useTranslation();
    const toast = useToast();
    const navigation = useNavigation();

    const accountId = useActiveAccount().accountId;
    const accountName = useActiveAccountMeta().name;
    const deviceName = useSyncedDeviceName(ikPubHex) ?? t('safety.deviceLinked.unknownDevice');
    const walletsCount = usePortfolios().length;
    const contactsCount = useContacts().length;

    const handleCopyAccountId = () => {
        void setStringAsync(accountId);
        toast(t('safety.deviceLinked.accountIdCopied'));
    };

    const handleViewDevices = () => {
        navigation.goBack();
        navigation.navigate('TabsNavigator', { screen: 'SafetyScreen' });
    };

    return (
        <Screen>
            <Screen.Header>
                <Screen.Header.Title />
                <Screen.Header.CloseButton onPress={handleViewDevices} />
            </Screen.Header>
            <Screen.Scrollable>
                <View style={styles.iconBox}>
                    <Icon icon={Checkmark96} />
                </View>

                <View style={styles.titleBox}>
                    <Text textAlign="center" variant="titleM">
                        {t('safety.deviceLinked.title', { device: deviceName })}
                    </Text>
                    <Text textAlign="center" variant="bodyL" color="secondary">
                        {t('safety.deviceLinked.subtitle', {
                            device: deviceName,
                            account: accountName
                        })}
                    </Text>
                </View>

                <View style={styles.table}>
                    <List.Group withoutBottomMargin>
                        <TableCell columnDivider>
                            <TableCell.Column leading>
                                <TableCell.Label>
                                    {t('safety.deviceLinked.account')}
                                </TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value>{accountName}</TableCell.Value>
                            </TableCell.Column>
                        </TableCell>
                        <TableCell columnDivider>
                            <TableCell.Column leading>
                                <TableCell.Label>{t('safety.deviceLinked.device')}</TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value>{deviceName}</TableCell.Value>
                            </TableCell.Column>
                        </TableCell>
                        <TableCell columnDivider rowDivider={contactsCount > 0}>
                            <TableCell.Column leading>
                                <TableCell.Label>
                                    {t('safety.deviceLinked.wallets')}
                                </TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value>
                                    {t('safety.deviceLinked.walletsCount', { count: walletsCount })}
                                </TableCell.Value>
                            </TableCell.Column>
                        </TableCell>
                        {contactsCount > 0 && (
                            <TableCell columnDivider rowDivider={false}>
                                <TableCell.Column leading>
                                    <TableCell.Label>
                                        {t('safety.deviceLinked.contacts')}
                                    </TableCell.Label>
                                </TableCell.Column>
                                <TableCell.Column>
                                    <TableCell.Value>
                                        {t('safety.deviceLinked.contactsCount', {
                                            count: contactsCount
                                        })}
                                    </TableCell.Value>
                                </TableCell.Column>
                            </TableCell>
                        )}
                    </List.Group>
                </View>

                <Pressable style={styles.accountId} onPress={handleCopyAccountId}>
                    <Text textAlign="center" variant="bodyM" color="tertiary">
                        {t('safety.deviceLinked.accountId', { id: ellipsisMiddle(accountId, 6) })}
                    </Text>
                </Pressable>
            </Screen.Scrollable>

            <View style={styles.footer}>
                <Button type="secondary" size="large" onPress={handleViewDevices}>
                    {t('safety.deviceLinked.viewLinkedDevices')}
                </Button>
            </View>
        </Screen>
    );
};
