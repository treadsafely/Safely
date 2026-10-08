import { css } from '@safely/web-ui/styled-system/css';

export const contentStyles = css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: '0',
    gap: '32',
    paddingInline: '24',
    paddingBottom: '32',
    overflowY: 'auto'
});

export const buildStyles = css({ paddingInline: '16', paddingBottom: '8' });

export const sectionStyles = css({ display: 'flex', flexDirection: 'column', gap: '8' });

export const columnStyles = css({ display: 'flex', flexDirection: 'column', gap: '16' });

export const rowStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: '12',
    flexWrap: 'wrap'
});
