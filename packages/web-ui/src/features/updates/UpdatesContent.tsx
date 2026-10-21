import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import { UpdatesFeed } from './UpdatesFeed';
import { PageHeader } from '../../shared';

export const UpdatesContent: FC = () => {
    const t = useTranslate();

    return (
        <>
            <PageHeader title={t('tabs.updates')} />
            <UpdatesFeed />
        </>
    );
};
