import { useEffect, useRef } from 'react';

export interface UseSubmitWhenCompleteParams {
    value: string;
    length: number;
    onComplete: (value: string) => void;
}

export function useSubmitWhenComplete(params: UseSubmitWhenCompleteParams): void {
    const { value, length, onComplete } = params;

    const isComplete = length > 0 && value.length === length;
    const wasComplete = useRef(false);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    });

    useEffect(() => {
        const hasJustCompleted = isComplete && !wasComplete.current;
        wasComplete.current = isComplete;

        if (hasJustCompleted) {
            onCompleteRef.current(value);
        }
    }, [isComplete, value]);
}
