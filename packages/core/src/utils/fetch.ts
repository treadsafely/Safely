import { z } from 'zod';

import type { Logger } from '@safely/sync';

export interface RequestSigner {
    sign(method: string, pathWithQuery: string, body: string): Promise<string>;
}

export class ApiError extends Error {
    public readonly name: string = 'ApiError';

    public readonly status: number;

    public readonly payload?: unknown;

    constructor(message: string, status: number, payload?: unknown) {
        super(message);
        this.status = status;
        this.payload = payload;
    }
}

/** API error response. */
const APIErrorSchema = z.looseObject({
    error: z.string()
});

export class ApiClient {
    protected readonly headers: Record<string, string>;

    protected readonly timeoutMs: number = 5000;

    /** subclasses override to throw their own ApiError subclass */
    protected readonly errorConstructor: new (
        message: string,
        status: number,
        payload?: unknown
    ) => ApiError = ApiError;

    protected readonly logger?: Logger;

    protected readonly signer?: RequestSigner;

    constructor(
        protected readonly baseUrl: string,
        headers: Record<string, string> = {},
        logger?: Logger,
        signer?: RequestSigner
    ) {
        this.headers = { ...headers };
        this.logger = logger?.child(this.constructor.name);
        this.signer = signer;
    }

    protected async getJson<T extends z.ZodTypeAny, Q extends object>(
        path: string,
        schema: T,
        query?: Q,
        opts?: { sign?: boolean }
    ): Promise<z.infer<T>> {
        const url = this.buildUrl(path, query);
        const headers = await this.authHeaders('GET', url, '', opts);
        const response = await this.performFetch(url, { method: 'GET', headers });
        return await this.parseAndValidate(response, schema);
    }

    protected async postPlain<T extends z.ZodTypeAny>(
        path: string,
        body: string,
        schema: T
    ): Promise<z.infer<T>> {
        const url = this.buildUrl(path);
        const response = await this.performFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            body
        });
        return await this.parseAndValidate(response, schema);
    }

    protected async postJson(path: string, body: unknown): Promise<void>;
    protected async postJson<T extends z.ZodTypeAny>(
        path: string,
        body: unknown,
        schema: T,
        query?: object,
        opts?: { sign?: boolean }
    ): Promise<z.infer<T>>;
    protected async postJson<T extends z.ZodTypeAny>(
        path: string,
        body: unknown,
        schema?: T,
        query?: object,
        opts?: { sign?: boolean }
    ): Promise<z.infer<T> | void> {
        const url = this.buildUrl(path, query);
        const bodyString = JSON.stringify(body);
        const headers = {
            'Content-Type': 'application/json',
            ...(await this.authHeaders('POST', url, bodyString, opts))
        };
        const response = await this.performFetch(url, {
            method: 'POST',
            headers,
            body: bodyString
        });

        if (!schema) {
            if (!response.ok) await this.parseAndThrow(response);

            return;
        }

        return await this.parseAndValidate(response, schema);
    }

    protected async putJson(
        path: string,
        body: unknown,
        opts?: { headers?: Record<string, string> }
    ): Promise<void>;
    protected async putJson<T extends z.ZodTypeAny>(
        path: string,
        body: unknown,
        schema: T,
        opts?: { headers?: Record<string, string> }
    ): Promise<z.infer<T>>;
    protected async putJson<T extends z.ZodTypeAny>(
        path: string,
        body: unknown,
        schemaOrOpts?: T | { headers?: Record<string, string> },
        maybeOpts?: { headers?: Record<string, string> }
    ): Promise<z.infer<T> | void> {
        const schema = schemaOrOpts instanceof z.ZodType ? schemaOrOpts : undefined;
        const opts = schema ? maybeOpts : (schemaOrOpts as { headers?: Record<string, string> });
        const url = this.buildUrl(path);
        const response = await this.performFetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...opts?.headers },
            body: JSON.stringify(body)
        });

        if (!schema) {
            if (!response.ok) await this.parseAndThrow(response);

            return;
        }

        return await this.parseAndValidate(response, schema);
    }

    protected async deleteRequest(path: string): Promise<void> {
        const url = this.buildUrl(path);
        const response = await this.performFetch(url, { method: 'DELETE' });

        if (!response.ok) await this.parseAndThrow(response);
    }

    private async authHeaders(
        method: string,
        url: string,
        body: string,
        opts?: { sign?: boolean }
    ): Promise<Record<string, string>> {
        if (!opts?.sign || !this.signer) return {};
        const parsed = new URL(url);
        const pathWithQuery = parsed.pathname + parsed.search;
        return { Authorization: await this.signer.sign(method, pathWithQuery, body) };
    }

    private buildUrl(path: string, query?: object): string {
        const url = new URL(this.baseUrl + path);
        if (query) {
            Object.entries(query)
                .filter(([, v]) => v !== undefined && v !== null)
                .forEach(([k, v]) => {
                    if (Array.isArray(v)) {
                        url.searchParams.set(k, v.join(','));
                    } else {
                        url.searchParams.set(k, String(v));
                    }
                });
        }
        return url.toString();
    }

    private async performFetch(url: string, init: RequestInit): Promise<Response> {
        const controller = this.timeoutMs ? new AbortController() : undefined;
        const id = this.timeoutMs
            ? setTimeout(() => controller!.abort(), this.timeoutMs)
            : undefined;
        this.logger?.debug('request', { method: init.method, url });
        try {
            const mergedInit: RequestInit = {
                ...init,
                headers: { ...this.headers, ...(init.headers || {}) },
                signal: controller?.signal
            };
            const response = await fetch(url, mergedInit);
            this.logger?.debug('response', { method: init.method, url, status: response.status });
            return response;
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                this.logger?.warn('request timed out', { method: init.method, url });
                throw new this.errorConstructor('Request timed out', 408);
            }
            this.logger?.warn('request failed (network error)', { method: init.method, url });
            throw err;
        } finally {
            if (id) clearTimeout(id);
        }
    }

    private async parseAndValidate<T extends z.ZodTypeAny>(
        response: Response,
        schema: T
    ): Promise<z.infer<T>> {
        const text = await response.text();
        let parsed: unknown;

        try {
            parsed = text ? JSON.parse(text) : {};
        } catch {
            parsed = text;
        }

        if (!response.ok) {
            const errorResult = APIErrorSchema.safeParse(parsed);
            const message = errorResult.success
                ? errorResult.data.error
                : response.statusText || 'Request failed';
            throw new this.errorConstructor(message, response.status, parsed);
        }

        const result = schema.safeParse(parsed);
        if (!result.success) {
            this.logger?.warn('response validation failed', {
                url: response.url,
                issue: result.error.message
            });
            throw new this.errorConstructor(
                `Response validation failed: ${result.error.message}`,
                response.status,
                parsed
            );
        }

        return result.data;
    }

    private async parseAndThrow(response: Response): Promise<never> {
        const text = await response.text();
        let parsed: unknown;

        try {
            parsed = text ? JSON.parse(text) : {};
        } catch {
            parsed = text;
        }

        const errorResult = APIErrorSchema.safeParse(parsed);
        const message = errorResult.success
            ? errorResult.data.error
            : response.statusText || 'Request failed';

        throw new this.errorConstructor(message, response.status, parsed);
    }
}
