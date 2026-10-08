import { z } from 'zod';

import type { Build, UserCountryInfo } from '../../entities';

export interface ConfigParams {
    build: Build;
    version: string; // x.y.z
    userCountryInfo: UserCountryInfo;
    lang: string;
    devToken?: string;
}

// GET /config

export const flagsSchema = z.looseObject({
    enable_onramps: z.boolean().default(false),
    enable_app_restrictions: z.boolean().default(false)
});

export type Flags = z.infer<typeof flagsSchema>;
export type FlagKey = keyof typeof flagsSchema.shape;

export const bootConfigSchema = z.looseObject({
    blockchains: z.looseObject({
        bitcoin: z.looseObject({
            mainnet: z.looseObject({
                api_url: z.string(),
                explorer_account_url: z.string(),
                explorer_tx_url: z.string()
            }),
            testnet: z
                .looseObject({
                    api_url: z.string(),
                    explorer_account_url: z.string(),
                    explorer_tx_url: z.string()
                })
                // Required for testnet wallets to work, but made optional for not to throw
                // on the app bootstrap if server gives wrong config and user doesn't have any testent wallets
                .optional()
        })
    }),

    notices: z.looseObject({
        home_screen_banners: z.array(
            z.looseObject({
                id: z.string(),
                type: z.enum(['default', 'warn', 'danger', 'transparent']).catch('default'),
                text: z.string(),
                icon: z.string().optional(),
                banner_click_action_url: z.string().optional(),
                action_button: z
                    .looseObject({
                        text: z.string(),
                        url: z.string()
                    })
                    .optional()
            })
        )
    }),

    currencies: z.looseObject({
        prices_api_url: z.string(),
        supported_currencies: z.array(
            z.looseObject({
                description: z.string(),
                slug: z.string()
            })
        )
    }),

    flags: flagsSchema,

    latest_app_version: z.looseObject({
        version: z.string()
    }),

    references: z.looseObject({
        sync_learn_more_url: z.string().optional(),
        legal: z.looseObject({
            privacy_url: z.string(),
            terms_url: z.string()
        }),
        support: z.looseObject({
            email: z.string(),
            telegram: z.string()
        })
    }),

    sync: z.looseObject({
        api_url: z.string()
    }),

    exchange: z.looseObject({
        api_url: z.string()
    }),

    notifications: z
        .looseObject({
            bitcoin: z.looseObject({
                mainnet: z.looseObject({
                    api_url: z.string()
                })
            })
        })
        .optional(),

    telemetry: z.looseObject({
        analytics: z.looseObject({
            url: z.string(),
            token: z.string()
        })
    })
});

export type BootConfig = z.infer<typeof bootConfigSchema>;

// GET /about

export const taggedTextPostSchema = z.object({
    type: z.literal('taggedTextPost'),
    id: z.string(),
    timestamp: z.number(), // Unix seconds
    tagged_text: z.string(),
    links: z.record(z.string(), z.string()).optional()
});

export const externalLinkPostSchema = z.object({
    type: z.literal('externalLinkPost'),
    id: z.string(),
    timestamp: z.number(), // Unix seconds
    title: z.string(),
    description: z.string(),
    url: z.string(),
    img_url: z.string().optional()
});

export const aboutPostSchema = z.discriminatedUnion('type', [
    taggedTextPostSchema,
    externalLinkPostSchema
]);

export const aboutSchema = z.object({
    posts: z.array(aboutPostSchema)
});

export type TaggedTextPost = z.infer<typeof taggedTextPostSchema>;
export type ExternalLinkPost = z.infer<typeof externalLinkPostSchema>;
export type AboutPost = z.infer<typeof aboutPostSchema>;
export type About = z.infer<typeof aboutSchema>;
