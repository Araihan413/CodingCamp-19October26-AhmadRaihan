# 🌟 To-Do List Life Dashboard

Sebuah aplikasi personal dashboard modern berbasis web dengan estetika **Glassmorphism** yang elegan, responsif, dan berjalan 100% di sisi klien (*zero-backend*) menggunakan penyimpanan browser `localStorage`.

Dibuat untuk membantu produktivitas harian dengan menggabungkan jam digital presisi, sapaan personal dinamis, Pomodoro Focus Timer, manajemen to-do list terstruktur, dan peluncur tautan cepat (*quick links dock*).

---

## ✨ Fitur Utama

### 1. 🌓 Dynamic Island Theme Switcher
- Tombol sakelar tema bergaya *top-center camera notch / dynamic island*.
- Transisi halus antara **Light Mode** (gradien hangat) dan **Dark Mode** (gradien malam elegan) dalam 280ms.
- Memenuhi standar rasio kontras aksesibilitas WCAG 2.1 AA (≥ 4.5:1).

### 2. 🕒 Live Clock & Personalized Greeting
- **Jam Digital Real-Time**: Format 24-jam (`HH:MM:SS`) yang otomatis tersinkronisasi kembali saat tab browser aktif kembali (*visibilitychange API*).
- **Format Tanggal Lengkap**: Menampilkan hari, tanggal, bulan, dan tahun (misal: *Friday, 23 October 2026*).
- **Greeting Kontekstual**: Sapaan dinamis yang otomatis berganti sesuai waktu (*Morning*, *Afternoon*, *Evening*, *Night*).
- **Custom Display Name**: Simpan nama panggilan Anda ke `localStorage` (maks. 50 karakter), atau kosongkan untuk kembali ke default (*Friend*).

### 3. ⏱️ Pomodoro Focus Timer
- **SVG Circular Progress Ring**: Cincin animasi progres visual yang terkalibrasi dinamis dengan durasi sesi.
- **Kontrol Penuh**: Tombol Mulai (*Start*), Jeda (*Pause*), dan Atur Ulang (*Reset*).
- **Kustomisasi Durasi**: Bebas menentukan durasi fokus antara 1 hingga 120 menit dengan validasi input.
- **Audio Cue Alert**: Notifikasi audio otomatis saat sesi fokus berakhir.

### 4. 📝 Interactive Task Management (To-Do List)
- **Full CRUD**: Tambah task, centang selesai (*toggle completion*), edit teks secara inline, dan hapus task.
- **Dukungan Keyboard**: Tekan `Enter` untuk menyimpan task/edit dan `Escape` untuk membatalkan inline edit.
- **Layout Protektif**: Daftar task dilengkapi batas tinggi maksimal dan scroll internal berdesain halus, memastikan ribuan task tidak akan merusak layout komponen lain.
- **Counter Badge**: Menghitung jumlah task aktif dan selesai secara real-time.

### 5. 🚀 Quick Links Launchpad Dock
- Simpan tautan website favorit Anda dan buka langsung di tab baru (*1-click launchpad*).
- Validasi URL aman (wajib diawali `http://` atau `https://`, maks. 2048 karakter) dan label (maks. 50 karakter).
- Batas maksimal hingga 20 link dengan pesan notifikasi informatif.
- Tombol hapus tautan interaktif yang muncul saat di-hover tanpa terpotong.

### 6. 🛡️ Robust Error Handling & Feedback
- **StorageManager**: Pembungkus aman `localStorage` yang menangani penanganan kuota penuh atau mode penyamaran (*Incognito*) secara graceful.
- **Validasi Inline**: Pesan kesalahan input yang muncul dengan animasi halus (*slideInDown*).
- **Toast Notifications**: Notifikasi mengambang (*info, warning, error*) dengan animasi fade dan tombol dismiss.

---

## 🛠️ Teknologi yang Digunakan

- **HTML5**: Struktur semantik, aksesibilitas ARIA (*aria-live, role, aria-checked*), dan template tag.
- **CSS3**: Vanilla CSS murni, CSS Grid & Flexbox, CSS Custom Properties (*design tokens*), Glassmorphism (*backdrop-filter blur*), dan keyframe animations.
- **JavaScript (ES6+)**: Modular IIFE architecture, event delegation, DOM diffing sebelum render, tanpa dependensi pustaka luar (*Zero Dependency*).

---

## 📁 Struktur Direktori

```
CodingCamp-19October26-AhmadRaihan/
├── index.html          # Markup shell utama aplikasi & template DOM
├── README.md           # Dokumentasi proyek
├── css/
│   └── style.css       # Design tokens, reset, glassmorphism, responsive grid
├── js/
│   └── app.js          # Arsitektur modul JS (Storage, Theme, Clock, Timer, Tasks, Links)
└── .kiro/
    └── specs/          # Dokumentasi spesifikasi, requirements, dan checklist tasks
```

---

## 🚀 Cara Menjalankan Proyek

Proyek ini tidak memerlukan instalasi server atau dependensi tambahan (seperti Node.js / npm). Anda dapat membukanya langsung di browser:

1. **Clone repository ini:**
   ```bash
   git clone git@github.com:Araihan413/CodingCamp-19October26-AhmadRaihan.git
   ```
2. **Masuk ke direktori proyek:**
   ```bash
   cd CodingCamp-19October26-AhmadRaihan
   ```
3. **Buka file `index.html`:**
   - Cukup klik ganda pada file `index.html`, atau
   - Buka menggunakan Live Server di VS Code / editor pilihan Anda.

---
