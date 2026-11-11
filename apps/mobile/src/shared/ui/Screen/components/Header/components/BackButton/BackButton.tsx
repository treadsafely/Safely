import { NavigationContext } from '@react-navigation/core';
import { useContext } from 'react';

import { Icon, ArrowLeft16 } from '@mobile/shared/ui/Icon';
import { Button } from '@mobile/shared/ui/Screen/components/Header/components/Button';

type BackButtonProps = {
    type?: 'rounded' | 'translucent';
    testID?: string;
};

export const BackButton = (props: BackButtonProps) => {
    const { type, testID } = props;
    const navigation = useContext(NavigationContext);

    return (
        <Button type={type} testID={testID} onPress={() => navigation?.goBack()}>
            <Icon icon={ArrowLeft16} />
        </Button>
    );
};
