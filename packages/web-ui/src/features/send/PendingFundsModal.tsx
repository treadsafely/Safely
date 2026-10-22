import type { FC } from 'react';

import { BtcAssetAmount, btcBlockWaitingTimeMinutes } from '@safely/core';
import {
    useActiveBtcWalletUtxo,
    useActiveWalletBtcBalance,
    useNumberFormatter,
    useTranslate
} from '@safely/ux';

import { tableStyles } from './PendingFundsModal.styles';
import { Button, List, Modal, TableCell } from '../../shared';

export type PendingFundsModalProps = {
    onClose: () => void;
};

export const PendingFundsModal: FC<PendingFundsModalProps> = ({ onClose }) => {
    const t = useTranslate();
    const formatter = useNumberFormatter();
    const { data: utxo } = useActiveBtcWalletUtxo();
    const { data: balance } = useActiveWalletBtcBalance();

    const total = balance?.display.amountAdd(balance.pending ?? BtcAssetAmount.fromWeiAmount('0'));

    return (
        <Modal open onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup closeLabel={t('common.close')}>
                <Modal.Content>
                    <Modal.Title>{t('pendingFunds.title')}</Modal.Title>
                    <Modal.Description>{t('pendingFunds.subtitle')}</Modal.Description>
                </Modal.Content>

                <div className={tableStyles}>
                    <List.Group>
                        <TableCell hasColumnDivider>
                            <TableCell.Column width="label">
                                <TableCell.Label>{t('pendingFunds.pending')}</TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                {utxo?.unconfirmedUnsafe.utxos.map(item => (
                                    <div key={item.tx.txid}>
                                        <TableCell.Value>
                                            {BtcAssetAmount.fromWeiAmount(item.value).format(
                                                formatter,
                                                { showPositiveSign: true }
                                            )}
                                        </TableCell.Value>
                                        <TableCell.Label>
                                            {t('pendingFunds.estimatedTime', {
                                                minutes:
                                                    (item.tx.confirmationETABlocks ?? 1) *
                                                    btcBlockWaitingTimeMinutes
                                            })}
                                        </TableCell.Label>
                                    </div>
                                ))}
                            </TableCell.Column>
                        </TableCell>

                        <TableCell hasColumnDivider>
                            <TableCell.Column width="label">
                                <TableCell.Label>{t('pendingFunds.available')}</TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value>
                                    {balance?.display.format(formatter)}
                                </TableCell.Value>
                            </TableCell.Column>
                        </TableCell>

                        <TableCell hasColumnDivider>
                            <TableCell.Column width="label">
                                <TableCell.Label>{t('pendingFunds.total')}</TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value>{total?.format(formatter)}</TableCell.Value>
                            </TableCell.Column>
                        </TableCell>
                    </List.Group>
                </div>

                <Modal.Actions>
                    <Button variant="secondary" isFullWidth onClick={onClose}>
                        {t('pendingFunds.ok')}
                    </Button>
                </Modal.Actions>
            </Modal.Popup>
        </Modal>
    );
};
