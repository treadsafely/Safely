import { useNavigation } from '@react-navigation/core';
import type { Ref } from 'react';
import { useCallback } from 'react';

import type { BottomSheetProps, BottomSheetRef } from '@mobile/shared/ui';
import { BottomSheet } from '@mobile/shared/ui';

type BottomSheetScreenProps = BottomSheetProps & {
    ref?: Ref<BottomSheetRef>;
};

export const BottomSheetScreen = (props: BottomSheetScreenProps) => {
    const { onClose, ref, ...rest } = props;

    const navigation = useNavigation();

    const handleClose = useCallback(() => {
        onClose?.();
        navigation.goBack();
    }, [navigation, onClose]);

    return <BottomSheet ref={ref} {...rest} onClose={handleClose} />;
};
