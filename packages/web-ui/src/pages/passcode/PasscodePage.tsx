import type { FC } from 'react';

import { useTranslate } from '@safely/ux';
import ArrowLeft16 from '@safely/ux/assets/icons/16/arrow-left-16.svg?react';

import {
    bodyStyles,
    descriptionStyles,
    keypadFillStyles,
    popupStyles
} from './PasscodePage.styles';
import type { PasscodeScreenProps } from '../../shared';
import {
    Button,
    Icon,
    Modal,
    Passcode,
    PasscodeLengthToggle,
    ScreenProtection,
    usePasscodeEntry
} from '../../shared';

export const PasscodePage: FC<PasscodeScreenProps> = props => {
    const {
        title,
        description,
        length,
        isInvalid,
        onLengthChange,
        onSubmit,
        onInvalidCleared,
        onClose,
        onBack
    } = props;

    const t = useTranslate();
    const entry = usePasscodeEntry({ length, isInvalid, onSubmit, onInvalidCleared });

    return (
        <ScreenProtection>
            <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onClose()}>
                <Modal.Popup
                    className={popupStyles}
                    hasClose={false}
                    closeLabel={t('common.close')}
                >
                    <Modal.Header closeLabel={t('common.close')} hasClose={onBack === undefined}>
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

                        {onLengthChange !== undefined && (
                            <PasscodeLengthToggle length={length} onChange={onLengthChange} />
                        )}
                    </Modal.Header>

                    <div className={bodyStyles}>
                        <Modal.Content hasFloatingClose={false}>
                            <Modal.Title>{title}</Modal.Title>
                            {description !== undefined && (
                                <Modal.Description className={descriptionStyles}>
                                    {description}
                                </Modal.Description>
                            )}
                        </Modal.Content>

                        <Passcode
                            className={keypadFillStyles}
                            value={entry.value}
                            length={length}
                            isInvalid={isInvalid}
                            onChange={entry.setValue}
                        />
                    </div>
                </Modal.Popup>
            </Modal>
        </ScreenProtection>
    );
};
