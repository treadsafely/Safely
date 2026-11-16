import { NavigationContext } from '@react-navigation/core';
import { useContext } from 'react';

import { Icon, ArrowLeft16 } from '@mobile/shared/ui/Icon';
import { Button } from '@mobile/shared/ui/Screen/components/Header/components/Button';

type BackButtonProps = {
    type?: 'rounded' | 'translucent';
    onPress?: () => void;
};

export const BackButton = ({ type, onPress }: BackButtonProps) => {
    const navigation = useContext(NavigationContext);

    const handleBack = onPress ?? (() => navigation?.goBack());

    return (
        <Button type={type} onPress={handleBack}>
            <Icon icon={ArrowLeft16} />
        </Button>
    );
};
