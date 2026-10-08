import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Input } from '../../../src';

describe('Input', () => {
    it('ties the label to the control', () => {
        render(
            <Input>
                <Input.Label>Address</Input.Label>
                <Input.Field />
            </Input>
        );

        expect(screen.getByLabelText('Address')).toBeDefined();
    });

    it('renders a textarea when multiline', () => {
        render(
            <Input>
                <Input.Field isMultiline />
            </Input>
        );

        expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA');
    });

    it('shows the trailing slot while there is nothing to clear', () => {
        render(
            <Input>
                <Input.Field value="" onChange={vi.fn()} trailing={<span>scan</span>} />
            </Input>
        );

        expect(screen.getByText('scan')).toBeDefined();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('replaces the trailing slot with the clear button once there is a value', () => {
        const onClear = vi.fn();

        render(
            <Input>
                <Input.Field
                    value="bc1q"
                    onChange={vi.fn()}
                    trailing={<span>scan</span>}
                    onClear={onClear}
                    clearLabel="Clear"
                />
            </Input>
        );

        expect(screen.queryByText('scan')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

        expect(onClear).toHaveBeenCalledOnce();
        expect(document.activeElement).toBe(screen.getByRole('textbox'));
    });

    it('focuses the control when the box around it is clicked', () => {
        render(
            <Input>
                <Input.Field value="" onChange={vi.fn()} />
            </Input>
        );

        const control = screen.getByRole('textbox');

        fireEvent.mouseDown(control.parentElement as HTMLElement);

        expect(document.activeElement).toBe(control);
    });
});
