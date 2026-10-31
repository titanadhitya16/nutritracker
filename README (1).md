# NutriTracker (NourishTracker)

Aplikasi pelacak nutrisi, kalori, dan hidrasi harian bergaya **Skeuomorphic** yang ditenagai oleh AI untuk memudahkan pencatatan makanan sehari-hari—baik melalui foto kamera maupun deskripsi teks sederhana.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4.1-06B6D4?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)

---

## Fitur Utama

- **Scan Makanan dengan Kamera (AI Vision)**: Ambil atau unggah foto makanan (termasuk masakan Indonesia) untuk memperkirakan kalori, protein, karbohidrat, dan lemak secara otomatis.
- **Input Teks Otomatis (Tanpa Ribet)**: Cukup ketik nama makanan beserta jumlah porsi (contoh: *"1 porsi Nasi Padang ayam bakar"*), dan AI akan menghitung estimasi kalori serta makronutrisinya tanpa perlu mengisi angka manual.
- **Asisten Gizi & Rekomendasi Menu**: Dapatkan evaluasi singkat pola makan harian serta ide menu sehat berdasarkan sisa kuota kalori dan waktu makan (pagi, siang, sore, malam).
- **Kalkulator TDEE Otomatis**: Menghitung kebutuhan kalori harian (*Total Daily Energy Expenditure*) menggunakan rumus *Harris-Benedict* berdasarkan berat badan, tinggi badan, usia, jenis kelamin, dan tingkat aktivitas, lengkap dengan pembagian target makronutrisi (30% Protein, 45% Karbohidrat, 25% Lemak).
- **Pelacak Hidrasi & Berat Badan**: Pantau target minum air putih harian (8 gelas/hari) dengan indikator visual interaktif serta pencatatan berat badan harian.
- **Statistik & Grafik Mingguan**: Visualisasi tren asupan kalori, distribusi makronutrisi, hidrasi, dan perubahan berat badan menggunakan grafik interaktif.
- **Streak & Sistem Medali**: Bangun kebiasaan sehat dengan penghitung *streak* harian dan koleksi pencapaian (*achievements*).
- **Desain Skeuomorphic Modern**: Antarmuka taktil yang intuitif, responsif, dan nyaman digunakan di perangkat *mobile* maupun *desktop*.

---

## Teknologi yang Digunakan

- **Frontend**: React 19, TypeScript, Vite
- **Styling & Animasi**: Tailwind CSS v4, Motion (`motion/react`), Lucide Icons
- **Visualisasi Data**: Recharts
- **Utilitas Tanggal**: `date-fns` (lokalisasi Bahasa Indonesia)
- **AI SDK**: `@google/genai`
- **Penyimpanan Data**: Browser `localStorage` (cepat, privat, tanpa perlu login)

---

## Struktur Proyek

```text
├── src/
│   ├── hooks/
│   │   └── useJournal.ts   # State management jurnal harian, profil, TDEE, streak & localStorage
│   ├── lib/
│   │   ├── gemini.ts       # Integrasi analisis foto makanan, teks porsi, & saran nutrisi
│   │   └── utils.ts        # Helper classNames & konversi file ke Base64
│   ├── App.tsx             # Komponen utama UI (Harian, Progres, Medali, Profil)
│   ├── index.css           # Custom styling skeuomorphic & konfigurasi Tailwind CSS
│   └── main.tsx            # Entry point aplikasi React
├── .env.example            # Contoh konfigurasi environment variable
├── index.html              # Template HTML utama
├── package.json            # Daftar dependensi & skrip npm
└── vite.config.ts          # Konfigurasi bundler Vite
```

---

## Cara Menjalankan secara Lokal

### Prasyarat

- **Node.js** versi 18 atau lebih baru (atau **Bun**)
- API Key dari [Google AI Studio](https://aistudio.google.com/)

### Langkah Instalasi

1. **Clone repositori ini**
   ```bash
   git clone https://github.com/titanadhitya16/nourish-tracker.git
   cd nourish-tracker
   ```

2. **Instal dependensi**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variable**

   Salin file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
   Lalu buka file `.env` dan masukkan API Key Anda:
   ```env
   GEMINI_API_KEY="MASUKKAN_API_KEY_ANDA_DI_SINI"
   ```

4. **Jalankan server pengembangan**
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000` di browser Anda.

---

## Skrip Tersedia

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan server pengembangan di port `3000` |
| `npm run build` | Mem-build aplikasi untuk produksi ke folder `dist/` |
| `npm run preview` | Menjalankan pratinjau hasil build produksi secara lokal |
| `npm run lint` | Memeriksa tipe TypeScript (`tsc --noEmit`) |

---

## Penyimpanan & Privasi Data

Aplikasi ini menyimpan seluruh data profil, riwayat makanan, hidrasi, dan berat badan secara lokal di perangkat pengguna melalui `localStorage` browser (`nourish_tracker_data_v2` dan `nourish_profile`). Tidak ada data jurnal pribadi yang disimpan di database eksternal.

---

## Kredit

**Design & Develop by [Tan](https://github.com/titanadhitya16)**
