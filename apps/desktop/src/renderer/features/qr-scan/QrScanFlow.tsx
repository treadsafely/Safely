import type { FC } from 'react';
import { useEffect, useState } from 'react';

import { useToast, useTranslate } from '@safely/ux';
import { CameraAccessModal, QrScanModal, SelectCameraModal } from '@safely/web-ui';

import type { QrScanRequest } from './qr-scan-prompt';
import { QrScanCancelledError, useQrScanPromptStore } from './qr-scan-prompt';
import { openCameraSettings, useCameraAccess } from './useCameraAccess';
import { useCameraStream } from './useCameraStream';
import { useQrScanDeviceId } from './useQrScanDeviceId';
import { useVideoInputs } from './useVideoInputs';

export const QrScanFlow: FC = () => {
    const request = useQrScanPromptStore(state => state.request);

    return request === null ? null : <QrScanSession request={request} />;
};

type QrScanSessionProps = {
    request: QrScanRequest;
};

const QrScanSession: FC<QrScanSessionProps> = ({ request }) => {
    const t = useTranslate();
    const toast = useToast();
    const close = useQrScanPromptStore(state => state.close);

    const access = useCameraAccess();
    const { deviceId, isLoaded, select } = useQrScanDeviceId();
    const [isSelectingSource, setIsSelectingSource] = useState(false);

    const isGranted = access.data === 'granted';
    const devices = useVideoInputs(isGranted);
    const { stream, error } = useCameraStream({
        deviceId,
        isEnabled: isGranted && isLoaded
    });

    const cancel = () => {
        request.reject(new QrScanCancelledError());
        close();
    };

    const isDenied =
        access.data === 'denied' ||
        access.data === 'restricted' ||
        error?.name === 'NotAllowedError';

    useEffect(() => {
        if (error === null || error.name === 'NotAllowedError') {
            return;
        }

        toast({ message: t('camera.noCameraFound.title'), type: 'error' });
        request.reject(error);
        close();
    }, [error, toast, t, request, close]);

    if (access.isPending) {
        return null;
    }

    if (isDenied) {
        return <CameraAccessModal onOpenSettings={openCameraSettings} onClose={cancel} />;
    }

    const activeLabel = stream?.getVideoTracks()[0]?.label;

    return (
        <>
            <QrScanModal
                title={request.title}
                subtitle={request.subtitle}
                stream={stream}
                isDetecting={!isSelectingSource}
                source={
                    devices.length > 1
                        ? {
                              label: activeLabel ?? t('qrScan.source.automatic'),
                              onSelect: () => setIsSelectingSource(true)
                          }
                        : undefined
                }
                onDetected={value => {
                    request.resolve(value);
                    close();
                }}
                onUnsupported={() => {
                    toast({ message: t('common.errors.notSupportedYet'), type: 'error' });
                    cancel();
                }}
                onClose={cancel}
            />

            {isSelectingSource && (
                <SelectCameraModal
                    options={devices}
                    selectedDeviceId={deviceId}
                    onSelect={nextDeviceId => {
                        select(nextDeviceId);
                        setIsSelectingSource(false);
                    }}
                    onClose={() => setIsSelectingSource(false)}
                />
            )}
        </>
    );
};
