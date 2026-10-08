import { useNavigation } from '@react-navigation/core';
import { CommonActions, type StaticScreenProps } from '@react-navigation/native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PortfolioType } from '@safely/core';
import {
    resolveRemoveWalletCopy,
    useActivePortfolioEntitiesQuery,
    useDeletePortfolio,
    useToast
} from '@safely/ux';

import { BottomSheetScreen } from '@mobile/shared/navigation';
import { Button, ConfirmCheckbox, Text, useBottomSheet } from '@mobile/shared/ui';

import { HideDerivationContent } from './HideDerivationContent';
import { styles } from './RemoveWalletSheet.styles';

const RemoveWalletContent = () => {
    const { t } = useTranslation();
    const { close } = useBottomSheet();
    const entities = useRef(useActivePortfolioEntitiesQuery().data!).current;
    const portfolio = entities.portfolio;
    const toast = useToast();
    const { mutateAsync: deletePortfolio, isPending: isDeleting } = useDeletePortfolio();
    const navigation = useNavigation();
    const copy = resolveRemoveWalletCopy(portfolio);
    const [isConfirmed, setIsConfirmed] = useState(false);

    const walletsCount =
        portfolio.type === PortfolioType.LEDGER ? portfolio.getDerivations().length : 0;

    const handleRemove = async () => {
        try {
            await deletePortfolio(portfolio);
            toast(t('removeWallet.toastMessages.walletRemoved'));

            navigation.dispatch(
                CommonActions.reset({ index: 0, routes: [{ name: 'TabsNavigator' }] })
            );
        } catch {
            // Security check cancelled
        }
    };

    const handleBackUpPress = () => {
        navigation.navigate('RecoveryConfirmSheet');
    };

    return (
        <View>
            <View style={styles.titleBox}>
                <Text textAlign="center" variant="titleM">
                    {t(copy.titleKey, { name: portfolio.meta.name })}
                </Text>
                <Text textAlign="center" variant="bodyL" color="secondary" style={styles.subtitle}>
                    {t(copy.subtitleKey, { count: walletsCount })}{' '}
                    {copy.hasBackUpLink && (
                        <Text variant="bodyL" color="link" onPress={handleBackUpPress}>
                            {t('removeWallet.backUpLink')}
                        </Text>
                    )}
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
                    disabled={(copy.checkboxKey !== undefined && !isConfirmed) || isDeleting}
                    onPress={handleRemove}
                >
                    {t(copy.buttonKey)}
                </Button>
                <Button type="secondary" size="large" onPress={close}>
                    {t('removeWallet.cancelButton')}
                </Button>
            </View>
        </View>
    );
};

const RemoveWalletDispatch = ({ derivationIndex }: { derivationIndex?: number }) => {
    const entities = useRef(useActivePortfolioEntitiesQuery().data!).current;
    const portfolio = entities.portfolio;

    if (portfolio.type === PortfolioType.LEDGER && derivationIndex !== undefined) {
        const derivation = portfolio.getDerivations().find(item => item.index === derivationIndex);

        if (derivation) {
            return <HideDerivationContent portfolio={portfolio} derivation={derivation} />;
        }
    }

    return <RemoveWalletContent />;
};

type RemoveWalletSheetProps = StaticScreenProps<{ derivationIndex?: number } | undefined>;

export const RemoveWalletSheet = (props: RemoveWalletSheetProps) => {
    return (
        <BottomSheetScreen>
            <RemoveWalletDispatch derivationIndex={props.route.params?.derivationIndex} />
        </BottomSheetScreen>
    );
};
