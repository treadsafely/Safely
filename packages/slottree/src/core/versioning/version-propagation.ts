import type { MergeProtocol } from '../merge-protocol';
import type { ContainerSlot, Slot } from '../slots';
import { isContainerSlot, SlotKind } from '../slots';
import type { StorageVersion } from './version';
import { DEVICES_KEY } from './version-controller';
import { stripSlot } from '../slots/slot-json';
import { validateSlot } from '../slots/slot-validation';

export class VersionPropagation {
    constructor(
        private readonly versions: readonly StorageVersion[],
        private readonly protocol: MergeProtocol
    ) {}

    public propagateChangedOlderVersionsToNewer(before: ContainerSlot, root: ContainerSlot): void {
        const activeVersions = this.activeVersionsForMerge(root);
        if (activeVersions.size <= 1) {
            return;
        }
        const minVersion = Math.min(...activeVersions);
        const minVersionIndex = this.versions.findIndex(version => version.version === minVersion);

        let current: ContainerSlot | undefined;

        for (let index = minVersionIndex; index < this.versions.length - 1; index += 1) {
            const fromVersion = this.versions[index];
            const toVersion = this.versions[index + 1];

            if (current === undefined) {
                const source = root.v[String(fromVersion.version)];
                const previousSource = before.v[String(fromVersion.version)];

                if (!isContainerSlot(source) || this.slotEquals(source, previousSource)) {
                    continue;
                }

                current = source;
            }

            const projected = toVersion.projectUp(current);
            this.validateVersionSlot(toVersion, projected);
            current = this.mergeIntoExistingVersion(root, toVersion, projected, {
                updateExisting: true,
                createMissing: false
            });
        }
    }

    public propagateToOlderVersions(root: ContainerSlot): void {
        const deviceVersions = this.deviceVersions(root);

        if (deviceVersions.size <= 1) {
            return;
        }
        const minVersion = Math.min(...deviceVersions);
        const minVersionIndex = this.versions.findIndex(version => version.version === minVersion);
        const latestVersion = this.latestVersion().version;

        const latest = root.v[String(latestVersion)];
        if (!isContainerSlot(latest)) {
            return;
        }

        let current = latest;

        for (let index = this.versions.length - 1; index > minVersionIndex; index -= 1) {
            const fromVersion = this.versions[index];
            const toVersion = this.versions[index - 1];

            const projected = fromVersion.projectDown(current);
            this.validateVersionSlot(toVersion, projected);
            current = this.mergeIntoExistingVersion(root, toVersion, projected, {
                updateExisting: deviceVersions.has(toVersion.version),
                createMissing: deviceVersions.has(toVersion.version)
            });
        }
    }

    private latestVersion(): StorageVersion {
        const latest = this.versions[this.versions.length - 1];

        if (latest === undefined) {
            throw new Error('Storage must have at least one version');
        }

        return latest;
    }

    private deviceVersions(root: ContainerSlot): Set<number> {
        const knownVersions = new Set(this.versions.map(version => version.version));
        const deviceVersions = new Set<number>();
        const devices = root.v[DEVICES_KEY];

        if (!isContainerSlot(devices)) {
            return deviceVersions;
        }

        for (const authorId of Object.keys(devices.v)) {
            const device = devices.v[authorId];
            if (!isContainerSlot(device)) {
                continue;
            }

            const version = device.v.version;
            if (
                version?.s === SlotKind.Atomic &&
                typeof version.v === 'number' &&
                knownVersions.has(version.v)
            ) {
                deviceVersions.add(version.v);
            }
        }

        return deviceVersions;
    }

    private activeVersionsForMerge(root: ContainerSlot): Set<number> {
        const activeVersions = this.deviceVersions(root);

        for (const version of Object.keys(root.v)) {
            if (this.versions.find(x => String(x.version) === version)) {
                activeVersions.add(Number(version));
            }
        }

        return activeVersions;
    }

    private mergeIntoExistingVersion(
        root: ContainerSlot,
        version: StorageVersion,
        projected: ContainerSlot,
        options: {
            updateExisting: boolean;
            createMissing: boolean;
        }
    ): ContainerSlot {
        const target = root.v[String(version.version)];

        if (options.updateExisting && isContainerSlot(target)) {
            this.protocol.merge(target, projected);
            return target;
        }

        if (options.createMissing && target === undefined) {
            root.v[String(version.version)] = projected;
        }

        return projected;
    }

    private validateVersionSlot(version: StorageVersion, projected: ContainerSlot): void {
        validateSlot(projected);
        version.schema.parse(stripSlot(projected));
    }

    private slotEquals(left: Slot, right: Slot | undefined): boolean {
        return JSON.stringify(left) === JSON.stringify(right);
    }
}
