import type { StaticScreenProps } from '@react-navigation/native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { resolveSignOutCopy, useHasActivePeer } from '@safely/ux';

import { BottomSheetScreen } from '@mobile/shared/navigation';
import { Button, ConfirmCheckbox, Text, useBottomSheet } from '@mobile/shared/ui';

import { styles } from './SignOutAccountSheet.styles';

type SignOutAccountParams = {
    accountName: string;
    withLoader: boolean;
    onConfirm: () => Promise<void>;
};

type SignOutAccountSheetProps = StaticScreenProps<SignOutAccountParams>;

const SignOutAccountContent = (props: SignOutAccountParams) => {
    const { accountName, withLoader, onConfirm } = props;

    const { t } = useTranslation();
    const { close } = useBottomSheet();
    const hasActivePeer = useHasActivePeer();
    const [copy] = useState(() => resolveSignOutCopy(hasActivePeer));

    const [isLoading, setIsLoading] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);

    const handleSignOut = async () => {
        if (withLoader) setIsLoading(true);

        try {
            await onConfirm();
        } finally {
            if (withLoader) setIsLoading(false);
            close();
        }
    };

    return (
        <View>
            <View style={styles.titleBox}>
                <Text textAlign="center" variant="titleM">
                    {t('settings.signOutAccount.sheet.title', { name: accountName })}
                </Text>
                <Text textAlign="center" variant="bodyL" color="secondary" style={styles.subtitle}>
                    {t(copy.subtitleKey)}
                </Text>
            </View>

            {copy.checkboxKey !== undefined && (
                <ConfirmCheckbox
                    text={t(copy.checkboxKey)}
                    isChecked={isConfirmed}
                    onToggle={() => setIsConfirmed(prev => !prev)}
                />
            )}

            <View style={styles.footer}>
                <Button
                    type="destructive"
                    size="large"
                    disabled={copy.checkboxKey !== undefined && !isConfirmed}
                    isLoading={isLoading}
                    onPress={handleSignOut}
                >
                    {t('settings.signOutAccount.sheet.signOutButton')}
                </Button>
                <Button type="secondary" size="large" disabled={isLoading} onPress={close}>
                    {t('settings.signOutAccount.sheet.cancelButton')}
                </Button>
            </View>
        </View>
    );
};

export const SignOutAccountSheet = (props: SignOutAccountSheetProps) => {
    return (
        <BottomSheetScreen>
            <SignOutAccountContent {...props.route.params} />
        </BottomSheetScreen>
    );
};
