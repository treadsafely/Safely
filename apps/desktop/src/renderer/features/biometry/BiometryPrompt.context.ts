import { createContext, useContext } from 'react';

import type { BiometryPrompt } from './BiometryPrompt';

export const BiometryPromptContext = createContext<BiometryPrompt | null>(null);

export function useBiometryPrompt(): BiometryPrompt {
    const prompt = useContext(BiometryPromptContext);

    if (prompt === null) {
        throw new Error('useBiometryPrompt is used outside BiometryPromptContext');
    }

    return prompt;
}
