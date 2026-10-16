---
paths:
    - 'apps/desktop/src/main/camera.ts'
    - 'apps/desktop/src/renderer/features/qr-scan/**'
    - 'packages/web-ui/src/features/qr-scan/**'
---

# QR scanning on the web targets

Three screens, all in `packages/web-ui/src/features/qr-scan/`: the access modal, the scanner over a
live preview, and the camera picker. Everything that decides — whether the OS granted the camera,
which devices exist, which one is remembered — is the app's
(`apps/desktop/src/renderer/features/qr-scan/`), the same split the passcode module follows. The
entry point is `IAppContext.qrScanner.scan()`, assembled in `app/AppProviders.tsx` over
`qrScanPrompt`, a promise store shaped exactly like `passcodePrompt`; `app/App.tsx` renders
`QrScanFlow` inside `AppLock`, so nothing can scan over the lock screen.

## The decoder is the platform's, and only on macOS

`BarcodeDetector` — Chromium's Barcode Detection API — does the decoding, and there is **no
fallback**: the API exists on macOS, ChromeOS and Android, and nowhere else, so a Windows or Linux
target needs jsQR or `zxing-wasm` added before it can scan at all. `createQrDetector()` returns
`null` when the API or the `qr_code` format is missing, and the flow reports that as unsupported
rather than showing a camera that never resolves. A WASM decoder is the more capable option and
costs a CSP change — `wasm-unsafe-eval` in `script-src` — which is why it was not the first choice.

Measured on Electron 43 (Chromium 150), macOS 26, so the numbers behind the decode loop are not
guesses: the first `detect()` costs 60–900 ms (the Vision framework warming up), every later one
14–16 ms on a full 1080p frame and 8–10 ms on a 960-wide copy of it. Hence `useQrDetection`:
`requestAnimationFrame` throttled to 100 ms, drawing into a canvas capped at 960 px wide. A QR
filling 64 px of a 640×480 frame still decodes, so the cap costs nothing.

## The permission handler has two halves, and both are needed

`main/security.ts` grants `media` only for a video-only request from the top frame — `mediaTypes`
naming `audio`, an empty list, or a subframe are all refused. The **check** handler is the trap:
Chromium runs it for `media` with **no media type at all**, and answering `false` there hides the
device labels the picker lists, so it answers on anything that is not `audio` or `unknown`. Capture
stays gated by the request handler, which is why the looser check is safe.
`test/main/security.test.ts` pins both halves.

macOS TCC sits in front of all of it: `main/camera.ts` reads `getMediaAccessStatus('camera')` and
calls `askForMediaAccess` only while the answer is still `not-determined`. After that only System
Settings can change it — and macOS wants the app restarted for a change there to take effect — so
the status is resolved once per scan and never refetched. `denied` and `restricted` both render the
access modal, whose button opens the privacy pane through a constant in main; the renderer's
`openExternal` channel deliberately allows no such scheme.

A packaged build needs three more things, listed in `desktop-app.md` under Build. The one that is
easy to get wrong: `NSCameraUseContinuityCameraDeviceType` belongs in the **helper** plist as much
as the app's, because capture runs in the GPU process — Chromium put it in its own helper plist for
the same reason. It is not what makes an iPhone appear, though: verified against a connected iPhone,
the device is enumerated and opens with or without the key, which only moves it off the deprecated
`AVCaptureDeviceTypeExternal` type. What does gate it is Apple's own rule for browser-class apps —
the phone offers itself to Chromium only while it is locked, still, landscape and screen-off, or
plugged in — so a user who cannot see their iPhone in the list is not looking at a bug of ours.

## The preview is mirrored, the frame is not

`videoStyles` carries `transform: scaleX(-1)`, the self-view convention every camera app on macOS
follows (Photo Booth, FaceTime, Zoom) and which `getUserMedia` never applies itself — its frames come
straight off the sensor. Two things follow, and both were deliberate:

- **the flip is CSS only.** `useQrDetection` draws the `<video>` into a canvas, which is unaffected
  by the transform. Mirroring the *frame* would break scanning outright: a mirrored QR is not a QR to
  most decoders, `BarcodeDetector` included.
- **an iPhone is mirrored too, and that is accepted.** It contributes its *rear* camera, which no
  camera app mirrors, so its preview reads reversed. Doing better needs to know which way a camera
  faces, and macOS does not tell a web target: `facingMode` is absent from `getSettings()` and an
  empty array in `getCapabilities()` for the built-in camera and for an iPhone alike (measured).
  AVFoundation's `deviceType` does not answer it either — a USB webcam and an iPhone are both
  `External`, and only one of them wants mirroring. The laptop camera is the primary scenario, so it
  is the one that matches Photo Booth; a per-source toggle is the way out if that stops being true.

## The source list

`enumerateDevices()` is the whole mechanism; no native addon is involved, and the `deviceId` of a
connected iPhone survived restarts across profiles in testing, so the choice is remembered as
`qrScanDeviceId` in the desktop `regular` node. Three things about it:

- **labels are localised AVFoundation names** (`HD-камера FaceTime`, `Камера (iPhone)`), so no code
  may branch on them; the picker shows what it is given, and nothing infers "this one is a phone";
- `deviceId` is a per-origin salted hash, and the dev server and `safely://app` are different
  origins, so a remembered id can be meaningless in the other build — `useCameraStream` falls back
  to automatic on any failure that is not a refusal, rather than leaving the user with a black
  frame;
- Chromium hides the Desk View camera, so an iPhone contributes exactly one row.

`{ width: { ideal: 1280 } }` is deliberate: a camera hands out 640×480 unasked, and a QR filmed
across a desk needs more. Both the built-in camera and an iPhone answer 1280×720, and 1920×1080 if
asked.

## Not built yet

- **Nothing calls it yet.** `IAppContext.qrScanner.scan()` is wired and `QrScanFlow` is mounted, but
  no screen invokes either, so the whole scanner is reachable only from the next feature that needs
  it. `useConnectAccountToNewDevice` in `@safely/ux` is what the first real consumer — a settings
  screen that adds a device — will call.
- **No screen for "no camera at all"**, and none is designed: `NotFoundError` and a failing stream
  become an error toast on `camera.noCameraFound.title` and reject the promise.
- **No image fallback** — dropping a screenshot or reading the clipboard would scan without a camera
  and needs no new permission.
