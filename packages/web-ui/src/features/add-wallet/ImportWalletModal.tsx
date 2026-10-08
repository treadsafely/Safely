import type { FC, KeyboardEvent } from 'react';

import { sanitizeSeedPhraseInput, useImportSeedPhrase, useTranslate } from '@safely/ux';

import { bodyStyles, errorStyles, fieldStyles, popupStyles } from './ImportWalletModal.styles';
import { Button, Input, Modal, ScreenProtection, Text } from '../../shared';

export type ImportWalletModalProps = {
    onSubmit: (mnemonic: string[]) => void;
    onClose: () => void;
};

export const ImportWalletModal: FC<ImportWalletModalProps> = props => {
    const { onSubmit, onClose } = props;

    const t = useTranslate();
    const { value, error, isDirty, onChange, handleSubmit } = useImportSeedPhrase({ onSubmit });

    const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSubmit();
        }
    };

    return (
        <ScreenProtection>
            <Modal open disablePointerDismissal onOpenChange={isOpen => !isOpen && onClose()}>
                <Modal.Popup
                    className={popupStyles}
                    hasClose={false}
                    closeLabel={t('common.close')}
                >
                    <Modal.Header closeLabel={t('common.close')}>
                        <Button
                            variant="primary"
                            size="small"
                            disabled={!isDirty}
                            onClick={handleSubmit}
                        >
                            {t('common.continue')}
                        </Button>
                    </Modal.Header>

                    <Modal.Content hasFloatingClose={false}>
                        <Modal.Title>{t('onboarding.importWallet.title')}</Modal.Title>
                        <Modal.Description>
                            {t('onboarding.importWallet.description')}
                        </Modal.Description>
                    </Modal.Content>

                    <div className={bodyStyles}>
                        <Input invalid={Boolean(error)}>
                            <Input.Field
                                autoFocus
                                isMultiline
                                className={fieldStyles}
                                value={value}
                                placeholder={t('onboarding.importWallet.placeholder')}
                                autoComplete="off"
                                spellCheck={false}
                                onChange={event =>
                                    onChange(sanitizeSeedPhraseInput(event.target.value))
                                }
                                onKeyDown={onKeyDown}
                            />
                        </Input>

                        {error !== null && (
                            <Text variant="bodyM" tone="accentRed" className={errorStyles}>
                                {error}
                            </Text>
                        )}
                    </div>
                </Modal.Popup>
            </Modal>
        </ScreenProtection>
    );
};
