import type { FC } from 'react';

import type { Portfolio } from '@safely/core';
import { usePortfolios, useTranslate } from '@safely/ux';

import { listStyles, popupStyles } from './SelectWalletModal.styles';
import { WalletCell } from '../../entities';
import { List, Modal } from '../../shared';

export type SelectWalletModalProps = {
    activePortfolioId: Portfolio['id'];
    onSelect: (portfolio: Portfolio) => void;
    onClose: () => void;
};

export const SelectWalletModal: FC<SelectWalletModalProps> = props => {
    const { activePortfolioId, onSelect, onClose } = props;

    const t = useTranslate();
    const portfolios = usePortfolios();

    return (
        <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')}>
                <Modal.Content>
                    <Modal.Title>{t('accounts.title')}</Modal.Title>
                </Modal.Content>

                <List className={listStyles}>
                    <List.Group variant="separated">
                        {portfolios.map(portfolio => (
                            <WalletCell
                                key={portfolio.id.toString()}
                                portfolio={portfolio}
                                isActive={portfolio.id.isEq(activePortfolioId)}
                                onSelect={() => onSelect(portfolio)}
                            />
                        ))}
                    </List.Group>
                </List>
            </Modal.Popup>
        </Modal>
    );
};
