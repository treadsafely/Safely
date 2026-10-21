import { useTranslation } from 'react-i18next';

import { BTC_ASSET, CryptoAssetAmount } from '@safely/core';
import { useActivePortfolioRate, useNumberFormatter } from '@safely/ux';

import { ActivityItem } from '@mobile/entities/activity';

const DEMO_AMOUNT = new CryptoAssetAmount({ relativeAmount: 0.03, asset: BTC_ASSET });
const DEMO_ADDRESS = 'bc1qra…m2e4c8';
const DEMO_TIMESTAMP_LABEL = '23:45';

export const TransactionHistoryPreview = () => {
    const { t } = useTranslation();
    const formatter = useNumberFormatter();
    const rate = useActivePortfolioRate(BTC_ASSET);

    return (
        <ActivityItem
            title={t('history.transactionInfo.received')}
            amountSign="+"
            formattedValue={DEMO_AMOUNT.format(formatter)}
            valueTone="accentGreen"
            formattedFiat={rate.data ? DEMO_AMOUNT.convert(rate.data).format(formatter) : null}
            timestampLabel={DEMO_TIMESTAMP_LABEL}
            background="tertiary"
            isPending={false}
            counterparty={{ kind: 'address', label: DEMO_ADDRESS }}
        />
    );
};
