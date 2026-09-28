import type { Logger } from '@safely/sync';

import type {
    GeneralSubscription,
    PushDeviceCredentials,
    SubscriptionGroup,
    SyncAnnouncement,
    SyncSubscription,
    TargetRefs
} from './models';
import { replaceGroupResponseSchema } from './models';
import type { IIdentifiable } from '../../utils';
import { ApiClient } from '../../utils/fetch';

export class NotificationsApi extends ApiClient implements IIdentifiable {
    public readonly id: string;

    constructor(options: { baseUrl: string; logger?: Logger }) {
        const baseUrl = options.baseUrl.replace(/\/$/, '');
        super(baseUrl, {}, options.logger);

        this.id = `${this.constructor.name}:${baseUrl}`;
    }

    public async replaceGeneral(
        deviceId: string,
        general: GeneralSubscription,
        credentials: PushDeviceCredentials
    ): Promise<void> {
        await this.putJson(`/api/v1/devices/${deviceId}/general`, general, {
            headers: this.credentialHeaders(credentials)
        });
    }

    public deleteGeneral(deviceId: string): Promise<void> {
        return this.deleteRequest(`/api/v1/devices/${deviceId}/general`);
    }

    public async replaceGroup(
        deviceId: string,
        groupId: string,
        group: SubscriptionGroup,
        credentials: PushDeviceCredentials
    ): Promise<TargetRefs> {
        const response = await this.putJson(
            `/api/v1/devices/${deviceId}/subscriptions/${groupId}`,
            group,
            replaceGroupResponseSchema,
            { headers: this.credentialHeaders(credentials) }
        );

        return response.target_refs;
    }

    private credentialHeaders(credentials: PushDeviceCredentials): Record<string, string> {
        return {
            'X-Safely-Push-Token': credentials.pushToken,
            'X-Safely-Push-Platform': credentials.platform,
            ...(credentials.lang && { 'X-Safely-Lang': credentials.lang }),
            ...(credentials.appVersion && { 'X-Safely-App-Version': credentials.appVersion })
        };
    }

    public deleteGroup(deviceId: string, groupId: string): Promise<void> {
        return this.deleteRequest(`/api/v1/devices/${deviceId}/subscriptions/${groupId}`);
    }

    public async replaceSync(
        deviceId: string,
        syncId: string,
        subscription: SyncSubscription,
        credentials: PushDeviceCredentials
    ): Promise<void> {
        await this.putJson(`/api/v1/devices/${deviceId}/syncs/${syncId}`, subscription, {
            headers: this.credentialHeaders(credentials)
        });
    }

    public deleteSync(deviceId: string, syncId: string): Promise<void> {
        return this.deleteRequest(`/api/v1/devices/${deviceId}/syncs/${syncId}`);
    }

    public announceSyncEvent(syncId: string, announcement: SyncAnnouncement): Promise<void> {
        return this.postJson(`/api/v1/syncs/${syncId}/announce`, announcement);
    }

    public deleteDevice(deviceId: string): Promise<void> {
        return this.deleteRequest(`/api/v1/devices/${deviceId}`);
    }
}
