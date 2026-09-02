"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Camera, 
  RefreshCw, 
  Upload, 
  Keyboard, 
  Flashlight, 
  AlertCircle,
  ScanBarcode
} from "lucide-react";
import { toast } from "sonner";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: BarcodeScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'file'>('camera');
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "fintrack-barcode-scanner-box";

  // Play subtle beep sound on detection
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);

      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    } catch {}
  };

  const handleDetected = (barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;
    playBeep();
    stopScanner();
    onScanSuccess(clean);
  };

  const startScanner = async () => {
    setCameraError(null);
    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {}
      }

      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleDetected(decodedText);
        },
        () => {
          // Frame scan error - ignore per frame
        }
      );

      setIsScanning(true);

      // Check flashlight support
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if ((capabilities as any)?.torch) {
          setHasFlash(true);
        }
      } catch {}
    } catch (err: any) {
      setIsScanning(false);
      setCameraError(
        err?.message || "Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan."
      );
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
    }
    setIsScanning(false);
    setIsFlashOn(false);
  };

  const toggleFlashlight = async () => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: !isFlashOn } as any]
      });
      setIsFlashOn(!isFlashOn);
    } catch {
      toast.error("Flashlight tidak didukung di perangkat ini.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode("fintrack-file-scanner-temp");
      const result = await html5QrCode.scanFile(file, true);
      handleDetected(result);
    } catch (err) {
      toast.error("Barcode tidak terdeteksi pada gambar.");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      toast.error("Masukkan kode barcode terlebih dahulu.");
      return;
    }
    handleDetected(manualCode.trim());
    setManualCode("");
  };

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      const timeout = setTimeout(() => {
        startScanner();
      }, 300);
      return () => {
        clearTimeout(timeout);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, activeTab]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { stopScanner(); onClose(); } }}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ScanBarcode className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl">Scan Barcode Barang</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Arahkan kamera ke barcode kemasan barang belanjaan Anda.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-border px-4 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`pb-2.5 pt-1 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'camera'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            Kamera
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`pb-2.5 pt-1 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Keyboard className="h-3.5 w-3.5" />
            Input Manual
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`pb-2.5 pt-1 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'file'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Foto
          </button>
        </div>

        <div className="p-4 sm:p-6 pt-2">
          {activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-xl bg-black aspect-[4/3] flex items-center justify-center border">
                <div id={containerId} className="w-full h-full" />
                
                {/* Overlay Scanner Animation */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    <div className="w-64 h-36 border-2 border-emerald-400/80 rounded-lg relative overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      {/* Laser Line */}
                      <div className="w-full h-0.5 bg-emerald-400 animate-pulse absolute top-1/2 -translate-y-1/2 shadow-[0_0_8px_#34d399]" />
                    </div>
                    <p className="text-[11px] text-white/90 mt-3 font-medium bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                      Posisikan barcode di dalam kotak
                    </p>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 bg-background/95 p-6 flex flex-col items-center justify-center text-center gap-3">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Akses Kamera Terkendala</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                        {cameraError}
                      </p>
                    </div>
                    <Button size="sm" onClick={startScanner} className="gap-1.5 mt-1">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Coba Lagi
                    </Button>
                  </div>
                )}
              </div>

              {/* Camera Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1">
                {hasFlash && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleFlashlight}
                    className="gap-1.5 text-xs"
                  >
                    <Flashlight className={`h-3.5 w-3.5 ${isFlashOn ? 'text-amber-500 fill-amber-500' : ''}`} />
                    {isFlashOn ? "Matikan Lampu" : "Nyalakan Lampu"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={startScanner}
                  className="gap-1.5 text-xs text-muted-foreground ml-auto"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh Kamera
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Nomor Barcode / EAN / UPC</Label>
                <Input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Contoh: 8992753123456"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Ketik deretan angka yang tertera di bawah garis barcode barang.
                </p>
              </div>
              <Button type="submit" className="w-full">
                Cari & Masukkan Transaksi
              </Button>
            </form>
          )}

          {activeTab === 'file' && (
            <div className="space-y-4 py-4 text-center">
              <div id="fintrack-file-scanner-temp" className="hidden" />
              <div className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-muted/30 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Unggah Foto Barcode</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pilih foto kemasan barang yang memuat barcode jelas
                  </p>
                </div>
                <label className="mt-2 inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 cursor-pointer">
                  Pilih Berkas Foto
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
