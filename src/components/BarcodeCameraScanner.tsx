import { useEffect, useRef, useState } from "react";

type DetectedBarcode = { rawValue: string };

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
};

type BarcodeCameraScannerProps = {
  isArabic: boolean;
  onDetected: (code: string) => void;
  onClose: () => void;
  includeQrCode?: boolean;
};

const BARCODE_FORMATS = ["ean_13", "ean_8", "code_128", "upc_a", "upc_e", "code_39"];
const QR_CODE_FORMAT = "qr_code";

function isBarcodeDetectorSupported() {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

export default function BarcodeCameraScanner({
  isArabic,
  onDetected,
  onClose,
  includeQrCode = false,
}: BarcodeCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const lastCodeRef = useRef("");
  const lastCodeAtRef = useRef(0);
  const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!isBarcodeDetectorSupported()) {
      setError(
        isArabic
          ? "مسح الكاميرا غير مدعوم في هذا المتصفح. استخدم Chrome على الجوال أو امسح بالماسح الضوئي."
          : "Camera scanning is not supported in this browser. Use Chrome on mobile or a hardware scanner.",
      );
      setStarting(false);
      return;
    }

    let cancelled = false;
    const DetectorCtor = (
      window as typeof window & {
        BarcodeDetector: new (options?: { formats: string[] }) => BarcodeDetectorLike;
      }
    ).BarcodeDetector;
    const detector = new DetectorCtor({
      formats: includeQrCode ? [...BARCODE_FORMATS, QR_CODE_FORMAT] : BARCODE_FORMATS,
    });

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play();
        setStarting(false);

        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            const code = results[0]?.rawValue?.trim();
            if (code) {
              const now = Date.now();
              if (code !== lastCodeRef.current || now - lastCodeAtRef.current > 1500) {
                lastCodeRef.current = code;
                lastCodeAtRef.current = now;
                onDetectedRef.current(code);
                return;
              }
            }
          } catch {
            // Keep scanning until a frame succeeds.
          }
          scanFrameRef.current = window.requestAnimationFrame(() => {
            void scan();
          });
        };

        scanFrameRef.current = window.requestAnimationFrame(() => {
          void scan();
        });
      } catch {
        if (!cancelled) {
          setError(
            isArabic
              ? "تعذر فتح الكاميرا. تأكد من منح الإذن أو استخدم الماسح الضوئي."
              : "Could not open the camera. Allow camera access or use a hardware scanner.",
          );
          setStarting(false);
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      if (scanFrameRef.current !== null) {
        window.cancelAnimationFrame(scanFrameRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isArabic]);

  return (
    <div className="modalOverlay barcodeScannerOverlay">
      <div
        className="barcodeScannerModal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isArabic ? "مسح الباركود بالكاميرا" : "Camera barcode scan"}
      >
        <div className="barcodeScannerHeader">
          <div>
            <h3>{isArabic ? "مسح الباركود بالكاميرا" : "Scan barcode with camera"}</h3>
            <p className="returnsSectionHint">
              {isArabic
                ? "وجّه الكاميرا نحو الباركود داخل الإطار"
                : "Point the camera at the barcode inside the frame"}
            </p>
          </div>
          <button
            type="button"
            className="closeBtn"
            onClick={onClose}
            aria-label={isArabic ? "إغلاق" : "Close"}
          >
            ×
          </button>
        </div>

        <div className="barcodeScannerViewport">
          <video ref={videoRef} className="barcodeScannerVideo" playsInline muted />
          <div className="barcodeScannerFrame" aria-hidden="true" />
          {starting && !error && (
            <div className="barcodeScannerStatus">
              {isArabic ? "جاري تشغيل الكاميرا..." : "Starting camera..."}
            </div>
          )}
          {error && <div className="barcodeScannerStatus error">{error}</div>}
        </div>
      </div>
    </div>
  );
}

export function canUseBarcodeCameraScanner() {
  return isBarcodeDetectorSupported();
}
