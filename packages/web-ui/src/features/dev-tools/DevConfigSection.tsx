import type { FC } from 'react';
import { useState } from 'react';

import type { ISyncKeyValueStorage } from '@safely/core';
import { useAppContext } from '@safely/ux';

import { rootStyles } from './DevConfigSection.styles';
import { Button, Input } from '../../shared';

const ALPHANUMERIC = /[^a-zA-Z0-9]/g;
const DEV_TOKEN_KEY = 'devToken';

export type DevConfigSectionProps = {
    storage: ISyncKeyValueStorage;
};

export const DevConfigSection: FC<DevConfigSectionProps> = ({ storage }) => {
    const { reloadApp } = useAppContext();
    const [token, setToken] = useState(() => storage.get(DEV_TOKEN_KEY) ?? '');

    const saveAndReload = (): void => {
        if (token.length > 0) {
            storage.set(DEV_TOKEN_KEY, token);
        } else {
            storage.remove(DEV_TOKEN_KEY);
        }

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
