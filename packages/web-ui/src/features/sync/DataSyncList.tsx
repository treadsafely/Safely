import type { FC } from 'react';

import type { SyncedDeviceDetails } from '@safely/ux';
import { SyncedDeviceDataStatus, useTranslate } from '@safely/ux';
import DeviceLink from '@safely/ux/assets/icons/56/device-link.svg?react';

import { bannerStyles, statusColumnStyles, walletsStyles } from './DeviceDetailsModal.styles';
import { WalletName } from '../../entities';
import { Banner, List, TableCell, Text } from '../../shared';

const STATUS_LABEL_KEY: Record<SyncedDeviceDataStatus, string> = {
    [SyncedDeviceDataStatus.SYNCED]: 'security.deviceDetails.synced',
    [SyncedDeviceDataStatus.NOT_SYNCED]: 'security.deviceDetails.notSynced',
    [SyncedDeviceDataStatus.UNKNOWN]: 'security.deviceDetails.unknown'
};

const STATUS_TONE: Record<SyncedDeviceDataStatus, 'accentGreen' | 'accentRed' | 'accentOrange'> = {
    [SyncedDeviceDataStatus.SYNCED]: 'accentGreen',
    [SyncedDeviceDataStatus.NOT_SYNCED]: 'accentRed',
    [SyncedDeviceDataStatus.UNKNOWN]: 'accentOrange'
};

export type DataSyncListProps = {
    details: SyncedDeviceDetails;
};

export const DataSyncList: FC<DataSyncListProps> = ({ details }) => {
    const t = useTranslate();

    const deviceName = details.meta.name;
    const isSynced = details.dataStatus === SyncedDeviceDataStatus.SYNCED;
    const isUnknown = details.dataStatus === SyncedDeviceDataStatus.UNKNOWN;

    return (
        <List>
            <List.Title>{t('security.deviceDetails.dataSync')}</List.Title>
            <List.Group>
                <TableCell hasColumnDivider>
                    <TableCell.Column width="label">
                        <TableCell.Label>{t('security.deviceDetails.status')}</TableCell.Label>
                    </TableCell.Column>
                    <TableCell.Column className={statusColumnStyles}>
                        <Text variant="bodyM" tone={STATUS_TONE[details.dataStatus]}>
                            {t(STATUS_LABEL_KEY[details.dataStatus])}
                        </Text>
                        {isUnknown && (
                            <Text variant="bodyM" tone="secondary">
                                {t('security.deviceDetails.unknownHint')}
                            </Text>
                        )}
                        {!isSynced && !isUnknown && (
                            <Text variant="bodyM" tone="secondary">
                                {t('security.deviceDetails.completeSyncHint', { deviceName })}
                            </Text>
                        )}
                    </TableCell.Column>
                </TableCell>

                {!isUnknown && (
                    <TableCell hasColumnDivider>
                        <TableCell.Column width="label">
                            <TableCell.Label>
                                {isSynced
                                    ? t('security.deviceDetails.wallets')
                                    : t('security.deviceDetails.notOnThisDevice', { deviceName })}
                            </TableCell.Label>
                        </TableCell.Column>
                        <TableCell.Column className={walletsStyles}>
                            {isSynced ? (
                                <TableCell.Value>
                                    {t('security.deviceDetails.allWallets')}
                                </TableCell.Value>
                            ) : (
                                details.pendingPortfolios.map(portfolio => (
                                    <WalletName
                                        key={portfolio.id.toString()}
                                        meta={portfolio.meta}
                                    />
                                ))
                            )}
                        </TableCell.Column>
                    </TableCell>
                )}
            </List.Group>

            {isSynced && (
                <Banner className={bannerStyles}>
                    <Banner.Content>
                        <Banner.Text>{t('security.deviceDetails.fullAccess')}</Banner.Text>
                    </Banner.Content>
                    <Banner.Icon asset={DeviceLink} />
                </Banner>
            )}
        </List>
    );
};
