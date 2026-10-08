import { sActiveAccountId } from './active-account-id.schema';
import { sChartPeriod } from './chart-period.schema';
import { sDismissedBannerIds } from './dismissed-banner-ids.schema';
import { sDismissedProviders } from './dismissed-providers.schema';
import { sHiddenDeviceWarnings } from './hidden-device-warnings.schema';
import { sNewsNotificationsEnabled } from './news-notifications-enabled.schema';
import { sNotificationsEnabled } from './notifications-enabled.schema';
import { sSendAmountInputType } from './send-amount-input-type.schema';
import { sSyncOnboardingCompleted } from './sync-onboarding-completed.schema';
import { sWatchedBetaTimestamp } from './watched-beta-timestamp.schema';

export const sharedStorageStructure = {
    activeAccount: sActiveAccountId,
    chartPeriod: sChartPeriod,
    notificationsEnabled: sNotificationsEnabled,
    newsNotificationsEnabled: sNewsNotificationsEnabled,
    dismissedBannerIds: sDismissedBannerIds,
    dismissedProviders: sDismissedProviders,
    watchedBetaTimestamp: sWatchedBetaTimestamp,
    sendAmountInputType: sSendAmountInputType,
    syncOnboardingCompleted: sSyncOnboardingCompleted,
    hiddenDeviceWarnings: sHiddenDeviceWarnings
};

export type SharedStorageStructure = typeof sharedStorageStructure;
