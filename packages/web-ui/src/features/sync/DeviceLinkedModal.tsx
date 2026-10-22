import type { FC } from 'react';

import { ellipsisMiddle } from '@safely/core';
import {
    useActiveAccount,
    useActiveAccountMeta,
    useContacts,
    usePortfolios,
    useSyncedDeviceName,
    useToast,
    useTranslate
} from '@safely/ux';
import Checkmark96 from '@safely/ux/assets/icons/96/checkmark-96.svg?react';

import { accountIdStyles, mediaStyles, popupStyles, tableStyles } from './DeviceLinkedModal.styles';
import { Button, Icon, List, Modal, TableCell, Text, useCopyToClipboard } from '../../shared';

const ACCOUNT_ID_SIDE_CHARS = 6;

export type DeviceLinkedModalProps = {
    ikPubHex: string;
    onViewLinkedDevices: () => void;
    onClose: () => void;
};

export const DeviceLinkedModal: FC<DeviceLinkedModalProps> = props => {
    const { ikPubHex, onViewLinkedDevices, onClose } = props;

    const t = useTranslate();
    const toast = useToast();
    const { copy } = useCopyToClipboard();

    const { accountId } = useActiveAccount();
    const accountName = useActiveAccountMeta().name;
    const deviceName = useSyncedDeviceName(ikPubHex) ?? t('safety.deviceLinked.unknownDevice');
    const walletsCount = usePortfolios().length;
    const contactsCount = useContacts().length;

    const handleCopyAccountId = (): void => {
        copy(accountId);
        toast(t('safety.deviceLinked.accountIdCopied'));
    };

    return (
        <Modal open onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')}>
                <div className={mediaStyles}>
                    <Icon asset={Checkmark96} size={96} />
                </div>

                <Modal.Content hasFloatingClose={false}>
                    <Modal.Title>
                        {t('safety.deviceLinked.title', { device: deviceName })}
                    </Modal.Title>
                    <Modal.Description>
                        {t('safety.deviceLinked.subtitle', {
                            device: deviceName,
                            account: accountName
                        })}
                    </Modal.Description>
                </Modal.Content>

                <div className={tableStyles}>
                    <List.Group>
                        <TableCell hasColumnDivider>
                            <TableCell.Column width="label">
                                <TableCell.Label>
                                    {t('safety.deviceLinked.account')}
                                </TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value>{accountName}</TableCell.Value>
                            </TableCell.Column>
                        </TableCell>

                        <TableCell hasColumnDivider>
                            <TableCell.Column width="label">
                                <TableCell.Label>{t('safety.deviceLinked.device')}</TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value>{deviceName}</TableCell.Value>
                            </TableCell.Column>
                        </TableCell>

                        <TableCell hasColumnDivider>
                            <TableCell.Column width="label">
                                <TableCell.Label>
                                    {t('safety.deviceLinked.wallets')}
                                </TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value>
                                    {t('safety.deviceLinked.walletsCount', {
                                        count: walletsCount
                                    })}
                                </TableCell.Value>
                            </TableCell.Column>
                        </TableCell>

                        {contactsCount > 0 && (
                            <TableCell hasColumnDivider>
                                <TableCell.Column width="label">
                                    <TableCell.Label>
                                        {t('safety.deviceLinked.contacts')}
                                    </TableCell.Label>
                                </TableCell.Column>
                                <TableCell.Column>
                                    <TableCell.Value>
                                        {t('safety.deviceLinked.contactsCount', {
                                            count: contactsCount
                                        })}
                                    </TableCell.Value>
                                </TableCell.Column>
                            </TableCell>
                        )}
                    </List.Group>
                </div>

                <button type="button" className={accountIdStyles} onClick={handleCopyAccountId}>
                    <Text variant="bodyM" tone="tertiary">
                        {t('safety.deviceLinked.accountId', {
                            id: ellipsisMiddle(accountId, ACCOUNT_ID_SIDE_CHARS)
                        })}
                    </Text>
                </button>

                <Modal.Actions>
                    <Button variant="secondary" isFullWidth onClick={onViewLinkedDevices}>
                        {t('safety.deviceLinked.viewLinkedDevices')}
                    </Button>
                </Modal.Actions>
            </Modal.Popup>
        </Modal>
    );
};
