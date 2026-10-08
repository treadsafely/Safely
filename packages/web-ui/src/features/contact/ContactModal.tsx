import type { FC } from 'react';

import type { Contact } from '@safely/core';
import { CONTACT_NAME_MAX_LENGTH } from '@safely/core';
import { useContactForm, useDateFormatter, useTranslate } from '@safely/ux';

import {
    bodyStyles,
    errorStyles,
    fieldStyles,
    noteStyles,
    popupStyles,
    removeStyles
} from './ContactModal.styles';
import { Button, Input, List, Modal, TableCell, Text } from '../../shared';

export type ContactModalProps = {
    contact?: Contact;
    onDelete: () => void;
    onClose: () => void;
};

export const ContactModal: FC<ContactModalProps> = props => {
    const { contact, onDelete, onClose } = props;

    const t = useTranslate();
    const formatDate = useDateFormatter({
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const { state, actions, meta } = useContactForm({
        initialContact: contact,
        onSuccess: onClose
    });

    return (
        <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} hasClose={false} closeLabel={t('common.close')}>
                <Modal.Header
                    closeLabel={t('common.close')}
                    title={meta.isEditMode ? t('newContact.editTitle') : t('newContact.title')}
                >
                    <Button
                        variant="primary"
                        size="small"
                        disabled={!meta.canSubmit}
                        onClick={() => void actions.submit()}
                    >
                        {t('common.save')}
                    </Button>
                </Modal.Header>

                <div className={bodyStyles}>
                    <Input invalid={Boolean(state.errors.name)}>
                        <Input.Label>{t('newContact.form.name')}</Input.Label>
                        <Input.Field
                            autoFocus
                            className={fieldStyles}
                            value={state.values.name}
                            maxLength={CONTACT_NAME_MAX_LENGTH}
                            placeholder={t('newContact.form.namePlaceholder')}
                            onChange={event => actions.setName(event.target.value)}
                        />
                        {state.errors.name !== undefined && (
                            <Text variant="bodyM" tone="accentRed" className={errorStyles}>
                                {t(state.errors.name)}
                            </Text>
                        )}
                    </Input>

                    {contact ? (
                        <>
                            <List>
                                <List.Title>{t('newContact.form.address')}</List.Title>
                                <List.Group variant="divided">
                                    {contact.addresses.map(({ address }) => (
                                        <TableCell
                                            key={address}
                                            copyable={address}
                                            copiedLabel={t('actions.copied')}
                                        >
                                            <TableCell.Column>
                                                <TableCell.Value>{address}</TableCell.Value>
                                            </TableCell.Column>
                                        </TableCell>
                                    ))}
                                </List.Group>
                            </List>

                            <Text variant="bodyM" tone="tertiary" className={noteStyles}>
                                {t('newContact.form.addressReadonly')}
                            </Text>
                            <Text variant="bodyM" tone="tertiary" className={noteStyles}>
                                {t('newContact.form.addedOn', {
                                    date: formatDate.format(contact.createdAt)
                                })}
                            </Text>

                            <button type="button" className={removeStyles} onClick={onDelete}>
                                {t('newContact.form.remove')}
                            </button>
                        </>
                    ) : (
                        state.values.addresses.map((address, index) => {
                            const error = state.errors.addresses[index];

                            return (
                                <Input key={index} invalid={Boolean(error)}>
                                    <Input.Label>{t('newContact.form.address')}</Input.Label>
                                    <Input.Field
                                        isMultiline
                                        className={fieldStyles}
                                        value={address.value}
                                        placeholder={t('newContact.form.addressPlaceholder')}
                                        autoComplete="off"
                                        spellCheck={false}
                                        clearLabel={t('common.clear')}
                                        onClear={() => actions.setAddress(index, '')}
                                        onChange={event =>
                                            actions.setAddress(index, event.target.value)
                                        }
                                    />
                                    {error !== undefined && (
                                        <Text
                                            variant="bodyM"
                                            tone="accentRed"
                                            className={errorStyles}
                                        >
                                            {t(error)}
                                        </Text>
                                    )}
                                </Input>
                            );
                        })
                    )}
                </div>
            </Modal.Popup>
        </Modal>
    );
};
