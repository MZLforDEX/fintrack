<div align="center">

# 💳 FinTrack — Personal Finance Tracker

**Aplikasi Manajemen Keuangan Pribadi yang Modern, Cepat, dan 100% Offline-First untuk Web & Android.**

[![Version](https://img.shields.io/badge/version-1.3.0-emerald.svg?style=flat-square)](https://github.com/MZLforDEX/fintrack/releases)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black.svg?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android_Native-119EFF.svg?style=flat-square&logo=ionic)](https://capacitorjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Privacy: 100% Offline](https://img.shields.io/badge/Privacy-100%25_Offline-success.svg?style=flat-square)](https://github.com/MZLforDEX/fintrack)

<p align="center">
  <a href="#-fitur-utama">Fitur Utama</a> •
  <a href="#-unduh-aplikasi-android-v13">Unduh APK</a> •
  <a href="#-teknologi-yang-digunakan">Tech Stack</a> •
  <a href="#-struktur-proyek">Struktur Proyek</a> •
  <a href="#-menjalankan-secara-lokal">Cara Menjalankan</a> •
  <a href="#-arsitektur-keamanan--privasi">Keamanan & Privasi</a>
</p>

---

</div>

## 📖 Tentang FinTrack

**FinTrack** adalah aplikasi pencatatan dan analisis keuangan pribadi yang dirancang dengan pendekatan **Privacy-First** dan **Offline-First**. Berbeda dengan kebanyakan aplikasi keuangan yang mengharuskan pembuatan akun atau mengunggah data sensitif ke server cloud pihak ketiga, FinTrack beroperasi **sepenuhnya di memori lokal perangkat Anda** tanpa ketergantungan internet sama sekali.

Aplikasi ini tersedia baik sebagai aplikasi web responsif modern maupun sebagai aplikasi **Android Native (.apk)** yang ringan, responsif, dan hemat daya baterai.

---

## 🚀 Fitur Utama

### 🛡️ 1. 100% Offline & Menjamin Privasi (Zero-Data Leakage)
- Tidak membutuhkan login akun, email, ataupun password.
- Seluruh riwayat transaksi keuangan Anda tersimpan eksklusif di dalam database lokal **IndexedDB (Dexie.js)** pada perangkat Anda.
- Versi Android dikompilasi **tanpa izin akses internet (`INTERNET` permission disabled)**, menjamin secara teknis di level sistem operasi bahwa tidak ada data transaksi yang dapat bocor atau dikirim keluar dari smartphone Anda.

### ☀️ 2. Batas Wajar Penggunaan Harian & Bulanan (Smart Safe Limits)
- **Batas Wajar Harian Otomatis**: Menghitung jatah pengeluaran harian yang aman berdasarkan alokasi saldo kas 6 bulan dibagi jumlah hari.
- **Jatah Adaptif Sisa Bulan**: Menyesuaikan rekomendasi kuota belanja harian ke depan berdasarkan sisa kuota bulanan yang masih tersedia.
- **Peringatan Real-Time**: Memberikan peringatan instan saat memasukkan transaksi jika nominal belanja melebihi sisa batas wajar harian.
- **Fleksibilitas Kustomisasi**: Pengguna dapat memilih mode rekomendasi otomatis atau menetapkan batas nominal harian sendiri.

### 🔍 3. Pemindai Barcode Barang (Smart Barcode Scanner)
- Pindai barcode kemasan produk belanjaan secara instan menggunakan kamera smartphone via `html5-qrcode`.
- Terintegrasi dengan **katalog bawaan 100+ produk retail harian populer** di Indonesia (Indomie, Aqua, Le Minerale, minyak goreng, produk kebutuhan pokok, hingga perlengkapan mandi).
- Memungkinkan penambahan dan kustomisasi daftar barcode produk baru sesuai kebiasaan belanja Anda.

### 🧾 4. Pemindai Struk Belanja (OCR Smart Receipt Reader)
- Ekstraksi teks struk belanja otomatis menggunakan teknologi Optical Character Recognition (OCR).
- Algoritma cerdas yang mampu mendeteksi nama merchant/minimarket (*Indomaret, Alfamart, SPBU, apotek, kafe*), nominal total belanja, tanggal transaksi, dan menyarankan kategori pengeluaran yang sesuai.

### 📊 5. Analitik & Grafik Keuangan Interaktif
- Visualisasi arus kas masuk (*Income*) dan keluar (*Expense*) yang interaktif dan responsif menggunakan **Recharts**.
- Analisis pengeluaran per kategori (*Pie Chart & Bar Chart*) serta perbandingan tren arus kas bulanan untuk evaluasi finansial yang akurat.

### 💰 6. Anggaran Bulanan (Budgeting Management)
- Tentukan limit pengeluaran per kategori untuk setiap bulan.
- Dilengkapi ringkasan batas wajar harian dan bulanan terpadu untuk acuan belanja global.
- Indikator bar visual dinamis yang memberi peringatan saat pengeluaran mendekati atau melampaui limit anggaran.

### 🎯 7. Target Tabungan & Impian (Financial Goals)
- Atur target finansial jangka pendek maupun jangka panjang (dana darurat, liburan, gadget, kendaraan).
- Pantau persentase progres tabungan dan sisa waktu menuju tenggat waktu target (*deadline*).

### 📅 8. Kalender Finansial
- Tampilan kalender bulanan interaktif yang menampilkan riwayat keluar-masuk uang pada tanggal spesifik secara sekilas.

### 📱 9. Pengalaman Mobile Native Android yang Mulus
- Bilah navigasi bawah (*Mobile Bottom Navigation*) yang ramah satu tangan.
- Dukungan tombol kembali fisik Android (*Hardware Back Button*) yang cerdas (menutup dialog modal, kembali ke dashboard, atau konfirmasi keluar aplikasi).
- Desain *Safe Area Insets* yang menyesuaikan punch-hole kamera dan bilah gestur navigasi modern.
- Transisi antarmuka 60 FPS dengan akselerasi hardware penuh.

---

## 📦 Unduh Aplikasi Android (v1.3)

File APK versi terbaru yang siap diinstall langsung di smartphone Android Anda:

| Parameter | Spesifikasi |
| :--- | :--- |
| **Berkas APK** | [**`FinTrack-v1.3.apk`**](./FinTrack-v1.3.apk) *(Klik untuk mengunduh langsung dari repo)* |
| **Versi Rilis** | `v1.3.0 (Build 3)` |
| **Ukuran File** | **~5.1 MB** (Sangat ringan dan cepat diunduh) |
| **Application ID** | `com.mzlfordex.fintrack` |
| **Target OS** | Android 7.0 (Nougat, API Level 24) hingga Android 16 (API Level 36) |
| **Koneksi Internet** | **Tidak Dibutuhkan (100% Offline)** |

### Cara Pasang di Smartphone:
1. Unduh file [**`FinTrack-v1.3.apk`**](./FinTrack-v1.3.apk) ke ponsel Anda.
2. Buka file manager di HP dan ketuk file APK tersebut.
3. Pilih **Install** (jika muncul notifikasi keamanan, aktifkan *Allow from this source* atau *Izinkan dari sumber ini*).
4. Buka aplikasi **FinTrack** dan mulai kelola keuangan pribadi Anda secara bebas dan privat!

---

## 🛠️ Teknologi yang Digunakan

### Frontend Web Stack
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Static HTML Export)
- **Library UI**: [React 19](https://react.dev/)
- **Bahasa**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- **Komponen Ikon**: [Lucide React](https://lucide.dev/)
- **Visualisasi Data**: [Recharts](https://recharts.org/)
- **Database Klien**: [Dexie.js](https://dexie.org/) (Wrapper IndexedDB berkinerja tinggi)
- **Computer Vision & Hardware**: [html5-qrcode](https://github.com/mebjas/html5-qrcode) & [Tesseract.js](https://tesseract.projectnaptha.com/)

### Mobile Native Stack
- **Mobile Runtime**: [Capacitor 8](https://capacitorjs.com/) by Ionic
- **Build Toolchain**: Android Gradle Plugin 8.13 + Gradle 8.14.3 + OpenJDK 17
- **Target SDK**: Android API Level 36 (Android 16)

---

## 📂 Struktur Proyek

```text
fintrack/
├── android/                         # Proyek Native Android Studio (Capacitor)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml  # Konfigurasi izin, keamanan, dan hardware Android
│   │   │   └── res/                 # Resource ikon aplikasi dan splash screen
│   │   └── build.gradle             # Konfigurasi build module Android (v1.2)
│   ├── build.gradle                 # Konfigurasi root build Gradle & Java 17
│   └── gradlew.bat                  # Gradle Wrapper executable
├── src/
│   ├── app/                         # Rute Halaman Next.js (App Router)
│   │   ├── page.tsx                 # Dashboard Arus Kas Finansial
│   │   ├── transactions/            # Pencatatan & Riwayat Transaksi
│   │   ├── budgets/                 # Pengaturan Anggaran Bulanan
│   │   ├── goals/                   # Target Tabungan & Financial Goals
│   │   ├── analytics/               # Grafik & Visualisasi Finansial
│   │   ├── calendar/                # Kalender Kas Harian
│   │   ├── categories/              # Manajemen Kategori Kustom
│   │   ├── more/                    # Menu Lainnya & Katalog Barcode Produk
│   │   ├── globals.css              # Styling Tema Tailwind & Safe Area Insets
│   │   └── layout.tsx               # Root Layout & Mobile Navigation
│   ├── components/
│   │   ├── layout/                  # Sidebar (Desktop) & MobileNav (Mobile)
│   │   ├── providers/               # CapacitorProvider & Inisialisasi Database
│   │   ├── scanner/                 # BarcodeScannerModal & ReceiptScannerModal
│   │   └── ui/                      # Komponen Primitif Antarmuka (Button, Dialog, Card, Input)
│   └── lib/
│       ├── db.ts                    # Skema Database Dexie (IndexedDB) & Data Bawaan
│       ├── dateUtils.ts             # Format Tanggal & Waktu Lokal Indonesia
│       └── utils.ts                 # Formatter Mata Uang (IDR) & Classnames
├── capacitor.config.ts              # Konfigurasi Capacitor Native Bridge
├── next.config.ts                   # Konfigurasi Next.js Static Export
├── package.json                     # Daftar Dependensi & Skrip Perintah
├── FinTrack-v1.2.apk                # Binary APK Siap Pasang untuk Android
└── README.md                        # Dokumentasi Resmi Proyek
```

---

## 💻 Menjalankan Secara Lokal

### Prasyarat
- [Node.js](https://nodejs.org/) versi 20 atau 22 (LTS disarankan)
- [Java Development Kit (JDK)](https://adoptium.net/) versi 17
- [Android Studio](https://developer.android.com/studio) (opsional, jika ingin mengedit kode native Android)

### 1. Clone Repositori
```bash
git clone https://github.com/MZLforDEX/fintrack.git
cd fintrack
```

### 2. Instal Dependensi
```bash
npm install
```

### 3. Menjalankan Server Pengembangan Web
```bash
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

### 4. Melakukan Kompilasi Web & Sinkronisasi ke Android
```bash
npm run build:android
```
Perintah ini akan menjalankan `next build` untuk mengekspor aplikasi ke folder `out/` statis, lalu menyinkronkan seluruh aset web ke proyek Android native via `npx cap sync android`.

### 5. Membuka di Android Studio
```bash
npm run open:android
```

### 6. Mengompilasi File APK via Command Line
```powershell
cd android
.\gradlew.bat assembleDebug
```
File APK hasil build akan berlokasi di:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🔒 Arsitektur Keamanan & Privasi

FinTrack dibangun dengan standar keamanan aplikasi finansial tingkat tinggi:

1. **Zero Network Socket (Tanpa Izin Internet)**:
   File `AndroidManifest.xml` tidak mencantumkan `<uses-permission android:name="android.permission.INTERNET" />`. Aplikasi secara fisik terisolasi dari dunia luar.
2. **Anti-Pencadangan ADB (`android:allowBackup="false"`)**:
   Mencegah peretasan fisik atau pencurian database aplikasi melalui perintah *Android Debug Bridge (ADB)* saat ponsel terhubung ke komputer.
3. **Anti-MitM (`usesCleartextTraffic="false"`)**:
   Menolak segala bentuk koneksi HTTP polos tanpa enkripsi TLS/SSL.
4. **Isolasi Database Sandbox**:
   Data transaksi disimpan di direktori internal Android OS yang hanya dapat diakses oleh UID aplikasi FinTrack.
5. **Sanitasi Data**:
   Seluruh input formulir tervalidasi ketat dan terhindar dari kerentanan Cross-Site Scripting (XSS) maupun SQL Injection.

---

## 📜 Riwayat Rilis

- **v1.2.0 (Terbaru)**:
  - Transformasi menjadi aplikasi 100% luring (*Standalone Offline*).
  - Penghapusan total dependensi backend Supabase dan fitur sinkronisasi cloud demi privasi mutlak.
  - Pencabutan izin `android.permission.INTERNET` di AndroidManifest.
  - Pembaruan UI Menu Lainnya dengan status proteksi privasi.
  - Kompilasi APK v1.2 yang lebih ringan (~4.93 MB).
- **v1.0.0**:
  - Peluncuran perdana versi hybrid web dan Android dengan Capacitor.
  - Penambahan integrasi kamera Barcode Scanner dan OCR Struk Belanja.
  - Dukungan database lokal Dexie.js dan 100 katalog produk bawaan.

---

## 📄 Lisensi

Proyek ini dirilis di bawah lisensi terbuka [MIT License](LICENSE). Bebas digunakan, dipelajari, dan dikembangkan lebih lanjut untuk keperluan pribadi maupun non-komersial.

---

<div align="center">
  <sub>Dikembangkan dengan sepenuh hati oleh <a href="https://github.com/MZLforDEX">MZLforDEX</a></sub>
</div>
