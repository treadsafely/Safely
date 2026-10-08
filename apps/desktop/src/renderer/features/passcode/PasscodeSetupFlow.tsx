import type { FC } from 'react';
import { useRef, useState } from 'react';

import { PasscodePage } from '@safely/web-ui';

export type PasscodeSetupCopy = {
    title: string;
    description?: string;
};

export type PasscodeSetupFlowProps = {
    create: PasscodeSetupCopy;
    confirm: PasscodeSetupCopy;
    onConfirmed: (passcode: string) => void;
    onCancel: () => void;
};

/* both steps are one component on purpose: the entered code never reaches router state */
export const PasscodeSetupFlow: FC<PasscodeSetupFlowProps> = props => {
    const { create, confirm, onConfirmed, onCancel } = props;

    const created = useRef('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [isMismatched, setIsMismatched] = useState(false);

    const onCreated = (passcode: string): void => {
        created.current = passcode;
        setIsMismatched(false);
        setIsConfirming(true);
    };

    const onReentered = (passcode: string): void => {
        const isMatch = passcode === created.current;
        created.current = '';

        if (!isMatch) {
            setIsMismatched(true);
            setIsConfirming(false);
            return;
        }

        onConfirmed(passcode);
    };

    const onBack = (): void => {
        created.current = '';

        if (isConfirming) {
            setIsConfirming(false);
            return;
        }

        onCancel();
    };

    return isConfirming ? (
        <PasscodePage
            title={confirm.title}
            description={confirm.description}
            onBack={onBack}
            onSubmit={onReentered}
        />
    ) : (
        <PasscodePage
            title={create.title}
            description={create.description}
            isInvalid={isMismatched}
            onBack={onBack}
            onSubmit={onCreated}
        />
    );
};
