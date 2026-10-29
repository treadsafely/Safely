import type { TextProps as RNTextProps, ViewStyle } from 'react-native';
import { Text as RNText, View } from 'react-native';
import type { UnistylesVariants } from 'react-native-unistyles';
import { useUnistyles } from 'react-native-unistyles';

import { Skeleton, type SkeletonVariant } from '../Skeleton';
import { styles } from './Text.styles';
import { SKELETON_CONFIG } from './Text.styles';

export type TextProps = RNTextProps &
    UnistylesVariants<typeof styles> & {
        skeleton?: boolean;
        skeletonVariant?: SkeletonVariant;
        skeletonWidth?: number;
    };

export const Text = (props: TextProps) => {
    const {
        children,
        variant,
        textAlign,
        color,
        monospace,
        textTransform,
        skeleton,
        skeletonVariant,
        skeletonWidth,
        style,
        ...rest
    } = props;
    const { theme } = useUnistyles();
    const hasSkeleton = skeleton || skeletonWidth !== undefined || skeletonVariant !== undefined;

    styles.useVariants({ variant, textAlign, color, monospace, textTransform });

    if (hasSkeleton && children === undefined) {
        // TODO: should add config for other variants
        const { height, width } =
            SKELETON_CONFIG[variant as keyof typeof SKELETON_CONFIG] ?? SKELETON_CONFIG.displayL;
        return (
            <View style={styles.skeletonContainer}>
                <Skeleton
                    width={skeletonWidth ?? width}
                    style={style as ViewStyle}
                    height={height}
                    borderRadius={theme.radius.sm}
                    variant={skeletonVariant ?? 'secondary'}
                />
            </View>
        );
    }

    return (
        <RNText allowFontScaling={false} {...rest} style={[styles.text, style]}>
            {children}
        </RNText>
    );
};
