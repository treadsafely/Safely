import type { FC } from 'react';

import { useContacts, useTranslate } from '@safely/ux';
import AddressBook96 from '@safely/ux/assets/icons/96/address-book-96.svg?react';

import {
    actionStyles,
    descriptionStyles,
    emptyStyles,
    introStyles,
    titleStyles
} from './AddressBookSettings.styles';
import { listStyles } from './SettingsSection.styles';
import { ContactCell } from '../../../entities';
import { ContactModals, useAddressBookFlow } from '../../../features';
import { Button, Icon, List, PageHeader, Text } from '../../../shared';

export const AddressBookSettings: FC = () => {
    const t = useTranslate();
    const contacts = useContacts();
    const flow = useAddressBookFlow();

    const isEmpty = contacts.length === 0;

    const intro = (
        <div className={introStyles}>
            <Icon asset={AddressBook96} size={96} />
            <Text as="h2" className={titleStyles}>
                {t('addressBook.title')}
            </Text>
            <Text variant="bodyL" tone="secondary" align="center" className={descriptionStyles}>
                {isEmpty ? t('addressBook.subtitle') : t('addressBook.subtitle_not_empty')}
            </Text>
            <Button
                variant={isEmpty ? 'primary' : 'secondary'}
                size="small"
                className={actionStyles}
                onClick={flow.startCreate}
            >
                {t('addressBook.addContact')}
            </Button>
        </div>
    );

    return (
        <>
            <PageHeader title={t('addressBook.title')} hasDivider />

            {isEmpty ? <div className={emptyStyles}>{intro}</div> : intro}

            {!isEmpty && (
                <List className={listStyles}>
                    <List.Group variant="divided">
                        {contacts.map(contact => (
                            <ContactCell
                                key={contact.id.toString()}
                                meta={contact.meta}
                                onSelect={() => flow.openContact(contact)}
                            />
                        ))}
                    </List.Group>
                </List>
            )}

            <ContactModals flow={flow} />
        </>
    );
};
