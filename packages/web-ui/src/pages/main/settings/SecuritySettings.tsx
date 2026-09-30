import type { FC } from 'react';
import { useState } from 'react';

import { useEraseAllData, useLoader, useTranslate } from '@safely/ux';

import { adjacentGroupStyles, listStyles } from './SettingsSection.styles';
import { EraseDataModal } from '../../../features';
import { Cell, List, PageHeader, Switch } from '../../../shared';

export type SecuritySettingsBiometry = {
    title: string;
    description: string;
    isEnabled: boolean;
    onToggle: (isEnabled: boolean) => void;
};

export type SecuritySettingsProps = {
    isLockScreenEnabled: boolean;
    biometry?: SecuritySettingsBiometry;
    onToggleLockScreen: (isEnabled: boolean) => void;
    onChangePasscode: () => void;
};

export const SecuritySettings: FC<SecuritySettingsProps> = props => {
    const { isLockScreenEnabled, biometry, onToggleLockScreen, onChangePasscode } = props;

    const t = useTranslate();
    const { withLoader } = useLoader();
    const { mutateAsync: eraseAllData } = useEraseAllData();

    const [isErasing, setIsErasing] = useState(false);

    return (
        <>
            <PageHeader title={t('security.title')} hasDivider />

            <List className={listStyles}>
                <List.Group variant="divided">
                    {biometry && (
                        <Cell>
                            <Cell.Content>
                                <Cell.Title>{biometry.title}</Cell.Title>
                                <Cell.Subtitle>{biometry.description}</Cell.Subtitle>
                            </Cell.Content>
                            <Cell.Trailing>
                                <Switch
                                    checked={biometry.isEnabled}
                                    onCheckedChange={biometry.onToggle}
                                />
                            </Cell.Trailing>
                        </Cell>
                    )}

                    <Cell>
                        <Cell.Content>
                            <Cell.Title>
                                {t('security.groups.application.lockScreen.title')}
                            </Cell.Title>
                            <Cell.Subtitle>
                                {t('security.groups.application.lockScreen.subtitle')}
                            </Cell.Subtitle>
                        </Cell.Content>
                        <Cell.Trailing>
                            <Switch
                                checked={isLockScreenEnabled}
                                onCheckedChange={onToggleLockScreen}
                            />
                        </Cell.Trailing>
                    </Cell>

                    <Cell onClick={onChangePasscode}>
                        <Cell.Content>
                            <Cell.Title>
                                {t('security.groups.application.changePasscode')}
                            </Cell.Title>
                        </Cell.Content>
                        <Cell.Chevron />
                    </Cell>
                </List.Group>

                <List.Group variant="separated" className={adjacentGroupStyles}>
                    <Cell onClick={() => setIsErasing(true)}>
                        <Cell.Content>
                            <Cell.Title>
                                {t('security.groups.application.eraseAndLogout')}
                            </Cell.Title>
                        </Cell.Content>
                        <Cell.Chevron />
                    </Cell>
                </List.Group>
            </List>

            {isErasing && (
                <EraseDataModal
                    onConfirm={() => void withLoader(() => eraseAllData())}
                    onClose={() => setIsErasing(false)}
                />
            )}
        </>
    );
};
