import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ITreeStorage } from '@safely/core';
import { useAppContext } from '@safely/ux';
import Pencil16 from '@safely/ux/assets/icons/16/pencil-16.svg?react';
import Plus16 from '@safely/ux/assets/icons/16/plus-16.svg?react';
import Xmark16 from '@safely/ux/assets/icons/16/xmark-16.svg?react';
import { css } from '@safely/web-ui/styled-system/css';

import { columnStyles, rowStyles, sectionStyles } from './DevToolsSettings.styles';
import type { KeychainEntryDraft } from './KeychainEntryModal';
import { KeychainEntryModal } from './KeychainEntryModal';
import { Banner, Button, Cell, Icon, List, Modal, Spinner, Text } from '../../../shared';

const SCOPES = ['encrypted', 'secureEncrypted'] as const;

type Scope = (typeof SCOPES)[number];

type KeychainEntry = {
    key: string;
    value: string | null;
    error: string | null;
};

const NEW_DRAFT: KeychainEntryDraft = { isExisting: false, key: '', value: '' };

const rowActionsStyles = css({ gap: '8' });

function describeError(cause: unknown): string {
    return cause instanceof Error ? cause.message : 'unknown failure';
}

function describeValue(entry: KeychainEntry): string {
    if (entry.error !== null) {
        return `read failed: ${entry.error}`;
    }

    return entry.value === null ? '(gone)' : entry.value;
}

async function readEntries(storage: ITreeStorage): Promise<KeychainEntry[]> {
    const keys = await storage.getOwnKeys();

    return Promise.all(
        [...keys].sort().map(async key => {
            try {
                return { key, value: await storage.getItem(key), error: null };
            } catch (cause) {
                return { key, value: null, error: describeError(cause) };
            }
        })
    );
}

export const KeychainSection: FC = () => {
    const { storage: appStorage } = useAppContext();

    const [scope, setScope] = useState<Scope>('encrypted');
    const [entries, setEntries] = useState<KeychainEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(true);
    const [draft, setDraft] = useState<KeychainEntryDraft>(NEW_DRAFT);
    const [isDraftOpen, setIsDraftOpen] = useState(false);
    const [isClearOpen, setIsClearOpen] = useState(false);

    const storage = useMemo<ITreeStorage>(() => {
        if (scope === 'encrypted') {
            return appStorage.sync.encrypted;
        }

        const secure = appStorage.sync.getSecureEncrypted();

        /* nothing can prove user presence yet, so the gate would reject every read and write */
        secure.UNSAFE_SKIP_SECURITY_CHECK_unlock();

        return secure;
    }, [appStorage, scope]);

    const refresh = useCallback(async (): Promise<void> => {
        setIsBusy(true);
        setError(null);

        try {
            setEntries(await readEntries(storage));
        } catch (cause) {
            setEntries([]);
            setError(describeError(cause));
        } finally {
            setIsBusy(false);
        }
    }, [storage]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    /* the refresh clears the error, so a failed mutation has to report after it */
    const mutate = (operation: () => Promise<void>): void => {
        setIsBusy(true);

        void (async () => {
            let failure: string | null = null;

            try {
                await operation();
            } catch (cause) {
                failure = describeError(cause);
            }

            await refresh();

            if (failure !== null) {
                setError(failure);
            }
        })();
    };

    const openDraft = (entry: KeychainEntry | null): void => {
        setDraft(
            entry === null
                ? NEW_DRAFT
                : { isExisting: true, key: entry.key, value: entry.value ?? '' }
        );
        setIsDraftOpen(true);
    };

    const saveDraft = (): void => {
        setIsDraftOpen(false);
        mutate(() => storage.setItem(draft.key, draft.value));
    };

    return (
        <section className={sectionStyles}>
            <Text variant="labelS" tone="tertiary">
                SECRET STORE
            </Text>

            <div className={columnStyles}>
                <div className={rowStyles}>
                    {SCOPES.map(name => (
                        <Button
                            key={name}
                            size="medium"
                            variant={name === scope ? 'primary' : 'secondary'}
                            onClick={() => setScope(name)}
                        >
                            {name}
                        </Button>
                    ))}
                </div>

                <div className={rowStyles}>
                    <Button
                        size="medium"
                        iconLeft={<Icon asset={Plus16} />}
                        onClick={() => openDraft(null)}
                    >
                        Add entry
                    </Button>

                    <Button size="medium" variant="secondary" onClick={() => void refresh()}>
                        Refresh
                    </Button>

                    <Button
                        size="medium"
                        variant="destructive"
                        disabled={entries.length === 0}
                        onClick={() => setIsClearOpen(true)}
                    >
                        Delete all
                    </Button>

                    {isBusy && <Spinner />}
                </div>

                {error !== null && (
                    <Banner tone="danger">
                        <Banner.Content>
                            <Banner.Text>{error}</Banner.Text>
                        </Banner.Content>
                    </Banner>
                )}

                <List>
                    <List.Group>
                        {entries.length === 0 ? (
                            <Cell>
                                <Cell.Content>
                                    <Cell.Subtitle>No entries in this store</Cell.Subtitle>
                                </Cell.Content>
                            </Cell>
                        ) : (
                            entries.map(entry => (
                                /* no onClick on the Cell: its root would become a button around these */
                                <Cell key={entry.key}>
                                    <Cell.Content>
                                        <Cell.Title>{entry.key}</Cell.Title>
                                        <Cell.Subtitle>{describeValue(entry)}</Cell.Subtitle>
                                    </Cell.Content>

                                    <Cell.Trailing className={rowActionsStyles}>
                                        <Button
                                            variant="secondary"
                                            size="small"
                                            isIconOnly
                                            aria-label={`Edit ${entry.key}`}
                                            onClick={() => openDraft(entry)}
                                        >
                                            <Icon asset={Pencil16} />
                                        </Button>

                                        <Button
                                            variant="destructive"
                                            size="small"
                                            isIconOnly
                                            aria-label={`Delete ${entry.key}`}
                                            onClick={() =>
                                                mutate(() => storage.removeItem(entry.key))
                                            }
                                        >
                                            <Icon asset={Xmark16} />
                                        </Button>
                                    </Cell.Trailing>
                                </Cell>
                            ))
                        )}
                    </List.Group>

                    <List.Footer>{`${scope}/sync · ${entries.length} entries`}</List.Footer>
                </List>
            </div>

            <KeychainEntryModal
                isOpen={isDraftOpen}
                draft={draft}
                onChange={setDraft}
                onSave={saveDraft}
                onClose={() => setIsDraftOpen(false)}
            />

            <Modal open={isClearOpen} onOpenChange={setIsClearOpen}>
                <Modal.Popup closeLabel="Close">
                    <Modal.Content>
                        <Modal.Title>{`Delete every ${scope}/sync entry?`}</Modal.Title>
                        <Modal.Description>
                            Every keychain item the app keeps under this node is removed. Only what
                            is backed up elsewhere can be restored.
                        </Modal.Description>
                    </Modal.Content>

                    <Modal.Actions>
                        <Button
                            variant="destructive"
                            isFullWidth
                            onClick={() => {
                                setIsClearOpen(false);
                                mutate(() => storage.clear());
                            }}
                        >
                            Delete all
                        </Button>

                        <Modal.Close
                            render={
                                <Button variant="secondary" isFullWidth>
                                    Cancel
                                </Button>
                            }
                        />
                    </Modal.Actions>
                </Modal.Popup>
            </Modal>
        </section>
    );
};
