import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const GRAPHQL_URL = 'https://api.expo.dev/graphql';

export const describeStatus = status =>
    status === 401 || status === 403 ? ' — check EXPO_TOKEN' : '';

// Bearer for a token, `expo-session` for a CLI login: the two forms eas-cli
// itself accepts, in the same order of precedence. The session fallback is what
// makes anything here runnable on a laptop against a real build, which is how it
// was tested without spending one.
export function authHeaders(token = process.env.EXPO_TOKEN) {
    if (token) return { authorization: `Bearer ${token}` };

    const statePath = join(homedir(), '.expo/state.json');
    if (existsSync(statePath)) {
        try {
            const secret = JSON.parse(readFileSync(statePath, 'utf8')).auth?.sessionSecret;
            if (secret) return { 'expo-session': secret };
        } catch {
            // A malformed state file is the same as no credentials at all.
        }
    }

    throw new Error('no credentials — set EXPO_TOKEN, or log in with `eas login`');
}

// GraphQL answers 200 with an `errors` array, so the status code alone says
// nothing about whether the query worked.
export async function queryExpo(http, { label, query, variables, token }) {
    const payload = await http.withRetries(label, () =>
        http.postJson(
            GRAPHQL_URL,
            { query, variables },
            { headers: authHeaders(token), describeStatus }
        )
    );
    if (payload.errors?.length)
        throw new Error(payload.errors.map(error => error.message).join('; '));
    return payload.data;
}
