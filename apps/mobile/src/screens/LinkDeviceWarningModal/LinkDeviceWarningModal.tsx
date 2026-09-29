import { useNavigation } from '@react-navigation/core';
import { StackActions } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
    useActiveAccountMeta,
    useAppContext,
    useConnectAccountToNewDevice,
    useContacts,
    usePortfolios
} from '@safely/ux';

import { PortfolioName } from '@mobile/entities/portfolio';
import {
    Banner,
    Button,
    DeviceLinkArrowRight96,
    ExclamationmarkCircle16,
    Icon,
    List,
    Screen,
    TableCell,
    Text
} from '@mobile/shared/ui';

import { styles } from './LinkDeviceWarningModal.styles';

export const LinkDeviceWarningModal = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const {
        storage: {
            sync: { getSecureEncrypted }
        }
    } = useAppContext();
    const { mutateAsync: connectToNewDevice } = useConnectAccountToNewDevice();

    const accountName = useActiveAccountMeta().name;
    const portfolios = usePortfolios();
    const contactsCount = useContacts().length;

    const handleContinue = async () => {
        using secureEncryptedStorage = getSecureEncrypted();
        await secureEncryptedStorage.unlock();

        const ikPubHex = await connectToNewDevice({ secureEncryptedStorage });
        navigation.dispatch(StackActions.replace('DeviceLinkedModal', { ikPubHex }));
    };

    return (
        <Screen>
            <Screen.Header>
                <Screen.Header.Title />
                <Screen.Header.CloseButton />
            </Screen.Header>
            <Screen.Scrollable>
                <View style={styles.iconBox}>
                    <Icon icon={DeviceLinkArrowRight96} />
                </View>

                <View style={styles.titleBox}>
                    <Text textAlign="center" variant="titleM">
                        {t('safety.linkDeviceWarning.title', { name: accountName })}
                    </Text>
                    <Text textAlign="center" variant="bodyL" color="secondary">
                        {t('safety.linkDeviceWarning.subtitle')}
                    </Text>
                </View>

                <View style={styles.table}>
                    <Banner variant="danger" nonInteractive style={styles.warningBanner}>
                        <Banner.Content>
                            <Banner.Text>{t('safety.linkDeviceWarning.warning')}</Banner.Text>
                            <Banner.Icon icon={ExclamationmarkCircle16} />
                        </Banner.Content>
                    </Banner>

                    <List.Group withoutBottomMargin>
                        <TableCell columnDivider rowDivider={contactsCount > 0}>
                            <TableCell.Column leading>
                                <TableCell.Label>
                                    {t('safety.linkDeviceWarning.wallets')}
                                </TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column style={styles.wallets}>
                                {portfolios.map(portfolio => (
                                    <PortfolioName
                                        key={portfolio.id.toString()}
                                        meta={portfolio.meta}
                                        fontVariant="bodyM"
                                        color="primary"
                                    />
                                ))}
                            </TableCell.Column>
                        </TableCell>
                        {contactsCount > 0 && (
                            <TableCell columnDivider rowDivider={false}>
                                <TableCell.Column leading>
                                    <TableCell.Label>
                                        {t('safety.linkDeviceWarning.contacts')}
                                    </TableCell.Label>
                                </TableCell.Column>
                                <TableCell.Column>
                                    <TableCell.Value>
                                        {t('safety.linkDeviceWarning.contactsCount', {
                                            count: contactsCount
                                        })}
                                    </TableCell.Value>
                                </TableCell.Column>
                            </TableCell>
                        )}
                    </List.Group>
                </View>
            </Screen.Scrollable>

            <View style={styles.footer}>
                <Button
                    style={styles.footerButton}
                    type="secondary"
                    size="large"
                    onPress={() => navigation.goBack()}
                >
                    {t('common.cancel')}
                </Button>
                <Button
                    style={styles.footerButton}
                    type="destructive"
                    size="large"
                    onPress={handleContinue}
                >
                    {t('safety.linkDeviceWarning.continue')}
                </Button>
            </View>
        </Screen>
    );
};
