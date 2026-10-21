import type { Logger } from '@safely/sync';

import type { About, AboutOrder, BootConfig, ConfigParams } from './models';
import { aboutSchema, bootConfigSchema } from './models';
import type { IIdentifiable } from '../../utils';
import { ApiClient } from '../../utils/fetch';

export class ConfigApi extends ApiClient implements IIdentifiable {
    constructor(
        private readonly params: ConfigParams,
        logger?: Logger
    ) {
        super('https://config.safely.app/v1', {}, logger);
    }

    public get id() {
        const { storeCode, deviceCode } = this.params.userCountryInfo;

        return `${this.constructor.name}:${this.params.build}:${this.params.version}:${this.params.lang}:${storeCode ?? ''}:${deviceCode ?? ''}:${this.params.devToken ?? ''}`;
    }

    private get searchParams() {
        const dev_token = this.params.devToken;
        const store_country_code = this.params.userCountryInfo.storeCode;
        const device_country_code = this.params.userCountryInfo.deviceCode;

        return {
            lang: this.params.lang,
            platform: this.params.build,
            version: this.params.version,
            ...(device_country_code && { device_country_code }),
            ...(store_country_code && { store_country_code }),
            ...(dev_token && { dev_token })
        };
    }

    public async boot(): Promise<BootConfig> {
        return this.getJson('/config', bootConfigSchema, this.searchParams);
    }

    public async getAbout(order: AboutOrder): Promise<About> {
        return this.getJson('/about', aboutSchema, { ...this.searchParams, order });
    }
}
