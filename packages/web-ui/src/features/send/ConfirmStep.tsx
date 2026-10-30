import type { FC } from 'react';
import { useState } from 'react';

import type { CryptoAssetAmount, Estimation, SendResult } from '@safely/core';
import {
    btcBlockWaitingTimeMinutes,
    ellipsisMiddle,
    LedgerSigningCancelledError,
    PortfolioType
} from '@safely/core';
import type { SendFormResult } from '@safely/ux';
import {
    orderAmounts,
    useActiveBtcWallet,
    useActivePortfolio,
    useActivePortfolioLedgerIndex,
    useActiveWalletMeta,
    useEstimateAssetTransfer,
    useExplorerFactory,
    useFiatEquivalent,
    useLinking,
    useNumberFormatter,
    useParseEstimateError,
    useParseSendError,
    useSendAssetTransfer,
    useTranslate
} from '@safely/ux';
import Copy16 from '@safely/ux/assets/icons/16/copy-16.svg?react';
import Globe16 from '@safely/ux/assets/icons/16/globe-16.svg?react';
import Checkmark96 from '@safely/ux/assets/icons/96/checkmark-96.svg?react';

import {
    actionsStyles,
    bodyStyles,
    errorBlockStyles,
    heroStyles,
    iconSlotStyles,
    listStyles,
    successIconStyles,
    successStyles
} from './ConfirmStep.styles';
import { RecipientName } from './RecipientName';
import { AssetIcon, WalletIcon } from '../../entities';
import { Badge, Button, Icon, List, Modal, Skeleton, TableCell, Text } from '../../shared';

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
            {fiat != null && <span>{fiat.format(formatter)}</span>}
            <Text variant="bodyM" tone="secondary">
                {estimation.fee.amount.format(formatter)}
            </Text>
        </>
    );
};

const MaxAmountLabel: FC<{ amount: CryptoAssetAmount }> = ({ amount }) => {
    const formatter = useNumberFormatter();
    const { data: fiat } = useFiatEquivalent(amount);

    return (
        <>
            <TableCell.Label>{amount.format(formatter)}</TableCell.Label>
            {fiat != null && <TableCell.Label>{fiat.format(formatter)}</TableCell.Label>}
        </>
    );
};

const AmountValue: FC<{ result: SendFormResult; maxAmount: CryptoAssetAmount | undefined }> = ({
    result,
    maxAmount
}) => {
    const t = useTranslate();
    const formatter = useNumberFormatter();

    if (result.isMax) {
        return (
            <>
                <TableCell.Value>{t('confirmation.allAvailableBalance')}</TableCell.Value>
                {maxAmount ? (
                    <MaxAmountLabel amount={maxAmount} />
                ) : (
                    <Skeleton width={64} height={20} />
                )}
            </>
        );
    }

    const cryptoAmount = result.amount.cryptoAssetAmount.format(formatter, { fullPrecision: true });
    const fiatAmount = result.amount.fiatAssetAmount?.format(formatter) ?? null;
    const [primaryAmount, secondaryAmount] = orderAmounts(
        result.amount.inputType,
        cryptoAmount,
        fiatAmount
    );

    return (
        <>
            <TableCell.Value>{primaryAmount}</TableCell.Value>
            {secondaryAmount !== null && <TableCell.Label>{secondaryAmount}</TableCell.Label>}
        </>
    );
};

const ErrorBlock: FC<{ title: string; message: string }> = ({ title, message }) => (
    <div className={errorBlockStyles}>
        <Text variant="labelL" tone="accentRed">
            {title}
        </Text>
        <Text variant="bodyM" tone="accentRed">
            {message}
        </Text>
    </div>
);

export const ConfirmStep: FC<ConfirmStepProps> = props => {
    const { result, onSent, onClose } = props;

    const t = useTranslate();
    const walletMeta = useActiveWalletMeta();
    const wallet = useActiveBtcWallet();
    const isLedger = useActivePortfolio().type === PortfolioType.LEDGER;
    const ledgerIndex = useActivePortfolioLedgerIndex();
    const explorerFactory = useExplorerFactory();
    const { openURL } = useLinking();

    const [sendError, setSendError] = useState<unknown>(null);
    const [sendResult, setSendResult] = useState<SendResult | null>(null);

    const { data: transaction, error: estimationError } = useEstimateAssetTransfer(result, {
        enabled: sendResult === null
    });
    const { mutateAsync: send, isPending: isSending } = useSendAssetTransfer();

    const parseSendError = useParseSendError();
    const parseEstimateError = useParseEstimateError();

    const targetBlock =
        transaction && 'txTargetBlock' in transaction.estimation
            ? Math.max(transaction.estimation.txTargetBlock, 1)
            : undefined;
    const explorerUrl = sendResult?.toExplorerUrl(explorerFactory) ?? null;

    const handleSend = async (): Promise<void> => {
        setSendError(null);

        try {
            const broadcasted = await send(transaction);

            setSendResult(broadcasted);
            onSent();
        } catch (error) {
            if (!(error instanceof LedgerSigningCancelledError)) {
                setSendError(error);
            }
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
                                    {ledgerIndex !== undefined && (
                                        <Badge isUppercase>{ledgerIndex + 1}</Badge>
                                    )}
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
                                <AmountValue
                                    result={result}
                                    maxAmount={transaction?.request.amount}
                                />
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
                                        <Skeleton width={64} height={20} />
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
                                {({ copy }) => (
                                    <>
                                        <TableCell.Column width="label">
                                            <TableCell.Label>
                                                {t('confirmation.sendResult.transaction')}
                                            </TableCell.Label>
                                        </TableCell.Column>
                                        <TableCell.Column>
                                            <TableCell.Value>
                                                {ellipsisMiddle(sendResult.toString(), 6)}
                                            </TableCell.Value>
                                        </TableCell.Column>
                                        <TableCell.Actions>
                                            {explorerUrl && (
                                                <TableCell.Action
                                                    aria-label={t(
                                                        'history.transactionInfo.openInExplorer'
                                                    )}
                                                    onClick={() => openURL(explorerUrl)}
                                                >
                                                    <Icon asset={Globe16} tone="inherit" />
                                                </TableCell.Action>
                                            )}
                                            <TableCell.Action
                                                aria-label={t('actions.copy')}
                                                onClick={copy}
                                            >
                                                <Icon asset={Copy16} tone="inherit" />
                                            </TableCell.Action>
                                        </TableCell.Actions>
                                    </>
                                )}
                            </TableCell>
                        </List.Group>
                    )}
                </List>
            </div>

            <Modal.Actions className={actionsStyles}>
                {sendResult !== null ? (
                    <Button variant="secondary" isFullWidth onClick={onClose}>
                        {t('confirmation.slider.backToWallet')}
                    </Button>
                ) : estimationError ? (
                    <ErrorBlock
                        title={t('confirmation.estimateError.title')}
                        message={parseEstimateError(estimationError)}
                    />
                ) : sendError !== null ? (
                    <ErrorBlock
                        title={t('confirmation.sendError.title')}
                        message={parseSendError(sendError)}
                    />
                ) : (
                    <Button
                        variant="primary"
                        isFullWidth
                        isLoading={isSending}
                        disabled={transaction === undefined}
                        onClick={() => void handleSend()}
                    >
                        {t(
                            isLedger
                                ? 'confirmation.continueWithLedger'
                                : 'confirmation.slider.send'
                        )}
                    </Button>
                )}
            </Modal.Actions>
        </>
    );
};
