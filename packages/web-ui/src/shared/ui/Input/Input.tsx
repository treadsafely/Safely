import { Field } from '@base-ui/react/field';
import type { ComponentPropsWithoutRef, FC, MouseEvent, ReactNode } from 'react';
import { useRef } from 'react';

import XmarkCircle16 from '@safely/ux/assets/icons/16/xmark-circle-16.svg?react';
import { cx } from '@safely/web-ui/styled-system/css';
import { input } from '@safely/web-ui/styled-system/recipes';

import { Icon } from '../Icon';

export type InputRootProps = Omit<ComponentPropsWithoutRef<typeof Field.Root>, 'className'> & {
    className?: string;
};

export type InputLabelProps = Omit<ComponentPropsWithoutRef<typeof Field.Label>, 'className'> & {
    className?: string;
};

export type InputDescriptionProps = Omit<
    ComponentPropsWithoutRef<typeof Field.Description>,
    'className'
> & {
    className?: string;
};

export type InputFieldProps = Omit<
    ComponentPropsWithoutRef<typeof Field.Control>,
    'className' | 'render'
> & {
    leading?: ReactNode;
    trailing?: ReactNode;
    isMultiline?: boolean;
    onClear?: () => void;
    clearLabel?: string;
    className?: string;
};

const InputRoot: FC<InputRootProps> = props => {
    const { className, ...rest } = props;

    return <Field.Root className={cx(input().root, className)} {...rest} />;
};

const InputLabel: FC<InputLabelProps> = props => {
    const { className, ...rest } = props;

    return <Field.Label className={cx(input().label, className)} {...rest} />;
};

const InputDescription: FC<InputDescriptionProps> = props => {
    const { className, ...rest } = props;

    return <Field.Description className={cx(input().description, className)} {...rest} />;
};

const InputField: FC<InputFieldProps> = props => {
    const { leading, trailing, isMultiline, onClear, clearLabel, className, value, ...rest } =
        props;

    const controlRef = useRef<HTMLInputElement>(null);
    const styles = input({ isMultiline });

    const isClearVisible = Boolean(onClear && value);

    /* Everything around the control — padding, border, the empty part of the slots — reads as the
       field, so a click there has to land the caret in the control. */
    const handleFieldMouseDown = (event: MouseEvent<HTMLDivElement>) => {
        if (
            event.target instanceof HTMLElement &&
            event.target.closest('button, input, textarea')
        ) {
            return;
        }

        event.preventDefault();
        controlRef.current?.focus();
    };

    /* Preventing the default keeps the control focused while the value is being cleared. */
    const handleClearMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };

    const handleClear = () => {
        onClear?.();
        controlRef.current?.focus();
    };

    return (
        <div className={cx(styles.wrapper, className)}>
            <div className={styles.field} onMouseDown={handleFieldMouseDown}>
                <div className={styles.content}>
                    {leading}

                    <Field.Control
                        ref={controlRef}
                        className={styles.control}
                        value={value}
                        render={isMultiline ? <textarea rows={1} /> : undefined}
                        {...rest}
                    />
                </div>

                {isClearVisible ? (
                    <button
                        type="button"
                        className={cx(styles.adornment, styles.action)}
                        aria-label={clearLabel}
                        onMouseDown={handleClearMouseDown}
                        onClick={handleClear}
                    >
                        <Icon asset={XmarkCircle16} tone="tertiary" />
                    </button>
                ) : (
                    trailing && <div className={styles.adornment}>{trailing}</div>
                )}
            </div>
        </div>
    );
};

export const Input = Object.assign(InputRoot, {
    Label: InputLabel,
    Field: InputField,
    Description: InputDescription
});
