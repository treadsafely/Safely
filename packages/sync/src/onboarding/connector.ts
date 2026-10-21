import type { StorageVersion } from '@safely/slottree';

import type { ISyncAccount } from '../account/I-sync-account';

export type OnboardedAccount<Latest extends StorageVersion> = {
    account: ISyncAccount<Latest>;
    /* null on reconnection, and when the authorising device predates the payload field */
    inviterIkPub: Buffer | null;
};

export type OnboardingConnector<Latest extends StorageVersion> = {
    /**
     * The data buffer that contains the necessary information for onboarding a new device to an existing sync account.
     */
    data: Buffer;
    /**
     * Waits for the completion of the onboarding process and returns the connected sync account once the onboarding is successful.
     * Throws and error if the onboarding process isn't completed after 30 seconds
     */
    waitForCompletion: () => Promise<OnboardedAccount<Latest>>;
    /**
     * Aborts the onboarding polling.
     */
    abort: () => void;
};
