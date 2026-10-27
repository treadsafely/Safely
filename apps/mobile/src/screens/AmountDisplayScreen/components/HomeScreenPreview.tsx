import { BTC_ASSET, CryptoAssetAmount } from '@safely/core';
import { useMainnetRate, useActiveWalletBtcBalance, useActivePortfolioWallets } from '@safely/ux';

import { AssetCell, BtcAssetCell } from '@mobile/entities/asset';

const DEMO_BALANCE = new CryptoAssetAmount({ relativeAmount: 0.25, asset: BTC_ASSET });

const BtcPreview = () => {
    const balance = useActiveWalletBtcBalance();
    const rate = useMainnetRate(BTC_ASSET);

    const displayBalance = balance.data?.display;
    const amount = displayBalance && displayBalance.weiAmount > 0n ? displayBalance : DEMO_BALANCE;

    return (
        <BtcAssetCell
            cryptoAssetAmount={amount}
            price={rate.data}
            showDivider={false}
            background="tertiary"
        />
    );
};

const DemoPreview = () => {
    const rate = useMainnetRate(BTC_ASSET);

    return (
        <AssetCell
            cryptoAssetAmount={DEMO_BALANCE}
            price={rate.data}
            image={{ type: 'image', image: BTC_ASSET.image }}
            showDivider={false}
            background="tertiary"
        />
    );
};

export const HomeScreenPreview = () => {
    const hasBtc = useActivePortfolioWallets().btc !== null;

    return hasBtc ? <BtcPreview /> : <DemoPreview />;
};
