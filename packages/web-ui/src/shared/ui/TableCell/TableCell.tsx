import type { ComponentPropsWithoutRef, FC, ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { css, cx } from '@safely/web-ui/styled-system/css';
import { tableCell } from '@safely/web-ui/styled-system/recipes';

export type TableCellColumnWidth = 'fill' | 'label' | 'labelNarrow';

export type TableCellRenderProps = {
    copy: () => void;
};

export type TableCellRootProps = {
    copyable?: string;
    copiedLabel?: string;
    hasColumnDivider?: boolean;
    onCopy?: () => void;
    children?: ReactNode | ((props: TableCellRenderProps) => ReactNode);
    className?: string;
};

export type TableCellColumnProps = Omit<ComponentPropsWithoutRef<'div'>, 'className'> & {
    width?: TableCellColumnWidth;
    className?: string;
};

export type TableCellTextProps = Omit<ComponentPropsWithoutRef<'span'>, 'className'> & {
    className?: string;
};

export type TableCellActionProps = Omit<ComponentPropsWithoutRef<'button'>, 'className'> & {
    className?: string;
};

const COPIED_VISIBLE_MS = 800;

const COLUMN_WIDTH_STYLES: Record<TableCellColumnWidth, string> = {
    fill: css({}),
    label: css({ flex: 'none', width: '120px' }),
    labelNarrow: css({ flex: 'none', width: '80px' })
};

const TableCellContext = createContext(tableCell());

const useTableCellStyles = () => useContext(TableCellContext);

const TableCellRoot: FC<TableCellRootProps> = props => {
    const { copyable, copiedLabel, hasColumnDivider, onCopy, className, children } = props;

    const [isCopied, setIsCopied] = useState(false);
    const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => () => clearTimeout(timeout.current), []);

    const handleCopy = useCallback(() => {
        if (copyable === undefined) {
            return;
        }

        void navigator.clipboard.writeText(copyable).then(() => {
            setIsCopied(true);
            clearTimeout(timeout.current);
            timeout.current = setTimeout(() => setIsCopied(false), COPIED_VISIBLE_MS);
            onCopy?.();
        });
    }, [copyable, onCopy]);

    /* a render prop puts buttons of its own inside the cell, and a button cannot nest one */
    const isPressable = copyable !== undefined && typeof children !== 'function';

    const styles = tableCell({
        isCopyable: isPressable,
        isCopied,
        hasColumnDivider
    });

    const content = (
        <TableCellContext.Provider value={styles}>
            {typeof children === 'function' ? children({ copy: handleCopy }) : children}
            {copiedLabel !== undefined && <span className={styles.copied}>{copiedLabel}</span>}
        </TableCellContext.Provider>
    );

    if (!isPressable) {
        return <div className={cx(styles.root, className)}>{content}</div>;
    }

    return (
        <button type="button" className={cx(styles.root, className)} onClick={handleCopy}>
            {content}
        </button>
    );
};

const TableCellColumn: FC<TableCellColumnProps> = props => {
    const { width = 'fill', className, ...rest } = props;

    return (
        <div
            className={cx(useTableCellStyles().column, COLUMN_WIDTH_STYLES[width], className)}
            {...rest}
        />
    );
};

const TableCellLabel: FC<TableCellTextProps> = props => {
    const { className, ...rest } = props;

    return <span className={cx(useTableCellStyles().label, className)} {...rest} />;
};

const TableCellValue: FC<TableCellTextProps> = props => {
    const { className, children, ...rest } = props;
    const styles = useTableCellStyles();

    return (
        <span className={cx(styles.value, className)} {...rest}>
            {typeof children === 'string' ? (
                <span className={styles.valueText}>{children}</span>
            ) : (
                children
            )}
        </span>
    );
};

const TableCellActions: FC<Omit<ComponentPropsWithoutRef<'div'>, 'className'>> = props => (
    <div className={useTableCellStyles().actions} {...props} />
);

const TableCellAction: FC<TableCellActionProps> = props => {
    const { className, ...rest } = props;

    return (
        <button type="button" className={cx(useTableCellStyles().action, className)} {...rest} />
    );
};

export const TableCell = Object.assign(TableCellRoot, {
    Column: TableCellColumn,
    Label: TableCellLabel,
    Value: TableCellValue,
    Actions: TableCellActions,
    Action: TableCellAction
});
