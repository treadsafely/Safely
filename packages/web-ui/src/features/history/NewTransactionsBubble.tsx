import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import { bubbleStyles, containerStyles } from './NewTransactionsBubble.styles';
import type { NewTransactionsBubbleMode } from './useNewTransactionsBubble';
import { Toast } from '../../shared';

export type NewTransactionsBubbleProps = {
    mode: NewTransactionsBubbleMode;
    onClick: () => void;
};

export const NewTransactionsBubble: FC<NewTransactionsBubbleProps> = ({ mode, onClick }) => {
    const t = useTranslate();

    return (
        <div
            className={containerStyles}
            data-visible={mode === 'hidden' ? undefined : ''}
            inert={mode === 'hidden'}
        >
            <Toast
                message={mode === 'many' ? t('history.bubble.many') : t('history.bubble.one')}
                className={bubbleStyles}
                onClick={onClick}
            />
        </div>
    );
};
