import type { FC } from 'react';

import { useImportSeedPhrase, useTranslate } from '@safely/ux';

import { ImportWalletForm } from './ImportWalletForm';
import { bodyStyles, submitStyles } from './ImportWalletModal.styles';
import { Button, Modal, ScreenProtection, StepCard } from '../../shared';

export type ImportWalletModalProps = {
    hasBackdrop?: boolean;
    onSubmit: (mnemonic: string[]) => void;
    onBack: () => void;
};

export const ImportWalletModal: FC<ImportWalletModalProps> = props => {
    const { hasBackdrop = true, onSubmit, onBack } = props;

    const t = useTranslate();
    const { value, error, isDirty, onChange, handleSubmit } = useImportSeedPhrase({ onSubmit });

    return (
        <ScreenProtection>
            <StepCard hasShadow={hasBackdrop} hasBackdrop={hasBackdrop} onBack={onBack}>
                <Modal.Content hasFloatingClose={false}>
                    <Modal.Title>{t('onboarding.importWallet.title')}</Modal.Title>
                    <Modal.Description>
                        {t('onboarding.importWallet.description')}
                    </Modal.Description>
                </Modal.Content>

                <div className={bodyStyles}>
                    <ImportWalletForm
                        value={value}
                        error={error}
                        onChange={onChange}
                        onSubmit={handleSubmit}
                    />
                </div>

                <div className={submitStyles}>
                    <Button
                        variant="primary"
                        size="small"
                        disabled={!isDirty}
                        onClick={handleSubmit}
                    >
                        {t('common.continue')}
                    </Button>
                </div>
            </StepCard>
        </ScreenProtection>
    );
};
