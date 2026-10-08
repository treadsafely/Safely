import { defineSlotRecipe } from '@pandacss/dev';

const TITLE_BAR_HEIGHT = '52px';
const SIDEBAR_WIDTH = '300px';
const PANEL_WIDTH = '400px';

export const appLayoutRecipe = defineSlotRecipe({
    className: 'appLayout',
    description: 'Window shell: a title bar over the sidebar, an optional second bar and content',
    slots: [
        'root',
        'titleBar',
        'sidebar',
        'secondary',
        'secondaryContent',
        'content',
        'panel',
        'panelContent'
    ],
    base: {
        root: {
            position: 'relative',
            /* confines the shell's own z-indexes so a portalled overlay still covers them */
            isolation: 'isolate',
            display: 'flex',
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            backgroundColor: 'background.primary'
        },
        titleBar: {
            position: 'absolute',
            top: '0',
            left: '0',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            width: SIDEBAR_WIDTH,
            height: TITLE_BAR_HEIGHT
        },
        sidebar: {
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            width: SIDEBAR_WIDTH,
            paddingTop: TITLE_BAR_HEIGHT,
            overflowY: 'auto',
            borderRightWidth: 'hairline',
            borderRightStyle: 'solid',
            borderRightColor: 'other.transparentElement',
            backgroundColor: 'background.secondary'
        },
        secondary: {
            position: 'relative',
            flexShrink: 0,
            width: '300px',
            overflow: 'hidden',
            transition: 'width 200ms ease',
            _motionReduce: { transition: 'none' }
        },
        secondaryContent: {
            position: 'absolute',
            top: '0',
            left: '0',
            display: 'flex',
            flexDirection: 'column',
            width: '300px',
            height: '100%',
            borderRightWidth: 'hairline',
            borderRightStyle: 'solid',
            borderRightColor: 'other.transparentElement',
            backgroundColor: 'background.overlay',
            transition: 'transform 200ms ease',
            _motionReduce: { transition: 'none' }
        },
        content: {
            display: 'flex',
            flexDirection: 'column',
            flex: '1',
            minWidth: '0',
            overflowY: 'auto'
        },
        panel: {
            position: 'relative',
            flexShrink: 0,
            width: PANEL_WIDTH,
            overflow: 'hidden',
            transition: 'width 200ms ease',
            _motionReduce: { transition: 'none' }
        },
        panelContent: {
            position: 'absolute',
            top: '0',
            right: '0',
            display: 'flex',
            flexDirection: 'column',
            width: PANEL_WIDTH,
            height: '100%',
            overflow: 'hidden',
            borderLeftWidth: 'hairline',
            borderLeftStyle: 'solid',
            borderLeftColor: 'other.transparentElement',
            backgroundColor: 'background.primary',
            transition: 'transform 200ms ease',
            _motionReduce: { transition: 'none' }
        }
    },
    variants: {
        hasWindowControls: {
            true: {
                titleBar: { paddingLeft: '98px' }
            }
        },
        isSecondaryOpen: {
            false: {
                secondary: { width: '0' },
                secondaryContent: { transform: 'translateX(-100%)' }
            }
        },
        isPanelOpen: {
            false: {
                panel: { width: '0' },
                panelContent: { transform: 'translateX(100%)' }
            }
        },
        isFullScreen: {
            true: {
                secondaryContent: { paddingTop: TITLE_BAR_HEIGHT },
                content: { paddingTop: TITLE_BAR_HEIGHT },
                panelContent: { paddingTop: TITLE_BAR_HEIGHT }
            }
        }
    }
});
