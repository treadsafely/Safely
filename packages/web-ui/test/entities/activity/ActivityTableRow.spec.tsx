import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SPACE } from '@safely/core';
import type * as SafelyUx from '@safely/ux';

import { ActivityTableRow, type ActivityTableRowProps } from '../../../src';

const { amountOrder } = vi.hoisted(() => ({ amountOrder: vi.fn(() => 'fiat') }));

vi.mock('@safely/ux', async importOriginal => ({
    ...(await importOriginal<typeof SafelyUx>()),
    useTransactionHistoryAmountOrder: amountOrder
}));

const PROPS: ActivityTableRowProps = {
    title: 'Received',
    amountSign: '+',
    formattedValue: '0.7422 BTC',
    valueTone: 'accentGreen',
    formattedFiat: '$ 93,274',
    counterparty: { kind: 'address', label: 'bc1qra…m2e4c8' },
    dateLabel: 'Yesterday at 23:45',
    direction: 'in'
};

const renderRow = (props: Partial<ActivityTableRowProps> = {}) => {
    const { container } = render(<ActivityTableRow {...PROPS} {...props} />);
    const [secondary, primary] = container.querySelectorAll('.text--align_right');

    return { container, primary, secondary };
};

describe('ActivityTableRow', () => {
    beforeEach(() => {
        amountOrder.mockReturnValue('fiat');
    });

    it('puts the fiat amount in the last column and demotes the crypto one', () => {
        const { primary, secondary } = renderRow();

        expect(primary.textContent).toBe(`+${SPACE.THSP}$ 93,274`);
        expect(primary.className).toContain('text--tone_accentGreen');
        expect(secondary.textContent).toBe('0.7422 BTC');
        expect(secondary.className).toContain('text--tone_tertiary');
    });

    it('swaps the two amount columns when the account displays crypto first', () => {
        amountOrder.mockReturnValue('crypto');

        const { primary, secondary } = renderRow();

        expect(primary.textContent).toBe(`+${SPACE.THSP}0.7422 BTC`);
        expect(secondary.textContent).toBe('$ 93,274');
    });

    it('keeps the crypto amount in the last column when there is no rate to convert with', () => {
        const { primary, secondary } = renderRow({ formattedFiat: null });

        expect(primary.textContent).toBe(`+${SPACE.THSP}0.7422 BTC`);
        expect(secondary.textContent).toBe('');
    });

    it('omits the sign entirely for an unsuccessful order', () => {
        const { primary } = renderRow({ amountSign: null, valueTone: 'tertiary' });

        expect(primary.textContent).toBe('$ 93,274');
    });

    it('is a button only when it can be selected', () => {
        expect(renderRow().container.querySelector('button')).toBeNull();

        const { container } = renderRow({ onSelect: vi.fn(), isSelected: true });

        expect(container.querySelector('button')?.getAttribute('data-selected')).toBe('true');
    });
});
