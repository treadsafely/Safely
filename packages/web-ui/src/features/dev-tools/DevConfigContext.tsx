import { createContext, useContext } from 'react';

export type DevConfig = {
    devToken: string | null;
    setDevToken: (value: string | null) => void;
};

const DevConfigContext = createContext<DevConfig | null>(null);

export const DevConfigProvider = DevConfigContext.Provider;

export function useDevConfig(): DevConfig {
    const context = useContext(DevConfigContext);

    if (context === null) {
        throw new Error('useDevConfig must be used within a DevConfigProvider');
    }

    return context;
}
