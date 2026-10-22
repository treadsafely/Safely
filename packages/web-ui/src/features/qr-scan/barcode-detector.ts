type DetectedBarcode = {
    rawValue: string;
};

type BarcodeDetectorInstance = {
    detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = {
    new (options?: { formats?: string[] }): BarcodeDetectorInstance;
    getSupportedFormats(): Promise<string[]>;
};

declare global {
    interface Window {
        /* Chromium implements the Barcode Detection API on macOS only, and lib.dom declares none of it */
        BarcodeDetector?: BarcodeDetectorConstructor;
    }
}

const QR_FORMAT = 'qr_code';

export type QrDetector = BarcodeDetectorInstance;

export async function createQrDetector(): Promise<QrDetector | null> {
    const Detector = window.BarcodeDetector;

    if (Detector === undefined) {
        return null;
    }

    const formats = await Detector.getSupportedFormats().catch((): string[] => []);

    return formats.includes(QR_FORMAT) ? new Detector({ formats: [QR_FORMAT] }) : null;
}
