import type { FC, ReactNode } from 'react';

import { useTranslate } from '@safely/ux';
import ArrowLeft16 from '@safely/ux/assets/icons/16/arrow-left-16.svg?react';

import { headingStyles, titleStyles } from './SendModal.styles';
import { Button, Icon, Modal } from '../../shared';

export type SendHeaderProps = {
    subtitle?: ReactNode;
    hasNext?: boolean;
    hasClose?: boolean;
    onNext?: () => void;
    onBack?: () => void;
};

export const SendHeader: FC<SendHeaderProps> = props => {
    const { subtitle, hasNext = true, hasClose, onNext, onBack } = props;

    const t = useTranslate();

    return (
        <Modal.Header closeLabel={t('common.close')} hasClose={hasClose ?? onBack === undefined}>
            {onBack !== undefined && (
                <Button
                    variant="secondary"
                    size="small"
                    isIconOnly
                    aria-label={t('common.back')}
                    onClick={onBack}
                >
                    <Icon asset={ArrowLeft16} />
                </Button>
            )}

            {hasNext && (
                <div className={headingStyles}>
                    <Modal.Title className={titleStyles}>{t('send.title')}</Modal.Title>
                    {subtitle}
                </div>
            )}

            {hasNext && (
                <Button
                    variant="primary"
                    size="small"
                    disabled={onNext === undefined}
                    onClick={onNext}
                >
                    {t('common.next')}
                </Button>
            )}
        </Modal.Header>
    );
};
