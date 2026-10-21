import { fireEvent, render, screen } from '@testing-library/react';
import type { SVGProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Banner } from '../../../src';

const Asset = (props: SVGProps<SVGSVGElement>) => <svg data-testid="asset" {...props} />;

describe('Banner', () => {
    it('colours its parts from the tone set on the root', () => {
        render(
            <Banner tone="danger">
                <Banner.Content>
                    <Banner.Text>Something failed</Banner.Text>
                    <Banner.Action>Retry</Banner.Action>
                </Banner.Content>
            </Banner>
        );

        expect(screen.getByText('Something failed').className).toContain('banner__text');
        expect(screen.getByRole('button', { name: 'Retry' }).className).toContain(
            'banner__action--tone_danger'
        );
    });

    it('renders a div until it is given a click handler', () => {
        const { rerender } = render(
            <Banner>
                <Banner.Content>
                    <Banner.Text>Notice</Banner.Text>
                </Banner.Content>
            </Banner>
        );

        expect(screen.queryByRole('button')).toBeNull();

        rerender(
            <Banner onClick={vi.fn()}>
                <Banner.Content>
                    <Banner.Text>Notice</Banner.Text>
                </Banner.Content>
            </Banner>
        );

        expect(screen.getByRole('button', { name: 'Notice' })).toBeDefined();
    });

    it('dismisses through its own button', () => {
        const onClose = vi.fn();

        render(
            <Banner>
                <Banner.Content>
                    <Banner.Text>Notice</Banner.Text>
                </Banner.Content>
                <Banner.Icon asset={Asset} />
                <Banner.Close label="Dismiss" onClick={onClose} />
            </Banner>
        );

        expect(screen.getByTestId('asset')).toBeDefined();

        fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

        expect(onClose).toHaveBeenCalledOnce();
    });
});
