# Slot Tree Specification

This specification describes the core concepts of the Slot Tree data structure and its merge protocol. Anything not
covered in this specification is implementation-defined.

## Slot Tree

A Slot Tree is a tree-shaped data structure whose nodes are slots.

A Slot Tree MAY be strictly typed according to a schema, but this is not enforced.

The root slot MUST be a Container slot. The root slot MUST be an origin slot. The root slot MUST NOT be replaced by
another slot during any valid operation.

## Slots

A Slot is an object that contains a stamp and a value.

Slot values are untyped. The value type MAY change during an edit or during a valid merge.

Slots are mutable but non-deletable. If a slot should be marked as absent, it MUST be replaced with a Tombstone.

### Recursive Slots

A recursive slot is a slot that contains nested slots. Container and OrderedArray slots are recursive slots.

A recursive slot's own stamp determines only the recursive slot version. Child stamps MAY be greater than the parent
slot's stamp.

If a recursive slot is updated or replaced, the entire subtree is removed. Removal occurs even if some child slots
from the old subtree have timestamps greater than the operation timestamp.

### Slot Stamp

A Slot Stamp identifies a particular version of a slot. It contains an `AuthorId` and a `Timestamp`.

`AuthorId` is the byte sequence that identifies the Author that created this version of the slot.

`Timestamp` is a logical timestamp according to the rules in the Time section.

#### Author

An Author is an entity that owns and mutates a Slot Tree replica. Each Author is identified by an `AuthorId`, which is
a byte sequence of arbitrary length.

An Author can create and update slots, but it cannot delete them directly. Deletion is represented by replacing a slot
with a Tombstone.

A single Slot Tree MAY be managed by multiple Authors.

`AuthorId` values are compared lexicographically as unsigned byte sequences. If one byte sequence is a prefix of
another, the shorter sequence is considered smaller.

The empty `AuthorId` is reserved for origin slots and MUST NOT be used by real Authors.

The same `AuthorId` MUST NOT be used by multiple independent logical clocks concurrently.

#### Time

Each Slot Tree replica maintains a monotonically increasing logical clock.

When a new slot timestamp is needed, the replica MUST set its clock to:

`max(current clock, current Unix time in seconds) + 1`

The resulting clock value MUST be used as the slot timestamp.

A timestamp MUST be a non-negative safe integer as defined by the ECMAScript `Number.isSafeInteger` operation. A
snapshot containing any other timestamp MUST be rejected as invalid. If a replica cannot increment its clock while 
keeping the result a safe integer, the local operation MUST fail with a logical-clock exhaustion error instead of 
reusing the current timestamp.

When a replica observes incoming slots during merge, it MUST advance its clock to at least the greatest observed incoming
timestamp before creating any later local timestamp.

### Slot Types

#### Atomic

An Atomic slot contains a single valid JSON value.

The value MAY be a string, number, boolean, null, array, or object. Arrays and objects inside Atomic slots are opaque
values and are not recursively merged.

#### Container

A Container slot contains a key-value map of slots. Each key is a string, and each value is a slot. A Container has its
own stamp, while each child slot has its own stamp. Child stamps MAY be greater than the parent slot's stamp. Child
stamps MUST NOT be less than the parent slot's stamp.

Container slots are recursive slots.

#### Tombstone

A Tombstone slot indicates that a slot is known to have been removed.

A slot replaced by a Tombstone CAN be resurrected by a newer non-Tombstone slot. The resurrecting slot CAN be of any
valid slot type.

A Tombstone slot does not contain a value.

#### OrderedArray

An OrderedArray is a recursive slot that stores items in a key-value map. Each key identifies one array item.
OrderedArray items MUST be addressed by key. The order index is used only to derive the ordered view.

Each non-Tombstone OrderedArray item MUST be a Container slot with at least the following child slots:

- `order`, an Atomic slot containing the order index.
- `value`, a slot containing the item value.

An item Container MAY contain other child slots. An implementation that does not recognize an extra child slot MUST
preserve and merge it using normal recursive slot rules, but MUST NOT use it to derive the ordered view, expose it as
part of the item value, mutate it as part of ordinary item order or value operations, or reject the item solely because
the extra child slot is present.

The order index is a 32-bit integer. The `order` child slot MUST be an Atomic slot containing a 32-bit integer.

The `value` child slot MAY be Atomic, Container, or OrderedArray. The `value` child slot MUST NOT be a Tombstone.

Item order is merged as the `order` child slot of the item Container. Item value is merged as the `value` child slot
of the item Container.

Updating, adding, tombstoning, or moving items inside an OrderedArray MUST NOT change the stamp of the OrderedArray
slot.

Updating an item `order` child slot or `value` child slot MUST NOT change the stamp of the item Container. The item
Container's stamp identifies the existence and type of the item itself, not its current order or value.

When an item is deleted, the item Container slot MUST be replaced with a Tombstone.

When an item is added, it MUST be assigned a new order index.

A non-Tombstone item Container MUST contain both a valid `order` child slot and a valid `value` child slot.

An item Container is invalid if any of the following is true:

- It does not contain a valid `order` child slot.
- It does not contain a valid `value` child slot.
- It contains a Tombstone `order` child slot and a non-Tombstone `value` child slot.
- It contains a Tombstone `value` child slot and a non-Tombstone `order` child slot.
- Its `order` child slot is not an Atomic slot containing a 32-bit integer.
- Its `value` child slot is a Tombstone.

