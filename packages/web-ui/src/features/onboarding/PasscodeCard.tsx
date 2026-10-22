import type { FC } from 'react';

import { descriptionStyles } from './PasscodeCard.styles';
import type { PasscodeScreenProps } from '../../shared';
import {
    Modal,
    Passcode,
    PasscodeLengthToggle,
    ScreenProtection,
    StepCard,
    usePasscodeEntry
} from '../../shared';

export const PasscodeCard: FC<PasscodeScreenProps> = props => {
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

    const entry = usePasscodeEntry({ length, isInvalid, onSubmit, onInvalidCleared });

    return (
        <ScreenProtection>
            <StepCard
                hasShadow={false}
                hasBackdrop={false}
                onBack={onBack ?? onClose}
                trailing={
                    onLengthChange === undefined ? undefined : (
                        <PasscodeLengthToggle length={length} onChange={onLengthChange} />
                    )
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
                    length={length}
                    isInvalid={isInvalid}
                    isInset
                    onChange={entry.setValue}
                />
            </StepCard>
        </ScreenProtection>
    );
};
