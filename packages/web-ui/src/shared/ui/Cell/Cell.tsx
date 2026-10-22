import type { ComponentPropsWithoutRef, FC, ReactNode } from 'react';

import ChevronRight16 from '@safely/ux/assets/icons/16/chevron-right-16.svg?react';
import Checkmark28 from '@safely/ux/assets/icons/28/checkmark-28.svg?react';
import { cx } from '@safely/web-ui/styled-system/css';
import { cell } from '@safely/web-ui/styled-system/recipes';

import type { CellTone } from './CellContext';
import { CellContext, useCellStyles } from './CellContext';
import { Icon } from '../Icon';

export type CellRootProps = {
    tone?: CellTone;
    isSelected?: boolean;
    onClick?: () => void;
    children?: ReactNode;
    className?: string;
};

type CellPartProps<TElement extends 'div' | 'span'> = Omit<
    ComponentPropsWithoutRef<TElement>,
    'className'
> & {
    className?: string;
};

const CellRoot: FC<CellRootProps> = props => {
    const { tone, isSelected, onClick, className, children } = props;

    const styles = cell({ tone, isSelected, isInteractive: Boolean(onClick) });
    const content = <CellContext.Provider value={styles}>{children}</CellContext.Provider>;

    if (!onClick) {
        return <div className={cx(styles.root, className)}>{content}</div>;
    }

    return (
        <button type="button" className={cx(styles.root, className)} onClick={onClick}>
            {content}
        </button>
    );
};

const CellLeading: FC<CellPartProps<'div'>> = props => {
    const { className, ...rest } = props;

    return <div className={cx(useCellStyles().leading, className)} {...rest} />;
};

const CellContent: FC<CellPartProps<'div'>> = props => {
    const { className, ...rest } = props;

    return <div className={cx(useCellStyles().content, className)} {...rest} />;
};

const CellRow: FC<CellPartProps<'div'>> = props => {
    const { className, ...rest } = props;

    return <div className={cx(useCellStyles().row, className)} {...rest} />;
};

const CellTitle: FC<CellPartProps<'span'>> = props => {
    const { className, ...rest } = props;

    return <span className={cx(useCellStyles().title, className)} {...rest} />;
};

const CellSubtitle: FC<CellPartProps<'span'>> = props => {
    const { className, ...rest } = props;

    return <span className={cx(useCellStyles().subtitle, className)} {...rest} />;
};

const CellValue: FC<CellPartProps<'span'>> = props => {
    const { className, ...rest } = props;

    return <span className={cx(useCellStyles().value, className)} {...rest} />;
};

const CellSubvalue: FC<CellPartProps<'span'>> = props => {
    const { className, ...rest } = props;

    return <span className={cx(useCellStyles().subvalue, className)} {...rest} />;
};

const CellTrailing: FC<CellPartProps<'div'>> = props => {
    const { className, ...rest } = props;

    return <div className={cx(useCellStyles().trailing, className)} {...rest} />;
};

const CellChevron: FC = () => (
    <CellTrailing>
        <Icon asset={ChevronRight16} />
    </CellTrailing>
);

const CellCheckmark: FC = () => (
    <CellTrailing>
        <Icon asset={Checkmark28} tone="accent" />
    </CellTrailing>
);

export const Cell = Object.assign(CellRoot, {
    Leading: CellLeading,
    Content: CellContent,
    Row: CellRow,
    Title: CellTitle,
    Subtitle: CellSubtitle,
    Value: CellValue,
    Subvalue: CellSubvalue,
    Trailing: CellTrailing,
    Chevron: CellChevron,
    Checkmark: CellCheckmark
});
