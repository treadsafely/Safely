import { useTranslation } from 'react-i18next';

import { BTC_ASSET, CryptoAssetAmount } from '@safely/core';
import {
    resolveSentAmount,
    useActivePortfolioRate,
    useNumberFormatter,
    useShowFullSentAmount
} from '@safely/ux';

import { ActivityItem } from '@mobile/entities/activity';

const DEMO_VALUE = new CryptoAssetAmount({ relativeAmount: 0.03, asset: BTC_ASSET });
const DEMO_FEE = new CryptoAssetAmount({ relativeAmount: 0.00000073, asset: BTC_ASSET });
const DEMO_ADDRESS = 'bc1qra…m2e4c8';
const DEMO_TIMESTAMP_LABEL = '23:45';

export const SentAmountPreview = () => {
    const { t } = useTranslation();
    const formatter = useNumberFormatter();
    const rate = useActivePortfolioRate(BTC_ASSET);
    const showFullSentAmount = useShowFullSentAmount();

    const { amount, isFullPrecision } = resolveSentAmount({
        isInitiator: true,
        value: DEMO_VALUE,
        fee: DEMO_FEE,
        showFullSentAmount
    });

    return (
        <ActivityItem
            title={t('history.transactionInfo.sent')}
            amountSign="−"
            formattedValue={amount.format(formatter, { fullPrecision: isFullPrecision })}
            valueTone="primary"
            formattedFiat={rate.data ? amount.convert(rate.data).format(formatter) : null}
            timestampLabel={DEMO_TIMESTAMP_LABEL}
            background="tertiary"
            isPending={false}
            counterparty={{ kind: 'address', label: DEMO_ADDRESS }}
        />
    );
};
