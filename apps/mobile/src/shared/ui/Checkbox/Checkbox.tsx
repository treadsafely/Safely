import type { PressableProps } from 'react-native';
import { Pressable } from 'react-native';
import type { UnistylesVariants } from 'react-native-unistyles';

import { Checkmark16, Icon } from '@mobile/shared/ui/Icon';

import { styles } from './Checkbox.styles';

const CHECKMARK_SIZE = { regular: 16, small: 12 } as const;
// a small checkbox sits beside buttons, where a slop would steal their taps
const HIT_SLOP = { regular: 32, small: 0 } as const;

type CheckboxProps = Omit<PressableProps, 'style'> &
    UnistylesVariants<typeof styles> & {
        isChecked: boolean;
    };

export const Checkbox = ({ isChecked, size = 'regular', ...rest }: CheckboxProps) => {
    styles.useVariants({ size });

    return (
        <Pressable
            style={[styles.box, isChecked && styles.boxChecked]}
            hitSlop={HIT_SLOP[size]}
            {...rest}
        >
            {isChecked && (
                <Icon icon={Checkmark16} size={CHECKMARK_SIZE[size]} color="constantWhite" />
            )}
        </Pressable>
    );
};
