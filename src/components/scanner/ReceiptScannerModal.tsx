"use client";

import { useState, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Receipt, 
  Camera, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  Sparkles, 
  Store, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Category } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { buildTransactionDateTime, getLocal24TimeString } from "@/lib/dateUtils";
import Tesseract from "tesseract.js";

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTransaction: (data: {
    amount: number;
    description: string;
    category_id: string;
    transaction_date: string;
  }) => Promise<void>;
  categories: Category[];
}

export function ReceiptScannerModal({
  isOpen,
  onClose,
  onSaveTransaction,
  categories,
}: ReceiptScannerModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState("");

  // Extracted and Editable Form State
  const [extractedAmount, setExtractedAmount] = useState("");
  const [extractedMerchant, setExtractedMerchant] = useState("");
  const [extractedDate, setExtractedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [extractedCategoryId, setExtractedCategoryId] = useState("");
  const [rawText, setRawText] = useState("");
  const [isResultReady, setIsResultReady] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === "Expense");

  const resetState = () => {
    setImagePreview(null);
    setIsProcessing(false);
    setOcrProgress(0);
    setOcrStatus("");
    setExtractedAmount("");
    setExtractedMerchant("");
    setExtractedDate(format(new Date(), "yyyy-MM-dd"));
    setExtractedCategoryId(expenseCategories[0]?.id || "");
    setRawText("");
    setIsResultReady(false);
  };

  const handleModalClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
      processReceiptImage(result);
    };
    reader.readAsDataURL(file);
  };

  // Smart receipt parser function
  const parseReceiptText = (text: string) => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // 1. Detect Merchant / Store Name
    let detectedMerchant = "";
    const knownStores = [
      "indomaret",
      "alfamart",
      "alfamidi",
      "superindo",
      "hypermart",
      "transmart",
      "kfc",
      "mcdonald",
      "starbucks",
      "fore coffee",
      "janji jiwa",
      "point coffee",
      "kopi kenangan",
      "apotek",
      "kimia farma",
      "pertamina",
      "spbu",
      "guardian",
      "watsons",
      "miniso",
      "uniqlo",
    ];

    for (const line of lines.slice(0, 8)) {
      const lower = line.toLowerCase();
      const matched = knownStores.find((store) => lower.includes(store));
      if (matched) {
        detectedMerchant = line;
        break;
      }
    }

    if (!detectedMerchant && lines.length > 0) {
      detectedMerchant = lines[0].slice(0, 30);
    }

    // 2. Detect Total Amount
    let detectedTotal = 0;
    const totalKeywords = [
      "total",
      "grand total",
      "total bayar",
      "harga total",
      "jumlah",
      "tagihan",
      "bayar",
      "tunai",
      "subtotal",
      "cash",
      "netto",
    ];

    // Search lines for total keyword
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      const lower = line.toLowerCase();
      const hasKeyword = totalKeywords.some((kw) => lower.includes(kw));

      if (hasKeyword) {
        // Extract numbers with possible dot/comma formatting
        const numbers = line.match(/(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+)/gi);
        if (numbers && numbers.length > 0) {
          const cleaned = numbers[numbers.length - 1].replace(/[^0-9]/g, "");
          const num = parseInt(cleaned, 10);
          if (num > 100 && num < 100000000) {
            detectedTotal = num;
            break;
          }
        }
      }
    }

    // Fallback if total keyword not matched: find largest reasonable number
    if (detectedTotal === 0) {
      let maxNum = 0;
      lines.forEach((line) => {
        const matches = line.match(/(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?)/gi);
        if (matches) {
          matches.forEach((m) => {
            const cleaned = parseInt(m.replace(/[^0-9]/g, ""), 10);
            if (cleaned > maxNum && cleaned < 50000000) {
              maxNum = cleaned;
            }
          });
        }
      });
      detectedTotal = maxNum;
    }

    // 3. Detect Date
    let detectedDate = format(new Date(), "yyyy-MM-dd");
    const dateRegex = /(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/;
    for (const line of lines) {
      const match = line.match(dateRegex);
      if (match) {
        try {
          let day = parseInt(match[1], 10);
          let month = parseInt(match[2], 10);
          let year = parseInt(match[3], 10);
          if (year < 100) year += 2000;
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            detectedDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            break;
          }
        } catch {}
      }
    }

    // 4. Smart Category Matching
    let categoryId = expenseCategories[0]?.id || "";
    const lowerMerch = (detectedMerchant + " " + text).toLowerCase();

    if (
      lowerMerch.includes("indomaret") ||
      lowerMerch.includes("alfamart") ||
      lowerMerch.includes("superindo") ||
      lowerMerch.includes("sembako") ||
      lowerMerch.includes("hypermart")
    ) {
      const sembakoCat = expenseCategories.find(
        (c) => c.name.includes("Sembako") || c.name.includes("Belanja")
      );
      if (sembakoCat) categoryId = sembakoCat.id;
    } else if (
      lowerMerch.includes("kfc") ||
      lowerMerch.includes("mcd") ||
      lowerMerch.includes("cafe") ||
      lowerMerch.includes("coffee") ||
      lowerMerch.includes("resto") ||
      lowerMerch.includes("bakso") ||
      lowerMerch.includes("makan") ||
      lowerMerch.includes("warung")
    ) {
      const foodCat = expenseCategories.find((c) => c.name.includes("Makanan"));
      if (foodCat) categoryId = foodCat.id;
    } else if (
      lowerMerch.includes("apotek") ||
      lowerMerch.includes("kimia farma") ||
      lowerMerch.includes("klinik") ||
      lowerMerch.includes("obat")
    ) {
      const medCat = expenseCategories.find((c) => c.name.includes("Kesehatan"));
      if (medCat) categoryId = medCat.id;
    } else if (
      lowerMerch.includes("pertamina") ||
      lowerMerch.includes("spbu") ||
      lowerMerch.includes("shell") ||
      lowerMerch.includes("bensin")
    ) {
      const transCat = expenseCategories.find((c) => c.name.includes("Transportasi"));
      if (transCat) categoryId = transCat.id;
    }

    return {
      merchant: detectedMerchant || "Belanja Struk",
      amount: detectedTotal > 0 ? String(detectedTotal) : "",
      date: detectedDate,
      categoryId,
    };
  };

  const processReceiptImage = async (imageSrc: string) => {
    setIsProcessing(true);
    setOcrProgress(10);
    setOcrStatus("Mempersiapkan pemindai teks...");

    try {
      const worker = await Tesseract.createWorker("ind+eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 85) + 10);
            setOcrStatus(`Membaca teks struk (${Math.round(m.progress * 100)}%)...`);
          }
        },
      });

      const res = await worker.recognize(imageSrc);
      await worker.terminate();

      const text = res.data.text;
      setRawText(text);

      const parsed = parseReceiptText(text);
      setExtractedMerchant(parsed.merchant);
      setExtractedAmount(parsed.amount);
      setExtractedDate(parsed.date);
      setExtractedCategoryId(parsed.categoryId);

      setIsResultReady(true);
      toast.success("Struk berhasil dibaca! Periksa rincian sebelum disimpan.");
    } catch (err: any) {
      toast.error("Gagal membaca gambar struk. Coba gunakan foto yang lebih terang dan jelas.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractedAmount || !extractedCategoryId) {
      toast.error("Mohon lengkapi nominal dan kategori pengeluaran.");
      return;
    }

    try {
      await onSaveTransaction({
        amount: Number(extractedAmount),
        description: extractedMerchant || "Belanja Struk",
        category_id: extractedCategoryId,
        transaction_date: buildTransactionDateTime(extractedDate, getLocal24TimeString()),
      });

      toast.success(
        `Transaksi struk "${extractedMerchant}" (${formatCurrency(Number(extractedAmount))}) berhasil dicatat!`
      );
      handleModalClose();
    } catch (err) {
      toast.error("Gagal menyimpan transaksi struk.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Receipt className="h-5 w-5 text-primary" />
            Scan Struk Belanja / Nota
          </DialogTitle>
          <DialogDescription className="text-xs">
            Foto nota kasir untuk membaca total belanja dan toko secara otomatis dengan OCR.
          </DialogDescription>
        </DialogHeader>

        {/* State 1: Choose Camera or Upload */}
        {!imagePreview && (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center space-y-4 bg-muted/20">
              <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Receipt className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-sm sm:text-base text-foreground">
                  Ambil Foto atau Pilih Gambar Struk
                </h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Pastikan foto struk terang, tidak buram, dan teks total belanja terlihat jelas.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2 justify-center">
                <Button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="gap-2 text-xs sm:text-sm font-medium"
                >
                  <Camera className="h-4 w-4" />
                  Buka Kamera
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 text-xs sm:text-sm font-medium"
                >
                  <Upload className="h-4 w-4" />
                  Pilih Dari Galeri
                </Button>
              </div>
            </div>

            {/* Hidden native inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* State 2: Processing OCR */}
        {imagePreview && isProcessing && (
          <div className="py-10 text-center space-y-4">
            <div className="relative h-16 w-16 mx-auto">
              <RefreshCw className="h-16 w-16 text-primary animate-spin opacity-80" />
              <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-semibold text-sm sm:text-base text-foreground">
                {ocrStatus || "Sedang Membaca Struk..."}
              </h4>
              <p className="text-xs text-muted-foreground">
                Kecerdasan OCR sedang mendeteksi nominal harga, tanggal, dan nama toko.
              </p>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden max-w-xs mx-auto">
              <div
                className="bg-primary h-full transition-all duration-300 rounded-full"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* State 3: Result Verification & Edit Form */}
        {imagePreview && isResultReady && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Image Preview Thumbnail */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl border bg-muted/30">
              <img
                src={imagePreview}
                alt="Foto Struk"
                className="h-16 w-16 object-cover rounded-lg border shrink-0 bg-background"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Struk Berhasil Terbaca</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  Silakan tinjau dan sesuaikan data di bawah bila diperlukan.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetState}
                className="text-xs text-muted-foreground hover:text-foreground shrink-0"
              >
                Foto Ulang
              </Button>
            </div>

            {/* Total Amount */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Total Nominal Belanja (Rp)</Label>
              <Input
                type="number"
                min="0"
                value={extractedAmount}
                onChange={(e) => setExtractedAmount(e.target.value)}
                placeholder="Contoh: 75000"
                className="text-base font-bold text-foreground"
                required
              />
            </div>

            {/* Merchant / Description */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Nama Toko / Deskripsi</Label>
              <Input
                value={extractedMerchant}
                onChange={(e) => setExtractedMerchant(e.target.value)}
                placeholder="Contoh: Indomaret Point"
                required
              />
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Kategori Pengeluaran</Label>
              <Select
                value={extractedCategoryId}
                onValueChange={setExtractedCategoryId}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tanggal Transaksi</Label>
              <Input
                type="date"
                value={extractedDate}
                onChange={(e) => setExtractedDate(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full font-semibold">
              Simpan Transaksi Struk
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
