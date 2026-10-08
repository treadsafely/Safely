import type { FC } from 'react';

import { useTranslate } from '@safely/ux';
import Fingerprint96 from '@safely/ux/assets/icons/96/fingerprint-96.svg?react';
import { BiometryPage } from '@safely/web-ui';

import { useSetBiometryEnabled } from './useBiometry';

export type EnableBiometryFlowProps = {
    onDone: () => void;
};

export const EnableBiometryFlow: FC<EnableBiometryFlowProps> = ({ onDone }) => {
    const t = useTranslate();
    const { mutateAsync: setBiometryEnabled } = useSetBiometryEnabled();

    const title = t('biometry.fingerprint.ios.title');

    const onEnable = (): void => {
        void setBiometryEnabled(true).then(onDone, () => undefined);
    };

    return (
        <BiometryPage
            icon={Fingerprint96}
            title={title}
            description={t('biometry.fingerprint.ios.description')}
            enableLabel={t('biometry.enable', { name: title })}
            onEnable={onEnable}
            onSkip={onDone}
        />
    );
};
