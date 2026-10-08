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

import { accountIdStyles, mediaStyles, tableStyles } from './DeviceLinkedModal.styles';
import { popupStyles } from './SignInSuccessModal.styles';
import { Button, Icon, List, Modal, TableCell, Text, useCopyToClipboard } from '../../shared';

const ACCOUNT_ID_SIDE_CHARS = 6;

export type SignInSuccessModalProps = {
    inviterIkPubHex: string | null;
    onContinue: () => void;
};

export const SignInSuccessModal: FC<SignInSuccessModalProps> = props => {
    const { inviterIkPubHex, onContinue } = props;

    const t = useTranslate();
    const toast = useToast();
    const { copy } = useCopyToClipboard();

    const { accountId } = useActiveAccount();
    const accountName = useActiveAccountMeta().name;
    const inviterName = useSyncedDeviceName(inviterIkPubHex);
    const walletsCount = usePortfolios().length;
    const contactsCount = useContacts().length;

    const handleCopyAccountId = (): void => {
        copy(accountId);
        toast(t('safety.deviceLinked.accountIdCopied'));
    };

    return (
        <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onContinue()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')}>
                <div className={mediaStyles}>
                    <Icon asset={Checkmark96} size={96} />
                </div>

                <Modal.Content hasFloatingClose={false}>
                    <Modal.Title>
                        {t('safety.signedIn.title', { account: accountName })}
                    </Modal.Title>
                    <Modal.Description>
                        {inviterName === null
                            ? t('safety.signedIn.subtitleUnknownDevice')
                            : t('safety.signedIn.subtitle', { device: inviterName })}
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
                    <Button variant="secondary" isFullWidth onClick={onContinue}>
                        {t('signIn.success.continue')}
                    </Button>
                </Modal.Actions>
            </Modal.Popup>
        </Modal>
    );
};
