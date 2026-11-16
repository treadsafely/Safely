import type { ReactNode } from 'react';
import React from 'react';
import type { ViewProps } from 'react-native';
import { View } from 'react-native';

import { Title } from './components/Title';
import type { HeaderVariant } from './Header.context';
import { HeaderContext } from './Header.context';
import { styles } from './Header.styles';
import { resolveShouldInsetTop } from './Header.utils';
import { useScreenContext } from '../../Screen.context';

interface HeaderProps extends ViewProps {
    variant?: HeaderVariant;
    backdrop?: ReactNode;
    withCompensateHeight?: boolean;
    withCompensateInset?: boolean;
    shortHeader?: boolean;
}

export const HeaderContainer = (props: HeaderProps) => {
    const {
        children,
        variant = 'center',
        backdrop,
        style,
        withCompensateHeight = true,
        withCompensateInset = true,
        shortHeader = false,
        ...rest
    } = props;
    const { background, layout } = useScreenContext();

    const shouldInsetTop = resolveShouldInsetTop(layout);

    const { hasTitle, leftChildren, titleChild, rightChildren, hasSides } = React.useMemo(() => {
        const childrenArray = React.Children.toArray(children);
        const titleIndex = childrenArray.findIndex(
            child => React.isValidElement(child) && child.type === Title
        );
        const _hasTitle = titleIndex >= 0;
        const _leftChildren = _hasTitle ? childrenArray.slice(0, titleIndex) : childrenArray;
        const _titleChild = _hasTitle ? childrenArray[titleIndex] : null;
        const _rightChildren = _hasTitle ? childrenArray.slice(titleIndex + 1) : [];
        const _hasSides = _leftChildren.length > 0 || _rightChildren.length > 0;

        return {
            hasTitle: _hasTitle,
            leftChildren: _leftChildren,
            titleChild: _titleChild,
            rightChildren: _rightChildren,
            hasSides: _hasSides
        };
    }, [children]);

    styles.useVariants({ background, shortHeader });

    return (
        <HeaderContext.Provider value={{ variant, hasSides, shouldInsetTop }}>
            {backdrop && (
                <View style={styles.backdrop({ shouldInsetTop })} pointerEvents="none">
                    {backdrop}
                </View>
            )}
            <View
                style={[
                    styles.container({
                        shouldInsetTop
                    }),
                    style
                ]}
                {...rest}
            >
                {hasTitle ? (
                    <>
                        <View style={styles.side}>{leftChildren}</View>
                        {titleChild}
                        <View style={[styles.side, styles.sideRight]}>{rightChildren}</View>
                    </>
                ) : (
                    children
                )}
            </View>
            {shouldInsetTop && withCompensateInset && <View style={styles.topInset} />}
            {withCompensateHeight && <View style={styles.headerHeight} />}
        </HeaderContext.Provider>
    );
};
