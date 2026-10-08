import { app } from 'electron';

/* Only a pipeline build carries a number, and the panel must not imply one. */
const BUILD_NUMBER = SAFELY_BUILD_NUMBER ?? 'local';

export function configureAboutPanel(): void {
    app.setAboutPanelOptions({
        applicationName: app.getName(),
        applicationVersion: app.getVersion(),
        version: BUILD_NUMBER
    });
}
