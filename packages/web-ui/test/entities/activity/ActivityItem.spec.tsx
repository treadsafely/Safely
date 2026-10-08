import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SPACE } from '@safely/core';
import type * as SafelyUx from '@safely/ux';

import { ActivityItem, type ActivityItemProps } from '../../../src';

const { amountOrder } = vi.hoisted(() => ({ amountOrder: vi.fn(() => 'fiat') }));

vi.mock('@safely/ux', async importOriginal => ({
    ...(await importOriginal<typeof SafelyUx>()),
    useTransactionHistoryAmountOrder: amountOrder
}));

const PROPS: ActivityItemProps = {
    title: 'Received',
    amountSign: '+',
    formattedValue: '0.7422 BTC',
    valueTone: 'accentGreen',
    formattedFiat: '$ 93,274',
    timestampLabel: '23:45',
    isPending: false,
    counterparty: { kind: 'address', label: 'bc1qra…m2e4c8' }
};

const renderItem = (props: Partial<ActivityItemProps> = {}) => {
    const { container } = render(<ActivityItem {...PROPS} {...props} />);
    const [primary, secondary] = container.querySelectorAll('.text--align_right');

    return { container, primary, secondary };
};

describe('ActivityItem', () => {
    beforeEach(() => {
        amountOrder.mockReturnValue('fiat');
    });

    it('leads with the fiat amount and demotes the crypto one', () => {
        const { primary, secondary } = renderItem();

        expect(primary.textContent).toBe(`+${SPACE.THSP}$ 93,274`);
        expect(primary.className).toContain('text--variant_labelL');
        expect(primary.className).toContain('text--tone_accentGreen');
        expect(secondary.textContent).toBe('0.7422 BTC');
    });

    it('swaps the two amounts when the account displays crypto first', () => {
        amountOrder.mockReturnValue('crypto');

        const { primary, secondary } = renderItem();

        expect(primary.textContent).toBe(`+${SPACE.THSP}0.7422 BTC`);
        expect(secondary.textContent).toBe('$ 93,274');
    });

    it('keeps the crypto amount primary when there is no rate to convert with', () => {
        const { primary, secondary } = renderItem({ formattedFiat: null });

        expect(primary.textContent).toBe(`+${SPACE.THSP}0.7422 BTC`);
        expect(secondary.textContent).toBe('');
    });

    it('omits the sign entirely for an unsuccessful order', () => {
        const { primary } = renderItem({ amountSign: null, valueTone: 'tertiary' });

        expect(primary.textContent).toBe('$ 93,274');
    });

    it('drops the timestamp and lifts the background while pending', () => {
        const { container } = renderItem({
            isPending: true,
            timestampLabel: null,
            title: 'Receiving'
        });

        expect(screen.queryByText('23:45')).toBeNull();
        expect(container.querySelector('.cell__root')?.className).toContain(
            'bg-c_background.tertiary'
        );
    });
});
