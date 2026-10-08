import type { FC, SVGProps } from 'react';

import { cx } from '@safely/web-ui/styled-system/css';
import { spinner } from '@safely/web-ui/styled-system/recipes';

export type SpinnerProps = Omit<SVGProps<SVGSVGElement>, 'className' | 'ref'> & {
    size?: number;
    className?: string;
};

const TRACK_OPACITY = 0.24;

export const Spinner: FC<SpinnerProps> = props => {
    const { size = 20, className, ...rest } = props;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 20 20"
            fill="none"
            className={cx(spinner(), className)}
            role="progressbar"
            {...rest}
        >
            <circle
                cx="10"
                cy="10"
                r="8"
                stroke="currentColor"
                strokeOpacity={TRACK_OPACITY}
                strokeWidth="2"
            />
            <path
                d="M18 10a8 8 0 0 0-8-8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
};
