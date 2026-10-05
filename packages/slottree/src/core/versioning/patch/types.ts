// Convert intersection types into flat objects

import type { z } from 'zod';

import type { DeepReadonly, JsonValue } from '../../json';
import type { ContainerSlot } from '../../slots';

type Simplify<T> = { [K in keyof T]: T[K] } & {};

// Verify T is an object
type ObjectValue<T> = Extract<Exclude<T, undefined>, object>;
type StringKeyOf<T> = Extract<keyof ObjectValue<T>, string>;
// Get only string keys
type StringFields<T> = [ObjectValue<T>] extends [never] ? never : StringKeyOf<T>;

// Get field type
type Field<T, K extends string> = K extends keyof ObjectValue<T>
    ? ObjectValue<T>[K]
    : string extends keyof ObjectValue<T>
      ? ObjectValue<T>[string] | undefined
      : never;

// Get access to the type located at the Path
type PathValue<T, P extends readonly string[]> = P extends readonly [
    infer Head extends string,
    ...infer Rest extends readonly string[]
]
    ? PathValue<Field<T, Head>, Rest>
    : T;

// Get union of all possible path combinations, i.e.
// { a: { b }, c } -> ['a'] | ['a', 'b'] | ['c']
type NonEmptyPatchPath<T> = T extends readonly unknown[]
    ? never
    : [ObjectValue<T>] extends [never]
      ? never
      : {
            [K in StringKeyOf<T>]:
                | readonly [K]
                | (NonEmptyPatchPath<Field<T, K>> extends infer Rest extends readonly string[]
                      ? readonly [K, ...Rest]
                      : never);
        }[StringKeyOf<T>];
// Same as above but also []
export type PatchPath<T> = readonly [] | NonEmptyPatchPath<T>;
// PathPath<T> but filter only paths where all fields are objects
type ContainerPatchPath<T> =
    PatchPath<T> extends infer P extends readonly string[]
        ? PathValue<T, P> extends readonly unknown[]
            ? never
            : [ObjectValue<PathValue<T, P>>] extends [never]
              ? never
              : P
        : never;
// Any path where only the last segment may be a new key.
type MoveTargetPath<T> =
    PatchPath<T> extends infer P extends readonly string[] ? readonly [...P, string] : never;

// Recursively updates types, ex:
// { a: { b: string } } => { a: { b: number } }
type SetPath<T, P extends readonly string[], Value> = P extends readonly [
    infer Head extends string,
    ...infer Tail extends string[]
]
    ? SetField<T, Head, SetPath<Field<T, Head>, Tail, Value>>
    : Value;
type DeletePath<T, P extends readonly string[]> = P extends readonly [infer Head extends string]
    ? DeleteField<T, Head>
    : P extends readonly [infer Head extends string, ...infer Tail extends string[]]
      ? SetField<T, Head, DeletePath<Field<T, Head>, Tail>>
      : never;
type SetField<T, K extends string, V> = T extends object
    ? Simplify<Omit<T, K> & { [P in K]: V }>
    : T;

// Rename field in the object
type RenameField<T, From extends string, To extends string> =
    T extends ObjectValue<T>
        ? Simplify<Omit<ObjectValue<T>, From> & { [K in To]: Field<ObjectValue<T>, From> }>
        : never;

// Add field to the object
type AddField<T, F extends string, V> =
    T extends ObjectValue<T> ? Simplify<ObjectValue<T> & { [K in F]: V }> : never;

// Delete field in object
type DeleteField<T, K extends string> =
    T extends ObjectValue<T> ? Simplify<Omit<ObjectValue<T>, K>> : never;

// T[] | Record<_, T> -> T
type CollectionItem<T> =
    NonNullable<T> extends readonly (infer Item)[]
        ? Item
        : NonNullable<T> extends Record<string, infer Item>
          ? Item
          : never;

// U, T[] -> U[]; U, Record<_, T> -> Record<_, U>
type CollectionWithItem<Collection, Item> =
    NonNullable<Collection> extends readonly unknown[]
        ? Item[]
        : NonNullable<Collection> extends Record<string, unknown>
          ? Record<string, Item>
          : never;

