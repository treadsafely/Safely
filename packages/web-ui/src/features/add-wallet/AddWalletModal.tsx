import type { FC } from 'react';

import { useAppContext, useTranslate } from '@safely/ux';
import WalletPlus96 from '@safely/ux/assets/icons/96/wallet-plus-96.svg?react';

import { iconStyles, optionsStyles, popupStyles } from './AddWalletModal.styles';
import { Cell, Icon, List, Modal } from '../../shared';

export type AddWalletModalProps = {
    onCreateNew: () => void;
    onImportExisting: () => void;
    onWatchAccount: () => void;
    onImportTestnet: () => void;
    onConnectLedger: () => void;
    onClose: () => void;
};

export const AddWalletModal: FC<AddWalletModalProps> = props => {
    const { onCreateNew, onImportExisting, onWatchAccount, onImportTestnet, onConnectLedger } =
        props;

    const t = useTranslate();
    const { devIsTestnetAllowed } = useAppContext();

    return (
        <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && props.onClose()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')}>
                <div className={iconStyles}>
                    <Icon asset={WalletPlus96} size={96} />
                </div>

                <Modal.Content hasFloatingClose={false}>
                    <Modal.Title>{t('addWallet.title')}</Modal.Title>
                    <Modal.Description>{t('addWallet.subtitle')}</Modal.Description>
                </Modal.Content>

                <List className={optionsStyles}>
                    <List.Group variant="separated">
                        <Cell onClick={onCreateNew}>
                            <Cell.Content>
                                <Cell.Row>
                                    <Cell.Title>{t('addWallet.createNew.title')}</Cell.Title>
                                </Cell.Row>
                                <Cell.Row>
                                    <Cell.Subtitle>
                                        {t('addWallet.createNew.subtitle')}
                                    </Cell.Subtitle>
                                </Cell.Row>
                            </Cell.Content>
                            <Cell.Chevron />
                        </Cell>

                        <Cell onClick={onImportExisting}>
                            <Cell.Content>
                                <Cell.Row>
                                    <Cell.Title>{t('addWallet.importExisting.title')}</Cell.Title>
                                </Cell.Row>
                                <Cell.Row>
                                    <Cell.Subtitle>
                                        {t('addWallet.importExisting.subtitle')}
                                    </Cell.Subtitle>
                                </Cell.Row>
                            </Cell.Content>
                            <Cell.Chevron />
                        </Cell>

                        <Cell onClick={onConnectLedger}>
                            <Cell.Content>
                                <Cell.Row>
                                    <Cell.Title>{t('addWallet.connectLedger.title')}</Cell.Title>
                                </Cell.Row>
                                <Cell.Row>
                                    <Cell.Subtitle>
                                        {t('addWallet.connectLedger.subtitle')}
                                    </Cell.Subtitle>
                                </Cell.Row>
                            </Cell.Content>
                            <Cell.Chevron />
                        </Cell>

                        <Cell onClick={onWatchAccount}>
                            <Cell.Content>
                                <Cell.Row>
                                    <Cell.Title>{t('addWallet.watchAccount.title')}</Cell.Title>
                                </Cell.Row>
                                <Cell.Row>
                                    <Cell.Subtitle>
                                        {t('addWallet.watchAccount.subtitle')}
                                    </Cell.Subtitle>
                                </Cell.Row>
                            </Cell.Content>
                            <Cell.Chevron />
                        </Cell>

                        {devIsTestnetAllowed && (
                            <Cell onClick={onImportTestnet}>
                                <Cell.Content>
                                    <Cell.Row>
                                        <Cell.Title>{t('addWallet.testnet.title')}</Cell.Title>
                                    </Cell.Row>
                                    <Cell.Row>
                                        <Cell.Subtitle>
                                            {t('addWallet.testnet.subtitle')}
                                        </Cell.Subtitle>
                                    </Cell.Row>
                                </Cell.Content>
                                <Cell.Chevron />
                            </Cell>
                        )}
                    </List.Group>
                </List>
            </Modal.Popup>
        </Modal>
    );
};
