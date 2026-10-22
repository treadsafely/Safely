import type { FC } from 'react';

import type { SyncedDeviceDetails, SyncedDeviceStatusTone } from '@safely/ux';
import { resolveDeviceRowStatus, useDateFormatter, useTranslate } from '@safely/ux';

import { nameRowStyles } from './SafetyContent.styles';
import { Badge, Cell, Text } from '../../shared';

const TEXT_TONE_BY_STATUS: Record<
    SyncedDeviceStatusTone,
    'secondary' | 'accentRed' | 'accentOrange'
> = {
    secondary: 'secondary',
    red: 'accentRed',
    orange: 'accentOrange'
};

export type DeviceRowProps = {
    device: SyncedDeviceDetails;
    onSelect: () => void;
};

export const DeviceRow: FC<DeviceRowProps> = ({ device, onSelect }) => {
    const t = useTranslate();
    const formatDate = useDateFormatter({ month: 'short', day: 'numeric', year: 'numeric' });
    const status = resolveDeviceRowStatus(device);

    return (
        <Cell onClick={onSelect}>
            <Cell.Content>
                <Cell.Row className={nameRowStyles}>
                    <Cell.Title>{device.meta.name}</Cell.Title>
                    {device.isCurrent && <Badge isUppercase>{t('security.device.current')}</Badge>}
                </Cell.Row>
                <Cell.Row>
                    <Text variant="bodyM" tone={TEXT_TONE_BY_STATUS[status.tone]}>
                        {device.archive === null
                            ? t(status.labelKey)
                            : t(status.labelKey, {
                                  date: formatDate.format(device.archive.archivedAt)
                              })}
                    </Text>
                </Cell.Row>
                <Cell.Row>
                    <Text variant="bodyM" tone="tertiary">
                        {t('security.device.added', {
                            date: formatDate.format(device.meta.pairedAt)
                        })}
                    </Text>
                </Cell.Row>
            </Cell.Content>
            <Cell.Chevron />
        </Cell>
    );
};
