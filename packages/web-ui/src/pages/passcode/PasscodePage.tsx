import type { FC } from 'react';
import { useState } from 'react';

import { PASSCODE_LENGTH, useSubmitWhenComplete, useTranslate } from '@safely/ux';

import {
    bodyStyles,
    descriptionStyles,
    keypadFillStyles,
    lengthToggleStyles,
    popupStyles
} from './PasscodePage.styles';
import { Modal, Passcode, ScreenProtection, Switch, Text } from '../../shared';

export type PasscodePageProps = {
    title: string;
    description?: string;
    isInvalid?: boolean;
    onSubmit: (code: string) => void;
    onBack: () => void;
};

export const PasscodePage: FC<PasscodePageProps> = props => {
    const { title, description, isInvalid, onSubmit, onBack } = props;

    const t = useTranslate();

    const [value, setValue] = useState('');
    const [length, setLength] = useState<number>(PASSCODE_LENGTH.short);

    useSubmitWhenComplete({
        value,
        length,
        onComplete: entered => {
            setValue('');
            onSubmit(entered);
        }
    });

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
                                checked={length === PASSCODE_LENGTH.long}
                                onCheckedChange={isLong => {
                                    setValue('');
                                    setLength(
                                        isLong ? PASSCODE_LENGTH.long : PASSCODE_LENGTH.short
                                    );
                                }}
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
                            value={value}
                            length={length}
                            isInvalid={isInvalid}
                            onChange={setValue}
                        />
                    </div>
                </Modal.Popup>
            </Modal>
        </ScreenProtection>
    );
};
