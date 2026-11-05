import type { MergeProtocol, MergeStats } from './merge-protocol';
import type { ContainerSlot, Slot } from './slots';
import { createOriginContainer, isContainerSlot } from './slots';
import { cloneDeep, stripSlot } from './slots/slot-json';
import { validateSlot } from './slots/slot-validation';
import type { StorageVersion } from './versioning/version';
import { VersionController } from './versioning/version-controller';
import { VersionPropagation } from './versioning/version-propagation';
import type { Draft } from './write';
import { createDraft, selectJsonStorage } from './write';

export class WorkingStorageRoot {
    constructor(
        private readonly root: ContainerSlot,
        private readonly versions: readonly StorageVersion[]
    ) {}

    public update<T>(
        fn: (draft: Draft<T>) => void,
        timestamp: number,
        author: string,
        protocol: MergeProtocol
    ): boolean {
        let updated = false;
        const draft = createDraft<T>(
            selectJsonStorage(this.latestContainer(), timestamp, author),
            () => {
                updated = true;
            }
        );

        fn(draft);

        this.validateLatest();
        new VersionPropagation(this.versions, protocol).propagateToOlderVersions(this.root);

        return updated;
    }

    public merge(protocol: MergeProtocol, incoming: ContainerSlot): MergeStats {
        validateSlot(incoming);

        const before = cloneDeep(this.root);
        const stats = protocol.merge(this.root, incoming);

        const controller = new VersionController(this.root, this.versions, protocol, {
            nowSeconds: () => protocol.wallTime()
        });
        if (controller.deleteVersionsUnusedByDevices()) {
            stats.updated += 1;
        }

        const propagation = new VersionPropagation(this.versions, protocol);
        propagation.propagateChangedOlderVersionsToNewer(before, this.root);

        this.validateLatest();
        propagation.propagateToOlderVersions(this.root);

        return stats;
    }

    public get<T>(): T {
        const value = stripSlot(this.latestContainer());

        return this.latestVersion().schema.parse(value) as T;
    }

    public topLevelSlot(key: string): Slot | undefined {
        return this.latestContainer().v[key];
    }

    public result(): ContainerSlot {
        return this.root;
    }

    private latestVersion(): StorageVersion {
        const latest = this.versions[this.versions.length - 1];

        if (latest === undefined) {
            throw new Error('Storage must have at least one version');
        }

        return latest;
    }

    private latestContainer(): ContainerSlot {
        const key = String(this.latestVersion().version);
        const slot = this.root.v[key];

        if (!isContainerSlot(slot)) {
            this.root.v[key] = createOriginContainer();
        }

        return this.root.v[key] as ContainerSlot;
    }

    private validateLatest(): unknown {
        return this.latestVersion().schema.parse(stripSlot(this.latestContainer()));
    }
}
