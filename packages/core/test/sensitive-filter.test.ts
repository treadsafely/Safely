import { describe, it, expect } from 'vitest';

import { filterSensitiveData } from '../src';

describe('filterSensitiveData', () => {
    describe('hex private keys', () => {
        it('should redact a 64-char lowercase hex string', () => {
            const key = 'a'.repeat(64);
            expect(filterSensitiveData(`key: ${key}`)).toBe('key: [REDACTED:key:aaaa…aaaa]');
        });

        it('should redact a 64-char mixed-case hex string', () => {
            const key = 'aB3f'.repeat(16);
            expect(filterSensitiveData(key)).toBe('[REDACTED:key:aB3f…aB3f]');
        });

        it('should not redact a 63-char hex string', () => {
            const short = 'a'.repeat(63);
            expect(filterSensitiveData(short)).toBe(short);
        });

        it('should not redact a 65-char hex string', () => {
            const long = 'a'.repeat(65);
            expect(filterSensitiveData(long)).toBe(long);
        });

        it('should redact a 128-char hex string (ed25519 private key)', () => {
            const key = 'a'.repeat(128);
            expect(filterSensitiveData(`self_ik_prv: ${key}`)).toBe(
                'self_ik_prv: [REDACTED:key:aaaa…aaaa]'
            );
        });

        it('should redact a 32-char hex string (16-byte secret / raw seed entropy)', () => {
            const key = 'a'.repeat(32);
            expect(filterSensitiveData(key)).toBe('[REDACTED:key:aaaa…aaaa]');
        });

        it('should not redact a 31-char hex string', () => {
            const short = 'a'.repeat(31);
            expect(filterSensitiveData(short)).toBe(short);
        });

        it('should not redact a 127-char (odd) hex string', () => {
            const odd = 'a'.repeat(127);
            expect(filterSensitiveData(odd)).toBe(odd);
        });

        it('should keep the edges of an accountID embedded in a storage key path', () => {
            const accountId = '0123456789abcdef0123456789abcdef';
            const input = `called "setItem" for key "sync..${accountId}..master_key"`;
            expect(filterSensitiveData(input)).toBe(
                'called "setItem" for key "sync..[REDACTED:key:0123…cdef]..master_key"'
            );
        });

        it('should redact multiple hex keys in the same string', () => {
            const k1 = 'a'.repeat(64);
            const k2 = 'b'.repeat(64);
            const result = filterSensitiveData(`${k1} and ${k2}`);
            expect(result).toBe('[REDACTED:key:aaaa…aaaa] and [REDACTED:key:bbbb…bbbb]');
        });
    });

    describe('Bearer tokens', () => {
        it('should redact Bearer token', () => {
            expect(filterSensitiveData('Bearer abc123xyz789')).toBe('Bearer [REDACTED]');
        });

        it('should handle tokens with base64 chars', () => {
            expect(filterSensitiveData('Bearer abc+def/ghi=')).toBe('Bearer [REDACTED]');
        });
    });

    describe('JWTs', () => {
        it('should redact a standard JWT', () => {
            const jwt =
                'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
            expect(filterSensitiveData(jwt)).toBe('[REDACTED:jwt]');
        });

        it('should not redact a short eyJ string', () => {
            expect(filterSensitiveData('eyJhbGci.ey.e')).toBe('eyJhbGci.ey.e');
        });
    });

    describe('xprv keys', () => {
        it('should redact an xprv key', () => {
            const xprv = 'xprv' + 'A'.repeat(107);
            expect(filterSensitiveData(xprv)).toBe('[REDACTED:xprv]');
        });

        it('should redact tprv variant', () => {
            const tprv = 'tprv' + 'B'.repeat(107);
            expect(filterSensitiveData(tprv)).toBe('[REDACTED:xprv]');
        });

        it('should redact vprv variant', () => {
            const vprv = 'vprv' + 'C'.repeat(107);
            expect(filterSensitiveData(vprv)).toBe('[REDACTED:xprv]');
        });
    });

    describe('xpub keys', () => {
        const xpub =
            'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8';

        it('should mask an xpub down to its prefix and tail', () => {
            expect(filterSensitiveData(xpub)).toBe('[REDACTED:xpub:xpub…cet8]');
        });

        it('should mask zpub and vpub variants', () => {
            const body = xpub.slice(4);
            expect(filterSensitiveData(`zpub${body}`)).toBe('[REDACTED:xpub:zpub…cet8]');
            expect(filterSensitiveData(`vpub${body}`)).toBe('[REDACTED:xpub:vpub…cet8]');
        });

        it('should mask an xpub inside a descriptor url', () => {
            const url = `https://api.example/v1/utxos/wpkh(${xpub})`;
            expect(filterSensitiveData(url)).toBe(
                'https://api.example/v1/utxos/wpkh([REDACTED:xpub:xpub…cet8])'
            );
        });

        it('should not mask a truncated xpub', () => {
            const short = xpub.slice(0, 40);
            expect(filterSensitiveData(short)).toBe(short);
        });

        it('should be stable on an already masked xpub', () => {
            const once = filterSensitiveData(xpub);
            expect(filterSensitiveData(once)).toBe(once);
        });
    });

    describe('generic credentials', () => {
        it('should redact api_key patterns', () => {
            const input = 'api_key: abcdefghijklmnopqr';
            expect(filterSensitiveData(input)).toBe('[REDACTED:credential]');
        });

        it('should redact token patterns (case-insensitive)', () => {
            const input = 'Token: abcdefghijklmnopqrstuvwx';
            expect(filterSensitiveData(input)).toBe('[REDACTED:credential]');
        });

        it('should redact password patterns', () => {
            const input = 'password=supersecretpassword1';
            expect(filterSensitiveData(input)).toBe('[REDACTED:credential]');
        });

        it('should not redact values shorter than 16 chars', () => {
            const input = 'token: short';
            expect(filterSensitiveData(input)).toBe('token: short');
        });
    });

    describe('mnemonic detection', () => {
        const mnemonic12 =
            'abandon ability able about above absent absorb abstract absurd abuse access accident';

        it('should redact 12 consecutive BIP39 words', () => {
            expect(filterSensitiveData(mnemonic12)).toBe('[REDACTED:mnemonic]');
        });

        it('should redact 24 consecutive BIP39 words', () => {
            const mnemonic24 = mnemonic12 + ' ' + mnemonic12;
            expect(filterSensitiveData(mnemonic24)).toBe('[REDACTED:mnemonic]');
        });

        it('should not redact 11 consecutive BIP39 words', () => {
            const words11 =
                'abandon ability able about above absent absorb abstract absurd abuse access';
            expect(filterSensitiveData(words11)).toBe(words11);
        });

        it('should preserve surrounding text', () => {
            const input = `prefix ${mnemonic12} suffix`;
            expect(filterSensitiveData(input)).toBe('prefix [REDACTED:mnemonic] suffix');
        });

        it('should handle mnemonic at end of string', () => {
            const input = `logging: ${mnemonic12}`;
            expect(filterSensitiveData(input)).toBe('logging: [REDACTED:mnemonic]');
        });

        it('should be case-insensitive', () => {
            const upper = mnemonic12.toUpperCase();
            expect(filterSensitiveData(upper)).toBe('[REDACTED:mnemonic]');
        });
    });

    describe('mnemonic inside serialized JSON', () => {
        const mnemonic12 =
            'abandon ability able about above absent absorb abstract absurd abuse access accident';
        const words12 = mnemonic12.split(' ');

        it('should redact a mnemonic embedded in a JSON object string', () => {
            const json = JSON.stringify({ mnemonic: mnemonic12 });
            expect(filterSensitiveData(json)).toBe('{"mnemonic":"[REDACTED:mnemonic]"}');
        });

        it('should redact a 13-word phrase in a JSON object (interior run below old threshold)', () => {
            const phrase = `${mnemonic12} achieve`;
            const json = JSON.stringify({ recovery: phrase });
            expect(filterSensitiveData(json)).toBe('{"recovery":"[REDACTED:mnemonic]"}');
        });

        it('should redact a mnemonic stored as a JSON array of words', () => {
            const json = JSON.stringify(words12);
            expect(filterSensitiveData(json)).toBe('"[REDACTED:mnemonic]"');
        });

        it('should redact a mnemonic nested in a JSON array field', () => {
            const json = JSON.stringify({ words: words12 });
            expect(filterSensitiveData(json)).toBe('{"words":"[REDACTED:mnemonic]"}');
        });

        it('should redact a word array by shape even without dictionary words', () => {
            const json = JSON.stringify([
                'zzz',
                'qqq',
                'xyzzy',
                'foobar',
                'plugh',
                'wibble',
                'wobble',
                'flob',
                'grault',
                'garply',
                'waldo',
                'fred'
            ]);
            expect(filterSensitiveData(json)).toBe('"[REDACTED:mnemonic]"');
        });

        it('should preserve surrounding JSON structure', () => {
            const json = JSON.stringify({ id: 'abc', mnemonic: mnemonic12, ok: true });
            expect(filterSensitiveData(json)).toBe(
                '{"id":"abc","mnemonic":"[REDACTED:mnemonic]","ok":true}'
            );
        });

        it('should redact a private key embedded in a JSON object string', () => {
            const key = 'a'.repeat(128);
            const json = JSON.stringify({ dmk_prv: key });
            expect(filterSensitiveData(json)).toBe('{"dmk_prv":"[REDACTED:key:aaaa…aaaa]"}');
        });
    });

    describe('false-positive guards', () => {
        it('should not redact ordinary English with scattered BIP39 words', () => {
            const text =
                'the quick brown fox jumps over the lazy dog and runs about above the access point';
            expect(filterSensitiveData(text)).toBe(text);
        });

        it('should not redact 11 BIP39 words stored as a JSON array', () => {
            const words11 = [
                'abandon',
                'ability',
                'able',
                'about',
                'above',
                'absent',
                'absorb',
                'abstract',
                'absurd',
                'abuse',
                'access'
            ];
            const json = JSON.stringify(words11);
            expect(filterSensitiveData(json)).toBe(json);
        });
    });

    describe('idempotency on new cases', () => {
        const mnemonic12 =
            'abandon ability able about above absent absorb abstract absurd abuse access accident';

        it('should be stable on a JSON object mnemonic', () => {
            const json = JSON.stringify({ mnemonic: mnemonic12 });
            const once = filterSensitiveData(json);
            expect(filterSensitiveData(once)).toBe(once);
        });

        it('should be stable on a JSON array mnemonic', () => {
            const json = JSON.stringify(mnemonic12.split(' '));
            const once = filterSensitiveData(json);
            expect(filterSensitiveData(once)).toBe(once);
        });

        it('should be stable on a 128-char hex key', () => {
            const once = filterSensitiveData('a'.repeat(128));
            expect(filterSensitiveData(once)).toBe(once);
        });
    });

    describe('combined', () => {
        it('should redact both hex key and mnemonic', () => {
            const key = 'f'.repeat(64);
            const mnemonic =
                'abandon ability able about above absent absorb abstract absurd abuse access accident';
            const input = `key ${key} words ${mnemonic}`;
            expect(filterSensitiveData(input)).toContain('[REDACTED:key:ffff…ffff]');
            expect(filterSensitiveData(input)).toContain('[REDACTED:mnemonic]');
        });

        it('should return unchanged input when nothing sensitive', () => {
            const input = 'just a normal log message about sync';
            expect(filterSensitiveData(input)).toBe(input);
        });

        it('should handle empty string', () => {
            expect(filterSensitiveData('')).toBe('');
        });

        it('should produce identical results on consecutive calls', () => {
            const key = 'a'.repeat(64);
            const r1 = filterSensitiveData(key);
            const r2 = filterSensitiveData(key);
            expect(r1).toBe(r2);
        });
    });
});
