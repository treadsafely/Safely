import { useCallback, useState } from 'react';

export type DisclosureProps = {
    isOpen?: boolean;
    defaultIsOpen?: boolean;
    onOpen?: () => void;
    onClose?: () => void;
};

export function useDisclosure(props: DisclosureProps = {}) {
    const {
        isOpen: isOpenProp,
        defaultIsOpen = false,
        onOpen: onOpenProp,
        onClose: onCloseProp
    } = props;

    const [isOpenState, setIsOpenState] = useState(defaultIsOpen);

    const isControlled = isOpenProp !== undefined;
    const isOpen = isControlled ? isOpenProp : isOpenState;

    const onOpen = useCallback(() => {
        if (!isControlled) {
            setIsOpenState(true);
        }
        onOpenProp?.();
    }, [isControlled, onOpenProp]);

    const onClose = useCallback(() => {
        if (!isControlled) {
            setIsOpenState(false);
        }
        onCloseProp?.();
    }, [isControlled, onCloseProp]);

    const onToggle = useCallback(() => (isOpen ? onClose() : onOpen()), [isOpen, onOpen, onClose]);

    return { isOpen, onOpen, onClose, onToggle };
}
