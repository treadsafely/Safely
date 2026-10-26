import { Dialog } from '@base-ui/react/dialog';
import type { FC } from 'react';

import { useTranslate } from '@safely/ux';
import Xmark16 from '@safely/ux/assets/icons/16/xmark-16.svg?react';

import {
    bodyStyles,
    closeStyles,
    headerStyles,
    promptStyles,
    rootStyles,
    signOutStyles
} from './PasscodeVerification.styles';
import { Button, Icon, LockoutContent, Passcode, ScreenProtection, Text } from '../../shared';

export type PasscodeVerificationProps = {
    title?: string;
    subtitle?: string;
    value: string;
    length: number;
    isInvalid?: boolean;
    isSuccess?: boolean;
    isLocked?: boolean;
    hasLockedOut?: boolean;
    remainingSeconds?: number;
    onCheckBiometry?: () => void;
    onChange: (value: string) => void;
    onCancel: () => void;
    onSignOut: () => void;
};

export const PasscodeVerification: FC<PasscodeVerificationProps> = props => {
    const {
        title,
        subtitle,
        value,
        length,
        isInvalid,
        isSuccess,
        isLocked,
        hasLockedOut,
        remainingSeconds,
        onCheckBiometry,
        onChange,
        onCancel,
        onSignOut
    } = props;

    const t = useTranslate();

    const headerButton = hasLockedOut ? (
        <Button className={signOutStyles} variant="secondary" size="small" onClick={onSignOut}>
            {t('passcode.lockout.signOut')}
        </Button>
    ) : (
        <Button
            className={closeStyles}
            variant="secondary"
            size="small"
            isIconOnly
            aria-label={t('common.close')}
            onClick={onCancel}
        >
            <Icon asset={Xmark16} />
        </Button>
    );

    return (
        <Dialog.Root open modal>
            <Dialog.Portal>
                <Dialog.Popup className={rootStyles}>
                    <ScreenProtection>
                        <div className={headerStyles}>{headerButton}</div>

                        <div className={bodyStyles}>
                            {isLocked ? (
                                <LockoutContent remainingSeconds={remainingSeconds ?? 0} />
                            ) : (
                                <div className={promptStyles}>
                                    <Text variant="labelL">
                                        {title ?? t('passcode.verify.title')}
                                    </Text>
                                    {subtitle !== undefined && (
                                        <Text variant="bodyM" tone="secondary" align="center">
                                            {subtitle}
                                        </Text>
                                    )}

                                    <Passcode
                                        value={value}
                                        length={length}
                                        isInvalid={isInvalid}
                                        isSuccess={isSuccess}
                                        onCheckBiometry={onCheckBiometry}
                                        onChange={onChange}
                                    />
                                </div>
                            )}
                        </div>
                    </ScreenProtection>
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
