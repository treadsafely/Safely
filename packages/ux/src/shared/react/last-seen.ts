import { useRef } from 'react';

export function useLastSeen<T>(value: T | null): T | null {
    const ref = useRef<T | null>(null);

    if (value !== null) ref.current = value;

    return ref.current;
}
