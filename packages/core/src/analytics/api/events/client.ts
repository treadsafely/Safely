import type { AnalyticsEvent } from './models';
import { sEventBatch } from './models';
import { ApiClient } from '../../../utils/fetch';

export class EventsApi extends ApiClient {
    constructor(opts: { baseUrl: string; projectToken: string }) {
        const normalizedUrl = opts.baseUrl.replace(/\/$/, '');
        super('EventsApi', normalizedUrl, { 'X-Project-Token': opts.projectToken });
    }

    public async send(events: AnalyticsEvent[]): Promise<void> {
        const body = sEventBatch.parse(events);
        await this.postJson('/v1/events', body);
    }
}
