import type { FC, ReactNode } from 'react';

import { useAppContext } from '@safely/ux';
import ArrowLeft16 from '@safely/ux/assets/icons/16/arrow-left-16.svg?react';

import { buildStyles, contentStyles } from './DevToolsSettings.styles';
import { KeychainSection } from './KeychainSection';
import { listStyles } from './SettingsSection.styles';
import type { DevTool } from './types';
import { DEV_TOOLS } from './types';
import { Button, Cell, Icon, List, PageHeader, Text } from '../../../shared';

const TOOL_TITLES: Record<DevTool, string> = {
    keychain: 'Keychain',
    logs: 'Logs'
};

export type DevToolsSettingsProps = {
    tool: DevTool | null;
    logs: ReactNode;
    onSelectTool: (tool: DevTool | null) => void;
};

export const DevToolsSettings: FC<DevToolsSettingsProps> = props => {
    const { tool, logs, onSelectTool } = props;

    const { version, build, environment, deviceInfo } = useAppContext();

    if (tool === null) {
        return (
            <>
                <PageHeader title="Dev tools" hasDivider />

                <List className={listStyles}>
                    <Text variant="bodyM" tone="tertiary" className={buildStyles}>
                        {`${build} ${version} · ${environment} · ${deviceInfo.osVersion}`}
                    </Text>

                    <List.Group variant="separated">
                        {DEV_TOOLS.map(item => (
                            <Cell key={item} onClick={() => onSelectTool(item)}>
                                <Cell.Content>
                                    <Cell.Title>{TOOL_TITLES[item]}</Cell.Title>
                                </Cell.Content>
                                <Cell.Chevron />
                            </Cell>
                        ))}
                    </List.Group>
                </List>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title={TOOL_TITLES[tool]}
                hasDivider
                leading={
                    <Button
                        variant="secondary"
                        size="small"
                        isIconOnly
                        aria-label="Back"
                        onClick={() => onSelectTool(null)}
                    >
                        <Icon asset={ArrowLeft16} />
                    </Button>
                }
            />

            {tool === 'keychain' ? (
                <div className={contentStyles}>
                    <KeychainSection />
                </div>
            ) : (
                logs
            )}
        </>
    );
};
