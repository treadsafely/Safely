export const finalKey = 'finalKey' as const;
export type FinalKey = typeof finalKey;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
    JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export type KeyPart = JsonPrimitive;
export type KeyPath = readonly (string | KeyPart)[];

export type JsonObject = {
    readonly [key: string]: JsonValue;
};

export type KeyResult = {
    readonly key: readonly unknown[];
    toKey(): readonly unknown[];
};

export type TransformValue<T> = T extends FinalKey
    ? KeyResult
    : T extends readonly unknown[]
      ? KeyResult
      : T extends (...args: infer A) => infer R
        ? ((...args: A) => TransformValue<R> & KeyResult) & KeyResult
        : T extends object
          ? { [K in keyof T]: TransformValue<T[K]> } & KeyResult
          : KeyResult;

export type QueryKeys<D extends string, Def extends object> = {
    toKey(): readonly [D];
} & {
    [K in keyof Def]: TransformValue<Def[K]>;
};

export type DefinitionMethod = {
    paramsMapper?: (...params: never[]) => readonly unknown[];
} & ((...args: never[]) => unknown);

export type Definition = {
    [K: string]: DefinitionMethod | Definition | readonly KeyPart[] | FinalKey;
};
