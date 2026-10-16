import type { PasscodeLength } from '@safely/ux';

import type { IconAsset } from '../ui';

export type PasscodeScreenProps = {
    title: string;
    description?: string;
    length: PasscodeLength;
    isInvalid?: boolean;
    onLengthChange?: (length: PasscodeLength) => void;
    onSubmit: (code: string) => void;
    onInvalidCleared?: () => void;
    onClose: () => void;
    onBack?: () => void;
};

export type BiometryScreenProps = {
    icon: IconAsset;
    title: string;
    description: string;
    enableLabel: string;
    onEnable: () => void;
    onSkip: () => void;
};
