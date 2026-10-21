import type { FC } from 'react';

import { css, cx } from '@safely/web-ui/styled-system/css';

import { useToastStore } from './store';

/* Styles are static and only the choice of class name depends on the type: a token path behind
   a ternary inside `css()` extracts to nothing (`@pandacss/no-dynamic-styling`). */
const toastBase = css({
    maxWidth: '480px',
    paddingBlock: '12',
    paddingInline: '16',
    borderRadius: 'md',
    backgroundColor: 'background.tertiary',
    fontSize: '14px'
});

const toastTone = {
    error: css({ color: 'accent.red' }),
    neutral: css({ color: 'text.primary' })
};

/* Minimal on purpose: the Base UI `Toast` slot recipe replaces this with the component library. */
export const ToastViewport: FC = () => {
    const entries = useToastStore(state => state.entries);

    if (entries.length === 0) {
        return null;
    }

    return (
        <div
            className={css({
                position: 'fixed',
                insetInline: '0',
                top: '12',
                zIndex: 'toast',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8',
                pointerEvents: 'none'
            })}
        >
            {entries.map(entry => (
                <div
                    key={entry.id}
                    className={cx(
                        toastBase,
                        entry.type === 'error' ? toastTone.error : toastTone.neutral
                    )}
                >
                    {entry.message}
                </div>
            ))}
        </div>
    );
};
