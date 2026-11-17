import { NavigationContext } from '@react-navigation/core';
import { useContext } from 'react';

import { Icon, ArrowLeft16 } from '@mobile/shared/ui/Icon';
import { Button } from '@mobile/shared/ui/Screen/components/Header/components/Button';

type BackButtonProps = {
    type?: 'rounded' | 'translucent';
    onPress?: () => void;
    testID?: string;
};

export const BackButton = ({ type, onPress, testID }: BackButtonProps) => {
    const navigation = useContext(NavigationContext);

    const handleBack = onPress ?? (() => navigation?.goBack());

    return (
        <Button type={type} testID={testID} onPress={handleBack}>
            <Icon icon={ArrowLeft16} />
        </Button>
    );
};
