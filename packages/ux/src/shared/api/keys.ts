import { defineQueryKeys, finalKey } from '../query-core';

export const apiKeys = defineQueryKeys('api', {
    bootConfig: (_apiId: string) => finalKey,
    about: (_apiId: string) => finalKey,
    userCountryInfo: () => finalKey
});
