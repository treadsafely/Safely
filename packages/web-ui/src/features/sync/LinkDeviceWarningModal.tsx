import type { FC } from 'react';

import { useActiveAccountMeta, useContacts, usePortfolios, useTranslate } from '@safely/ux';
import ExclamationmarkCircle16 from '@safely/ux/assets/icons/16/exclamationmark-circle-16.svg?react';
import DeviceLinkArrowRight96 from '@safely/ux/assets/icons/96/device-link-arrow-right-96.svg?react';

import {
    mediaStyles,
    popupStyles,
    tableStyles,
    walletsStyles
} from './LinkDeviceWarningModal.styles';
import { WalletName } from '../../entities';
import { Banner, Button, Icon, List, Modal, TableCell } from '../../shared';

export type LinkDeviceWarningModalProps = {
    onContinue: () => void;
    onClose: () => void;
};

export const LinkDeviceWarningModal: FC<LinkDeviceWarningModalProps> = props => {
    const { onContinue, onClose } = props;

    const t = useTranslate();
    const accountName = useActiveAccountMeta().name;
    const portfolios = usePortfolios();
    const contactsCount = useContacts().length;

    return (
        <Modal open onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')}>
                <div className={mediaStyles}>
                    <Icon asset={DeviceLinkArrowRight96} size={96} />
                </div>

                <Modal.Content>
                    <Modal.Title>
                        {t('safety.linkDeviceWarning.title', { name: accountName })}
                    </Modal.Title>
                    <Modal.Description>{t('safety.linkDeviceWarning.subtitle')}</Modal.Description>
                </Modal.Content>

                <div className={tableStyles}>
                    <Banner tone="danger">
                        <Banner.Content>
                            <Banner.Text>{t('safety.linkDeviceWarning.warning')}</Banner.Text>
                        </Banner.Content>
                        <Banner.Icon asset={ExclamationmarkCircle16} />
                    </Banner>

                    <List.Group variant="separated">
                        <TableCell hasColumnDivider>
                            <TableCell.Column width="label">
                                <TableCell.Label>
                                    {t('safety.linkDeviceWarning.wallets')}
                                </TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column className={walletsStyles}>
                                {portfolios.map(portfolio => (
                                    <WalletName
                                        key={portfolio.id.toString()}
                                        meta={portfolio.meta}
                                    />
                                ))}
                            </TableCell.Column>
                        </TableCell>

                        {contactsCount > 0 && (
                            <TableCell hasColumnDivider>
                                <TableCell.Column width="label">
                                    <TableCell.Label>
                                        {t('safety.linkDeviceWarning.contacts')}
                                    </TableCell.Label>
                                </TableCell.Column>
                                <TableCell.Column>
                                    <TableCell.Value>
                                        {t('safety.linkDeviceWarning.contactsCount', {
                                            count: contactsCount
                                        })}
                                    </TableCell.Value>
                                </TableCell.Column>
                            </TableCell>
                        )}
                    </List.Group>
                </div>

                <Modal.Actions direction="row">
                    <Button variant="secondary" isFullWidth onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="destructive" isFullWidth onClick={onContinue}>
                        {t('safety.linkDeviceWarning.continue')}
                    </Button>
                </Modal.Actions>
            </Modal.Popup>
        </Modal>
    );
};
