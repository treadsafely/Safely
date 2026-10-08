import type { Clock } from '../clock';
import { systemClock } from '../clock';
import type { JsonValue } from '../json';
import type { MergeProtocol } from '../merge-protocol';
import type { ContainerSlot, Slot } from '../slots';
import {
    createContainerSlot,
    createOriginContainer,
    createTombstoneSlot,
    isContainerSlot,
    isTombstoneSlot
} from '../slots';
import type { StorageVersion } from './version';
import { slotFromJson, stripSlot } from '../slots/slot-json';
import { validateSlot } from '../slots/slot-validation';

export type VersionSelector = number | Pick<StorageVersion, 'version'>;
export const DEVICES_KEY = 'devices';
export const VERSION_DELETION_KEY = 'versionDeletion';
export const VERSION_DELETION_GRACE_PERIOD_SECONDS = 90 * 24 * 60 * 60; // 90 days
const SHOULD_BE_DELETED_AT_KEY = 'shouldBeDeletedAt';

export type TombstoneStamp = {
    timestamp: number;
    author: string;
};

type VersionControllerProtocol = Pick<MergeProtocol, 'id' | 'tick'>;

export class VersionController {
    constructor(
        private readonly root: ContainerSlot,
        private readonly versions: readonly StorageVersion[],
        private readonly protocol: VersionControllerProtocol,
        private readonly clock: Clock = systemClock
    ) {}

    public get(version: VersionSelector): Slot | undefined {
        return this.root.v[this.versionKey(version)];
    }

    public createInitialVersion(): ContainerSlot {
        const latest = this.latestVersion();
        const initial =
            typeof latest.initial === 'function'
                ? (latest.initial as () => unknown)()
                : latest.initial;
        const parsed = latest.schema.parse(initial);
        const slot = slotFromJson(parsed as JsonValue, 0, '');

        if (!isContainerSlot(slot)) {
            throw new Error('Initial version must be a container');
        }

        this.root.v[this.versionKey(latest)] = slot;
        return slot;
    }

    public createVersionFrom(version: VersionSelector): ContainerSlot | undefined {
        const fromIndex = this.versionIndex(version);
        const source = this.get(version);

        if (!isContainerSlot(source)) {
            return undefined;
        }

        let current = source;

        for (let index = fromIndex + 1; index < this.versions.length; index += 1) {
            const toVersion = this.versions[index];
            const projected = toVersion.projectUp(current);
            this.validateVersionSlot(toVersion, projected);
            current = projected;
        }

        this.root.v[this.versionKey(this.latestVersion())] = current;
        return current;
    }

    public delete(version: VersionSelector): void {
        this.deleteWithStamp(version);
    }

    public getDeviceVersion(authorId: string): number | undefined {
        const devices = this.root.v[DEVICES_KEY];
        if (!isContainerSlot(devices)) {
            return undefined;
        }

        const device = devices.v[authorId];
        if (!isContainerSlot(device)) {
            return undefined;
        }

        const version = device.v.version;
        if (version === undefined || isContainerSlot(version) || isTombstoneSlot(version)) {
            return undefined;
        }

        return typeof version?.v === 'number' ? version.v : undefined;
    }

    public setDeviceVersion(
        authorId: string,
        version: number,
        timestamp: number,
        author: string
    ): void {
        this.versionIndex(version);
        const devices = this.devicesContainer();
        const existingDevice = devices.v[authorId];
        const device = isContainerSlot(existingDevice)
            ? existingDevice
            : createContainerSlot(timestamp, author);

        device.v.version = slotFromJson(this.versionNumber(version), timestamp, author);
        devices.v[authorId] = device;
    }

    public deleteAuthor(authorId: string): boolean {
        const devices = this.root.v[DEVICES_KEY];
        if (!isContainerSlot(devices)) {
            return false;
        }

        const device = devices.v[authorId];
        if (device === undefined || isTombstoneSlot(device)) {
            return false;
        }

        devices.v[authorId] = this.tombstoneFor();
        return true;
    }

    public deleteVersionsUnusedByDevices(): void {
        const usedVersions = this.usedDeviceVersions();
        const now = this.wallTime();

        for (const version of this.versions) {
            const versionKey = this.versionKey(version);
            const versionSlot = this.get(version);

            if (versionSlot === undefined || isTombstoneSlot(versionSlot)) {
                this.deleteVersionDeletionMarker(versionKey);
                continue;
            }

            if (usedVersions.has(version.version)) {
                this.deleteVersionDeletionMarker(versionKey);
                continue;
            }

            const shouldBeDeletedAt = this.getVersionShouldBeDeletedAt(versionKey);

            if (shouldBeDeletedAt === undefined) {
                this.setVersionShouldBeDeletedAt(
                    versionKey,
                    now + VERSION_DELETION_GRACE_PERIOD_SECONDS
                );
                continue;
            }

            if (now >= shouldBeDeletedAt) {
                this.delete(version);
                this.deleteVersionDeletionMarker(versionKey);
            }
        }
    }

