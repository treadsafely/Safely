import { createContext, useContext } from 'react';

import type { SecretStoreSession } from './SecretStoreSession';

export const SecretStoreSessionContext = createContext<SecretStoreSession | null>(null);

export function useSecretStoreSession(): SecretStoreSession {
    const session = useContext(SecretStoreSessionContext);

    if (session === null) {
        throw new Error('useSecretStoreSession is used outside SecretStoreGate');
    }

    return session;
}
