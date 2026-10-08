import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TableCell } from '../../../src';

describe('TableCell', () => {
    it('stays a div until it is given something to copy', () => {
        render(
            <TableCell>
                <TableCell.Column width="label">
                    <TableCell.Label>Label</TableCell.Label>
                </TableCell.Column>
                <TableCell.Column>
                    <TableCell.Value>Value</TableCell.Value>
                </TableCell.Column>
            </TableCell>
        );

        expect(screen.queryByRole('button')).toBeNull();
    });

    it('copies to the clipboard and reports it', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        const onCopy = vi.fn();

        vi.stubGlobal('navigator', { clipboard: { writeText } });

        render(
            <TableCell copyable="bc1q" copiedLabel="Copied" onCopy={onCopy}>
                <TableCell.Column>
                    <TableCell.Value>bc1q</TableCell.Value>
                </TableCell.Column>
            </TableCell>
        );

        screen.getByRole('button').click();

        await waitFor(() => expect(onCopy).toHaveBeenCalledOnce());
        expect(writeText).toHaveBeenCalledWith('bc1q');

        vi.unstubAllGlobals();
    });

    it('leaves the row inert and copies from its own action when given a render prop', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        const onCopy = vi.fn();

        vi.stubGlobal('navigator', { clipboard: { writeText } });

        render(
            <TableCell copyable="txid" onCopy={onCopy}>
                {({ copy }) => (
                    <>
                        <TableCell.Column>
                            <TableCell.Value>txid</TableCell.Value>
                        </TableCell.Column>
                        <TableCell.Actions>
                            <TableCell.Action aria-label="Copy" onClick={copy} />
                        </TableCell.Actions>
                    </>
                )}
            </TableCell>
        );

        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(1);

        buttons[0].click();

        await waitFor(() => expect(onCopy).toHaveBeenCalledOnce());
        expect(writeText).toHaveBeenCalledWith('txid');

        vi.unstubAllGlobals();
    });
});
