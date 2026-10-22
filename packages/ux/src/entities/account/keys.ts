import { defineQueryKeys, finalKey } from '../../shared';

export const accountKey = defineQueryKeys('account', {
    list: {
        active: finalKey
    },
    accountId: (_id: string | undefined) => {
        return {
            activePortfolio: finalKey
        };
    }
});
