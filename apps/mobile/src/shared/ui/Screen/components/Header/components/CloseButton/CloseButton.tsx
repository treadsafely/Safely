import { NavigationContext } from '@react-navigation/core';
import { useContext } from 'react';

import { useBottomSheetContext } from '@mobile/shared/ui/BottomSheet/context';
import { Icon, Xmark16 } from '@mobile/shared/ui/Icon';
import { Button } from '@mobile/shared/ui/Screen/components/Header/components/Button';

type CloseButtonProps = {
    onPress?: () => void;
};

export const CloseButton = ({ onPress }: CloseButtonProps) => {
    const navigation = useContext(NavigationContext);
    const bottomSheet = useBottomSheetContext();

    const handleClose = onPress ?? bottomSheet?.close ?? (() => navigation?.goBack());

    return (
        <Button onPress={handleClose}>
            <Icon icon={Xmark16} />
        </Button>
    );
};
