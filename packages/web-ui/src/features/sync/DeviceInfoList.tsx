import type { FC } from 'react';

import { SPACE } from '@safely/core';
import type { SyncedDeviceDetails } from '@safely/ux';
import {
    resolveConnectionLabel,
    useDateFormatter,
    useHideDeviceWarning,
    useTranslate
} from '@safely/ux';

import { bannerStyles } from './DeviceDetailsModal.styles';
import { Banner, Button, List, TableCell, Text } from '../../shared';

const ConnectionValue: FC<{ lastSyncAt: number | null }> = ({ lastSyncAt }) => {
    const t = useTranslate();
    const formatDate = useDateFormatter({ day: 'numeric', month: 'short', year: 'numeric' });
    const { labelKey, count, hasDate } = resolveConnectionLabel(lastSyncAt);

    return (
        <TableCell.Value>
            {count === null ? t(labelKey) : t(labelKey, { count })}
            {hasDate && lastSyncAt !== null && (
                <Text variant="bodyM" tone="secondary">
                    {`${SPACE.NBSP}·${SPACE.NBSP}${formatDate.format(lastSyncAt)}`}
                </Text>
            )}
        </TableCell.Value>
    );
};

const ArchiveRows: FC<{ details: SyncedDeviceDetails }> = ({ details }) => {
    const t = useTranslate();
    const formatDate = useDateFormatter({ day: 'numeric', month: 'short', year: 'numeric' });
    const { archive } = details;

    if (archive === null) {
        return null;
    }

    return (
        <>
            <TableCell hasColumnDivider>
                <TableCell.Column width="label">
                    <TableCell.Label>{t('security.deviceDetails.archived')}</TableCell.Label>
                </TableCell.Column>
                <TableCell.Column>
                    <TableCell.Value>{formatDate.format(archive.archivedAt)}</TableCell.Value>
                </TableCell.Column>
            </TableCell>

            <TableCell hasColumnDivider>
                <TableCell.Column width="label">
                    <TableCell.Label>{t('security.deviceDetails.reason')}</TableCell.Label>
                </TableCell.Column>
                <TableCell.Column>
                    <TableCell.Value>
                        {archive.isSignedOut
                            ? t('security.deviceDetails.reasonSignedOut', {
                                  deviceName: details.meta.name
                              })
                            : t('security.deviceDetails.reasonArchivedFrom', {
                                  deviceName: archive.archivedFromDeviceName ?? ''
                              })}
                    </TableCell.Value>
                </TableCell.Column>
            </TableCell>
        </>
    );
};

export type DeviceInfoListProps = {
    details: SyncedDeviceDetails;
};

export const DeviceInfoList: FC<DeviceInfoListProps> = ({ details }) => {
    const t = useTranslate();
    const { mutate: hideWarning } = useHideDeviceWarning();
    const formatDate = useDateFormatter({ day: 'numeric', month: 'short', year: 'numeric' });

    const deviceName = details.meta.name;
    const isSignedOut = details.archive?.isSignedOut ?? false;
    const hasStaleWarning =
        details.archive === null && details.isStale && !details.isStaleWarningHidden;

    return (
        <List>
            <List.Title>{t('security.deviceDetails.device')}</List.Title>
            <List.Group>
                <TableCell hasColumnDivider>
                    <TableCell.Column width="label">
                        <TableCell.Label>{t('security.deviceDetails.added')}</TableCell.Label>
                    </TableCell.Column>
                    <TableCell.Column>
                        <TableCell.Value>
                            {formatDate.format(details.meta.pairedAt)}
                        </TableCell.Value>
                    </TableCell.Column>
                </TableCell>

                {!isSignedOut && (
                    <TableCell hasColumnDivider>
                        <TableCell.Column width="label">
                            <TableCell.Label>
                                {t('security.deviceDetails.connection')}
                            </TableCell.Label>
                        </TableCell.Column>
                        <TableCell.Column>
                            <ConnectionValue lastSyncAt={details.lastSyncAt} />
                        </TableCell.Column>
                    </TableCell>
                )}

                <ArchiveRows details={details} />
            </List.Group>

            {hasStaleWarning && (
                <Banner tone="warn" className={bannerStyles}>
                    <Banner.Content>
                        <Banner.Text>
                            {t('security.deviceDetails.staleWarning', { deviceName })}
                        </Banner.Text>
                    </Banner.Content>
                    <Button
                        variant="destructiveOrange"
                        size="xsmall"
                        onClick={() => hideWarning(details.ikPubHex)}
                    >
                        {t('security.deviceDetails.hideWarning')}
                    </Button>
                </Banner>
            )}
        </List>
    );
};
