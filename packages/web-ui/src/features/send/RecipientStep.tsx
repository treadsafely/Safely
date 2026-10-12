import type { FC } from 'react';

import { CONTACT_NAME_MAX_LENGTH, PortfolioType } from '@safely/core';
import type { RecipientView } from '@safely/ux';
import { hasSuggestionMatches, resolveVisibleSuggestions, useTranslate } from '@safely/ux';

import { AddressInput } from './AddressInput';
import { addressBookStyles, listStyles, walletRowStyles } from './RecipientStep.styles';
import { ContactCell, PortfolioTypeBadge, WalletIcon } from '../../entities';
import { Cell, Input, List } from '../../shared';

export type RecipientStepProps = {
    view: RecipientView;
};

export const RecipientStep: FC<RecipientStepProps> = ({ view }) => {
    const t = useTranslate();

    const suggestions = resolveVisibleSuggestions(view);
    const hasSuggestions = hasSuggestionMatches(suggestions);
    const error = hasSuggestionMatches(view.suggestions) ? undefined : view.errors.recipient;

    const selectedPortfolio = suggestions.portfolios.find(
        item => item.id === view.selectedSuggestionId
    );
    const selectedContact = suggestions.contacts.find(
        item => item.id === view.selectedSuggestionId
    );

    return (
        <>
            <AddressInput
                value={view.values.recipient}
                error={error}
                portfolioMeta={selectedPortfolio?.meta}
                contactMeta={selectedContact?.meta}
                source={view.selectedSuggestionSource}
                onChange={view.setRecipient}
                onSubmit={'next' in view ? view.next : undefined}
            />

            {hasSuggestions && (
                <List className={listStyles}>
                    {suggestions.portfolios.length > 0 && (
                        <List.Group variant="divided">
                            {suggestions.portfolios.map(suggestion => (
                                <Cell
                                    key={suggestion.id}
                                    onClick={() =>
                                        view.selectSuggestion(suggestion.id, suggestions)
                                    }
                                >
                                    <Cell.Leading>
                                        <WalletIcon icon={suggestion.meta.icon} />
                                    </Cell.Leading>
                                    <Cell.Content>
                                        <Cell.Row className={walletRowStyles}>
                                            <Cell.Title>{suggestion.meta.name}</Cell.Title>
                                            {suggestion.isWatchOnly && (
                                                <PortfolioTypeBadge
                                                    type={PortfolioType.WATCH_ONLY}
                                                    tone="warning"
                                                />
                                            )}
                                        </Cell.Row>
                                    </Cell.Content>
                                    {suggestion.id === view.selectedSuggestionId && (
                                        <Cell.Checkmark />
                                    )}
                                </Cell>
                            ))}
                        </List.Group>
                    )}

                    {suggestions.contacts.length > 0 && (
                        <List.Group variant="divided">
                            {suggestions.contacts.map(suggestion => (
                                <ContactCell
                                    key={suggestion.id}
                                    meta={suggestion.meta}
                                    isSelected={suggestion.id === view.selectedSuggestionId}
                                    onSelect={() =>
                                        view.selectSuggestion(suggestion.id, suggestions)
                                    }
                                />
                            ))}
                        </List.Group>
                    )}
                </List>
            )}

            {view.selectedSuggestionId === undefined && view.status === 'valid' && (
                <div className={addressBookStyles}>
                    <Input>
                        <Input.Label>{t('send.addressBook.label')}</Input.Label>
                        <Input.Field
                            value={view.values.addressBookName}
                            maxLength={CONTACT_NAME_MAX_LENGTH}
                            placeholder={t('send.addressBook.placeholder')}
                            clearLabel={t('common.clear')}
                            onClear={() => view.setAddressBookName('')}
                            onChange={event => view.setAddressBookName(event.target.value)}
                        />
                        <Input.Description>{t('send.addressBook.description')}</Input.Description>
                    </Input>
                </div>
            )}
        </>
    );
};
