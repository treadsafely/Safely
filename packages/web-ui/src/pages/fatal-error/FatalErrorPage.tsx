import type { FC } from 'react';

import { useAppContext, useTranslate } from '@safely/ux';
import XmarkCircle56 from '@safely/ux/assets/icons/56/xmark-circle-56.svg?react';

import {
    actionsStyles,
    bodyStyles,
    contentStyles,
    headerStyles,
    rootStyles,
    textStyles
} from './FatalErrorPage.styles';
import { Button, Icon, Text } from '../../shared';

export type FatalErrorPageProps = {
    onShareLogs: () => void;
};

export const FatalErrorPage: FC<FatalErrorPageProps> = ({ onShareLogs }) => {
    const t = useTranslate();
    const { reloadApp } = useAppContext();

    return (
        <div className={rootStyles}>
            <div className={headerStyles} />

            <div className={bodyStyles}>
                <div className={contentStyles}>
                    <Icon asset={XmarkCircle56} tone="tertiary" />

                    <div className={textStyles}>
                        <Text variant="titleM" align="center">
                            {t('errorBoundary.title')}
                        </Text>
                        <Text variant="bodyL" tone="secondary" align="center">
                            {t('errorBoundary.subtitle')}
                        </Text>
                    </div>
                </div>

                <div className={actionsStyles}>
                    <Button variant="primary" isFullWidth onClick={reloadApp}>
                        {t('errorBoundary.restartButton')}
                    </Button>
                    <Button variant="secondary" isFullWidth onClick={onShareLogs}>
                        {t('errorBoundary.shareLogsButton')}
                    </Button>
                </div>
            </div>
        </div>
    );
};
