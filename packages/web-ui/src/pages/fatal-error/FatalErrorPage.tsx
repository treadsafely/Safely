import type { FC } from 'react';

import { useAppContext, useTranslate } from '@safely/ux';
import XmarkCircle56 from '@safely/ux/assets/icons/56/xmark-circle-56.svg?react';

import { Button, NoticeScreen } from '../../shared';

export type FatalErrorPageProps = {
    onShareLogs: () => void;
};

export const FatalErrorPage: FC<FatalErrorPageProps> = ({ onShareLogs }) => {
    const t = useTranslate();
    const { reloadApp } = useAppContext();

    return (
        <NoticeScreen
            icon={XmarkCircle56}
            title={t('errorBoundary.title')}
            description={t('errorBoundary.subtitle')}
            actions={
                <>
                    <Button variant="primary" isFullWidth onClick={reloadApp}>
                        {t('errorBoundary.restartButton')}
                    </Button>
                    <Button variant="secondary" isFullWidth onClick={onShareLogs}>
                        {t('errorBoundary.shareLogsButton')}
                    </Button>
                </>
            }
        />
    );
};
