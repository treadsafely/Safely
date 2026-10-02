import { useCallback, useMemo, useState } from 'react';

import { InvalidMnemonicError, MNEMONIC_TYPE, validateMnemonic } from '@safely/core';

import { useLogger, useTranslate } from '../../../../shared';
import { isValidMnemonicWord, normalizeInput } from '../utils';

export interface UseImportSeedPhraseParams {
    onSubmit: (mnemonic: string[]) => void;
}

export interface UseImportSeedPhraseResult {
    value: string;
    error: string | null;
    isDirty: boolean;
    isValid: boolean;
    onChange: (value: string) => void;
    handleSubmit: () => void;
}

export const useImportSeedPhrase = ({
    onSubmit
}: UseImportSeedPhraseParams): UseImportSeedPhraseResult => {
    const t = useTranslate();
    const logger = useLogger('import-seed');
    const [value, setValue] = useState('');
    const [error, setError] = useState<string | null>(null);

    const words = useMemo(() => normalizeInput(value), [value]);

    const isDirty = words.length > 0;

    const isValid = useMemo(() => {
        if (words.length !== 12 && words.length !== 24) {
            return false;
        }
        return words.every(word => isValidMnemonicWord(word));
    }, [words]);

    const onChange = useCallback((newValue: string) => {
        setValue(newValue);
        setError(null);
    }, []);

    const handleSubmit = useCallback(() => {
        // Never log the words themselves — only the count, which is safe.
        logger.info('seed phrase submitted', { wordCount: words.length });

        if (words.length !== 12 && words.length !== 24) {
            logger.warn('seed phrase rejected: invalid word count', { wordCount: words.length });
            setError('Secret recovery phrase must be 12 or 24 words');
            return;
        }

        const invalidWord = words.find(word => !isValidMnemonicWord(word));
        if (invalidWord) {
            logger.warn('seed phrase rejected: contains a word outside the BIP39 wordlist');
            setError(`Invalid word: "${invalidWord}"`);
            return;
        }

        try {
            validateMnemonic(MNEMONIC_TYPE.BIP39, words);
        } catch (e) {
            if (!(e instanceof InvalidMnemonicError)) {
                throw e;
            }

            logger.warn('seed phrase rejected: checksum mismatch');
            setError(t('importWalletScreen.errors.invalidMnemonic'));

            return;
        }

        onSubmit(words);
    }, [words, onSubmit, logger, t]);

    return {
        value,
        error,
        isDirty,
        isValid,
        onChange,
        handleSubmit
    };
};
