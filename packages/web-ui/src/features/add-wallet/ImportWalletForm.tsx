import type { FC, KeyboardEvent } from 'react';

import { sanitizeSeedPhraseInput, useTranslate } from '@safely/ux';

import { errorStyles, fieldStyles } from './ImportWalletForm.styles';
import { Input, Text } from '../../shared';

export type ImportWalletFormProps = {
    value: string;
    error: string | null;
    onChange: (value: string) => void;
    onSubmit: () => void;
};

export const ImportWalletForm: FC<ImportWalletFormProps> = props => {
    const { value, error, onChange, onSubmit } = props;

    const t = useTranslate();

    const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
        if (event.key === 'Enter') {
            event.preventDefault();
            onSubmit();
        }
    };

    return (
        <>
            <Input invalid={Boolean(error)}>
                <Input.Field
                    autoFocus
                    isMultiline
                    className={fieldStyles}
                    value={value}
                    placeholder={t('onboarding.importWallet.placeholder')}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={event => onChange(sanitizeSeedPhraseInput(event.target.value))}
                    onKeyDown={onKeyDown}
                />
            </Input>

            {error !== null && (
                <Text variant="bodyM" tone="accentRed" className={errorStyles}>
                    {error}
                </Text>
            )}
        </>
    );
};
