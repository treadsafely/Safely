import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Share } from 'react-native';

import { Actions, Copy28, Share28 } from '@mobile/shared/ui';

import { useReceiveCopy } from '../ReceiveCopyToastProvider';
import { styles } from './ReceiveActions.styles';

type ReceiveActionsProps = {
    address: string;
};

export const ReceiveActions = (props: ReceiveActionsProps) => {
    const { address } = props;

    const { t } = useTranslation();

    const copy = useReceiveCopy();

    const handleCopyAddress = useCallback(() => {
        copy(address);
    }, [copy, address]);

    const handleShareAddress = useCallback(() => {
        Share.share({
            message: address
        });
    }, [address]);

    return (
        <Actions style={styles.container}>
            <Actions.Button
                title={t('receiveAsset.actions.copy')}
                icon={Copy28}
                onPress={handleCopyAddress}
                variant="transparent"
            />
            <Actions.Button
                title={t('receiveAsset.actions.share')}
                icon={Share28}
                onPress={handleShareAddress}
                variant="transparent"
            />
        </Actions>
    );
};
