import { selectionAsync } from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useUnistyles } from 'react-native-unistyles';

import type { PortfolioMetaIcon } from '@safely/core';
import {
    allowedPortfolioMetaColors,
    allowedPortfolioMetaEmojis,
    PORTFOLIO_NAME_MAX_LENGTH
} from '@safely/core';

import { Badge, ColorPicker, EmojiPicker, Text } from '@mobile/shared/ui';
import { smoothstepGradient, useAutoFocus } from '@mobile/shared/utils';

import { styles } from './CustomizeWalletContent.styles';

interface CustomizeWalletContentProps {
    title: string;
    description: string;
    walletName: string;
    onWalletNameChange: (value: string) => void;
    selectedIcon?: PortfolioMetaIcon;
    onIconChange?: (icon: PortfolioMetaIcon) => void;
    tag?: number;
    disabled?: boolean;
    onSubmitEditing?: () => void;
}

export const CustomizeWalletContent = ({
    title,
    description,
    walletName,
    onWalletNameChange,
    selectedIcon,
    onIconChange,
    tag,
    disabled = false,
    onSubmitEditing
}: CustomizeWalletContentProps) => {
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useAutoFocus();

    styles.useVariants({ focused: isFocused });

    const handleIconChange = useCallback(
        (icon: PortfolioMetaIcon) => {
            selectionAsync();
            onIconChange?.(icon);
        },
        [onIconChange]
    );

    const accessory = useMemo(() => {
        if (tag !== undefined) {
            return <Badge>{String(tag)}</Badge>;
        }

        if (selectedIcon?.type === 'emoji') {
            return (
                <View style={styles.iconContainer}>
                    <Text style={styles.inputEmoji}>{selectedIcon.value}</Text>
                </View>
            );
        }

        if (selectedIcon?.type === 'color') {
            return (
                <View style={styles.iconContainer}>
                    <View style={[styles.colorDot, { backgroundColor: selectedIcon.value }]} />
                </View>
            );
        }

        return null;
    }, [tag, selectedIcon]);

    return (
        <>
            <View style={styles.content} pointerEvents={disabled ? 'none' : 'auto'}>
                <View style={styles.textContainer}>
                    <Text textAlign="center" variant="titleM">
                        {title}
                    </Text>
                    <Text textAlign="center" variant="bodyL" color="secondary">
                        {description}
                    </Text>
                </View>

                <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            ref={inputRef}
                            value={walletName}
                            onChangeText={onWalletNameChange}
                            placeholder={t('customizeWallet.namePlaceholder')}
                            placeholderTextColor={theme.colors.text.tertiary}
                            style={[styles.input, { color: theme.colors.text.primary }]}
                            editable={!disabled}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            maxLength={PORTFOLIO_NAME_MAX_LENGTH}
                            returnKeyType="done"
                            onSubmitEditing={onSubmitEditing}
                        />
                        {accessory}
                    </View>
                </View>

                {tag === undefined && (
                    <KeyboardAwareScrollView
                        style={styles.scrollContainer}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <ColorPicker
                            colors={allowedPortfolioMetaColors}
                            selectedColor={
                                selectedIcon?.type === 'color' ? selectedIcon.value : undefined
                            }
                            onColorSelect={color =>
                                handleIconChange({ type: 'color', value: color })
                            }
                        />

                        <EmojiPicker
                            emojis={allowedPortfolioMetaEmojis}
                            onEmojiSelect={emoji =>
                                handleIconChange({ type: 'emoji', value: emoji })
                            }
                        />
                    </KeyboardAwareScrollView>
                )}
            </View>
            <KeyboardStickyView pointerEvents="none">
                <LinearGradient
                    style={styles.gradient}
                    colors={smoothstepGradient(theme.colors.background.primary)}
                />
            </KeyboardStickyView>
        </>
    );
};
