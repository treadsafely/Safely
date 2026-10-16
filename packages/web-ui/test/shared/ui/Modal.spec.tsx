import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Modal } from '../../../src';

const renderModal = () =>
    render(
        <Modal defaultOpen>
            <Modal.Popup closeLabel="Close">
                <Modal.Content>
                    <Modal.Title>Erase all app data?</Modal.Title>
                    <Modal.Description>This cannot be undone.</Modal.Description>
                </Modal.Content>
            </Modal.Popup>
        </Modal>
    );

describe('Modal', () => {
    it('labels the dialog with its title and description', () => {
        renderModal();

        const dialog = screen.getByRole('dialog');

        expect(dialog.textContent).toContain('Erase all app data?');
        expect(dialog.textContent).toContain('This cannot be undone.');
    });

    it('closes through its own button', () => {
        renderModal();

        fireEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
