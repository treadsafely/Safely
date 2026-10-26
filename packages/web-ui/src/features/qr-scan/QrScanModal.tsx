import type { FC } from 'react';
import { useEffect, useState } from 'react';

import { useTranslate } from '@safely/ux';
import Switch16 from '@safely/ux/assets/icons/16/switch-16.svg?react';
import { cx } from '@safely/web-ui/styled-system/css';

import {
    cornerBottomLeftStyles,
    cornerBottomRightStyles,
    cornerStyles,
    cornerTopLeftStyles,
    cornerTopRightStyles,
    frameStyles,
    maskStyles,
    popupStyles,
    sourceStyles,
    subtitleStyles,
    textStyles,
    videoStyles
} from './QrScanModal.styles';
import { useQrDetection } from './useQrDetection';
import { Icon, Modal, Text } from '../../shared';

export type QrScanSource = {
    label: string;
    onSelect: () => void;
};

export type QrScanModalProps = {
    title: string;
    subtitle?: string;
    stream: MediaStream | null;
    isDetecting?: boolean;
    source?: QrScanSource;
    onDetected: (value: string) => void;
    onUnsupported?: () => void;
    onClose: () => void;
};

export const QrScanModal: FC<QrScanModalProps> = props => {
    const {
        title,
        subtitle,
        stream,
        isDetecting = true,
        source,
        onDetected,
        onUnsupported,
        onClose
    } = props;

    const t = useTranslate();
    const [video, setVideo] = useState<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (video === null) {
            return;
        }

        video.srcObject = stream;

        return () => {
            video.srcObject = null;
        };
    }, [video, stream]);

    useQrDetection({
        video,
        isEnabled: stream !== null && isDetecting,
        onDetected,
        onUnsupported
    });

    return (
        <Modal open onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')} hasTransparentClose>
                <video ref={setVideo} className={videoStyles} autoPlay muted playsInline />

                <div className={maskStyles}>
                    <div className={frameStyles}>
                        <span className={cx(cornerStyles, cornerTopLeftStyles)} />
                        <span className={cx(cornerStyles, cornerTopRightStyles)} />
                        <span className={cx(cornerStyles, cornerBottomLeftStyles)} />
                        <span className={cx(cornerStyles, cornerBottomRightStyles)} />
                    </div>
                </div>

                <div className={textStyles}>
                    <Text variant="titleM" tone="constantWhite" align="center">
                        {title}
                    </Text>
                    {subtitle !== undefined && (
                        <Text
                            variant="bodyL"
                            tone="constantWhite"
                            align="center"
                            className={subtitleStyles}
                        >
                            {subtitle}
                        </Text>
                    )}
                </div>

                {source !== undefined && (
                    <button type="button" className={sourceStyles} onClick={source.onSelect}>
                        <Text variant="bodyL" tone="constantWhite">
                            {t('qrScan.source.current', { name: source.label })}
                        </Text>
                        <Icon asset={Switch16} tone="constantWhite" />
                    </button>
                )}
            </Modal.Popup>
        </Modal>
    );
};
