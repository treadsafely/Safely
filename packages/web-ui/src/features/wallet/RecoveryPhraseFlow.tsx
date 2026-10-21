import type { FC } from 'react';
import { useRef, useState } from 'react';

import type { Portfolio } from '@safely/core';
import { PortfolioType } from '@safely/core';
import {
    SecurityCheckCancelledError,
    useErrorToast,
    useRecordActivePortfolioSecretReveal
} from '@safely/ux';

import { RecoveryConfirmModal } from './RecoveryConfirmModal';
import { RecoveryPhraseModal } from './RecoveryPhraseModal';

export type RecoveryPhraseFlowProps = {
    portfolio: Portfolio;
    onClose: () => void;
};

export const RecoveryPhraseFlow: FC<RecoveryPhraseFlowProps> = props => {
    const { portfolio, onClose } = props;

    const { mutateAsync: recordSecretReveal } = useRecordActivePortfolioSecretReveal();
    const errorToast = useErrorToast({});

    const mnemonic = useRef<string[] | null>(null);
    const [isRevealed, setIsRevealed] = useState(false);

    const handleReveal = async (): Promise<void> => {
        if (portfolio.type !== PortfolioType.BIP39) {
            return;
        }

        try {
            mnemonic.current = await portfolio.getMnemonic();
        } catch (error) {
            if (!(error instanceof SecurityCheckCancelledError)) {
                errorToast(error);
            }

            return;
        }

        setIsRevealed(true);

        void recordSecretReveal().catch(errorToast);
    };

    const handleClose = (): void => {
        mnemonic.current = null;
        onClose();
    };

    if (!isRevealed || mnemonic.current === null) {
        return <RecoveryConfirmModal onReveal={() => void handleReveal()} onClose={handleClose} />;
    }

    return <RecoveryPhraseModal mnemonic={mnemonic.current} onClose={handleClose} />;
};
