import type { Ref } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextInput } from 'react-native';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { CONTACT_NAME_MAX_LENGTH } from '@safely/core';
import { hasSuggestionMatches, type RecipientView } from '@safely/ux';

import { Input } from '@mobile/shared/ui';

import { AddressInput, SuggestionsList } from '../components';
import { styles } from './RecipientStep.styles';
import { useSuggestionSelection } from '../components/SuggestionsList/useSuggestionSelection';

interface RecipientStepProps {
    view: RecipientView;
    inputRef?: Ref<TextInput>;
    onSubmitEditing?: () => void;
}

export const RecipientStep = (props: RecipientStepProps) => {
    const { view, inputRef, onSubmitEditing } = props;

    const { t } = useTranslation();

    const {
        values,
        errors,
        suggestions,
        restoredSuggestions,
        selectedSuggestionId,
        selectedSuggestionSource,
        setRecipient,
        setAddressBookName,
        selectSuggestion,
        status
    } = view;

    const { displaySuggestions, handleSelect, handleChangeText } = useSuggestionSelection({
        suggestions,
        restoredSuggestions,
        selectedId: selectedSuggestionId,
        onChangeText: setRecipient,
        onSelectSuggestion: selectSuggestion
    });

    const selectedPortfolioMeta = useMemo(
        () => displaySuggestions.portfolios.find(s => s.id === selectedSuggestionId)?.meta,
        [displaySuggestions, selectedSuggestionId]
    );
    const selectedContactMeta = useMemo(
        () => displaySuggestions.contacts.find(s => s.id === selectedSuggestionId)?.meta,
        [displaySuggestions, selectedSuggestionId]
    );

    const hasSearchMatches = hasSuggestionMatches(suggestions);
    const visibleError = hasSearchMatches ? undefined : errors.recipient;
    const isValid = status === 'valid';

    return (
        <View style={{ flex: 1 }}>
            <AddressInput
                onSubmitEditing={onSubmitEditing}
                value={values.recipient}
                onChangeText={handleChangeText}
                error={visibleError}
                inputRef={inputRef}
                label={t('send.recipient.label')}
                placeholder={t('send.recipient.placeholder')}
                selectedPortfolioMeta={selectedPortfolioMeta}
                selectedContactMeta={selectedContactMeta}
                metaSource={selectedSuggestionSource}
            />
            <KeyboardAwareScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bottomOffset={16}
                keyboardDismissMode="on-drag"
            >
                <SuggestionsList
                    suggestions={displaySuggestions}
                    selectedId={selectedSuggestionId}
                    onSelect={handleSelect}
                />
                {!selectedSuggestionId && isValid && (
                    <Input>
                        <Input.Label>{t('send.addressBook.label')}</Input.Label>
                        <Input.Field
                            value={values.addressBookName}
                            onChangeText={setAddressBookName}
                            withClearButton
                            placeholder={t('send.addressBook.placeholder')}
                            maxLength={CONTACT_NAME_MAX_LENGTH}
                        />
                        <Input.Description>{t('send.addressBook.description')}</Input.Description>
                    </Input>
                )}
            </KeyboardAwareScrollView>
        </View>
    );
};
