import { describe, expect, it } from 'vitest';

import {
    decodeOnboardingMessagePayload,
    encodeOnboardingMessagePayload
} from '../src/onboarding/onboarding-message-payload';
import { u16be, u8be } from '../src/utils/buffer';

const MASTER_KEY = Buffer.alloc(32, 0xa1);
const INVITER_IK_PUB = Buffer.alloc(32, 0xb2);

function legacyPayload(masterKey: Buffer): Buffer {
    return Buffer.concat([u8be(0x01), u16be(masterKey.length), masterKey]);
}

describe('onboarding message payload', () => {
    it('round-trips the master key and the inviter identity key', () => {
        const decoded = decodeOnboardingMessagePayload(
            encodeOnboardingMessagePayload({
                masterKey: MASTER_KEY,
                inviterIkPub: INVITER_IK_PUB
            })
        );

        expect(decoded.masterKey.equals(MASTER_KEY)).toBe(true);
        expect(decoded.inviterIkPub?.equals(INVITER_IK_PUB)).toBe(true);
    });

    it('reads a payload written before the inviter key existed', () => {
        const decoded = decodeOnboardingMessagePayload(legacyPayload(MASTER_KEY));

        expect(decoded.masterKey.equals(MASTER_KEY)).toBe(true);
        expect(decoded.inviterIkPub).toBeNull();
    });

    /* the field is appended rather than versioned so an older receiver keeps onboarding */
    it('leaves a legacy decoder reading the master key it expects', () => {
        const payload = encodeOnboardingMessagePayload({
            masterKey: MASTER_KEY,
            inviterIkPub: INVITER_IK_PUB
        });

        expect(payload.readUInt8(0)).toBe(0x01);
        expect(payload.readUInt16BE(1)).toBe(MASTER_KEY.length);
        expect(payload.subarray(3, 3 + MASTER_KEY.length).equals(MASTER_KEY)).toBe(true);
    });

    it('reports a truncated trailing field as absent rather than throwing', () => {
        const payload = encodeOnboardingMessagePayload({
            masterKey: MASTER_KEY,
            inviterIkPub: INVITER_IK_PUB
        });

        const decoded = decodeOnboardingMessagePayload(payload.subarray(0, payload.length - 4));

        expect(decoded.masterKey.equals(MASTER_KEY)).toBe(true);
        expect(decoded.inviterIkPub).toBeNull();
    });

    it('rejects an unknown version', () => {
        const payload = encodeOnboardingMessagePayload({
            masterKey: MASTER_KEY,
            inviterIkPub: null
        });
        payload.writeUInt8(0x02, 0);

        expect(() => decodeOnboardingMessagePayload(payload)).toThrow(
            'Unsupported onboarding message version: 2'
        );
    });
});
