import type { IconAsset } from '../ui';

export type PasscodeScreenProps = {
    title: string;
    description?: string;
    isInvalid?: boolean;
    onSubmit: (code: string) => void;
    onBack: () => void;
};

export type BiometryScreenProps = {
    icon: IconAsset;
    title: string;
    description: string;
    enableLabel: string;
    onEnable: () => void;
    onSkip: () => void;
};
