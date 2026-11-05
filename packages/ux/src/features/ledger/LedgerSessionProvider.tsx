import type { DeviceManagementKit, DiscoveredDevice } from '@ledgerhq/device-management-kit';
import type { ReactNode } from 'react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import type { ActorRefFrom } from 'xstate';
import { createActor } from 'xstate';

import type { ILedgerSessionPort, LedgerSession } from '@safely/core';

import { ledgerSigningMachine } from './machine';
import { LedgerSessionPortProvider } from '../../entities/ledger';
import { useAppContext } from '../../shared';

export type LedgerSigningActor = ActorRefFrom<typeof ledgerSigningMachine>;

type LedgerSigningContextValue = {
    activeActor: LedgerSigningActor | null;
};

type LedgerSessionContextValue = {
    getLedgerKit: () => DeviceManagementKit;
    disconnect: () => Promise<void>;
    selectedDevice: DiscoveredDevice | null;
    setSelectedDevice: (device: DiscoveredDevice | null) => void;
    sessionId: string | null;
    setSessionId: (sessionId: string | null) => void;
    findMorePortfolioId: string | null;
    setFindMorePortfolioId: (portfolioId: string | null) => void;
};

const LedgerSigningContext = createContext<LedgerSigningContextValue | null>(null);
const LedgerSessionContext = createContext<LedgerSessionContextValue | null>(null);

type LedgerSessionProviderProps = {
    children: ReactNode;
    onSigningStart?: () => void;
};

export const LedgerSessionProvider = (props: LedgerSessionProviderProps) => {
    const { children, onSigningStart } = props;
    const { ledgerTransport } = useAppContext();

    const [sessionId, setSessionIdState] = useState<string | null>(null);
    const [activeActor, setActiveActor] = useState<LedgerSigningActor | null>(null);
    const [selectedDevice, setSelectedDevice] = useState<DiscoveredDevice | null>(null);
    const [findMorePortfolioId, setFindMorePortfolioId] = useState<string | null>(null);
    const ledgerKitRef = useRef<DeviceManagementKit | null>(null);
    const sessionIdRef = useRef<string | null>(null);

    const setSessionId = useCallback((id: string | null) => {
        sessionIdRef.current = id;
        setSessionIdState(id);
    }, []);

    const getLedgerKit = useCallback(() => {
        if (!ledgerKitRef.current) {
            ledgerKitRef.current = ledgerTransport.createKit();
        }

        return ledgerKitRef.current;
    }, [ledgerTransport]);

    const disconnect = useCallback(async () => {
        const currentSessionId = sessionIdRef.current;

        if (!currentSessionId) {
            return;
        }

        await getLedgerKit()
            .disconnect({ sessionId: currentSessionId })
            .catch(() => {});
        setSessionId(null);
    }, [getLedgerKit, setSessionId]);

    useEffect(() => {
        return () => {
            ledgerKitRef.current?.close();
            ledgerKitRef.current = null;
        };
    }, []);

    useEffect(() => () => activeActor?.stop(), [activeActor]);

    const withSession = useCallback(
        <T,>(
            params: { expectedFingerprint: Buffer },
            run: (session: LedgerSession) => Promise<T>
        ): Promise<T> =>
            new Promise<T>((resolve, reject) => {
                let actor: LedgerSigningActor | undefined;

                (async () => {
                    const ledgerKit = getLedgerKit();

                    await disconnect();

                    const sessionActor = createActor(ledgerSigningMachine, {
                        input: {
                            ledgerKit,
                            transportIdentifier: ledgerTransport.transportIdentifier,
                            expectedFingerprint: params.expectedFingerprint,
                            sessionId: null,
                            run
                        }
                    });
                    actor = sessionActor;

                    const release = (): void =>
                        setActiveActor(current => (current === sessionActor ? null : current));

                    sessionActor.subscribe({
                        next: snapshot => {
                            if (snapshot.context.sessionId) {
                                setSessionId(snapshot.context.sessionId);
                            }

                            if (snapshot.status !== 'done') {
                                return;
                            }

                            sessionActor.stop();
                            release();

                            const { error, result } = snapshot.output;

                            if (error) {
                                reject(
                                    error instanceof Error
                                        ? error
                                        : new Error('Ledger signing failed')
                                );
                            } else {
                                resolve(result as T);
                            }
                        },
                        error: (error: unknown) => {
                            sessionActor.stop();
                            release();
                            reject(
                                error instanceof Error ? error : new Error('Ledger signing failed')
                            );
                        }
                    });

                    setActiveActor(sessionActor);
                    sessionActor.start();
                    onSigningStart?.();
                })().catch((error: unknown) => {
                    actor?.stop();
                    setActiveActor(current => (current === actor ? null : current));
                    reject(error instanceof Error ? error : new Error('Ledger signing failed'));
                });
            }),
        [getLedgerKit, disconnect, ledgerTransport, onSigningStart, setSessionId]
    );

    const port = useMemo<ILedgerSessionPort>(() => ({ withSession }), [withSession]);

    const signingValue = useMemo(() => ({ activeActor }), [activeActor]);

    const sessionValue = useMemo(
        () => ({
            getLedgerKit,
            disconnect,
            selectedDevice,
            setSelectedDevice,
            sessionId,
            setSessionId,
            findMorePortfolioId,
            setFindMorePortfolioId
        }),
        [getLedgerKit, disconnect, selectedDevice, sessionId, setSessionId, findMorePortfolioId]
    );

    return (
        <LedgerSessionPortProvider port={port}>
            <LedgerSessionContext.Provider value={sessionValue}>
                <LedgerSigningContext.Provider value={signingValue}>
                    {children}
                </LedgerSigningContext.Provider>
            </LedgerSessionContext.Provider>
        </LedgerSessionPortProvider>
    );
};

export const useLedgerSigning = (): LedgerSigningContextValue => {
    const context = useContext(LedgerSigningContext);

    if (!context) {
        throw new Error('useLedgerSigning must be used within LedgerSessionProvider');
    }

    return context;
};

export const useLedgerSession = (): LedgerSessionContextValue => {
    const context = useContext(LedgerSessionContext);

    if (!context) {
        throw new Error('useLedgerSession must be used within LedgerSessionProvider');
    }

    return context;
};
