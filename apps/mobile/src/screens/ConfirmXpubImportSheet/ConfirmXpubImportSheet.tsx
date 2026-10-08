import type { StaticScreenProps } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { TEST_ID } from '@mobile/shared/constants';
import { BottomSheetScreen } from '@mobile/shared/navigation';
import { Button, Text, useBottomSheet, useCallOnClose } from '@mobile/shared/ui';

import { styles } from './ConfirmXpubImportSheet.styles';

type ConfirmXpubImportParams = {
    address: string;
    onConfirm: () => void;
};

type ConfirmXpubImportSheetProps = StaticScreenProps<ConfirmXpubImportParams>;

const ConfirmXpubImportContent = (props: ConfirmXpubImportParams) => {
    const { address, onConfirm } = props;

    const { t } = useTranslation();
    const { close } = useBottomSheet();
    const callOnClose = useCallOnClose();

    // The import continues only once the sheet is off the stack, so the next screen is not
    // pushed underneath it.
    const handleConfirm = () => {
        callOnClose(onConfirm);
    };

    return (
        <View style={styles.content}>
            <View style={styles.titleBox}>
                <Text textAlign="center" variant="titleM">
                    {t('addWallet.watchAccount.confirmXpub.title')}
                </Text>
                <Text textAlign="center" variant="bodyL" color="secondary">
                    {t('addWallet.watchAccount.confirmXpub.description')}
                </Text>
            </View>

            <View style={styles.addressBox}>
                <Text variant="labelM" color="secondary">
                    {t('addWallet.watchAccount.confirmXpub.addressLabel')}
                </Text>
                <Text testID={TEST_ID.watchOnly.confirmXpubAddress} variant="bodyLMono">
                    {address}
                </Text>
            </View>

            <Text textAlign="center" variant="bodyM" color="secondary">
                {t('addWallet.watchAccount.confirmXpub.verify')}
            </Text>

            <View style={styles.footer}>
                <Button
                    testID={TEST_ID.watchOnly.confirmXpubButton}
                    type="primary"
                    size="large"
                    onPress={handleConfirm}
                >
                    {t('common.continue')}
                </Button>
                <Button
                    testID={TEST_ID.watchOnly.cancelXpubButton}
                    type="secondary"
                    size="large"
                    onPress={close}
                >
                    {t('common.cancel')}
                </Button>
            </View>
        </View>
    );
};

export const ConfirmXpubImportSheet = (props: ConfirmXpubImportSheetProps) => {
    return (
        <BottomSheetScreen>
            <ConfirmXpubImportContent {...props.route.params} />
        </BottomSheetScreen>
    );
};
