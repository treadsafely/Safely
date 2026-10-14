import type { FC } from 'react';

import { useTranslate } from '@safely/ux';

import { useWatchAccountForm } from './useWatchAccountForm';
import { WatchAccountForm } from './WatchAccountForm';
import { bannerStyles, bodyStyles, submitStyles } from './WatchAccountModal.styles';
import { Banner, Button, Modal, StepCard } from '../../shared';

export type WatchAccountModalProps = {
    hasBackdrop?: boolean;
    onSubmit: (input: string) => void;
    onBack: () => void;
};

export const WatchAccountModal: FC<WatchAccountModalProps> = props => {
    const { hasBackdrop = true, onSubmit, onBack } = props;

    const t = useTranslate();
    const form = useWatchAccountForm();

    const submit = (): void => onSubmit(form.input);

    return (
        <StepCard hasShadow={hasBackdrop} hasBackdrop={hasBackdrop} onBack={onBack}>
            <Modal.Content hasFloatingClose={false}>
                <Modal.Title>{t('addWallet.watchAccount.title')}</Modal.Title>
                <Modal.Description>{t('addWallet.watchAccount.subtitle')}</Modal.Description>
            </Modal.Content>

            <div className={bodyStyles}>
                <WatchAccountForm form={form} onSubmit={submit} />

                <Banner className={bannerStyles}>
                    <Banner.Content>
                        <Banner.Text>{t('addWallet.watchAccount.info')}</Banner.Text>
                    </Banner.Content>
                </Banner>
            </div>

            <div className={submitStyles}>
                <Button variant="primary" size="small" disabled={!form.isValid} onClick={submit}>
                    {t('common.continue')}
                </Button>
            </div>
        </StepCard>
    );
};
