import type { FC } from 'react';
import { useEffect } from 'react';

import type { FlameHistoryItem } from '@safely/core';
import type { BtcHistoryItem } from '@safely/ux';
import { useActivePortfolio, useActivePortfolioWallets } from '@safely/ux';

import { Balance } from './Balance';
import { Header } from './Header';
import { History } from './History';
import { chartStyles, headerStyles } from './MainContent.styles';
import { Chart, NewTransactionsBubble, useNewTransactionsBubble } from '../../../features';

export type MainContentProps = {
    selectedActivityKey?: string;
    onSend: () => void;
    onReceive: () => void;
    onScan: () => void;
    onSelectBtcActivity: (activity: BtcHistoryItem) => void;
    onSelectFlameActivity: (activity: FlameHistoryItem) => void;
    onPortfolioChange: () => void;
};

export const MainContent: FC<MainContentProps> = props => {
    const {
        selectedActivityKey,
        onSend,
        onReceive,
        onScan,
        onSelectBtcActivity,
        onSelectFlameActivity,
        onPortfolioChange
    } = props;

    const bubble = useNewTransactionsBubble();
    const portfolioId = useActivePortfolio().id.toString();
    const wallets = useActivePortfolioWallets();

    useEffect(() => onPortfolioChange(), [portfolioId, onPortfolioChange]);

    return (
        <>
            <div ref={bubble.topRef} />

            <div className={headerStyles}>
                <Header />
                <Balance onSend={onSend} onReceive={onReceive} onScan={onScan} />
                <NewTransactionsBubble mode={bubble.mode} onClick={bubble.scrollToTop} />
            </div>

            {wallets.btc !== null && (
                <div className={chartStyles}>
                    <Chart />
                </div>
            )}

            <History
                wallets={wallets}
                selectedActivityKey={selectedActivityKey}
                onSelectBtcActivity={onSelectBtcActivity}
                onSelectFlameActivity={onSelectFlameActivity}
                onReceive={onReceive}
                onNewActivity={bubble.show}
            />
        </>
    );
};
