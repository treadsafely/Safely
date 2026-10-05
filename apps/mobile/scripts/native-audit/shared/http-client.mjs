import { sleep } from './util.mjs';

// Shared by both database clients. A run that could not reach a database must not
// be indistinguishable from a clean one, so exhausting the retries throws rather
// than returning an empty answer.
export class HttpClient {
    constructor({ attempts = 3, retryBaseMs = 5000, timeoutMs = 60000, log = console } = {}) {
        this.attempts = attempts;
        this.retryBaseMs = retryBaseMs;
        this.timeoutMs = timeoutMs;
        this.log = log;
    }

    async withRetries(label, work) {
        let lastError = 'unknown error';
        for (let attempt = 1; attempt <= this.attempts; attempt++) {
            try {
                return await work();
            } catch (error) {
                lastError = error.message;
                if (attempt < this.attempts) {
                    const wait = this.retryBaseMs * attempt;
                    this.log.warn(`${label} failed (${lastError}) — retrying in ${wait / 1000}s`);
                    await sleep(wait);
                }
            }
        }
        throw new Error(lastError);
    }

    async request(url, { describeStatus, ...init } = {}) {
        const response = await fetch(url, {
            ...init,
            signal: AbortSignal.timeout(this.timeoutMs)
        });
        if (!response.ok) {
            const detail = describeStatus?.(response.status) ?? '';
            throw new Error(`HTTP ${response.status} from ${url}${detail}`);
        }
        return response;
    }

    async getJson(url, options) {
        return (await this.request(url, options)).json();
    }

    async postJson(url, body, { headers, ...options } = {}) {
        return (
            await this.request(url, {
                ...options,
                method: 'POST',
                headers: { 'content-type': 'application/json', ...headers },
                body: JSON.stringify(body)
            })
        ).json();
    }
}
