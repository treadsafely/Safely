import type { FC } from 'react';

import type { LedgerStep, LedgerStepStatus } from '@safely/ux';
import Checkmark16 from '@safely/ux/assets/icons/16/checkmark-16.svg?react';
import ExclamationmarkCircle16 from '@safely/ux/assets/icons/16/exclamationmark-circle-16.svg?react';

import { dotStyles, indicatorStyles, rootStyles, rowStyles } from './LedgerSteps.styles';
import { Icon, Spinner, Text } from '../../shared';

export type LedgerStepsProps = {
    steps: LedgerStep[];
};

const StepIndicator: FC<{ status: LedgerStepStatus }> = ({ status }) => {
    switch (status) {
        case 'active':
            return <Spinner size={16} />;
        case 'done':
            return <Icon asset={Checkmark16} tone="accentGreen" />;
        case 'error':
            return <Icon asset={ExclamationmarkCircle16} tone="accentOrange" />;
        case 'pending':
            return <span className={dotStyles} />;
    }
};

export const LedgerSteps: FC<LedgerStepsProps> = ({ steps }) => (
    <ul className={rootStyles}>
        {steps.map(step => (
            <li key={step.label} className={rowStyles}>
                <span className={indicatorStyles}>
                    <StepIndicator status={step.status} />
                </span>
                <Text variant="bodyM" tone={step.status === 'done' ? 'accentGreen' : 'primary'}>
                    {step.label}
                </Text>
            </li>
        ))}
    </ul>
);
