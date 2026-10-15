import { useTranslation } from 'react-i18next';

import { TEST_ID } from '@mobile/shared/constants';
import { Input } from '@mobile/shared/ui';

import { styles } from './MemoInput.styles';

interface MemoInputProps {
    value: string;
    onChangeText: (value: string) => void;
}

export const MemoInput = (props: MemoInputProps) => {
    const { value, onChangeText } = props;
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
                style={styles.field}
            />
            <Input.Description>{t('send.memo.description')}</Input.Description>
        </Input>
    );
};
