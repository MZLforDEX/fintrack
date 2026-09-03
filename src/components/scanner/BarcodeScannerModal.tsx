"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
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
  ScanBarcode,
  SwitchCamera
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
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const isStartingRef = useRef(false);
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

  const handleDetected = useCallback(async (barcode: string) => {
    const clean = barcode.trim();
    if (!clean || isProcessingRef.current) return;
    isProcessingRef.current = true;

    playBeep();
    await stopScanner();
    onScanSuccess(clean);
  }, [onScanSuccess]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn("Error stopping scanner:", err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setIsFlashOn(false);
    isStartingRef.current = false;
  };

  const startScanner = async (cameraIdx?: number) => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setCameraError(null);
    isProcessingRef.current = false;

    // 1. Ensure any previous instance is properly stopped
    await stopScanner();

    // 2. Wait for DOM container element to be mounted
    const container = document.getElementById(containerId);
    if (!container) {
      isStartingRef.current = false;
      setTimeout(() => startScanner(cameraIdx), 200);
      return;
    }

    try {
      // 3. Supported barcode formats (EAN-13, EAN-8, CODE-128, QR, UPC, etc.)
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.QR_CODE,
      ];

      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport,
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      scannerRef.current = html5QrCode;

      // 4. Discover all cameras on device
      let cameras: Array<{ id: string; label: string }> = [];
      try {
        cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          setAvailableCameras(cameras);
        }
      } catch (e) {
        console.warn("Could not list cameras:", e);
      }

      const activeIdx = cameraIdx !== undefined ? cameraIdx : selectedCameraIndex;
      let targetCameraConfig: any = null;

      if (cameras.length > 0) {
        if (cameraIdx !== undefined) {
          targetCameraConfig = cameras[activeIdx]?.id || cameras[0].id;
        } else {
          // Find rear / back camera automatically
          const backCamIndex = cameras.findIndex((c) =>
            /back|rear|belakang|environment|macro|main/i.test(c.label)
          );
          if (backCamIndex !== -1) {
            setSelectedCameraIndex(backCamIndex);
            targetCameraConfig = cameras[backCamIndex].id;
          } else {
            targetCameraConfig = cameras[0].id;
          }
        }
      } else {
        // Default to facingMode environment
        targetCameraConfig = { facingMode: "environment" };
      }

      const scanConfig = {
        fps: 20,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.min(Math.floor(viewfinderWidth * 0.88), 300);
          const height = Math.min(Math.floor(viewfinderHeight * 0.55), 160);
          return { width, height };
        },
        aspectRatio: 1.333334,
      };

      // 5. Start camera stream with multi-level fallback
      let started = false;

      // Attempt 1: Target camera ID or environment
      try {
        await html5QrCode.start(
          targetCameraConfig,
          scanConfig,
          (decodedText) => handleDetected(decodedText),
          () => {}
        );
        started = true;
      } catch (err1) {
        console.warn("Attempt 1 failed, trying facingMode environment:", err1);
      }

      // Attempt 2: Fallback to { facingMode: "environment" }
      if (!started && typeof targetCameraConfig === "string") {
        try {
          await html5QrCode.start(
            { facingMode: "environment" },
            scanConfig,
            (decodedText) => handleDetected(decodedText),
            () => {}
          );
          started = true;
        } catch (err2) {
          console.warn("Attempt 2 failed, trying facingMode user:", err2);
        }
      }

      // Attempt 3: Fallback to { facingMode: "user" } / default video
      if (!started) {
        await html5QrCode.start(
          { facingMode: "user" },
          scanConfig,
          (decodedText) => handleDetected(decodedText),
          () => {}
        );
      }

      setIsScanning(true);
      setCameraError(null);

      // Check flashlight support
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if ((capabilities as any)?.torch) {
          setHasFlash(true);
        }
      } catch {}
    } catch (err: any) {
      console.error("Barcode camera startup error:", err);
      setIsScanning(false);
      const errMsg = err?.message || String(err);
      if (/permission|allowed|denied|NotAllowedError/i.test(errMsg)) {
        setCameraError("Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.");
      } else if (/NotFoundError|DevicesNotFoundError/i.test(errMsg)) {
        setCameraError("Kamera tidak ditemukan pada perangkat ini.");
      } else {
        setCameraError("Tidak dapat mengaktifkan kamera. Silakan tekan tombol 'Coba Lagi' atau gunakan tab 'Input Manual'.");
      }
    } finally {
      isStartingRef.current = false;
    }
  };

  const handleSwitchCamera = async () => {
    if (availableCameras.length <= 1) return;
    const nextIdx = (selectedCameraIndex + 1) % availableCameras.length;
    setSelectedCameraIndex(nextIdx);
    await startScanner(nextIdx);
  };

  const toggleFlashlight = async () => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: !isFlashOn } as any]
      });
      setIsFlashOn(!isFlashOn);
    } catch {
      toast.error("Lampu flash tidak didukung pada kamera ini.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode("fintrack-file-scanner-temp", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });
      const result = await html5QrCode.scanFile(file, true);
      handleDetected(result);
    } catch (err) {
      toast.error("Barcode tidak terdeteksi pada gambar. Pastikan gambar barcode jelas dan tidak buram.");
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
      const timer = setTimeout(() => {
        startScanner();
      }, 250);
      return () => {
        clearTimeout(timer);
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
              <div className="relative overflow-hidden rounded-xl bg-black aspect-[4/3] flex items-center justify-center border shadow-inner">
                {/* HTML5-QRCode Target Container */}
                <div 
                  id={containerId} 
                  className="w-full h-full [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover [&_video]:!rounded-xl [&_canvas]:!hidden"
                />
                
                {/* Overlay Scanner Laser Animation */}
                {isScanning && !cameraError && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    <div className="w-[85%] max-w-[280px] h-[130px] border-2 border-emerald-400/90 rounded-lg relative overflow-hidden shadow-[0_0_25px_rgba(16,185,129,0.35)]">
                      {/* Laser Line */}
                      <div className="w-full h-0.5 bg-emerald-400 animate-pulse absolute top-1/2 -translate-y-1/2 shadow-[0_0_10px_#34d399]" />
                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-300" />
                      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-300" />
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-300" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-300" />
                    </div>
                    <p className="text-[11px] text-white/95 mt-3 font-medium bg-black/70 px-3 py-1 rounded-full backdrop-blur-sm shadow">
                      Posisikan garis barcode di dalam kotak
                    </p>
                  </div>
                )}

                {/* Error State */}
                {cameraError && (
                  <div className="absolute inset-0 bg-background/95 p-6 flex flex-col items-center justify-center text-center gap-3 z-10">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Akses Kamera Terkendala</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[300px]">
                        {cameraError}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <Button size="sm" onClick={() => startScanner()} className="gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" />
                        Coba Lagi
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setActiveTab('manual')}>
                        Input Manual Saja
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <div className="flex items-center gap-2">
                  {hasFlash && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={toggleFlashlight}
                      className="gap-1.5 text-xs h-8"
                    >
                      <Flashlight className={`h-3.5 w-3.5 ${isFlashOn ? 'text-amber-500 fill-amber-500' : ''}`} />
                      {isFlashOn ? "Lampu Mati" : "Lampu Nyala"}
                    </Button>
                  )}

                  {availableCameras.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSwitchCamera}
                      className="gap-1.5 text-xs h-8"
                      title="Ganti Lensa Kamera"
                    >
                      <SwitchCamera className="h-3.5 w-3.5" />
                      Ganti Kamera ({selectedCameraIndex + 1}/{availableCameras.length})
                    </Button>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => startScanner()}
                  className="gap-1.5 text-xs text-muted-foreground ml-auto h-8"
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
                  placeholder="Contoh: 8998866200213 (Indomie)"
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

