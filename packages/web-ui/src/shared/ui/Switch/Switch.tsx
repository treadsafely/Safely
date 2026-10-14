import { Switch as BaseUiSwitch } from '@base-ui/react/switch';
import type { ComponentPropsWithoutRef, FC } from 'react';

import { cx } from '@safely/web-ui/styled-system/css';
import type { ToggleRecipe } from '@safely/web-ui/styled-system/recipes';
import { toggle } from '@safely/web-ui/styled-system/recipes';

import type { RecipeVariants } from '../recipe-variants';

export type SwitchProps = Omit<
    ComponentPropsWithoutRef<typeof BaseUiSwitch.Root>,
    'className' | 'render'
> &
    RecipeVariants<ToggleRecipe> & {
        className?: string;
    };

export const Switch: FC<SwitchProps> = props => {
    const { size, className, ...rest } = props;
    const styles = toggle({ size });

    return (
        <BaseUiSwitch.Root className={cx(styles.root, className)} {...rest}>
            <BaseUiSwitch.Thumb className={styles.thumb} />
        </BaseUiSwitch.Root>
    );
};
