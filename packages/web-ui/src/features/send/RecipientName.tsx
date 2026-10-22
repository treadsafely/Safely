import type { FC } from 'react';

import type { ContactMeta, PortfolioMeta } from '@safely/core';

import { ContactIcon, WalletIcon } from '../../entities';

export type RecipientNameProps = {
    portfolioMeta?: PortfolioMeta;
    contactMeta?: ContactMeta;
};

export const RecipientName: FC<RecipientNameProps> = props => {
    const { portfolioMeta, contactMeta } = props;

    if (portfolioMeta) {
        return (
            <>
                <WalletIcon icon={portfolioMeta.icon} />
                {portfolioMeta.name}
            </>
        );
    }

    if (contactMeta) {
        return (
            <>
                <ContactIcon color={contactMeta.color} />
                {contactMeta.name}
            </>
        );
    }

    return null;
};
