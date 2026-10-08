import type { FC } from 'react';

import { useTranslate } from '@safely/ux';
import Xmark16 from '@safely/ux/assets/icons/16/xmark-16.svg?react';

import {
    bodyStyles,
    closeStyles,
    headerStyles,
    promptStyles,
    rootStyles
} from './PasscodeVerification.styles';
import { Button, Icon, LockoutContent, Passcode, ScreenProtection, Text } from '../../shared';

export type PasscodeVerificationProps = {
    title?: string;
    subtitle?: string;
    value: string;
    length: number;
    isInvalid?: boolean;
    isLocked?: boolean;
    remainingSeconds?: number;
    onCheckBiometry?: () => void;
    onChange: (value: string) => void;
    onCancel: () => void;
};

export const PasscodeVerification: FC<PasscodeVerificationProps> = props => {
    const {
        title,
        subtitle,
        value,
        length,
        isInvalid,
        isLocked,
        remainingSeconds,
        onCheckBiometry,
        onChange,
        onCancel
    } = props;

    const t = useTranslate();

    return (
        <ScreenProtection>
            <div className={rootStyles}>
                <div className={headerStyles}>
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
                </div>

                <div className={bodyStyles}>
                    {isLocked ? (
                        <LockoutContent remainingSeconds={remainingSeconds ?? 0} />
                    ) : (
                        <div className={promptStyles}>
                            <Text variant="labelL">{title ?? t('passcode.verify.title')}</Text>
                            {subtitle !== undefined && (
                                <Text variant="bodyM" tone="secondary" align="center">
                                    {subtitle}
                                </Text>
                            )}

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
