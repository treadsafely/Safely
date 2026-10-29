import type { Ref } from 'react';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Pressable, TextInput, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    Easing,
    withDelay,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import { useUnistyles } from 'react-native-unistyles';

import type { ContactMeta, PortfolioMeta } from '@safely/core';
import { ellipsisMiddle } from '@safely/core';
import { SuggestionSource, useScanQrScheme } from '@safely/ux';

import { ContactName } from '@mobile/entities/contact';
import { PortfolioName } from '@mobile/entities/portfolio';
import { TEST_ID } from '@mobile/shared/constants';
import { Icon, QrCodeScan28, XmarkCircle16 } from '@mobile/shared/ui/Icon';
import { Text } from '@mobile/shared/ui/Text';
import { TouchableOpacity } from '@mobile/shared/ui/TouchableOpacity';

import { styles } from './AddressInput.styles';
import { AddressSuffix } from './AddressSuffix';

interface AddressInputProps {
    value: string;
    onChangeText: (value: string) => void;
    error?: string;
    label?: string;
    placeholder?: string;
    inputRef?: Ref<TextInput>;
    selectedPortfolioMeta?: PortfolioMeta;
    selectedContactMeta?: ContactMeta;
    metaSource?: SuggestionSource;
    onSubmitEditing?: () => void;
}

export const AddressInput = (props: AddressInputProps) => {
    const {
        value,
        onChangeText,
        error,
        label,
        placeholder,
        inputRef,
        selectedPortfolioMeta,
        selectedContactMeta,
        metaSource,
        onSubmitEditing
    } = props;
    const selectedMeta = selectedPortfolioMeta ?? selectedContactMeta;
    const isSuggestionsMeta = !!selectedMeta && metaSource === SuggestionSource.SUGGESTIONS;
    const isUserDefinedMeta = !!selectedMeta && metaSource === SuggestionSource.USER_DEFINED;
    const { t } = useTranslation();
    const { theme } = useUnistyles();

    const fallbackRef = useRef<TextInput>(null);
    const textInputRef = (inputRef as React.RefObject<TextInput>) ?? fallbackRef;

    // iOS multiline TextInput skips re-measure when value is set after a clear while unfocused; remount forces it
    const [scanRemountKey, setScanRemountKey] = useState(0);

    const scan = useScanQrScheme({
        allowedSchemes: ['btc-transfer', 'flame-transfer'] as const,
        onResult: useCallback(
            scheme => {
                onChangeText(scheme.parsed.address);
                setScanRemountKey(key => key + 1);
            },
            [onChangeText]
        )
    });

    const handleScan = useCallback(() => {
        Keyboard.dismiss();
        scan();
    }, [scan]);

    const [isFocused, setIsFocused] = useState(false);
    const [boxWidth, setBoxWidth] = useState(0);

    const hasValue = value.length > 0;
    const hasError = !!error;

    styles.useVariants({
        focused: isFocused && !hasError,
        error: hasError
    });

    const handleFocus = useCallback(() => {
        setIsFocused(true);
    }, []);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
    }, []);

    const handleClear = useCallback(() => {
        onChangeText('');
    }, [onChangeText]);

    const handleChangeText = useCallback(
        (text: string) => {
            if (isSuggestionsMeta) {
                const added = text.length > value.length ? text.slice(value.length) : '';
                onChangeText(added);
                return;
            }
            onChangeText(text);
        },
        [onChangeText, isSuggestionsMeta, value]
    );

    const handleSelectedPress = useCallback(() => {
        textInputRef.current?.focus();
    }, [textInputRef]);

    return (
        <View>
            {label && (
                <View style={styles.labelContainer}>
                    <Text variant="bodyM" color="tertiary">
                        {label}
                    </Text>
                </View>
            )}
            <View style={styles.container}>
                <View
                    style={[styles.inputModeBox, !hasValue && styles.emptyInputBox]}
                    onLayout={e => setBoxWidth(e.nativeEvent.layout.width)}
                >
                    <TextInput
                        key={scanRemountKey}
                        testID={TEST_ID.send.addressInput}
                        ref={textInputRef}
                        value={value}
                        onChangeText={handleChangeText}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        style={[styles.input, isSuggestionsMeta && styles.hiddenInput]}
                        placeholder={placeholder}
                        placeholderTextColor={theme.colors.text.tertiary}
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        multiline
                        submitBehavior="submit"
                        returnKeyType="next"
                        onSubmitEditing={onSubmitEditing}
                    />
                    {isUserDefinedMeta && (
                        <AddressSuffix
                            value={value}
                            portfolioMeta={selectedPortfolioMeta}
                            contactMeta={selectedContactMeta}
                            containerWidth={boxWidth}
                        />
                    )}
                    {isSuggestionsMeta && (
                        <Pressable style={styles.selectedContent} onPress={handleSelectedPress}>
                            {selectedPortfolioMeta ? (
                                <PortfolioName
                                    gap={8}
                                    meta={selectedPortfolioMeta}
                                    size={16}
                                    fontVariant="bodyL"
                                />
                            ) : (
                                selectedContactMeta && (
                                    <ContactName
                                        gap={8}
                                        meta={selectedContactMeta}
                                        size={16}
                                        fontVariant="bodyL"
                                    />
                                )
                            )}
                            <Text variant="bodyL" color="tertiary">
                                {ellipsisMiddle(value)}
                            </Text>
                            <BlinkingCursor color={theme.colors.accent.blue} />
                        </Pressable>
                    )}
                </View>

                {hasValue ? (
                    <TouchableOpacity
                        style={[styles.iconButton, styles.clearIconButton]}
                        onPress={handleClear}
                    >
                        <Icon icon={XmarkCircle16} color="tertiary" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.iconButton} onPress={handleScan}>
                        <Icon icon={QrCodeScan28} color="accent" />
                    </TouchableOpacity>
                )}
            </View>

            {hasError && <Text style={styles.errorText}>{t(error)}</Text>}
        </View>
    );
};

function BlinkingCursor({ color }: { color: string }) {
    const opacity = useSharedValue(1);

    opacity.value = withRepeat(
        withSequence(
            withDelay(500, withTiming(0, { duration: 100, easing: Easing.inOut(Easing.ease) })),
            withDelay(500, withTiming(1, { duration: 100, easing: Easing.inOut(Easing.ease) }))
        ),
        Infinity
    );

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value
    }));

    return (
        <Animated.View style={[styles.selectedCursor, { backgroundColor: color }, animatedStyle]} />
    );
}
