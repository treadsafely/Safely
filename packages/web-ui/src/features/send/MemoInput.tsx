import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import { rootStyles } from './MemoInput.styles';
import { Input, Text } from '../../shared';

export type MemoInputProps = {
    value: string;
    error: string | undefined;
    onChange: (value: string) => void;
};

export const MemoInput: FC<MemoInputProps> = props => {
    const { value, error, onChange } = props;

    const t = useTranslate();

    return (
        <Input className={rootStyles} invalid={error !== undefined}>
            <Input.Label>{t('send.memo.label')}</Input.Label>
            <Input.Field
                isMultiline
                value={value}
                placeholder={t('send.memo.placeholder')}
                autoComplete="off"
                spellCheck={false}
                clearLabel={t('common.clear')}
                onClear={() => onChange('')}
                onChange={event => onChange(event.target.value)}
            />
            <Input.Description>
                {error === undefined ? (
                    t('send.memo.description')
                ) : (
                    <Text variant="bodyM" tone="accentRed">
                        {t(error)}
                    </Text>
                )}
            </Input.Description>
        </Input>
    );
};
