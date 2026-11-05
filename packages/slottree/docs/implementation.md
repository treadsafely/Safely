# Slot Tree Implementation

This document describes the implementation of the Slot Tree data structure.

## Slot Structure

Slot Tree contains the following structure:

- `root`: The root slot of the tree. A Container slot. Always an origin slot.
    - `<version>`: Storage version slot. A Container slot. The key is the decimal storage version number.
    - `devices`: Device version registry. A Container slot.
        - `<authorId>`: Device entry. A Container slot.
            - `version`: Atomic slot with the storage version number used by the device.
    - `versionDeletion`: Delayed version deletion registry. A Container slot.
        - `<version>`: Deletion marker for a storage version. A Container slot.
            - `shouldBeDeletedAt`: Atomic slot with Unix time in seconds.

## Author Management

Every Slot Tree manages its own author entry. This way, when two Slot Trees are merged, the resulting Slot Tree will
contain all authors from both trees.

Removing an author must be performed manually, as there is no way to know when an author must be deleted.

## Strong Typing

Unlike the specification, the implementation uses a strongly typed Slot Tree. User storage is defined by a Zod schema,
and the implementation validates that every change satisfies the schema.

This way, the implementation protects the Slot Tree from unwanted changes, while preserving full flexibility of the JSON
structure, as any JSON structure can be described by a Zod schema.

## Snapshots

A Slot Tree encoded as a byte sequence containing the Slot Tree structure is called a snapshot. A snapshot contains all
data, including all tombstones, slot stamps, and versions. A snapshot is used to persist a Slot Tree in persistent
storage and to transfer a Slot Tree between different devices.

The current implementation uses CBOR encoding with additional performance optimizations, such as:
- Author table, which allows short non-negative indexes to be used instead of full author IDs.
- Key tables, which contain all keys with length >= 3 that occur in recursive containers >= 2 times.

> Note: While it is possible to reduce snapshot size even more with custom byte encoding, such a format would require
> additional serialization logic, which would make the implementation more complex. The current implementation is a
> balance between performance and simplicity, and it is expected to be sufficient for Safely use cases.

## Versioning

The core difference between the specification and the actual implementation is versioning. Versioning is built on top of
core Slot Tree concepts and fully satisfies the specification.

Versioning allows two different subtrees to exist in the same storage. These subtrees are fully independent user
storages, each of which contains a full replica of the data, modified by projection rules.

> Note: While a system where each version is a modified full copy can struggle with storage size and performance,
> it is a tradeoff for simplicity. In Safely, it is estimated that storage will stay in the range of 1-10 KB, with
> possible spikes to 100 KB, including metadata such as slot stamps. At this scale, having O(n) storage size is not a
> problem.

Each subtree is typed by its own Zod schema. While versions may be compatible, they are not required to be: every
version is allowed to introduce breaking changes.

Each version has its own version index. A version index is an unsigned integer.

Versions can only go forward or backward. Forks are not allowed. This means that if a version `N` exists, it is
possible to have exactly one version `N - 1` and exactly one version `N + 1`, where `N - 1` is the previous version,
and `N + 1` is the next version. It is not possible to have two different versions that are predecessors of the same
version, or two different versions that are successors of the same version.

This allows data to migrate through versions in a linear way by using projections.

### Known and Actual Versions

Versions are divided into two categories: known versions and actual versions. Known versions refer to versions that are
known to the application, while actual versions refer to versions that are currently present in the storage. Storage
may contain versions that are not known to the application, and known versions may not be present in the storage.

If an author knows versions `N`, `N + 1`, and `N + 2`, the greatest version, `N + 2`, is called the author version, and it
is the only version that the author can modify. The author cannot modify any other version, even if it is known to the
author. The implementation may still modify any version.

Actual versions contain:
- Author versions, which are used by authors from the list.
- Versions preserved for deletion, but not yet deleted.

### Replicas

Two different Slot Tree replicas may have different author versions. This way, two applications with two different
known version lists may operate on the same storage, and each of them will modify only its own author version. Changes
will project from one version to another automatically, using projection functions defined by the user.

### Projections

A projection is a function that converts slots from a version to its predecessor or successor version. So, a projection
can convert version `N` to version `N + 1`, or to version `N - 1`. A projection cannot convert version `N` to version
`N + 2`, or to version `N - 2`, or to any other version that is not a direct successor or predecessor of version `N`.

Projections are defined by the user, and the implementation verifies using the TypeScript type system that they are
valid. Additionally, after a projection is applied, the implementation runs the Zod schema parser to ensure that the
resulting data is valid at runtime.

When data needs to be projected to a version that is not a direct successor or predecessor of the current version, the
implementation will call projections in a chain until the desired version is reached.

Projections convert slots, not values. This means that metadata such as tombstones or slot stamps is preserved between
versions, while slot types and values may change. While this may seem like a contradiction to the specification, it is
not: both subtrees are fully independent, and one may think of them as completely different trees.

Projections must be deterministic, meaning that for the same input they must always produce the same output. The easiest
way to achieve this is to make projections pure functions.

### Storage Modification

When the author version is modified, the implementation will automatically project changes to all other versions present
in the storage. All changes to all versions will be applied as a single atomic transaction, so it is impossible to have a
situation where one version is modified but changes are not projected to other versions.

When storage is modified, projections are called:
1. If there are actual versions with indexes lower than the current author version, downgrade projections are called until
   the lowest version is reached. Intermediate versions that were not persisted in the storage before the operation
   remain unpersisted.
2. If there are actual versions with indexes higher than the current author version, which are also known, upgrade
   projections are called until the highest version is reached. Intermediate versions that were not persisted in the
   storage before the operation remain unpersisted.
3. If there are actual versions with indexes higher than the current author version, which are not known, they are ignored.

### Storage Merge

When two storages are merged, the implementation will automatically project changes from the lowest version that is both
known and actual to the highest version that is both known and actual. This way, when a Slot Tree with a lower author
version is merged into a Slot Tree with a higher author version, all changes will be projected so the author with the
higher version will see all changes from the author with the lower version.

> Note: While it is technically possible to make upgrade projections from the author version of the incoming Slot Tree,
> it is easier to make all projections. This behavior may change in the future, in case performance issues arise.

### Version Creation

A version is created automatically when the local Slot Tree is created from a snapshot that does not contain the author
version. There is no API to create a version manually.

### Version Deletion

A version will be automatically deleted when it is no longer part of the author versions set. There is no manual API for
version deletion.

Version deletion does not happen instantly. Instead, a version is marked for deletion, and it will be deleted after some
time. The actual time can be found in the source code.

When a version is no longer part of the author versions set, a new entry is created in the `versionDeletion` slot, with a
`shouldBeDeletedAt` timestamp based on the current replica's local time.

During Slot Tree startup, the implementation checks whether any versions marked for deletion are ready to be deleted.
If so, their version keys are physically removed from the root container. This is garbage collection: the data remains
available in other schema versions, so no tombstone is created.
