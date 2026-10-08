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

import { styles } from './SignInSuccessScreen.styles';

const ACCOUNT_ID_SIDE_CHARS = 6;

type SignInSuccessScreenProps = StaticScreenProps<{
    inviterIkPubHex: string | null;
    onContinue: () => void;
}>;

export const SignInSuccessScreen = (props: SignInSuccessScreenProps) => {
    const { inviterIkPubHex, onContinue } = props.route.params;

    const { t } = useTranslation();
    const toast = useToast();

    const accountId = useActiveAccount().accountId;
    const accountName = useActiveAccountMeta().name;
    const inviterName = useSyncedDeviceName(inviterIkPubHex);
    const walletsCount = usePortfolios().length;
    const contactsCount = useContacts().length;

    const handleCopyAccountId = () => {
        void setStringAsync(accountId);
        toast(t('safety.deviceLinked.accountIdCopied'));
    };

    return (
        <Screen>
            <Screen.Header>
                <Screen.Header.Title />
                <Screen.Header.CloseButton onPress={onContinue} />
            </Screen.Header>
            <Screen.Scrollable>
                <View style={styles.iconBox}>
                    <Icon icon={Checkmark96} />
                </View>

                <View style={styles.titleBox}>
                    <Text textAlign="center" variant="titleM">
                        {t('safety.signedIn.title', { account: accountName })}
                    </Text>
                    <Text textAlign="center" variant="bodyL" color="secondary">
                        {inviterName === null
                            ? t('safety.signedIn.subtitleUnknownDevice')
                            : t('safety.signedIn.subtitle', { device: inviterName })}
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
                        {t('safety.deviceLinked.accountId', {
                            id: ellipsisMiddle(accountId, ACCOUNT_ID_SIDE_CHARS)
                        })}
                    </Text>
                </Pressable>
            </Screen.Scrollable>

            <View style={styles.footer}>
                <Button type="secondary" size="large" onPress={onContinue}>
                    {t('safety.signedIn.continue')}
                </Button>
            </View>
        </Screen>
    );
};
