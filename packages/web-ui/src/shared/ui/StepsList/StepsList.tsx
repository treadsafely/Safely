import type { FC } from 'react';

import { cx } from '@safely/web-ui/styled-system/css';

import { numberStyles, rootStyles, rowStyles, textStyles } from './StepsList.styles';
import { Text } from '../Text';

export type Step = {
    title: string;
    description?: string;
};

export type StepsListProps = {
    steps: Step[];
    className?: string;
};

export const StepsList: FC<StepsListProps> = props => {
    const { steps, className } = props;

    return (
        <ol className={cx(rootStyles, className)}>
            {steps.map((step, index) => (
                <li key={step.title} className={rowStyles}>
                    <Text variant="bodyM" tone="tertiary" isTabular className={numberStyles}>
                        {index + 1}.
                    </Text>
                    <div className={textStyles}>
                        <Text variant="bodyM">{step.title}</Text>
                        {step.description !== undefined && (
                            <Text variant="bodyM" tone="tertiary">
                                {step.description}
                            </Text>
                        )}
                    </div>
                </li>
            ))}
        </ol>
    );
};
