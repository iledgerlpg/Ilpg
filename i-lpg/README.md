# 📖 i-LPG — Panduan Deployment

**Sistem Manajemen Distribusi LPG Enterprise**  
Versi 1.0.0 | Multi-Tenant | PWA Ready

---

## 🏗️ Struktur Folder

```
i-lpg/
├── index.html              # Halaman login
├── registerpt.html         # Pendaftaran perusahaan baru (otomatis)
├── offline.html            # Fallback PWA saat offline
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker (PWA offline)
├── Code.gs                 # Google Apps Script backend
├── css/
│   └── style.css           # Design system lengkap
├── js/
│   ├── app.js               # Core JS: API, Auth, Utils
│   ├── charts.js            # Grafik & laporan cetak
│   └── profile.js           # Modal profil & ubah password
├── pages/
│   ├── driver.html         # Dashboard Driver
│   ├── admin.html          # Dashboard Admin
│   └── hrd.html             # Dashboard HRD
└── assets/
    └── icons/              # PWA icons (72–512px)
```

---

## 🚀 LANGKAH DEPLOYMENT

### STEP 1 — Buat Google Spreadsheet Master

1. Buka [Google Sheets](https://sheets.google.com)
2. Buat spreadsheet baru, beri nama **"i-LPG Master"**
3. Salin **Spreadsheet ID** dari URL:  
   `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`**`/edit`

### STEP 2 — Buat Spreadsheet per Perusahaan

1. Buat spreadsheet baru untuk setiap perusahaan, misal: **"i-LPG - PT Demo Energi"**
2. Salin Spreadsheet ID-nya juga

### STEP 3 — Setup Google Apps Script

1. Buka [script.google.com](https://script.google.com)
2. Klik **New Project**
3. Paste seluruh isi file `Code.gs`
4. **Edit konfigurasi** di baris pertama:
   ```javascript
   const GAS_CONFIG = {
     MASTER_SS_ID: 'PASTE_MASTER_SPREADSHEET_ID_DISINI',
     // ...
   };
   ```
5. Klik **Save** (Ctrl+S)

### STEP 4 — Jalankan Setup Functions

Di Apps Script Editor:
1. Pilih function **`setupMasterSpreadsheet`** → klik **Run**  
   _(Akan meminta izin Google — setujui semua)_
2. Selesai — sheet `Perusahaan`, `Users`, `Sessions`, `AuditLog` otomatis dibuat di Master

> 💡 **Tidak perlu lagi membuat spreadsheet perusahaan secara manual.**  
> Mulai dari versi ini, perusahaan baru bisa mendaftar sendiri lewat halaman **`registerpt.html`** — sistem akan otomatis:
> 1. Membuat Google Spreadsheet baru untuk perusahaan tsb (`SpreadsheetApp.create()`)
> 2. Mengisi seluruh sheet wajib (Driver, Pangkalan, SPBE, Pengiriman, Absensi, dll)
> 3. Mendaftarkan perusahaan ke Master
> 4. Membuat akun HRD pertama
>
> Fungsi `setupCompanySpreadsheet()` manual tetap tersedia sebagai cadangan jika Anda ingin membuat spreadsheet perusahaan secara manual.

### STEP 5 — Deploy Apps Script sebagai Web App

1. Klik menu **Deploy** → **New Deployment**
2. Klik ikon ⚙️ → pilih **Web app**
3. Konfigurasi:
   - **Description**: i-LPG API v1.0
   - **Execute as**: Me (your account)
   - **Who has access**: Anyone
4. Klik **Deploy**
5. **Salin URL** yang diberikan (contoh: `https://script.google.com/macros/s/AKfycbxxx.../exec`)

### STEP 6 — Update URL di Frontend

Buka file `js/app.js`, cari baris:
```javascript
GAS_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
```
Ganti `YOUR_SCRIPT_ID` dengan URL lengkap dari Step 5.

### STEP 7 — Deploy ke GitHub Pages

```bash
# 1. Buat repository GitHub baru: "i-lpg"
git init
git add .
git commit -m "Initial i-LPG deployment"
git remote add origin https://github.com/USERNAME/i-lpg.git
git push -u origin main

# 2. Di GitHub: Settings → Pages → Source: main branch → /root
# 3. Akses: https://USERNAME.github.io/i-lpg/
```

---

## 👤 AKUN DEFAULT (Setelah Setup)

| Role   | Username       | Password  |
|--------|----------------|-----------|
| HRD    | `hrd_demo`     | `demo123` |
| Admin  | `admin_demo`   | `demo123` |
| Driver | `driver_demo`  | `demo123` |
| Kode Perusahaan | `DEMO` | — |

> ⚠️ **Segera ganti password default setelah login pertama!**

---

## 📋 SKEMA SPREADSHEET

### Master Spreadsheet (Sheet: Perusahaan)
| kode | nama | alamat | telepon | spreadsheet_id | status |
|------|------|--------|---------|----------------|--------|
| DEMO | PT Demo | ... | ... | 1Bxi... | aktif |

### Master Spreadsheet (Sheet: Users)
| id | name | username | email | telepon | password_hash | role | status | company_code |
|----|------|----------|-------|---------|---------------|------|--------|--------------|

### Company Spreadsheet (Sheet: Pengiriman)
| id | driver_id | driver_name | spbe_id | spbe_name | pangkalan_id | pangkalan_name | jumlah | tanggal | status | jumlah_kirim | keterangan | photo | report_time |

### Company Spreadsheet (Sheet: Absensi)
| id | user_id | user_name | role | date | type | timestamp | lat | lng | accuracy | photo | status |

---

## 🔑 API ENDPOINTS

Semua request ke `POST {GAS_URL}` dengan body JSON:

```json
{
  "action": "nama_action",
  "token": "session_token",
  ...params
}
```

### Auth
| Action | Params | Keterangan |
|--------|--------|------------|
| `login` | username, password, companyCode | Login user |
| `logout` | token | Logout & hapus sesi |
| `get_companies` | — | Daftar perusahaan aktif |
| `check_company_code` | code | Cek ketersediaan kode perusahaan |
| `register_company` | companyName, companyCode, address, phone, hrdName, hrdUsername, hrdEmail, hrdPhone, hrdPassword | **Daftar perusahaan baru — otomatis buat spreadsheet + akun HRD** |

### Pengiriman
| Action | Role | Keterangan |
|--------|------|------------|
| `get_deliveries` | All | Daftar jadwal |
| `create_delivery` | Admin/HRD | Buat jadwal |
| `update_delivery` | Admin/HRD | Edit jadwal |
| `delete_delivery` | Admin/HRD | Hapus jadwal |
| `report_delivery` | Driver | Submit laporan |
| `takeover_delivery` | Driver | Ambil alih jadwal |

### Absensi
| Action | Role | Keterangan |
|--------|------|------------|
| `attendance_checkin` | All | Absen masuk (GPS + foto) |
| `attendance_checkout` | All | Absen pulang |
| `get_attendance` | All | Riwayat absensi |

---

## 🔒 KEAMANAN

- ✅ **Token-based authentication** — setiap sesi punya token unik
- ✅ **Role-based access control** — driver/admin/hrd dibatasi per fitur
- ✅ **Password hashing** — SHA-256 di server side (Apps Script)
- ✅ **GPS validation** — batas koordinat Indonesia (±11°, 95°–141°)
- ✅ **Camera-only capture** — foto absensi tidak bisa dari galeri
- ✅ **Canvas watermark** — timestamp + nama + GPS pada foto
- ✅ **Audit log** — semua aktivitas tercatat lengkap
- ✅ **Session expiry** — token otomatis kadaluarsa 8 jam
- ✅ **Multi-tenant isolation** — data antar perusahaan terpisah total

---

## 📱 INSTALL PWA

### Android (Chrome)
1. Buka aplikasi di Chrome
2. Tap ⋮ → "Tambahkan ke layar utama"
3. Ketuk "Tambah"

### iPhone (Safari)
1. Buka aplikasi di Safari
2. Tap ikon berbagi ↑
3. Pilih "Tambah ke Layar Utama"
4. Ketuk "Tambah"

---

## 🐛 TROUBLESHOOTING

### Error "Perusahaan tidak ditemukan"
→ Pastikan kode perusahaan di sheet **Perusahaan** sudah benar

### Error "Spreadsheet ID belum dikonfigurasi"
→ Isi kolom `spreadsheet_id` di sheet Perusahaan

### Login selalu gagal
→ Jalankan ulang `setupMasterSpreadsheet()` di Apps Script

### Foto tidak bisa diambil
→ Pastikan browser mengizinkan akses kamera (HTTPS diperlukan)

### GPS tidak muncul
→ Aktifkan Location Services di perangkat. Harus HTTPS untuk GPS di mobile.

### CORS Error
→ Pastikan Apps Script di-deploy dengan "Anyone can access"

---

## 🔧 KUSTOMISASI

### Menambah Perusahaan Baru
1. Buat spreadsheet baru untuk perusahaan
2. Tambah baris di sheet **Perusahaan** Master
3. Jalankan `setupCompanySpreadsheet('KODE_BARU')`
4. Tambah user HRD via sheet Users atau function

### Mengubah Tema Warna
Edit variabel di `css/style.css`:
```css
:root {
  --primary: #E85D04;      /* Ubah warna utama */
  --primary-dark: #C44D03;
}
```

### Mengubah Durasi Sesi
Edit di `Code.gs`:
```javascript
TOKEN_EXPIRY_HOURS: 8,   /* Ubah jam sesi */
```

---

## 📊 FITUR SUMMARY

| Fitur | Driver | Admin | HRD |
|-------|:------:|:-----:|:---:|
| Absensi GPS + Kamera | ✅ | ✅ | — |
| Lihat Tugas Sendiri | ✅ | — | — |
| Lihat Jadwal Global | ✅ | ✅ | ✅ |
| Ambil Alih Jadwal | ✅ | — | — |
| Laporan Pengiriman | ✅ | — | — |
| Upload Jadwal | — | ✅ | ✅ |
| Edit Laporan Driver | — | ✅ | ✅ |
| Manajemen Pangkalan | — | ✅ | ✅ |
| Pembayaran | — | ✅ | ✅ |
| Bagi Hasil | — | ✅ | ✅ |
| Monitoring Refill | — | ✅ | ✅ |
| Manajemen User | — | — | ✅ |
| Approval Akun | — | — | ✅ |
| Kinerja Driver | — | — | ✅ |
| Audit Log | — | — | ✅ |

---

*i-LPG v1.0.0 — Enterprise LPG Distribution Management System*
