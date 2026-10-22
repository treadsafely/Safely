import type { FC } from 'react';

import { useTranslate } from '@safely/ux';
import Fingerprint96 from '@safely/ux/assets/icons/96/fingerprint-96.svg?react';
import type { BiometryScreenProps } from '@safely/web-ui';
import { BiometryPage } from '@safely/web-ui';

import { useSetBiometryEnabled } from './useBiometry';

export type EnableBiometryFlowProps = {
    Screen?: FC<BiometryScreenProps>;
    onDone: () => void;
};

export const EnableBiometryFlow: FC<EnableBiometryFlowProps> = ({
    Screen = BiometryPage,
    onDone
}) => {
    const t = useTranslate();
    const { mutateAsync: setBiometryEnabled } = useSetBiometryEnabled();

    const title = t('biometry.fingerprint.ios.title');

    const onEnable = (): void => {
        void setBiometryEnabled(true).then(onDone, () => undefined);
    };

    return (
        <Screen
            icon={Fingerprint96}
            title={title}
            description={t('biometry.fingerprint.ios.description')}
            enableLabel={t('biometry.enable', { name: title })}
            onEnable={onEnable}
            onSkip={onDone}
        />
    );
};
