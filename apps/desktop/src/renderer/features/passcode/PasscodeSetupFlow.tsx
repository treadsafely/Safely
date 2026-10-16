import type { FC } from 'react';
import { useRef, useState } from 'react';

import type { PasscodeLength } from '@safely/ux';
import { PASSCODE_LENGTH } from '@safely/ux';
import type { PasscodeScreenProps } from '@safely/web-ui';
import { PasscodePage } from '@safely/web-ui';

export type PasscodeSetupCopy = {
    title: string;
    description?: string;
};

export type PasscodeSetupFlowProps = {
    create: PasscodeSetupCopy;
    confirm: PasscodeSetupCopy;
    Screen?: FC<PasscodeScreenProps>;
    onConfirmed: (passcode: string) => void;
    onCancel: () => void;
};

/* both steps are one component on purpose: the entered code never reaches router state */
export const PasscodeSetupFlow: FC<PasscodeSetupFlowProps> = props => {
    const { create, confirm, Screen = PasscodePage, onConfirmed, onCancel } = props;

    const created = useRef('');
    const [length, setLength] = useState<PasscodeLength>(PASSCODE_LENGTH.short);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isMismatched, setIsMismatched] = useState(false);

    const onCreated = (passcode: string): void => {
        created.current = passcode;
        setIsMismatched(false);
        setIsConfirming(true);
    };

    const onReentered = (passcode: string): void => {
        if (passcode !== created.current) {
            setIsMismatched(true);
            return;
        }

        created.current = '';
        onConfirmed(passcode);
    };

    const onClose = (): void => {
        created.current = '';
        onCancel();
    };

    const onBackToCreate = (): void => {
        created.current = '';
        setIsMismatched(false);
        setIsConfirming(false);
    };

    return isConfirming ? (
        <Screen
            key="confirm"
            title={confirm.title}
            description={confirm.description}
            length={length}
            isInvalid={isMismatched}
            onInvalidCleared={() => setIsMismatched(false)}
            onClose={onClose}
            onBack={onBackToCreate}
            onSubmit={onReentered}
        />
    ) : (
        <Screen
            key="create"
            title={create.title}
            description={create.description}
            length={length}
            onLengthChange={setLength}
            onClose={onClose}
            onSubmit={onCreated}
        />
    );
};
