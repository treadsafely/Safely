import type { FC } from 'react';
import { useState } from 'react';

import { useAppContext } from '@safely/ux';

import { useDevConfig } from './DevConfigContext';
import { rootStyles } from './DevConfigSection.styles';
import { Button, Input } from '../../shared';

const ALPHANUMERIC = /[^a-zA-Z0-9]/g;

export const DevConfigSection: FC = () => {
    const { reloadApp } = useAppContext();
    const { devToken, setDevToken } = useDevConfig();
    const [token, setToken] = useState(() => devToken ?? '');

    const saveAndReload = (): void => {
        setDevToken(token.length > 0 ? token : null);
        reloadApp();
    };

    return (
        <div className={rootStyles}>
            <Input>
                <Input.Label>Dev token</Input.Label>
                <Input.Field
                    value={token}
                    placeholder="Token"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    clearLabel="Clear"
                    onClear={() => setToken('')}
                    onChange={event => setToken(event.target.value.replace(ALPHANUMERIC, ''))}
                />
            </Input>
            <Button variant="primary" isFullWidth onClick={saveAndReload}>
                Save and reload
            </Button>
        </div>
    );
};
