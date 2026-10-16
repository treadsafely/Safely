import type { FC } from 'react';

import { css } from '@safely/web-ui/styled-system/css';

import { Button, Input, Modal } from '../../../shared';

export type KeychainEntryDraft = {
    isExisting: boolean;
    key: string;
    value: string;
};

export type KeychainEntryModalProps = {
    isOpen: boolean;
    draft: KeychainEntryDraft;
    onChange: (draft: KeychainEntryDraft) => void;
    onSave: () => void;
    onClose: () => void;
};

const formStyles = css({ display: 'flex', flexDirection: 'column', gap: '16', paddingTop: '8' });

export const KeychainEntryModal: FC<KeychainEntryModalProps> = props => {
    const { isOpen, draft, onChange, onSave, onClose } = props;

    const handleOpenChange = (open: boolean): void => {
        if (!open) {
            onClose();
        }
    };

    return (
        <Modal open={isOpen} onOpenChange={handleOpenChange}>
            <Modal.Popup closeLabel="Close">
                <Modal.Content>
                    <Modal.Title>{draft.isExisting ? 'Edit entry' : 'Add entry'}</Modal.Title>

                    <div className={formStyles}>
                        {/* the key is the keychain account: renaming is a remove plus an add */}
                        <Input disabled={draft.isExisting}>
                            <Input.Label>Key</Input.Label>
                            <Input.Field
                                value={draft.key}
                                placeholder="dmk_pub"
                                onChange={event => onChange({ ...draft, key: event.target.value })}
                            />
                        </Input>

                        <Input>
                            <Input.Label>Value</Input.Label>
                            <Input.Field
                                isMultiline
                                value={draft.value}
                                placeholder="Value to store"
                                onChange={event =>
                                    onChange({ ...draft, value: event.target.value })
                                }
                                onClear={() => onChange({ ...draft, value: '' })}
                                clearLabel="Clear the value"
                            />
                        </Input>
                    </div>
                </Modal.Content>

                <Modal.Actions>
                    <Button isFullWidth disabled={draft.key === ''} onClick={onSave}>
                        Save
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
    );
};
