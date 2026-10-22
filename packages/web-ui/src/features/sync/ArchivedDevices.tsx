import type { FC } from 'react';
import { useState } from 'react';

import type { SyncedDeviceDetails } from '@safely/ux';
import { useTranslate } from '@safely/ux';
import ChevronRight12 from '@safely/ux/assets/icons/12/chevron-right-12.svg?react';

import { DeviceRow } from './DeviceRow';
import { archivedToggleStyles, listStyles } from './SafetyContent.styles';
import { Icon, List, Text } from '../../shared';

export type ArchivedDevicesProps = {
    devices: readonly SyncedDeviceDetails[];
    onSelect: (ikPubHex: string) => void;
};

export const ArchivedDevices: FC<ArchivedDevicesProps> = ({ devices, onSelect }) => {
    const t = useTranslate();
    const [isExpanded, setIsExpanded] = useState(false);

    if (devices.length === 0) {
        return null;
    }

    if (!isExpanded) {
        return (
            <button
                type="button"
                className={archivedToggleStyles}
                onClick={() => setIsExpanded(true)}
            >
                <Text variant="bodyM" tone="tertiary">
                    {t('security.archivedDevices.show')}
                </Text>
                <Icon asset={ChevronRight12} tone="tertiary" />
            </button>
        );
    }

    return (
        <List className={listStyles}>
            <List.Title>{t('security.archivedDevices.title')}</List.Title>
            <List.Group variant="separated">
                {devices.map(device => (
                    <DeviceRow
                        key={device.ikPubHex}
                        device={device}
                        onSelect={() => onSelect(device.ikPubHex)}
                    />
                ))}
            </List.Group>
            <List.Footer>{t('security.archivedDevices.footnote')}</List.Footer>
        </List>
    );
};
