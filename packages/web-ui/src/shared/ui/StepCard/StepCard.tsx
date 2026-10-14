import type { FC, ReactNode } from 'react';

import { useTranslate } from '@safely/ux';
import ArrowLeft16 from '@safely/ux/assets/icons/16/arrow-left-16.svg?react';
import { cx } from '@safely/web-ui/styled-system/css';

import { bodyStyles, popupStyles, shadowStyles } from './StepCard.styles';
import { Button } from '../Button';
import { Icon } from '../Icon';
import { Modal } from '../Modal';

export type StepCardProps = {
    trailing?: ReactNode;
    hasShadow?: boolean;
    hasBackdrop?: boolean;
    onBack?: () => void;
    children: ReactNode;
};

export const StepCard: FC<StepCardProps> = props => {
    const { trailing, hasShadow = true, hasBackdrop = true, onBack, children } = props;

    const t = useTranslate();

    return (
        <Modal open>
            <Modal.Popup
                className={cx(popupStyles, hasShadow && shadowStyles)}
                hasClose={false}
                hasBackdrop={hasBackdrop}
                closeLabel={t('common.close')}
            >
                {(onBack !== undefined || trailing !== undefined) && (
                    <Modal.Header closeLabel={t('common.close')} hasClose={false}>
                        {onBack !== undefined && (
                            <Button
                                variant="secondary"
                                size="small"
                                isIconOnly
                                isRound
                                aria-label={t('common.back')}
                                onClick={onBack}
                            >
                                <Icon asset={ArrowLeft16} />
                            </Button>
                        )}

                        {trailing}
                    </Modal.Header>
                )}

                <div className={bodyStyles}>{children}</div>
            </Modal.Popup>
        </Modal>
    );
};
