import { ExchangeApiError } from './errors';
import {
    exchangeErrorSchema,
    onrampWidgetResponseSchema,
    providersSchema,
    rampOrdersSchema,
    type GetProvidersParams,
    type GetRampOrdersParams,
    type OnrampWidgetRequest,
    type OnrampWidgetResponse,
    type PostOnrampWidgetParams,
    type Providers,
    type RampOrders
} from './models';
import type { ApiError, RequestSigner } from '../../utils/fetch';
import { ApiClient } from '../../utils/fetch';
import type { IIdentifiable } from '../../utils/types';

export class ExchangeApi extends ApiClient implements IIdentifiable {
    public readonly id: string;

    constructor(options: { baseUrl: string; signer?: RequestSigner }) {
        const baseUrl = options.baseUrl.replace(/\/$/, '');
        super('ExchangeApi', baseUrl, {}, undefined, options.signer);

        this.id = `${this.apiName}:${baseUrl}`;
    }

    public async getProviders(params: GetProvidersParams): Promise<Providers> {
        return this.getJson('/v1/providers', providersSchema, this.toProvidersQuery(params));
    }

    public async postOnrampWidget(
        params: PostOnrampWidgetParams,
        body: OnrampWidgetRequest
    ): Promise<OnrampWidgetResponse> {
        return this.postJson(
            '/v1/onramp/widget',
            body,
            onrampWidgetResponseSchema,
            this.toProvidersQuery(params),
            { sign: true }
        );
    }

    public async getRampOrders(params: GetRampOrdersParams): Promise<RampOrders> {
        return this.getJson('/v1/ramp/orders', rampOrdersSchema, this.toOrdersQuery(params), {
            sign: true
        });
    }

    protected createError(response: Response, parsed: unknown): ApiError {
        const result = exchangeErrorSchema.safeParse(parsed);
        const code = result.success ? result.data.code : undefined;
        const message =
            code !== undefined
                ? `Exchange API error (code=${code})`
                : response.statusText || 'Request failed';
        return new ExchangeApiError(message, response.status, parsed);
    }

    private toProvidersQuery(params: GetProvidersParams) {
        return {
            lang: params.lang,
            fiat: params.fiat,
            store_country_code: params.storeCountryCode,
            device_country_code: params.deviceCountryCode
        };
    }

    private toOrdersQuery(params: GetRampOrdersParams) {
        return {
            lang: params.lang,
            blockchain: params.blockchain,
            store_country_code: params.storeCountryCode,
            device_country_code: params.deviceCountryCode,
            limit: params.limit,
            before: params.before
        };
    }
}
