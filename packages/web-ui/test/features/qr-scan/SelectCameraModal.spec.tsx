import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SelectCameraModal } from '../../../src';

vi.mock('@safely/ux', async importOriginal => ({
    ...(await importOriginal<typeof import('@safely/ux')>()),
    useTranslate: () => (key: string) => key
}));

const OPTIONS = [
    { deviceId: 'built-in', label: 'FaceTime HD Camera' },
    { deviceId: 'phone', label: 'iPhone Air' }
];

const hasCheckmark = (name: string): boolean =>
    screen.getByRole('button', { name }).innerHTML.includes('cell__trailing');

describe('SelectCameraModal', () => {
    it('offers the automatic choice next to every camera, and marks the selected one', () => {
        render(
            <SelectCameraModal
                options={OPTIONS}
                selectedDeviceId="phone"
                onSelect={vi.fn()}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText('qrScan.source.title')).toBeTruthy();

        expect(hasCheckmark('iPhone Air')).toBe(true);
        expect(hasCheckmark('FaceTime HD Camera')).toBe(false);
        expect(hasCheckmark('qrScan.source.automatic')).toBe(false);
    });

    it('reports the chosen camera, and null for the automatic row', () => {
        const onSelect = vi.fn();

        render(
            <SelectCameraModal
                options={OPTIONS}
                selectedDeviceId={null}
                onSelect={onSelect}
                onClose={vi.fn()}
            />
        );

        expect(hasCheckmark('qrScan.source.automatic')).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: 'iPhone Air' }));
        expect(onSelect).toHaveBeenCalledWith('phone');

        fireEvent.click(screen.getByRole('button', { name: 'qrScan.source.automatic' }));
        expect(onSelect).toHaveBeenLastCalledWith(null);
    });

    it('closes on the confirming button', () => {
        const onClose = vi.fn();

        render(
            <SelectCameraModal
                options={OPTIONS}
                selectedDeviceId={null}
                onSelect={vi.fn()}
                onClose={onClose}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'common.ok' }));

        expect(onClose).toHaveBeenCalledOnce();
    });
});
