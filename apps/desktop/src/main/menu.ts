import { app, Menu } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';

export function installApplicationMenu(): void {
    if (!app.isPackaged) {
        return;
    }

    const isMac = process.platform === 'darwin';

    const template: MenuItemConstructorOptions[] = [
        ...(isMac ? [{ role: 'appMenu' as const }] : []),
        { role: 'fileMenu' },
        { role: 'editMenu' },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac ? [{ role: 'front' as const }] : [{ role: 'close' as const }])
            ]
        }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
