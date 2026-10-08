import { Switch as BaseUiSwitch } from '@base-ui/react/switch';
import type { ComponentPropsWithoutRef, FC } from 'react';

import { cx } from '@safely/web-ui/styled-system/css';
import { toggle } from '@safely/web-ui/styled-system/recipes';

export type SwitchProps = Omit<
    ComponentPropsWithoutRef<typeof BaseUiSwitch.Root>,
    'className' | 'render'
> & {
    className?: string;
};

export const Switch: FC<SwitchProps> = props => {
    const { className, ...rest } = props;
    const styles = toggle();

    return (
        <BaseUiSwitch.Root className={cx(styles.root, className)} {...rest}>
            <BaseUiSwitch.Thumb className={styles.thumb} />
        </BaseUiSwitch.Root>
    );
};
