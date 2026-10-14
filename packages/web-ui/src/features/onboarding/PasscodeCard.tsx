import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import { descriptionStyles, lengthToggleStyles } from './PasscodeCard.styles';
import type { PasscodeScreenProps } from '../../shared';
import {
    Modal,
    Passcode,
    ScreenProtection,
    StepCard,
    Switch,
    Text,
    usePasscodeEntry
} from '../../shared';

export const PasscodeCard: FC<PasscodeScreenProps> = props => {
    const { title, description, isInvalid, onSubmit, onBack } = props;

    const t = useTranslate();
    const entry = usePasscodeEntry(onSubmit);

    return (
        <ScreenProtection>
            <StepCard
                hasShadow={false}
                hasBackdrop={false}
                onBack={onBack}
                trailing={
                    <label className={lengthToggleStyles}>
                        <Text variant="bodyM">{t('onboarding.passcode.sixDigit')}</Text>
                        <Switch
                            size="small"
                            checked={entry.isLong}
                            onCheckedChange={entry.setIsLong}
                        />
                    </label>
                }
            >
                <Modal.Content hasFloatingClose={false}>
                    <Modal.Title>{title}</Modal.Title>
                    {description !== undefined && (
                        <Modal.Description className={descriptionStyles}>
                            {description}
                        </Modal.Description>
                    )}
                </Modal.Content>

                <Passcode
                    value={entry.value}
                    length={entry.length}
                    isInvalid={isInvalid}
                    isInset
                    onChange={entry.setValue}
                />
            </StepCard>
        </ScreenProtection>
    );
};
