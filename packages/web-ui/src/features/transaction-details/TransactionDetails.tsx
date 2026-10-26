import type { FC } from 'react';

import { SPACE } from '@safely/core';
import type { BtcActivityItem } from '@safely/ux';
import { useLinking, useTransactionDetails, useTranslate } from '@safely/ux';
import Copy16 from '@safely/ux/assets/icons/16/copy-16.svg?react';
import Globe16 from '@safely/ux/assets/icons/16/globe-16.svg?react';
import Xmark16 from '@safely/ux/assets/icons/16/xmark-16.svg?react';

import { amountStyles, bodyStyles, heroStyles, tableStyles } from './TransactionDetails.styles';
import { ActivityAvatar } from '../../entities';
import { Button, Icon, List, PageHeader, TableCell, Text } from '../../shared';

const EMPTY_VALUE = '-';

export type TransactionDetailsProps = {
    activity: BtcActivityItem;
    onClose: () => void;
};

export const TransactionDetails: FC<TransactionDetailsProps> = props => {
    const { activity, onClose } = props;

    const t = useTranslate();
    const { openURL } = useLinking();
    const details = useTransactionDetails(activity);

    return (
        <>
            <PageHeader
                isCentered
                title={details.title}
                subtitle={details.confirmedAtLabel ?? undefined}
                leading={
                    <Button
                        variant="secondary"
                        size="xsmall"
                        isIconOnly
                        isRound
                        aria-label={t('common.close')}
                        onClick={onClose}
                    >
                        <Icon asset={Xmark16} />
                    </Button>
                }
            />

            <div className={bodyStyles}>
                <div className={heroStyles}>
                    <ActivityAvatar image={details.assetImage} isInitiator={details.isInitiator} />

                    <div className={amountStyles}>
                        <Text as="p" variant="titleL" align="center">
                            {details.amountSign}
                            {SPACE.THSP}
                            {details.primaryAmount}
                        </Text>
                        {details.secondaryAmount !== null && (
                            <Text as="p" variant="bodyL" tone="secondary" align="center">
                                {details.secondaryAmount}
                            </Text>
                        )}
                    </div>
                </div>

                <List className={tableStyles}>
                    <List.Group variant="divided">
                        <TableCell
                            copyable={details.counterpartyAddress}
                            copiedLabel={t('actions.copied')}
                        >
                            <TableCell.Column width="label">
                                <TableCell.Label>{details.counterpartyLabel}</TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value>
                                    {details.counterpartyAddressLabel}
                                </TableCell.Value>
                            </TableCell.Column>
                        </TableCell>

                        <TableCell>
                            <TableCell.Column width="label">
                                <TableCell.Label>
                                    {t('history.transactionInfo.status.title')}
                                </TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                <TableCell.Value>{details.status.title}</TableCell.Value>
                                <TableCell.Value>
                                    <Text variant="bodyM" tone={details.status.descriptionTone}>
                                        {details.status.description}
                                    </Text>
                                </TableCell.Value>
                            </TableCell.Column>
                        </TableCell>
                    </List.Group>

                    <List.Group variant="divided">
                        <TableCell>
                            <TableCell.Column width="label">
                                <TableCell.Label>
                                    {t('history.transactionInfo.fee')}
                                </TableCell.Label>
                            </TableCell.Column>
                            <TableCell.Column>
                                {details.fee === null ? (
                                    <TableCell.Value>{EMPTY_VALUE}</TableCell.Value>
                                ) : (
                                    <TableCell.Value>
                                        <Text variant="bodyM">{details.fee.formattedFiat}</Text>
                                        <Text variant="bodyM" tone="secondary">
                                            {details.fee.formattedValue}
                                        </Text>
                                    </TableCell.Value>
                                )}
                            </TableCell.Column>
                        </TableCell>

                        <TableCell copyable={details.txid} copiedLabel={t('actions.copied')}>
                            {({ copy }) => (
                                <>
                                    <TableCell.Column width="label">
                                        <TableCell.Label>
                                            {t('history.transactionInfo.hash')}
                                        </TableCell.Label>
                                    </TableCell.Column>
                                    <TableCell.Column>
                                        <TableCell.Value>{details.txidLabel}</TableCell.Value>
                                    </TableCell.Column>
                                    <TableCell.Actions>
                                        <TableCell.Action
                                            aria-label={t('history.transactionInfo.openInExplorer')}
                                            onClick={() => openURL(details.explorerUrl)}
                                        >
                                            <Icon asset={Globe16} tone="inherit" />
                                        </TableCell.Action>
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

                    {details.hasFiatRateNote && (
                        <List.Footer>{t('history.transactionInfo.fiatRateNote')}</List.Footer>
                    )}
                </List>
            </div>
        </>
    );
};
