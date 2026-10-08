import type { FC } from 'react';

import { LogLevel } from '@safely/sync';
import type { LogFiltersProps } from '@safely/ux';

import { chipRowStyles, filtersStyles } from './LogsSection.styles';
import { Button } from '../../shared';

export const LogFilters: FC<LogFiltersProps> = props => {
    const { levels, scopes, isLevelActive, isScopeActive, onToggleLevel, onToggleScope } = props;

    return (
        <div className={filtersStyles}>
            {levels.length > 0 && (
                <div className={chipRowStyles}>
                    {levels.map(level => (
                        <Button
                            key={level}
                            variant={isLevelActive(level) ? 'primary' : 'secondary'}
                            size="xsmall"
                            onClick={() => onToggleLevel(level)}
                        >
                            {LogLevel[level]}
                        </Button>
                    ))}
                </div>
            )}
            {scopes.length > 0 && (
                <div className={chipRowStyles}>
                    {scopes.map(scope => (
                        <Button
                            key={scope}
                            variant={isScopeActive(scope) ? 'primary' : 'secondary'}
                            size="xsmall"
                            onClick={() => onToggleScope(scope)}
                        >
                            {scope}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
};
