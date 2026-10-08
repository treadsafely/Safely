import type { customErrors } from './custom-error';
import { isCustomError } from './custom-error';

export type ErrorsConfig = {
    [key in keyof typeof customErrors]?: (err: InstanceType<(typeof customErrors)[key]>) => string;
} & { UnknownError: (err: unknown) => string };

export type TranslatableErrorsConfig = {
    [key in keyof typeof customErrors]?:
        ((err: InstanceType<(typeof customErrors)[key]>) => string) | string;
} & { UnknownError?: ((err: unknown) => string) | string };

export type GetErrorTextOptions = {
    displayUnknownErrors?: boolean;
};

export function getExternalErrorText(error: unknown) {
    return getErrorText(error, undefined, { displayUnknownErrors: true });
}

export function getErrorText(
    error: unknown,
    config?: ErrorsConfig,
    options?: GetErrorTextOptions
): string {
    const unknownError = config?.UnknownError(error) || 'Unknown Error';
    if (!isCustomError(error)) {
        if (options?.displayUnknownErrors) {
            if (typeof error === 'string') {
                return error || unknownError;
            }

            if (!error || typeof error !== 'object') {
                return unknownError;
            }

            if (error instanceof Error) {
                return error.message || unknownError;
            }
        }

        return unknownError;
    }

    const handler = config?.[error.constructor.name as keyof typeof customErrors];
    if (handler) {
        return handler(error);
    }

    if (options?.displayUnknownErrors) {
        return error.message || unknownError;
    }

    return unknownError;
}
