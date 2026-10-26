import type { Logger } from '@safely/sync';

import type { GetRateParams, RateResponse } from './models';
import { RateSchema } from './models';
import type { IIdentifiable } from '../../utils';
import { ApiClient } from '../../utils/fetch';

export class RateApi extends ApiClient implements IIdentifiable {
    public readonly id: string;

    constructor(options: { baseUrl: string; logger?: Logger }) {
        const baseUrl = options.baseUrl.replace(/\/$/, '');
        super('RateApi', baseUrl, {}, options.logger);

        this.id = `${this.apiName}:${baseUrl}`;
    }

    public async getRate(params: GetRateParams): Promise<RateResponse> {
        return this.getJson('/v1/rate', RateSchema, params);
    }
}
