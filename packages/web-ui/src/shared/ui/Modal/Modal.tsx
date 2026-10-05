import { Dialog } from '@base-ui/react/dialog';
import type { ComponentPropsWithoutRef, FC, KeyboardEventHandler, ReactNode } from 'react';
import { useRef } from 'react';

import Xmark16 from '@safely/ux/assets/icons/16/xmark-16.svg?react';
import { css, cx } from '@safely/web-ui/styled-system/css';
import { button, modal } from '@safely/web-ui/styled-system/recipes';

import { Icon } from '../Icon';

const styles = modal();

const closeStyles = button({
    variant: 'secondary',
    size: 'xsmall',
    isIconOnly: true,
    isRound: true
});

/* the popup's own content (a camera preview) paints later in DOM order and would bury the button */
const floatingCloseStyles = css({ position: 'absolute', top: '12', right: '12', zIndex: 1 });

/* over a camera preview or an image there is no surface to match, so the button borrows one */
const transparentCloseStyles = css({
    backgroundColor: 'other.transparentElement',
    backdropFilter: 'blur(6px)'
});

export type ModalRootProps = ComponentPropsWithoutRef<typeof Dialog.Root>;

export type ModalPopupProps = {
    closeLabel: string;
    hasClose?: boolean;
    hasTransparentClose?: boolean;
    onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
    children?: ReactNode;
    className?: string;
};

export type ModalHeaderProps = {
    closeLabel: string;
    /* off when the step puts its own control there, a back arrow for instance */
    hasClose?: boolean;
    title?: string;
    align?: 'start';
    children?: ReactNode;
    className?: string;
};

export type ModalContentProps = Omit<ComponentPropsWithoutRef<'div'>, 'className'> & {
    hasFloatingClose?: boolean;
    className?: string;
};

export type ModalActionsProps = Omit<ComponentPropsWithoutRef<'div'>, 'className'> & {
    direction?: 'row';
    className?: string;
};

type ModalPartProps<TElement extends 'div' | 'h2' | 'p'> = Omit<
    ComponentPropsWithoutRef<TElement>,
    'className'
> & {
    className?: string;
};

const ModalPopup: FC<ModalPopupProps> = props => {
    const {
        closeLabel,
        hasClose = true,
        hasTransparentClose,
        onKeyDown,
        className,
        children
    } = props;

    const popupRef = useRef<HTMLDivElement>(null);

    return (
        <Dialog.Portal>
            <Dialog.Backdrop className={styles.backdrop} />

            <Dialog.Popup
                ref={popupRef}
                initialFocus={popupRef}
                className={cx(styles.popup, className)}
                onKeyDown={onKeyDown}
            >
                {hasClose && (
                    <Dialog.Close
                        className={cx(
                            closeStyles,
                            floatingCloseStyles,
                            hasTransparentClose && transparentCloseStyles
                        )}
                        aria-label={closeLabel}
                    >
                        <Icon asset={Xmark16} />
                    </Dialog.Close>
                )}

                {children}
            </Dialog.Popup>
        </Dialog.Portal>
    );
};

const ModalHeader: FC<ModalHeaderProps> = props => {
    const { closeLabel, hasClose = true, title, align, className, children } = props;

    const headerStyles = modal({ align });

    return (
        <div className={cx(headerStyles.header, className)}>
            {hasClose && (
                <Dialog.Close
                    className={cx(closeStyles, headerStyles.headerClose)}
                    aria-label={closeLabel}
                >
                    <Icon asset={Xmark16} />
                </Dialog.Close>
            )}

            {title !== undefined && (
                <Dialog.Title className={headerStyles.headerTitle}>{title}</Dialog.Title>
            )}

            {children}
        </div>
    );
};

const ModalContent: FC<ModalContentProps> = props => {
    const { hasFloatingClose, className, ...rest } = props;

    return <div className={cx(modal({ hasFloatingClose }).content, className)} {...rest} />;
};

const ModalTitle: FC<ModalPartProps<'h2'>> = props => {
    const { className, ...rest } = props;

    return <Dialog.Title className={cx(styles.title, className)} {...rest} />;
};

const ModalDescription: FC<ModalPartProps<'p'>> = props => {
    const { className, ...rest } = props;

    return <Dialog.Description className={cx(styles.description, className)} {...rest} />;
};

const ModalActions: FC<ModalActionsProps> = props => {
    const { direction, className, ...rest } = props;

    return (
        <div className={cx(modal({ actionsDirection: direction }).actions, className)} {...rest} />
    );
};

export const Modal = Object.assign(Dialog.Root, {
    Trigger: Dialog.Trigger,
    Close: Dialog.Close,
    Popup: ModalPopup,
    Header: ModalHeader,
    Content: ModalContent,
    Title: ModalTitle,
    Description: ModalDescription,
    Actions: ModalActions
});
