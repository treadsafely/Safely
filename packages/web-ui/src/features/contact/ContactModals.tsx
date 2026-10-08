import type { FC } from 'react';

import { ConfirmDeleteContactModal } from './ConfirmDeleteContactModal';
import { ContactModal } from './ContactModal';
import type { useAddressBookFlow } from './useAddressBookFlow';

export type ContactModalsProps = {
    flow: ReturnType<typeof useAddressBookFlow>;
};

export const ContactModals: FC<ContactModalsProps> = ({ flow }) => {
    const { draft } = flow;

    if (draft === null) {
        return null;
    }

    if (draft.kind === 'delete') {
        return (
            <ConfirmDeleteContactModal
                contact={draft.contact}
                onConfirm={() => void flow.remove()}
                onClose={flow.close}
            />
        );
    }

    return (
        <ContactModal
            contact={draft.kind === 'edit' ? draft.contact : undefined}
            onDelete={flow.confirmDelete}
            onClose={flow.close}
        />
    );
};
