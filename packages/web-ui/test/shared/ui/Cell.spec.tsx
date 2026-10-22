import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Cell, List } from '../../../src';

describe('Cell', () => {
    it('renders a div until it is given a click handler', () => {
        const onClick = vi.fn();

        const { rerender } = render(
            <Cell>
                <Cell.Content>
                    <Cell.Title>Label</Cell.Title>
                </Cell.Content>
            </Cell>
        );

        expect(screen.queryByRole('button')).toBeNull();

        rerender(
            <Cell onClick={onClick}>
                <Cell.Content>
                    <Cell.Title>Label</Cell.Title>
                </Cell.Content>
            </Cell>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Label' }));

        expect(onClick).toHaveBeenCalledOnce();
    });

    it('colours its title from the tone set on the root', () => {
        render(
            <Cell tone="accentRed">
                <Cell.Content>
                    <Cell.Title>Remove</Cell.Title>
                </Cell.Content>
            </Cell>
        );

        expect(screen.getByText('Remove').className).toContain('cell__title--tone_accentRed');
    });
});

describe('List', () => {
    it('groups cells and owns the corners', () => {
        const { container } = render(
            <List>
                <List.Title>Section</List.Title>
                <List.Group variant="separated">
                    <Cell>
                        <Cell.Content>
                            <Cell.Title>One</Cell.Title>
                        </Cell.Content>
                    </Cell>
                </List.Group>
            </List>
        );

        const group = container.querySelector('.list__group');

        expect(group?.className).toContain('list__group--variant_separated');
        expect(screen.getByText('Section').tagName).toBe('H2');
    });
});
