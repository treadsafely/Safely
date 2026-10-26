import { useCallback, useState } from 'react';

import type { Contact } from '@safely/core';
import { useDeleteContact, useErrorToast } from '@safely/ux';

type AddressBookDraft =
    { kind: 'create' } | { kind: 'edit'; contact: Contact } | { kind: 'delete'; contact: Contact };

export function useAddressBookFlow() {
    const { mutateAsync: deleteContact } = useDeleteContact();
    const errorToast = useErrorToast({});

    const [draft, setDraft] = useState<AddressBookDraft | null>(null);

    const startCreate = useCallback(() => setDraft({ kind: 'create' }), []);
    const openContact = useCallback((contact: Contact) => setDraft({ kind: 'edit', contact }), []);
    const close = useCallback(() => setDraft(null), []);

    const confirmDelete = useCallback(
        () =>
            setDraft(current =>
                current?.kind === 'edit' ? { kind: 'delete', contact: current.contact } : current
            ),
        []
    );

    const remove = useCallback(async () => {
        if (draft?.kind !== 'delete') {
            return;
        }

        const { contact } = draft;
        setDraft(null);

        try {
            await deleteContact(contact);
        } catch (error) {
            errorToast(error);
        }
    }, [draft, deleteContact, errorToast]);

    return { draft, startCreate, openContact, confirmDelete, remove, close };
}
