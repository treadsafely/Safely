import type { FC, KeyboardEvent } from 'react';
import { useState } from 'react';
import { Trans } from 'react-i18next';

import { useBootConfig, useLinking, useTranslate } from '@safely/ux';

import { SYNC_ABOUT_STEPS } from './sync-about-steps';
import {
    coverStyles,
    footerStyles,
    linkStyles,
    panelStyles,
    popupStyles,
    textsStyles
} from './SyncAboutModal.styles';
import { Button, Modal, Text } from '../../shared';

export type SyncAboutModalProps = {
    onClose: () => void;
};

export const SyncAboutModal: FC<SyncAboutModalProps> = ({ onClose }) => {
    const t = useTranslate();
    const { openURL } = useLinking();
    const learnMoreUrl = useBootConfig().references.sync_learn_more_url;

    const [index, setIndex] = useState(0);

    const step = SYNC_ABOUT_STEPS[index];
    const isLast = index === SYNC_ABOUT_STEPS.length - 1;

    const goNext = (): void => {
        if (isLast) {
            onClose();
            return;
        }

        setIndex(current => current + 1);
    };

    const goBack = (): void => setIndex(current => Math.max(current - 1, 0));

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            goNext();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            goBack();
        }
    };

    return (
        <Modal open onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup
                className={popupStyles}
                closeLabel={t('common.close')}
                onKeyDown={onKeyDown}
            >
                <img src={step.cover} alt="" className={coverStyles} />

                <div className={panelStyles}>
                    <div className={textsStyles}>
                        <Text variant="titleL" as="h2">
                            {t(step.titleKey)}
                        </Text>
                        <Text variant="bodyL" tone="secondary">
                            <Trans
                                i18nKey={step.subtitleKey}
                                components={{
                                    a:
                                        learnMoreUrl === undefined ? (
                                            <span />
                                        ) : (
                                            <button
                                                type="button"
                                                className={linkStyles}
                                                onClick={() => void openURL(learnMoreUrl)}
                                            />
                                        )
                                }}
                            />
                        </Text>
                    </div>

                    <div className={footerStyles}>
                        {index > 0 && (
                            <Button variant="secondary" size="small" onClick={goBack}>
                                {t('common.back')}
                            </Button>
                        )}
                        <Button variant="primary" size="small" onClick={goNext}>
                            {t('common.next')}
                        </Button>
                    </div>
                </div>
            </Modal.Popup>
        </Modal>
    );
};
