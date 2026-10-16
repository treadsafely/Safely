import { css } from '@safely/web-ui/styled-system/css';

export const fieldStyles = css({
    padding: '0',
    '& textarea': { minHeight: '96px' }
});

export const errorStyles = css({ paddingInline: '16', paddingTop: '8' });
