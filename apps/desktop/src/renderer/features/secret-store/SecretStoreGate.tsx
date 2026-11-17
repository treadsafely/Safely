import type { FC, PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';

import { useAppContext, useToast, useTranslate } from '@safely/ux';
import { SecretStoreGatePage } from '@safely/web-ui';

import { SecretStoreSession } from './SecretStoreSession';
import { SecretStoreSessionContext } from './SecretStoreSession.context';
import type { UnlockFailure } from '../../../shared/ipc';
import { logger } from '../../logger';
import { platform } from '../../platform';

type GateState =
    { kind: 'pending' } | { kind: 'unlocked' } | { kind: 'failed'; failure: UnlockFailure };

const ERASABLE_FAILURES: ReadonlySet<UnlockFailure> = new Set(['lost', 'mismatch']);

export const SecretStoreGate: FC<PropsWithChildren> = ({ children }) => {
    const t = useTranslate();
    const { clearAllData, reloadApp } = useAppContext();
    const toast = useToast();
    const [session] = useState(() => new SecretStoreSession());
    const [state, setState] = useState<GateState>({ kind: 'pending' });
    const [attempt, setAttempt] = useState(0);

    const retry = (): void => {
        setState({ kind: 'pending' });
        setAttempt(current => current + 1);
    };

    const erase = async (): Promise<void> => {
        try {
            await clearAllData();
        } catch (error) {
            logger.error('the secret store was not erased', error);
            toast({ message: t('logOutAllAccounts.error'), type: 'error' });

            return;
        }

        reloadApp();
    };

    useEffect(() => {
        let isCancelled = false;

        platform.secretStore.unlock().then(
            outcome => {
                if (isCancelled) {
                    return;
                }

                if (outcome.state === 'unlocked') {
                    session.recordUnlock(outcome.isPresenceVerified);
                    setState({ kind: 'unlocked' });
                } else {
                    setState({ kind: 'failed', failure: outcome.state });
                }
            },
            (error: unknown) => {
                logger.error('the secret store did not answer the unlock', error);

                if (!isCancelled) {
                    setState({ kind: 'failed', failure: 'failed' });
                }
            }
        );

        return () => {
            isCancelled = true;
        };
    }, [attempt, session]);

    if (state.kind === 'unlocked') {
        return <SecretStoreSessionContext value={session}>{children}</SecretStoreSessionContext>;
    }

    if (state.kind === 'pending') {
        return null;
    }

    return (
        <SecretStoreGatePage
            state={state.failure}
            onRetry={retry}
            onErase={ERASABLE_FAILURES.has(state.failure) ? erase : undefined}
        />
    );
};
