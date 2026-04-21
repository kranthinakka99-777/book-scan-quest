import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

type Props = { onScan: (text: string) => void; onClose: () => void };

export function QrScanner({ onScan, onClose }: Props) {
  const elementId = "qr-reader-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode(elementId);
    scannerRef.current = scanner;
    let cancelled = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (cancelled) return;
          cancelled = true;
          scanner.stop().then(() => scanner.clear()).finally(() => onScan(decoded));
        },
        () => {}
      )
      .catch(() => {});

    return () => {
      cancelled = true;
      if (scanner.isScanning) scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg p-4 max-w-md w-full">
        <h3 className="font-semibold mb-3">Scan book QR code</h3>
        <div id={elementId} className="w-full rounded overflow-hidden" />
        <button onClick={onClose} className="mt-4 w-full px-4 py-2 rounded-md border hover:bg-muted">Cancel</button>
      </div>
    </div>
  );
}
