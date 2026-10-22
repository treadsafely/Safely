import type { Logger } from '@safely/sync';

import type {
    CurrentPrice,
    GetCurrentPriceParams,
    HistoricalPrice,
    GetHistoricalPriceParams
} from './models';
import { CurrentPriceSchema, HistoricalPriceSchema } from './models';
import type { IIdentifiable } from '../../utils';
import { ApiClient } from '../../utils/fetch';

export class PriceApi extends ApiClient implements IIdentifiable {
    public readonly id: string;

    constructor(options: { baseUrl: string; logger?: Logger }) {
        const baseUrl = options.baseUrl.replace(/\/$/, '');
        super('PriceApi', baseUrl, {}, options.logger);

        this.id = `${this.apiName}:${baseUrl}`;
    }

    public async getCurrentPrice(params: GetCurrentPriceParams): Promise<CurrentPrice> {
        return this.getJson('/v1/prices/current', CurrentPriceSchema, params);
    }

    public async getHistoricalPrice(params: GetHistoricalPriceParams): Promise<HistoricalPrice> {
        return this.getJson('/v1/prices/chart', HistoricalPriceSchema, params);
    }
}
