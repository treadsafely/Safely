import { render } from '@testing-library/react';
import type { SVGProps } from 'react';
import { describe, expect, it } from 'vitest';

import { Icon } from '../../../src';

const Asset = (props: SVGProps<SVGSVGElement>) => (
    <svg data-testid="asset" width={16} height={16} viewBox="0 0 16 16" {...props}>
        <path fill="#EDEDED" d="M0 0h16v16H0z" />
    </svg>
);

describe('Icon', () => {
    it('leaves the asset untinted when no tone is given', () => {
        const { getByTestId } = render(<Icon asset={Asset} />);

        expect(getByTestId('asset').className).not.toContain('icon--tone');
    });

    it('carries the tone class when a tone is given', () => {
        const { getByTestId } = render(<Icon asset={Asset} tone="accentRed" />);

        expect(getByTestId('asset').className).toContain('icon--tone_accentRed');
    });

    it("keeps the asset's own dimensions when no size is given", () => {
        const { getByTestId } = render(<Icon asset={Asset} />);

        expect(getByTestId('asset').getAttribute('width')).toBe('16');
        expect(getByTestId('asset').getAttribute('height')).toBe('16');
    });

    it('sizes the asset through its own attributes', () => {
        const { getByTestId } = render(<Icon asset={Asset} size={28} />);

        expect(getByTestId('asset').getAttribute('width')).toBe('28');
        expect(getByTestId('asset').getAttribute('height')).toBe('28');
    });
});
