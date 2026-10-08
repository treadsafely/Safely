import { useEffect, useState } from 'react';

/* 640x480 is what a camera hands out unasked, and a QR filmed from across a desk needs more */
const IDEAL_WIDTH = 1280;

export type UseCameraStreamOptions = {
    deviceId: string | null;
    isEnabled: boolean;
};

export type CameraStreamState = {
    stream: MediaStream | null;
    error: Error | null;
};

const constraints = (deviceId: string | null): MediaStreamConstraints => ({
    video:
        deviceId === null
            ? { width: { ideal: IDEAL_WIDTH } }
            : { deviceId: { exact: deviceId }, width: { ideal: IDEAL_WIDTH } }
});

export function useCameraStream(options: UseCameraStreamOptions): CameraStreamState {
    const { deviceId, isEnabled } = options;

    const [state, setState] = useState<CameraStreamState>({ stream: null, error: null });

    useEffect(() => {
        if (!isEnabled) {
            return;
        }

        let isCancelled = false;
        let opened: MediaStream | null = null;

        const open = async () => {
            try {
                return await navigator.mediaDevices.getUserMedia(constraints(deviceId));
            } catch (error) {
                /* a remembered camera can be gone or already busy; automatic is still worth a try */
                if (
                    deviceId === null ||
                    (error instanceof Error && error.name === 'NotAllowedError')
                ) {
                    throw error;
                }

                return await navigator.mediaDevices.getUserMedia(constraints(null));
            }
        };

        void open().then(
            stream => {
                if (isCancelled) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                opened = stream;
                setState({ stream, error: null });
            },
            (error: unknown) => {
                if (!isCancelled) {
                    setState({
                        stream: null,
                        error: error instanceof Error ? error : new Error(String(error))
                    });
                }
            }
        );

        return () => {
            isCancelled = true;
            opened?.getTracks().forEach(track => track.stop());
            setState({ stream: null, error: null });
        };
    }, [deviceId, isEnabled]);

    return state;
}