An incoming Slot Tree that contains an invalid OrderedArray item is invalid.

Only valid non-Tombstone item Containers are included in the ordered view.

Items are sorted by order index in ascending order. Different items MAY have the same order index after concurrent
operations. If two or more items have the same order index, they are sorted by lexicographic order of their keys.

Moving an item means updating its `order` child slot. Updating an item's `order` MUST NOT update the stamp of the item
`value`. Updating an item's `value` MUST NOT update the stamp of the item `order`.

### Origin Slot

An origin slot is any slot whose `Timestamp` is `0` and whose `AuthorId` is the empty byte sequence. An origin slot
represents the default, uninitialized value of a slot.

A slot of any type CAN be an origin slot.

The origin stamp is the minimum possible stamp. Any non-origin slot is newer than an origin slot.

> Note: Slots with the same slot stamp MUST have the same value according to `Slot Ordering` rules. This means that
> origin slots in a given position in the tree MUST have the same value.

### Slot Operations

Whenever an Author performs an operation on a slot, a new stamp MUST be assigned to that slot. The new stamp MUST
contain the current logical timestamp and the Author's `AuthorId`.

#### Update Atomic Slot

When updating the value of a slot, the slot type remains the same.

The new value CAN be assigned to the slot. This means that the slot's value can remain the same after the update, but
the stamp still MUST be updated.

#### Update Recursive Slot

When updating the value of a slot, the slot type remains the same.

The new value CAN be assigned to the slot. This means that the slot's value can remain the same after the update, but
the stamp still MUST be updated.

When updating a recursive slot directly, it changes the full subtree of the slot. This means that all previous child slots
will be deleted, and new child slots will be created. The new child-slot structure CAN be different. This ultimately
means that inner child slots will be erased.

When updating a recursive slot directly, a new stamp MUST be assigned to all child slots. This slot stamp MUST be the same
for all child slots of the selected slot.

> NOTE: While the paragraph above may seem to contradict the non-deletability of slots, it does not. The value of the
> recursive slot is the entire subtree, so updating the value of the recursive slot means updating the entire subtree.

> NOTE: Updates to child slots MUST NOT change the parent slot stamp. The parent stamp identifies the recursive slot
> itself, not the transitive contents of its children.

#### Update Slot Type

When updating a slot type, the new slot type MUST be different from the old slot type. The new slot value MUST be
valid for the new slot type.

#### Add Slot to Recursive Slot

When adding a new child slot to a recursive slot, the new slot MUST be added with a new stamp.

#### Delete Slot

A slot MUST NOT be deleted directly. If a slot should be marked as absent, it MUST be replaced with a Tombstone slot.

## Merge Protocol

A Slot Tree merge is a deterministic operation that merges a remote Slot Tree into a local Slot Tree.

The merge operation MUST be idempotent, associative, and commutative.

### Slot Ordering

This ordering defines the conflict resolution rule: the newer slot wins. Two slots are ordered by their slot stamps:

- If two slots have different timestamps, the slot with the greater timestamp is newer.
- If two slots have the same timestamp but different `AuthorId` values, the slot with the lexicographically greater
  `AuthorId` is newer.
- If two slots have the same timestamp and the same `AuthorId`, the slots have equal stamps.

Two slots with equal stamps MUST represent the same slot version. Ordering is undefined when slots with equal stamps
have different slot values or slot types.

If two recursive slots have equal stamps, their child values MAY differ.

### Merge Algorithm

Before merging slot values, the merge operation MUST observe all timestamps from the incoming Slot Tree. This includes
every slot in the incoming tree and every nested slot inside recursive slots.

For OrderedArray slots, observed timestamps include the timestamps of item Container slots, `order` child slots, `value`
child slots, and all nested slots inside recursive `value` child slots.

After all incoming timestamps have been observed, the local logical clock MUST be updated to at least the maximum
observed incoming timestamp.

#### Merge Slot

1. If the incoming slot is not recursive, the incoming slot MUST replace the local slot only if the incoming slot
   is newer than the local slot according to the slot ordering rule. If the local stamp is greater, the local slot MUST be
   preserved unchanged.
2. If both slots are recursive slots, but they have different slot types or the incoming slot has a newer stamp than the
   local slot, the incoming slot MUST replace the local slot. If the local stamp is greater, the local slot MUST be
   preserved unchanged.
3. If both slots are recursive slots, both slots have the same slot type, and both slots have equal stamps, their child
   values MUST be merged recursively.
   1. When recursively merging child values, every key present in the incoming recursive slot MUST be processed
      independently.
   2. If a key exists only in the incoming slot, the incoming child slot MUST be added to the local slot.
   3. If a key exists in both the local slot and the incoming slot, the local child slot and the incoming child slot
      MUST be merged using the same merge algorithm.
   4. Keys that exist only in the local slot MUST be preserved.

### Tombstones

Tombstones MUST be preserved during merge unless they are replaced by a newer non-Tombstone slot or removed as part
of recursive tree replacement according to Merge Slot rules.

A missing key means that the Slot Tree has no information about that slot. Absence of a key MUST NOT be interpreted
as a Tombstone.

A key mapped to a Tombstone means that the slot is known to have been removed by a specific slot version.
