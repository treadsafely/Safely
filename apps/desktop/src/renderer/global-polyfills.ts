import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { Buffer } from 'buffer';

import type { IsomorphicEventSource, SafelyCrypto } from '@safely/sync';
import { XHREventSource } from '@safely/xhr-event-source';

const pbkdf2Sha512: SafelyCrypto['pbkdf2Sha512'] = (password, salt, iterations, keyLength) =>
    pbkdf2Async(sha512, password, salt, { c: iterations, dkLen: keyLength });

/* `buffer@6` predates base64url, which `@safely/sync` writes every CRDT snapshot in. */
type BufferFrom = (value: unknown, encoding?: string) => Uint8Array;
type BufferToString = (encoding?: string, start?: number, end?: number) => string;

const fromBase64Url = (value: string): string => value.replaceAll('-', '+').replaceAll('_', '/');
const toBase64Url = (value: string): string =>
    value.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');

const bufferStatic = Buffer as unknown as { from: BufferFrom };
const bufferPrototype = Buffer.prototype as unknown as { toString: BufferToString };

const bufferFrom: BufferFrom = bufferStatic.from.bind(bufferStatic);
const bufferToString: BufferToString = bufferPrototype.toString;

bufferStatic.from = (value, encoding) =>
    typeof value === 'string' && encoding === 'base64url'
        ? bufferFrom(fromBase64Url(value), 'base64')
        : bufferFrom(value, encoding);

bufferPrototype.toString = function toStringWithBase64Url(encoding, start, end) {
    return encoding === 'base64url'
        ? toBase64Url(bufferToString.call(this, 'base64', start, end))
        : bufferToString.call(this, encoding, start, end);
};

globalThis.Buffer ??= Buffer as unknown as typeof globalThis.Buffer;

globalThis.safelyCrypto ??= { pbkdf2Sha512 };

/* The SSE stream sends an Authorization header, which the native `EventSource` cannot do. The XHR
   implementation shared with mobile needs `XMLHttpRequest` — present in every renderer and extension
   page, absent in a service worker and in node. */
(globalThis as { IsomorphicEventSource?: IsomorphicEventSource }).IsomorphicEventSource ??=
    XHREventSource as unknown as IsomorphicEventSource;
