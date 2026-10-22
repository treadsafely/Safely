import { createWebI18n } from '@safely/web-ui';

import { platform } from './platform';

/* module scope, not a provider value: the security gate translates outside React */
export const { instance: i18n } = createWebI18n({
    storage: platform.storage.synchronous,
    fallbackLocale: platform.appInfo.locale
});
