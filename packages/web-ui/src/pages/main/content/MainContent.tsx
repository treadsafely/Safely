import type { FC } from 'react';
import { useEffect } from 'react';

import type { ActivityItem } from '@safely/ux';
import { useActivePortfolio } from '@safely/ux';

import { Balance } from './Balance';
import { Header } from './Header';
import { History } from './History';
import { headerStyles } from './MainContent.styles';
import { NewTransactionsBubble, useNewTransactionsBubble } from '../../../features';

export type MainContentProps = {
    selectedActivityKey?: string;
    onSend: () => void;
    onReceive: () => void;
    onScan: () => void;
    onSelectActivity: (activity: ActivityItem) => void;
    onPortfolioChange: () => void;
};

export const MainContent: FC<MainContentProps> = props => {
    const { selectedActivityKey, onSend, onReceive, onScan, onSelectActivity, onPortfolioChange } =
        props;

    const bubble = useNewTransactionsBubble();
    const portfolioId = useActivePortfolio().id.toString();

    useEffect(() => onPortfolioChange(), [portfolioId, onPortfolioChange]);

    return (
        <>
            <div ref={bubble.topRef} />

            <div className={headerStyles}>
                <Header />
                <Balance onSend={onSend} onReceive={onReceive} onScan={onScan} />
                <NewTransactionsBubble mode={bubble.mode} onClick={bubble.scrollToTop} />
            </div>

            <History
                selectedActivityKey={selectedActivityKey}
                onSelectActivity={onSelectActivity}
                onReceive={onReceive}
                onNewActivity={bubble.show}
            />
        </>
    );
};
