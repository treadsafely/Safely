import type { FC } from 'react';
import { useState } from 'react';

import { useTranslate } from '@safely/ux';
import Lock56 from '@safely/ux/assets/icons/56/lock-56.svg?react';

import { Button, Modal, NoticeScreen } from '../../shared';

export type SecretStoreGateState = 'unsupported' | 'cancelled' | 'lost' | 'mismatch' | 'failed';

export type SecretStoreGatePageProps = {
    state: SecretStoreGateState;
    onRetry: () => void;
    onErase?: () => Promise<void>;
};

const COPY = {
    unsupported: {
        title: 'secretStore.unsupported.title',
        description: 'secretStore.unsupported.description'
    },
    cancelled: {
        title: 'secretStore.cancelled.title',
        description: 'secretStore.cancelled.description'
    },
    lost: { title: 'secretStore.lost.title', description: 'secretStore.lost.description' },
    mismatch: {
        title: 'secretStore.mismatch.title',
        description: 'secretStore.mismatch.description'
    },
    failed: { title: 'secretStore.failed.title', description: 'secretStore.failed.description' }
} as const;

export const SecretStoreGatePage: FC<SecretStoreGatePageProps> = props => {
    const { state, onRetry, onErase } = props;

    const t = useTranslate();
    const [isConfirming, setIsConfirming] = useState(false);
    const [isErasing, setIsErasing] = useState(false);

    const erase = (): void => {
        if (onErase === undefined) {
            return;
        }

        setIsErasing(true);
        void onErase().finally(() => setIsErasing(false));
    };

    return (
        <NoticeScreen
            icon={Lock56}
            title={t(COPY[state].title)}
            description={t(COPY[state].description)}
            actions={
                <>
                    <Button variant="primary" isFullWidth onClick={onRetry}>
                        {t('secretStore.retry')}
                    </Button>
                    {onErase !== undefined && (
                        <Button
                            variant="secondary"
                            isFullWidth
                            isLoading={isErasing}
                            onClick={() => setIsConfirming(true)}
                        >
                            {t('secretStore.erase')}
                        </Button>
                    )}
                </>
            }
        >
            {isConfirming && (
                <Modal open onOpenChange={isOpen => !isOpen && setIsConfirming(false)}>
                    <Modal.Popup closeLabel={t('common.close')}>
                        <Modal.Content>
                            <Modal.Title>{t('secretStore.confirm.title')}</Modal.Title>
                            <Modal.Description>
                                {t('secretStore.confirm.message')}
                            </Modal.Description>
                        </Modal.Content>

                        <Modal.Actions>
                            <Button
                                variant="destructive"
                                isFullWidth
                                onClick={() => {
                                    setIsConfirming(false);
                                    erase();
                                }}
                            >
                                {t('secretStore.confirm.confirm')}
                            </Button>
                            <Button
                                variant="secondary"
                                isFullWidth
                                onClick={() => setIsConfirming(false)}
                            >
                                {t('secretStore.confirm.cancel')}
                            </Button>
                        </Modal.Actions>
                    </Modal.Popup>
                </Modal>
            )}
        </NoticeScreen>
    );
};