    private deleteWithStamp(version: VersionSelector, stamp?: TombstoneStamp): void {
        const key = this.versionKey(version);
        const existing = this.root.v[key];
        if (existing === undefined) {
            return;
        }

        this.root.v[key] = this.tombstoneFor(stamp);
    }

    private latestVersion(): StorageVersion {
        const latest = this.versions[this.versions.length - 1];

        if (latest === undefined) {
            throw new Error('Storage must have at least one version');
        }

        return latest;
    }

    private versionIndex(version: VersionSelector): number {
        const versionNumber = this.versionNumber(version);
        const index = this.versions.findIndex(candidate => candidate.version === versionNumber);

        if (index < 0) {
            throw new Error(`Unknown storage version ${versionNumber}`);
        }

        return index;
    }

    private versionKey(version: VersionSelector): string {
        return String(this.versionNumber(version));
    }

    private versionNumber(version: VersionSelector): number {
        return typeof version === 'number' ? version : version.version;
    }

    private wallTime(): number {
        return this.clock.nowSeconds();
    }

    private devicesContainer(): ContainerSlot {
        const devices = this.root.v[DEVICES_KEY];

        if (isContainerSlot(devices)) {
            return devices;
        }

        const created = createOriginContainer();
        this.root.v[DEVICES_KEY] = created;
        return created;
    }

    private versionDeletionContainer(): ContainerSlot {
        const versionDeletion = this.root.v[VERSION_DELETION_KEY];

        if (isContainerSlot(versionDeletion)) {
            return versionDeletion;
        }

        const created = createOriginContainer();
        this.root.v[VERSION_DELETION_KEY] = created;
        return created;
    }

    private getVersionShouldBeDeletedAt(versionKey: string): number | undefined {
        const versionDeletion = this.root.v[VERSION_DELETION_KEY];
        if (!isContainerSlot(versionDeletion)) {
            return undefined;
        }

        const marker = versionDeletion.v[versionKey];
        if (!isContainerSlot(marker)) {
            return undefined;
        }

        const shouldBeDeletedAt = marker.v[SHOULD_BE_DELETED_AT_KEY];
        if (
            shouldBeDeletedAt === undefined ||
            isContainerSlot(shouldBeDeletedAt) ||
            isTombstoneSlot(shouldBeDeletedAt)
        ) {
            return undefined;
        }

        return typeof shouldBeDeletedAt.v === 'number' ? shouldBeDeletedAt.v : undefined;
    }

    private setVersionShouldBeDeletedAt(versionKey: string, shouldBeDeletedAt: number): void {
        const versionDeletion = this.versionDeletionContainer();
        versionDeletion.v[versionKey] = slotFromJson(
            { [SHOULD_BE_DELETED_AT_KEY]: shouldBeDeletedAt },
            this.protocol.tick(),
            this.protocol.id
        );
    }

    private deleteVersionDeletionMarker(versionKey: string): void {
        const versionDeletion = this.root.v[VERSION_DELETION_KEY];
        if (!isContainerSlot(versionDeletion)) {
            return;
        }

        const marker = versionDeletion.v[versionKey];
        if (marker !== undefined && !isTombstoneSlot(marker)) {
            versionDeletion.v[versionKey] = this.tombstoneFor();
        }
    }

    private usedDeviceVersions(): Set<number> {
        const devices = this.root.v[DEVICES_KEY];
        const usedVersions = new Set<number>();

        if (!isContainerSlot(devices)) {
            return usedVersions;
        }

        for (const authorId of Object.keys(devices.v)) {
            const device = devices.v[authorId];

            if (!isContainerSlot(device)) {
                continue;
            }

            const version = device.v.version;

            if (version === undefined || isContainerSlot(version) || isTombstoneSlot(version)) {
                continue;
            }

            if (typeof version?.v === 'number') {
                usedVersions.add(version.v);
            }
        }

        return usedVersions;
    }

    private validateVersionSlot(version: StorageVersion, projected: ContainerSlot): void {
        validateSlot(projected);
        version.schema.parse(stripSlot(projected));
    }

    private tombstoneFor(stamp?: TombstoneStamp): Slot {
        const resolved = stamp ?? this.createProtocolStamp();

        return createTombstoneSlot(resolved.timestamp, resolved.author);
    }

    private createProtocolStamp(): TombstoneStamp {
        return {
            timestamp: this.protocol.tick(),
            author: this.protocol.id
        };
    }
}
