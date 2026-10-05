import { useMutation } from '@tanstack/react-query';
import Color from 'color';
import { View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

import { useBottomSheet } from '../BottomSheet';
import { Button } from '../Button';
import { SlideButton } from '../SlideButton';
import { Text } from '../Text';
import { styles } from './DestructiveConfirm.styles';

export type DestructiveConfirmProps = {
    title: string;
    message: string;
    sliderLabel: string;
    sliderDescription: string;
    cancelLabel: string;
    onConfirm: () => void | Promise<void>;
};

export const DestructiveConfirm = (props: DestructiveConfirmProps) => {
    const { title, message, sliderLabel, sliderDescription, cancelLabel, onConfirm } = props;

    const { close } = useBottomSheet();
    const { theme } = useUnistyles();

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            await onConfirm();
        }
    });

    return (
        <View style={styles.content}>
            <View style={styles.titleBox}>
                <Text textAlign="center" variant="titleM">
                    {title}
                </Text>
                <Text textAlign="center" variant="bodyL" color="secondary">
                    {message}
                </Text>
            </View>

            <View style={styles.footer}>
                <SlideButton
                    label={sliderLabel}
                    description={sliderDescription}
                    trackColor={Color(theme.colors.accent.red).alpha(0.16).toString()}
                    knobColor={theme.colors.accent.red}
                    textColor={theme.colors.accent.red}
                    loading={isPending}
                    onSlideComplete={() => mutate()}
                />
                <Button type="secondary" size="large" onPress={close}>
                    {cancelLabel}
                </Button>
            </View>
        </View>
    );
};
