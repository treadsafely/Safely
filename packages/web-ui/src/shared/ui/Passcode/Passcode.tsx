import type { FC, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useEffect, useRef } from 'react';

import { useTranslate } from '@safely/ux';
import Backspace28 from '@safely/ux/assets/icons/28/backspace-28.svg?react';
import Fingerprint96 from '@safely/ux/assets/icons/96/fingerprint-96.svg?react';
import { cx } from '@safely/web-ui/styled-system/css';
import { passcode } from '@safely/web-ui/styled-system/recipes';

import { Icon } from '../Icon';

export type PasscodeProps = {
    value: string;
    length: number;
    isInvalid?: boolean;
    isSuccess?: boolean;
    isInset?: boolean;
    onCheckBiometry?: () => void;
    onChange: (value: string) => void;
    className?: string;
};

const preventFocus = (event: { preventDefault: () => void }): void => event.preventDefault();

const KEYPAD_ROWS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9']
];

export const Passcode: FC<PasscodeProps> = props => {
    const { value, length, isInvalid, isSuccess, isInset, onCheckBiometry, onChange, className } =
        props;

    const t = useTranslate();
    const styles = passcode({ isInvalid, isSuccess, isInset });

    const append = (digit: string): void => {
        if (value.length < length) {
            onChange(value + digit);
        }
    };

    const removeLast = (): void => onChange(value.slice(0, -1));

    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        rootRef.current?.focus();
    }, []);

    const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
        if (event.key === 'Backspace') {
            event.preventDefault();
            removeLast();
            return;
        }

        if (/^[0-9]$/.test(event.key)) {
            event.preventDefault();
            append(event.key);
        }
    };

    return (
        <div
            ref={rootRef}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            className={cx(styles.root, className)}
        >
            <div className={styles.boxes}>
                {Array.from({ length }, (_, index) => (
                    <div key={index} className={styles.box}>
                        {index < value.length && <div className={styles.dot} />}
                    </div>
                ))}
            </div>

            <div className={styles.keypad}>
                {KEYPAD_ROWS.map(row => (
                    <div key={row[0]} className={styles.row}>
                        {row.map(digit => (
                            <button
                                key={digit}
                                type="button"
                                className={styles.key}
                                onMouseDown={preventFocus}
                                onClick={() => append(digit)}
                            >
                                {digit}
                            </button>
                        ))}
                    </div>
                ))}

                <div className={styles.row}>
                    {onCheckBiometry ? (
                        <button
                            type="button"
                            className={styles.key}
                            aria-label={t('biometry.default.title')}
                            onMouseDown={preventFocus}
                            onClick={onCheckBiometry}
                        >
                            <Icon asset={Fingerprint96} size={28} />
                        </button>
                    ) : (
                        <button type="button" className={styles.key} disabled aria-hidden />
                    )}

                    <button
                        type="button"
                        className={styles.key}
                        onMouseDown={preventFocus}
                        onClick={() => append('0')}
                    >
                        0
                    </button>

                    <button
                        type="button"
                        className={styles.key}
                        aria-label={t('onboarding.passcode.backspace')}
                        onMouseDown={preventFocus}
                        onClick={removeLast}
                    >
                        <Icon asset={Backspace28} size={28} />
                    </button>
                </div>
            </div>
        </div>
    );
};
