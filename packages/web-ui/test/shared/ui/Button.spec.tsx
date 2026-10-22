import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '../../../src';

describe('Button', () => {
    it('renders a button carrying the recipe class names', () => {
        render(<Button variant="secondary">Send</Button>);

        const button = screen.getByRole('button', { name: 'Send' });

        expect(button.className).toContain('button');
        expect(button.className).toContain('button--variant_secondary');
    });

    it('keeps the label mounted while loading, so the button does not resize', () => {
        render(<Button isLoading>Send</Button>);

        expect(screen.getByText('Send')).toBeDefined();
        expect(screen.getByRole('progressbar')).toBeDefined();
    });

    it('is not clickable while loading', () => {
        render(<Button isLoading>Send</Button>);

        expect(screen.getByRole('button')).toHaveProperty('disabled', true);
    });

    it('renders only the spinner when there is nothing to hide', () => {
        render(<Button isIconOnly isLoading aria-label="Loading" />);

        const button = screen.getByRole('button');

        expect(button.textContent).toBe('');
        expect(screen.getByRole('progressbar')).toBeDefined();
    });

    it('renders both icon slots', () => {
        render(
            <Button iconLeft={<span>left</span>} iconRight={<span>right</span>}>
                Send
            </Button>
        );

        expect(screen.getByText('left')).toBeDefined();
        expect(screen.getByText('right')).toBeDefined();
    });
});
