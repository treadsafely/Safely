import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Text } from '../../../src';

describe('Text', () => {
    it('renders a span carrying the type scale class names', () => {
        render(<Text variant="labelL">Balance</Text>);

        const text = screen.getByText('Balance');

        expect(text.tagName).toBe('SPAN');
        expect(text.className).toContain('text--variant_labelL');
    });

    it('renders the element asked for', () => {
        render(
            <Text as="h1" variant="titleM">
                Wallets
            </Text>
        );

        expect(screen.getByText('Wallets').tagName).toBe('H1');
    });
});
