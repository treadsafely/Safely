import { useNavigation } from '@react-navigation/core';
import type { StaticScreenProps } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { Contact } from '@safely/core';
import { useDeleteContact } from '@safely/ux';

import { BottomSheetScreen } from '@mobile/shared/navigation';
import { Button, Text } from '@mobile/shared/ui';
import type { BottomSheetContextType } from '@mobile/shared/ui/BottomSheet/context';

import { styles } from './ConfirmDeleteContactSheet.styles';

type ConfirmDeleteContactSheetProps = StaticScreenProps<{
    contact: Contact;
}>;

export const ConfirmDeleteContactSheet = ({ route }: ConfirmDeleteContactSheetProps) => {
    const { contact } = route.params;
    const { t } = useTranslation();
    const nativeStackNavigation =
        useNavigation<NativeStackNavigationProp<{ SettingsModal: undefined }>>();
    const bottomSheetRef = useRef<BottomSheetContextType>(null);
    const { mutateAsync: deleteContact } = useDeleteContact();

    const handleDelete = async () => {
        await deleteContact(contact);

        nativeStackNavigation.popTo('SettingsModal');
    };

    return (
        <BottomSheetScreen ref={bottomSheetRef}>
            <View style={styles.content}>
                <Text textAlign="center" variant="titleM">
                    {t('newContact.confirmDelete.title', { name: contact.meta.name })}
                </Text>
                <Text textAlign="center" variant="bodyL" color="secondary">
                    {t('newContact.confirmDelete.message')}
                </Text>
            </View>
            <View style={styles.footer}>
                <Button type="destructive" size="large" onPress={handleDelete}>
                    {t('common.remove')}
                </Button>
                <Button
                    type="secondary"
                    size="large"
                    onPress={() => bottomSheetRef.current?.close()}
                >
                    {t('common.cancel')}
                </Button>
            </View>
        </BottomSheetScreen>
    );
};
