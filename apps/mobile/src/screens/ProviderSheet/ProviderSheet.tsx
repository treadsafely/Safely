import type { StaticScreenProps } from '@react-navigation/native';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { Provider } from '@safely/core';
import { useDismissProvider, useLinking, useOpenOnramp } from '@safely/ux';
import { useErrorToast } from '@safely/ux';

import { BottomSheetScreen } from '@mobile/shared/navigation';
import { Text, Image, Banner, Button, TouchableOpacity, Checkbox } from '@mobile/shared/ui';

import { styles } from './ProviderSheet.styles';

export type ProviderSheetProps = StaticScreenProps<{
    provider: Provider;
}>;

export const ProviderSheet = ({
    route: {
        params: { provider }
    }
}: ProviderSheetProps) => {
    const { t } = useTranslation();
    const { openURL } = useLinking();
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const { openOnramp, isPending } = useOpenOnramp();
    const { mutateAsync: dismissProvider } = useDismissProvider();

    const errorToast = useErrorToast({});

    const { id, name: providerName, description, logo, legal, buyingGuide } = provider.info;

    const handleToggleDontShowAgain = () => {
        setDontShowAgain(prev => !prev);
    };

    const handleContinue = async () => {
        try {
            if (dontShowAgain) {
                await dismissProvider(id);
            }
            await openOnramp(provider);
        } catch (error) {
            errorToast(error);
        }
    };

    return (
        <BottomSheetScreen shortHeader>
            <View style={styles.content}>
                <Image source={{ uri: logo }} style={styles.logo} />
                <View style={styles.nameContainer}>
                    <Text textAlign="center" variant="titleM">
                        {providerName}
                    </Text>
                    <Text textAlign="center" variant="bodyL" color="secondary">
                        {description}
                    </Text>
                    {buyingGuide && (
                        <Text
                            textAlign="center"
                            variant="bodyL"
                            color="link"
                            onPress={() => openURL(buyingGuide)}
                        >
                            {t('exchange.buyingGuide')}
                        </Text>
                    )}
                </View>
            </View>
            <Banner style={styles.banner}>
                <Banner.Content>
                    <Banner.Text style={styles.disclaimerText}>
                        <Trans
                            i18nKey="exchange.disclaimer"
                            values={{ providerName }}
                            components={{
                                terms: <Text color="primary" onPress={() => openURL(legal.tos)} />,
                                privacy: (
                                    <Text color="primary" onPress={() => openURL(legal.privacy)} />
                                )
                            }}
                        />
                    </Banner.Text>
                </Banner.Content>
            </Banner>
            <View style={styles.actionBar}>
                <Button isLoading={isPending} type="primary" size="large" onPress={handleContinue}>
                    {t('exchange.continue', { providerName })}
                </Button>
                <TouchableOpacity
                    onPress={handleToggleDontShowAgain}
                    style={styles.showAgainContainer}
                >
                    <Checkbox isChecked={dontShowAgain} onPress={handleToggleDontShowAgain} />
                    <Text variant="bodyM" color="secondary">
                        {t('exchange.dontShowAgain')}
                    </Text>
                </TouchableOpacity>
            </View>
        </BottomSheetScreen>
    );
};
