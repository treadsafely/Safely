import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import {
    bodyStyles,
    descriptionStyles,
    keypadFillStyles,
    lengthToggleStyles,
    popupStyles
} from './PasscodePage.styles';
import type { PasscodeScreenProps } from '../../shared';
import { Modal, Passcode, ScreenProtection, Switch, Text, usePasscodeEntry } from '../../shared';

export const PasscodePage: FC<PasscodeScreenProps> = props => {
    const { title, description, isInvalid, onSubmit, onBack } = props;

    const t = useTranslate();
    const entry = usePasscodeEntry(onSubmit);

    return (
        <ScreenProtection>
            <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onBack()}>
                <Modal.Popup
                    className={popupStyles}
                    hasClose={false}
                    closeLabel={t('common.close')}
                >
                    <Modal.Header closeLabel={t('common.close')}>
                        <label className={lengthToggleStyles}>
                            <Text variant="bodyM">{t('onboarding.passcode.sixDigit')}</Text>
                            <Switch
                                size="small"
                                checked={entry.isLong}
                                onCheckedChange={entry.setIsLong}
                            />
                        </label>
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
                            length={entry.length}
                            isInvalid={isInvalid}
                            onChange={entry.setValue}
                        />
                    </div>
                </Modal.Popup>
            </Modal>
        </ScreenProtection>
    );
};
