import jsQR from 'jsqr';

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

export type QrDetector = {
    detect(source: HTMLCanvasElement): Promise<DetectedBarcode[]>;
};

/* the platform decoder where it exists; elsewhere jsQR reads the same canvas on the main thread */
export async function createQrDetector(): Promise<QrDetector> {
    const Detector = window.BarcodeDetector;

    if (Detector !== undefined) {
        const formats = await Detector.getSupportedFormats().catch((): string[] => []);

        if (formats.includes(QR_FORMAT)) {
            return new Detector({ formats: [QR_FORMAT] });
        }
    }

    return {
        detect: canvas => {
            const context = canvas.getContext('2d');

            if (context === null || canvas.width === 0 || canvas.height === 0) {
                return Promise.resolve([]);
            }

            const image = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(image.data, image.width, image.height, {
                inversionAttempts: 'dontInvert'
            });

            return Promise.resolve(code === null ? [] : [{ rawValue: code.data }]);
        }
    };
}
