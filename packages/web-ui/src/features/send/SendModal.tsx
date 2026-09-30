import type { FC } from 'react';
import { useRef, useState } from 'react';

import { ellipsisMiddle } from '@safely/core';
import type { SendFormResult, SendFormView } from '@safely/ux';
import { useActivePortfolio, useSendForm, useTranslate } from '@safely/ux';

import { AmountStep } from './AmountStep';
import { ConfirmStep } from './ConfirmStep';
import { RecipientStep } from './RecipientStep';
import { SendHeader } from './SendHeader';
import { bodyStyles, popupStyles, subtitleStyles } from './SendModal.styles';
import { PortfolioTypeBadge } from '../../entities';
import { Modal, Text } from '../../shared';

export type SendModalProps = {
    onClose: () => void;
};

function resolveNext(view: SendFormView): (() => void) | undefined {
    return 'next' in view ? view.next : undefined;
}

export const SendModal: FC<SendModalProps> = props => {
    const { onClose } = props;

    const t = useTranslate();
    const portfolio = useActivePortfolio();

    const [result, setResult] = useState<SendFormResult | null>(null);
    const [isSent, setIsSent] = useState(false);
    const onSubmitted = useRef<(() => void) | null>(null);

    const view = useSendForm({
        shouldResetForm: false,
        onSubmit: (formResult, onSuccess) => {
            onSubmitted.current = onSuccess;
            setResult(formResult);
        }
    });

    const backToEditing = (): void => {
        setResult(null);

        if (view.state === 'submitted') {
            view.backToEditing();
        }
    };

    const fromMeta =
        view.state === 'recipient' || view.state === 'amount' ? view.fromMeta : undefined;
    const recipient = view.state === 'amount' ? view.parsed.recipient.address : undefined;
    const recipientAlias = view.state === 'amount' ? view.recipientMeta?.meta.name : undefined;

    const subtitle =
        fromMeta === undefined ? undefined : (
            <span className={subtitleStyles}>
                <Text variant="bodyM" tone="secondary">
                    {recipient === undefined
                        ? `${t('send.from')} ${fromMeta.name}`
                        : `${fromMeta.name} → ${recipientAlias === undefined ? '' : `${recipientAlias} `}${ellipsisMiddle(recipient, 6)}`}
                </Text>
                <PortfolioTypeBadge type={portfolio.type} tone="warning" />
            </span>
        );

    return (
        <Modal open onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} hasClose={false} closeLabel={t('common.close')}>
                {result === null ? (
                    <>
                        <SendHeader
                            subtitle={subtitle}
                            onNext={resolveNext(view)}
                            onBack={view.state === 'amount' ? view.prev : undefined}
                        />

                        <div className={bodyStyles}>
                            {view.state === 'recipient' && <RecipientStep view={view} />}
                            {view.state === 'amount' && <AmountStep view={view} />}
                        </div>
                    </>
                ) : (
                    <>
                        <SendHeader
                            hasNext={false}
                            hasClose={false}
                            onBack={isSent ? undefined : backToEditing}
                        />

                        <ConfirmStep
                            result={result}
                            onSent={() => {
                                setIsSent(true);
                                onSubmitted.current?.();
                            }}
                            onClose={onClose}
                        />
                    </>
                )}
            </Modal.Popup>
        </Modal>
    );
};
