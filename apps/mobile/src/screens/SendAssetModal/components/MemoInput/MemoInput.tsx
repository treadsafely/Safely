import { useTranslation } from 'react-i18next';

import { TEST_ID } from '@mobile/shared/constants';
import { Input } from '@mobile/shared/ui';

import { styles } from './MemoInput.styles';

interface MemoInputProps {
    value: string;
    error: string | undefined;
    onChangeText: (value: string) => void;
}

export const MemoInput = (props: MemoInputProps) => {
    const { value, error, onChangeText } = props;
    const { t } = useTranslation();

    return (
        <Input style={styles.container}>
            <Input.Label>{t('send.memo.label')}</Input.Label>
            <Input.Field
                testID={TEST_ID.send.memoInput}
                value={value}
                onChangeText={onChangeText}
                placeholder={t('send.memo.placeholder')}
                withClearButton
                multiline
                autoCorrect={false}
                errored={!!error}
                style={styles.field}
            />
            {error ? (
                <Input.Description style={styles.error}>{t(error)}</Input.Description>
            ) : (
                <Input.Description>{t('send.memo.description')}</Input.Description>
            )}
        </Input>
    );
};
