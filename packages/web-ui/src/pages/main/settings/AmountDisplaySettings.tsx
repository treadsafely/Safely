import type { FC, ReactNode } from 'react';

import { BTC_ASSET, CryptoAssetAmount } from '@safely/core';
import type { AmountUnit } from '@safely/ux';
import {
    resolveSentAmount,
    useActivePortfolioRate,
    useNumberFormatter,
    useSetShowFullSentAmount,
    useSetTransactionHistoryAmountOrder,
    useShowFullSentAmount,
    useTransactionHistoryAmountOrder,
    useTranslate
} from '@safely/ux';
import ArrowLeft16 from '@safely/ux/assets/icons/16/arrow-left-16.svg?react';

import { previewCardStyles, previewStyles } from './AmountDisplaySettings.styles';
import { listStyles } from './SettingsSection.styles';
import { ActivityItem } from '../../../entities';
import { Button, Cell, Icon, List, PageHeader, Switch, Text } from '../../../shared';

const AMOUNT_ORDERS: AmountUnit[] = ['crypto', 'fiat'];

const DEMO_VALUE = new CryptoAssetAmount({ relativeAmount: 0.03, asset: BTC_ASSET });
const DEMO_FEE = new CryptoAssetAmount({ relativeAmount: 0.00000073, asset: BTC_ASSET });
const DEMO_ADDRESS = 'bc1qra…m2e4c8';
const DEMO_TIMESTAMP_LABEL = '23:45';

const Preview: FC<{ children: ReactNode }> = ({ children }) => (
    <div className={previewStyles}>
        <div className={previewCardStyles}>{children}</div>
    </div>
);

const TransactionHistoryPreview: FC = () => {
    const t = useTranslate();
    const formatter = useNumberFormatter();
    const { data: rate } = useActivePortfolioRate(BTC_ASSET);

    return (
        <ActivityItem
            tone="tertiary"
            title={t('history.transactionInfo.received')}
            amountSign="+"
            formattedValue={DEMO_VALUE.format(formatter)}
            valueTone="accentGreen"
            formattedFiat={rate ? DEMO_VALUE.convert(rate).format(formatter) : null}
            timestampLabel={DEMO_TIMESTAMP_LABEL}
            isPending={false}
            counterparty={{ kind: 'address', label: DEMO_ADDRESS }}
        />
    );
};

const SentAmountPreview: FC = () => {
    const t = useTranslate();
    const formatter = useNumberFormatter();
    const { data: rate } = useActivePortfolioRate(BTC_ASSET);
    const showFullSentAmount = useShowFullSentAmount();

    const { amount, isFullPrecision } = resolveSentAmount({
        isInitiator: true,
        value: DEMO_VALUE,
        fee: DEMO_FEE,
        showFullSentAmount
    });

    return (
        <ActivityItem
            tone="tertiary"
            title={t('history.transactionInfo.sent')}
            amountSign="−"
            formattedValue={amount.format(formatter, { fullPrecision: isFullPrecision })}
            valueTone="primary"
            formattedFiat={rate ? amount.convert(rate).format(formatter) : null}
            timestampLabel={DEMO_TIMESTAMP_LABEL}
            isPending={false}
            counterparty={{ kind: 'address', label: DEMO_ADDRESS }}
        />
    );
};

export type AmountDisplaySettingsProps = {
    onBack: () => void;
};

export const AmountDisplaySettings: FC<AmountDisplaySettingsProps> = props => {
    const t = useTranslate();

    const amountOrder = useTransactionHistoryAmountOrder();
    const setAmountOrder = useSetTransactionHistoryAmountOrder();

    const showFullSentAmount = useShowFullSentAmount();
    const setShowFullSentAmount = useSetShowFullSentAmount();

    return (
        <>
            <PageHeader
                isCentered
                hasDivider
                title={t('amountDisplay.title')}
                leading={
                    <Button
                        variant="secondary"
                        size="xsmall"
                        isIconOnly
                        isRound
                        aria-label={t('common.back')}
                        onClick={props.onBack}
                    >
                        <Icon asset={ArrowLeft16} />
                    </Button>
                }
            />

            <List className={listStyles}>
                <List.Title>{t('amountDisplay.transactionHistory.title')}</List.Title>
                <List.Group variant="separated">
                    {AMOUNT_ORDERS.map(order => (
                        <Cell
                            key={order}
                            isSelected={amountOrder === order}
                            onClick={() => setAmountOrder(order)}
                        >
                            <Cell.Content>
                                <Cell.Title>{t(`amountDisplay.options.${order}`)}</Cell.Title>
                            </Cell.Content>
                            {amountOrder === order && <Cell.Checkmark />}
                        </Cell>
                    ))}

                    <Preview>
                        <TransactionHistoryPreview />
                    </Preview>
                </List.Group>
                <List.Footer>
                    {t('amountDisplay.transactionHistory.footer')}{' '}
                    <Text variant="bodyM" tone="secondary">
                        {t('amountDisplay.transactionHistory.footerRates')}
                    </Text>
                </List.Footer>

                <List.Title>{t('amountDisplay.transactionAmounts.title')}</List.Title>
                <List.Group variant="separated">
                    <Cell>
                        <Cell.Content>
                            <Cell.Title>
                                {t('amountDisplay.transactionAmounts.showFull.title')}
                            </Cell.Title>
                            <Cell.Subtitle>
                                {t('amountDisplay.transactionAmounts.showFull.subtitle')}
                            </Cell.Subtitle>
                        </Cell.Content>
                        <Cell.Trailing>
                            <Switch
                                checked={showFullSentAmount}
                                onCheckedChange={setShowFullSentAmount}
                            />
                        </Cell.Trailing>
                    </Cell>

                    <Preview>
                        <SentAmountPreview />
                    </Preview>
                </List.Group>
            </List>
        </>
    );
};
