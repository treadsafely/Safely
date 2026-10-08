import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import {
    bodyStyles,
    headerStyles,
    promptStyles,
    rootStyles,
    signOutStyles
} from './LockScreen.styles';
import { Button, LockoutContent, Passcode, ScreenProtection, Text } from '../../shared';

export type LockScreenProps = {
    value: string;
    length: number;
    isInvalid?: boolean;
    isLocked?: boolean;
    remainingSeconds?: number;
    onCheckBiometry?: () => void;
    onChange: (value: string) => void;
    onSignOut: () => void;
};

export const LockScreen: FC<LockScreenProps> = props => {
    const {
        value,
        length,
        isInvalid,
        isLocked,
        remainingSeconds,
        onCheckBiometry,
        onChange,
        onSignOut
    } = props;

    const t = useTranslate();

    return (
        <ScreenProtection>
            <div className={rootStyles}>
                <div className={headerStyles}>
                    <Button
                        className={signOutStyles}
                        variant="secondary"
                        size="small"
                        onClick={onSignOut}
                    >
                        {t('passcode.lockout.signOut')}
                    </Button>
                </div>

                <div className={bodyStyles}>
                    {isLocked ? (
                        <LockoutContent remainingSeconds={remainingSeconds ?? 0} />
                    ) : (
                        <div className={promptStyles}>
                            <Text variant="labelL">{t('lockScreen.title')}</Text>

                            <Passcode
                                value={value}
                                length={length}
                                isInvalid={isInvalid}
                                onCheckBiometry={onCheckBiometry}
                                onChange={onChange}
                            />
                        </div>
                    )}
                </div>
            </div>
        </ScreenProtection>
    );
};
