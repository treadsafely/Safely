import type { FC } from 'react';

import type { PasscodeLength } from '@safely/ux';
import { PASSCODE_LENGTH, useTranslate } from '@safely/ux';

import { rootStyles } from './PasscodeLengthToggle.styles';
import { Switch } from '../Switch';
import { Text } from '../Text';

export type PasscodeLengthToggleProps = {
    length: PasscodeLength;
    onChange: (length: PasscodeLength) => void;
};

export const PasscodeLengthToggle: FC<PasscodeLengthToggleProps> = ({ length, onChange }) => {
    const t = useTranslate();

    return (
        <label className={rootStyles}>
            <Text variant="bodyM">{t('onboarding.passcode.sixDigit')}</Text>
            <Switch
                size="small"
                checked={length === PASSCODE_LENGTH.long}
                onCheckedChange={isLong =>
                    onChange(isLong ? PASSCODE_LENGTH.long : PASSCODE_LENGTH.short)
                }
            />
        </label>
    );
};
