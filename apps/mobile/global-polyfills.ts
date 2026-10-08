/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
// noinspection SuspiciousTypeOfGuard

import '@formatjs/intl-getcanonicallocales/polyfill.js';
import '@formatjs/intl-locale/polyfill.js';

import '@formatjs/intl-pluralrules/polyfill.js';
import '@formatjs/intl-pluralrules/locale-data/en.js';
import '@formatjs/intl-pluralrules/locale-data/ru.js';

import '@formatjs/intl-numberformat/polyfill.js';
import '@formatjs/intl-numberformat/locale-data/en.js';
import '@formatjs/intl-numberformat/locale-data/ru.js';

import '@formatjs/intl-relativetimeformat/polyfill.js';
import '@formatjs/intl-relativetimeformat/locale-data/en.js';
import '@formatjs/intl-relativetimeformat/locale-data/ru.js';
import * as Crypto from 'expo-crypto';

/**
 *  Explicit resources management polyfills
 */

if (typeof Symbol.dispose !== 'symbol') {
    (Symbol as any).dispose = Symbol.for('Symbol.dispose');
}
if (typeof Symbol.asyncDispose !== 'symbol') {
    (Symbol as any).asyncDispose = Symbol.for('Symbol.asyncDispose');
}
if (typeof global.SuppressedError === 'undefined') {
    class SuppressedError extends Error {
        public error: unknown;
        public suppressed: unknown;
        constructor(error: unknown, suppressed: unknown, message?: string) {
            super(message ?? 'SuppressedError');
            this.name = 'SuppressedError';
            this.error = error;
            this.suppressed = suppressed;
        }
    }

    (global as any).SuppressedError = SuppressedError;
}

/**
 *  We use `require` (not `import`) below: ES `import` statements are hoisted
 *  above the imperative polyfill assignments above `Symbol.dispose`.
 */

/**
 *  Buffer polyfill
 */
global.Buffer = require('@craftzdog/react-native-buffer').Buffer;

/**
 * crypto polyfills
 */
(global.crypto as any) = {
    ...Crypto,
    randomBytes: Crypto.getRandomBytes
};

/**
 *  EventSource polyfill
 */
const { XHREventSource } = require('@safely/xhr-event-source');
(global as any).IsomorphicEventSource = XHREventSource;

/**
 * Safely crypto implementations
 */
require('./safely-crypto');
require('./safely-flame');
