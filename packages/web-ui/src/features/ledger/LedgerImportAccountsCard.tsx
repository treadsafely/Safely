import type { FC } from 'react';

import type { BtcAssetAmount, LedgerAccount } from '@safely/core';
import { LEDGER_ACCOUNT_COUNT, useToast, useTranslate } from '@safely/ux';

import { LedgerAccountCell } from './LedgerAccountCell';
import { submitStyles } from './LedgerCard.styles';
import {
    captionStyles,
    columnStyles,
    linkStyles,
    scrollStyles
} from './LedgerImportAccountsCard.styles';
import { Button, List, Modal, StepCard, Text } from '../../shared';

const SKELETON_ACCOUNTS = Array.from({ length: LEDGER_ACCOUNT_COUNT }, (_, index) => index);

export type LedgerImportAccountsCardProps = {
    hasBackdrop?: boolean;
    accounts: LedgerAccount[];
    balances: (BtcAssetAmount | undefined)[];
    selectedIndexes: Set<number>;
    existingNames?: Map<number, string>;
    isDerived: boolean;
    showRetry: boolean;
    isContinueDisabled: boolean;
    onToggle: (index: number) => void;
    onPrimary: () => void;
    onBack: () => void;
};

export const LedgerImportAccountsCard: FC<LedgerImportAccountsCardProps> = props => {
    const {
        hasBackdrop = true,
        accounts,
        balances,
        selectedIndexes,
        existingNames,
        isDerived,
        showRetry,
        isContinueDisabled,
        onToggle,
        onPrimary,
        onBack
    } = props;

    const t = useTranslate();
    const toast = useToast();

    return (
        <StepCard hasShadow={hasBackdrop} hasBackdrop={hasBackdrop} onBack={onBack}>
            <div className={columnStyles}>
                <Modal.Content hasFloatingClose={false}>
                    <Modal.Title>{t('addWallet.connectLedger.importAccounts.title')}</Modal.Title>
                    <Modal.Description>
                        {t('addWallet.connectLedger.importAccounts.subtitle')}
                    </Modal.Description>
                </Modal.Content>

                <div className={scrollStyles}>
                    <List>
                        <List.Group variant="divided">
                            {isDerived
                                ? accounts.map((account, i) => (
                                      <LedgerAccountCell
                                          key={account.index}
                                          account={account}
                                          balance={balances[i]}
                                          isSelected={selectedIndexes.has(account.index)}
                                          name={existingNames?.get(account.index)}
                                          onToggle={() => onToggle(account.index)}
                                      />
                                  ))
                                : SKELETON_ACCOUNTS.map(index => (
                                      <LedgerAccountCell
                                          key={index}
                                          account={{ index }}
                                          isSkeleton
                                      />
                                  ))}
                        </List.Group>
                    </List>

                    {isDerived && (
                        <Text
                            variant="bodyM"
                            tone="tertiary"
                            align="center"
                            className={captionStyles}
                        >
                            {t('addWallet.connectLedger.importAccounts.featureNote')}
                            <Text
                                variant="bodyM"
                                tone="secondary"
                                className={linkStyles}
                                onClick={() =>
                                    toast(
                                        t('addWallet.connectLedger.importAccounts.featureRequested')
                                    )
                                }
                            >
                                {t('addWallet.connectLedger.importAccounts.featureRequest')}
                            </Text>
                        </Text>
                    )}
                </div>

                <div className={submitStyles}>
                    <Button
                        variant={showRetry ? 'secondary' : 'primary'}
                        size="small"
                        disabled={isContinueDisabled}
                        onClick={onPrimary}
                    >
                        {showRetry
                            ? t('addWallet.connectLedger.importAccounts.takingTooLong')
                            : t('common.continue')}
                    </Button>
                </div>
            </div>
        </StepCard>
    );
};
