import type { FC } from 'react';
import { useState } from 'react';

import type { Estimation, SendResult } from '@safely/core';
import { btcBlockWaitingTimeMinutes, ellipsisMiddle } from '@safely/core';
import type { SendFormResult } from '@safely/ux';
import {
    useActiveBtcWallet,
    useActiveWalletMeta,
    useErrorToast,
    useEstimateAssetTransfer,
    useExplorerFactory,
    useFiatEquivalent,
    useLinking,
    useNumberFormatter,
    useSendAssetTransfer,
    useTranslate
} from '@safely/ux';
import Globe16 from '@safely/ux/assets/icons/16/globe-16.svg?react';
import Checkmark96 from '@safely/ux/assets/icons/96/checkmark-96.svg?react';

import {
    actionsStyles,
    bodyStyles,
    heroStyles,
    iconSlotStyles,
    linkStyles,
    listStyles,
    successIconStyles,
    successStyles,
    transactionStyles
} from './ConfirmStep.styles';
import { RecipientName } from './RecipientName';
import { AssetIcon, WalletIcon } from '../../entities';
import { Button, Icon, List, Modal, TableCell, Text } from '../../shared';

export type ConfirmStepProps = {
    result: SendFormResult;
    onSent: () => void;
    onClose: () => void;
};

const FeeValue: FC<{ estimation: Estimation }> = ({ estimation }) => {
    const formatter = useNumberFormatter();
    const { data: fiat } = useFiatEquivalent(estimation.fee.amount);

    return (
        <>
            {fiat ? `${fiat.format(formatter)} ` : ''}
            {estimation.fee.amount.format(formatter)}
        </>
    );
};

