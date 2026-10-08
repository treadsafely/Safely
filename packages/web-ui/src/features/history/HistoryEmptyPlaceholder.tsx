import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import { containerStyles } from './HistoryEmptyPlaceholder.styles';
import { Button, EmptyState } from '../../shared';

export type HistoryEmptyPlaceholderProps = {
    onReceive: () => void;
};

export const HistoryEmptyPlaceholder: FC<HistoryEmptyPlaceholderProps> = props => {
    const { onReceive } = props;
    const t = useTranslate();

    return (
        <EmptyState
            className={containerStyles}
            title={t('history.empty.title')}
            description={t('history.empty.subtitle')}
            action={
                <Button variant="secondary" size="small" onClick={onReceive}>
                    {t('history.empty.receive')}
                </Button>
            }
        />
    );
};
