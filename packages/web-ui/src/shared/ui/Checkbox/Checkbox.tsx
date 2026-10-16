import { Checkbox as BaseUiCheckbox } from '@base-ui/react/checkbox';
import type { ComponentPropsWithoutRef, FC } from 'react';

import Checkmark16 from '@safely/ux/assets/icons/16/checkmark-16.svg?react';
import { cx } from '@safely/web-ui/styled-system/css';
import { checkbox } from '@safely/web-ui/styled-system/recipes';

import { Icon } from '../Icon';

export type CheckboxProps = Omit<
    ComponentPropsWithoutRef<typeof BaseUiCheckbox.Root>,
    'className' | 'render'
> & {
    className?: string;
};

export const Checkbox: FC<CheckboxProps> = props => {
    const { className, ...rest } = props;
    const styles = checkbox();

    return (
        <BaseUiCheckbox.Root className={cx(styles.root, className)} {...rest}>
            <BaseUiCheckbox.Indicator className={styles.indicator}>
                <Icon asset={Checkmark16} />
            </BaseUiCheckbox.Indicator>
        </BaseUiCheckbox.Root>
    );
};