export const ConfirmStep: FC<ConfirmStepProps> = props => {
    const { result, onSent, onClose } = props;

    const t = useTranslate();
    const formatter = useNumberFormatter();
    const walletMeta = useActiveWalletMeta();
    const wallet = useActiveBtcWallet();
    const explorerFactory = useExplorerFactory();
    const { openURL } = useLinking();
    const errorToast = useErrorToast({});

    const [sendResult, setSendResult] = useState<SendResult | null>(null);

    const { data: transaction } = useEstimateAssetTransfer(result, {
        enabled: sendResult === null
    });
    const { mutateAsync: send, isPending: isSending } = useSendAssetTransfer();

    const targetBlock = transaction ? Math.max(transaction.estimation.txTargetBlock, 1) : undefined;

    const handleSend = async (): Promise<void> => {
        try {
            const broadcasted = await send(transaction);

            setSendResult(broadcasted);
            onSent();
        } catch (error) {
            errorToast(error);
        }
    };

    return (
        <>
            <div className={bodyStyles}>
                {sendResult === null && (
                    <div className={heroStyles}>
                        <div className={iconSlotStyles}>
                            <AssetIcon
                                image={result.amount.cryptoAssetAmount.asset.image}
                                size={72}
                            />
                        </div>
                        <Text variant="titleM">
                            {t('confirmation.title', {
                                symbol: result.amount.cryptoAssetAmount.asset.symbol
                            })}
                        </Text>
                    </div>
                )}

                {sendResult !== null && (
                    <div className={successStyles}>
                        <div className={iconSlotStyles}>
                            <Icon
                                asset={Checkmark96}
                                size={96}
                                tone="accentGreen"
                                className={successIconStyles}
                            />
                        </div>
                        <Text variant="titleM">{t('confirmation.success')}</Text>
                    </div>
                )}

                <List className={listStyles}>
                    <List.Group variant="divided">
                        <TableCell>
                            <TableCell.Column width="label">
                                <TableCell.Label>{t('confirmation.from')}</TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value>
                                    <WalletIcon icon={walletMeta.icon} />
                                    {walletMeta.name}
                                </TableCell.Value>
                                <TableCell.Label>
                                    {ellipsisMiddle(wallet.address, 6)}
                                </TableCell.Label>
                            </TableCell.Column>
                        </TableCell>

                        <TableCell>
                            <TableCell.Column width="label">
                                <TableCell.Label>{t('confirmation.to')}</TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                {result.recipientMeta === undefined ? (
                                    <TableCell.Value>
                                        {ellipsisMiddle(result.recipient.address, 6)}
                                    </TableCell.Value>
                                ) : (
                                    <>
                                        <TableCell.Value>
                                            <RecipientName
                                                portfolioMeta={
                                                    result.recipientMeta.kind === 'portfolio'
                                                        ? result.recipientMeta.meta
                                                        : undefined
                                                }
                                                contactMeta={
                                                    result.recipientMeta.kind === 'contact'
                                                        ? result.recipientMeta.meta
                                                        : undefined
                                                }
                                            />
                                        </TableCell.Value>
                                        <TableCell.Label>
                                            {ellipsisMiddle(result.recipient.address, 6)}
                                        </TableCell.Label>
                                    </>
                                )}
                            </TableCell.Column>
                        </TableCell>
                    </List.Group>

                    <List.Group variant="divided">
                        <TableCell>
                            <TableCell.Column width="label">
                                <TableCell.Label>{t('confirmation.amount')}</TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value>
                                    {result.amount.cryptoAssetAmount.format(formatter)}
                                </TableCell.Value>
                                <TableCell.Label>
                                    {result.isMax
                                        ? t('confirmation.allAvailableBalance')
                                        : result.amount.fiatAssetAmount.format(formatter)}
                                </TableCell.Label>
                            </TableCell.Column>
                        </TableCell>

                        <TableCell>
                            <TableCell.Column width="label">
                                <TableCell.Label>
                                    {t('confirmation.networkFee.title')}
                                </TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value>
                                    {transaction ? (
                                        <FeeValue estimation={transaction.estimation} />
                                    ) : (
                                        '—'
                                    )}
                                </TableCell.Value>
                                <TableCell.Label>
                                    {targetBlock !== undefined
                                        ? t('confirmation.networkFee.timeMinutes', {
                                              count: targetBlock * btcBlockWaitingTimeMinutes
                                          })
                                        : ''}
                                </TableCell.Label>
                            </TableCell.Column>
                        </TableCell>
                    </List.Group>

                    {sendResult !== null && (
                        <List.Group variant="divided">
                            <TableCell>
                                <TableCell.Column width="label">
                                    <TableCell.Label>
                                        {t('confirmation.sendResult.status.title')}
                                    </TableCell.Label>
                                </TableCell.Column>
                                <TableCell.Column>
                                    <TableCell.Value>
                                        {t('confirmation.sendResult.status.created.value')}
                                    </TableCell.Value>
                                    <TableCell.Label>
                                        {t('confirmation.sendResult.status.created.description')}
                                    </TableCell.Label>
                                </TableCell.Column>
                            </TableCell>

                            <TableCell copyable={sendResult.txId} copiedLabel={t('actions.copied')}>
                                <TableCell.Column width="label">
                                    <TableCell.Label>
                                        {t('confirmation.sendResult.transaction')}
                                    </TableCell.Label>
                                </TableCell.Column>
                                <TableCell.Column>
                                    <div className={transactionStyles}>
                                        <TableCell.Value>
                                            {ellipsisMiddle(sendResult.toString(), 6)}
                                        </TableCell.Value>
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            className={linkStyles}
                                            onClick={() =>
                                                openURL(sendResult.toExplorerUrl(explorerFactory))
                                            }
                                        >
                                            <Icon asset={Globe16} tone="secondary" />
                                        </span>
                                    </div>
                                </TableCell.Column>
                            </TableCell>
                        </List.Group>
                    )}
                </List>
            </div>

            <Modal.Actions className={actionsStyles}>
                {sendResult === null ? (
                    <Button
                        variant="primary"
                        isFullWidth
                        isLoading={isSending}
                        disabled={transaction === undefined}
                        onClick={() => void handleSend()}
                    >
                        {t('confirmation.slider.send')}
                    </Button>
                ) : (
                    <Button variant="secondary" isFullWidth onClick={onClose}>
                        {t('confirmation.slider.backToWallet')}
                    </Button>
                )}
            </Modal.Actions>
        </>
    );
};
