import { u16be, u8be } from '../utils/buffer';

export type OnboardingMessagePayload = {
    masterKey: Buffer;
    /* absent when the sender predates the field — see doc/spec.md 2.2 */
    inviterIkPub: Buffer | null;
};

export function encodeOnboardingMessagePayload(message: OnboardingMessagePayload): Buffer {
    const parts = [
        u8be(0x01), // version
        u16be(message.masterKey.length),
        message.masterKey
    ];

    if (message.inviterIkPub !== null) {
        parts.push(u16be(message.inviterIkPub.length), message.inviterIkPub);
    }

    return Buffer.concat(parts);
}

export function decodeOnboardingMessagePayload(data: Buffer): OnboardingMessagePayload {
    let offset = 0;
    const version = data.readUInt8(offset);
    offset += 1;
    if (version !== 0x01) {
        throw new Error(`Unsupported onboarding message version: ${version}`);
    }

    const masterKeyLength = data.readUInt16BE(offset);
    offset += 2;
    const masterKey = data.slice(offset, offset + masterKeyLength);
    offset += masterKeyLength;

    return { masterKey, inviterIkPub: readOptionalField(data, offset) };
}

function readOptionalField(data: Buffer, offset: number): Buffer | null {
    if (offset + 2 > data.length) {
        return null;
    }

    const length = data.readUInt16BE(offset);
    const start = offset + 2;

    return start + length > data.length ? null : Buffer.from(data.subarray(start, start + length));
}
