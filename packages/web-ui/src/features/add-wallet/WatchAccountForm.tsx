import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import type { WatchAccountFormState } from './useWatchAccountForm';
import { errorStyles, fieldStyles } from './WatchAccountForm.styles';
import { Input, Text } from '../../shared';

export type WatchAccountFormProps = {
    form: WatchAccountFormState;
    onSubmit: () => void;
};

export const WatchAccountForm: FC<WatchAccountFormProps> = ({ form, onSubmit }) => {
    const t = useTranslate();

    return (
        <>
            <Input invalid={form.hasError}>
                <Input.Field
                    autoFocus
                    className={fieldStyles}
                    value={form.value}
                    placeholder={t('addWallet.watchAccount.placeholder')}
                    autoComplete="off"
                    spellCheck={false}
                    clearLabel={t('common.clear')}
                    onClear={() => form.setValue('')}
                    onChange={event => form.setValue(event.target.value)}
                    onKeyDown={event => form.isValid && event.key === 'Enter' && onSubmit()}
                />
            </Input>

            {form.hasError && (
                <Text variant="bodyM" tone="accentRed" className={errorStyles}>
                    {t(form.errorKey)}
                </Text>
            )}
        </>
    );
};
