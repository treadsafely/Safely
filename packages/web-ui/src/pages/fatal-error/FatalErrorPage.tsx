import type { FC } from 'react';
import { useState } from 'react';

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
import { EraseDataModal } from '../../features';
import { Button, Icon, Text } from '../../shared';

export const FatalErrorPage: FC = () => {
    const t = useTranslate();
    const { reloadApp, clearAllData } = useAppContext();

    const [isEraseOpen, setIsEraseOpen] = useState(false);

    const erase = async (): Promise<void> => {
        await clearAllData();
        reloadApp();
    };

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
                    <Button variant="secondary" isFullWidth onClick={() => setIsEraseOpen(true)}>
                        {t('errorBoundary.eraseButton')}
                    </Button>
                </div>
            </div>

            {isEraseOpen && (
                <EraseDataModal
                    onConfirm={() => void erase()}
                    onClose={() => setIsEraseOpen(false)}
                />
            )}
        </div>
    );
};