type DiscriminatedByPath<T, P extends readonly string[], V extends JsonValue> = T extends unknown
    ? V extends PathValue<T, P>
        ? T
        : never
    : never;
type NonDiscriminatedByPath<T, P extends readonly string[], V extends JsonValue> = Exclude<
    T,
    DiscriminatedByPath<T, P, V>
>;
type WhenMatcher<T, P extends readonly string[], V extends Extract<PathValue<T, P>, JsonValue>> =
    V | ((value: DeepReadonly<PathValue<T, P>>) => value is DeepReadonly<V>);
type RootContainer<T> = readonly [] extends ContainerPatchPath<T> ? unknown : never;

export interface SlotPatch<From, To> {
    (source: ContainerSlot): ContainerSlot;

    readonly fromSchema: z.ZodType<From>;
    readonly toSchema: z.ZodType<To>;
}

export interface PatchDraft<T> {
    newField<F extends string, V extends JsonValue>(
        field: (F extends StringFields<T> ? never : F) & RootContainer<T>,
        defaultValue: V
    ): PatchDraft<AddField<T, F, V>>;
    newField<const P extends readonly string[], F extends string, V extends JsonValue>(
        path: P & ContainerPatchPath<T>,
        field: F extends StringFields<PathValue<T, P>> ? never : F,
        defaultValue: V
    ): PatchDraft<SetPath<T, P, AddField<PathValue<T, P>, F, V>>>;
    rename<From extends StringFields<T>, To extends string>(
        from: From & RootContainer<T>,
        to: To extends StringFields<T> ? never : To
    ): PatchDraft<RenameField<T, From, To>>;
    rename<
        const P extends readonly string[],
        From extends StringFields<PathValue<T, P>>,
        To extends string
    >(
        path: P & ContainerPatchPath<T>,
        from: From,
        to: To extends StringFields<PathValue<T, P>> ? never : To
    ): PatchDraft<SetPath<T, P, RenameField<PathValue<T, P>, From, To>>>;

    update<V extends JsonValue>(f: (v: DeepReadonly<T>) => V): PatchDraft<V>;
    update<const P extends readonly string[], V extends JsonValue>(
        path: P & PatchPath<T>,
        f: (v: DeepReadonly<PathValue<T, P>>) => V
    ): PatchDraft<SetPath<T, P, V>>;
    deleteField<F extends string>(
        field: (F extends StringFields<T> ? F : never) & RootContainer<T>
    ): PatchDraft<DeleteField<T, F>>;
    deleteField<const P extends readonly string[], F extends string>(
        path: P & ContainerPatchPath<T>,
        field: F extends StringFields<PathValue<T, P>> ? F : never
    ): PatchDraft<SetPath<T, P, DeleteField<PathValue<T, P>, F>>>;
    move<
        const From extends readonly string[],
        const To extends MoveTargetPath<DeletePath<T, From>>
    >(
        from: From & NonEmptyPatchPath<T>,
        to: To
    ): PatchDraft<SetPath<DeletePath<T, From>, To, PathValue<T, From>>>;

    updateEach<Output>(
        f: (v: PatchDraft<CollectionItem<T>>) => PatchDraft<Output>
    ): PatchDraft<CollectionWithItem<T, Output>>;
    updateEach<const P extends readonly string[], Output>(
        path: P & PatchPath<T>,
        f: (v: PatchDraft<CollectionItem<PathValue<T, P>>>) => PatchDraft<Output>
    ): PatchDraft<SetPath<T, P, CollectionWithItem<PathValue<T, P>, Output>>>;

    when<
        const P extends readonly string[],
        const V extends Extract<PathValue<T, P>, JsonValue>,
        Output
    >(
        path: P & PatchPath<T>,
        value: WhenMatcher<T, P, V>,
        map: (draft: PatchDraft<DiscriminatedByPath<T, P, V>>) => PatchDraft<Output>
    ): PatchDraft<NonDiscriminatedByPath<T, P, V> | Output>;
    when<const V extends Extract<T, JsonValue>, Output>(
        value: WhenMatcher<T, readonly [], V>,
        map: (draft: PatchDraft<DiscriminatedByPath<T, readonly [], V>>) => PatchDraft<Output>
    ): PatchDraft<NonDiscriminatedByPath<T, readonly [], V> | Output>;
}
