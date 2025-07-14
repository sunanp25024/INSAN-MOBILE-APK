# INSAN MOBILE - Platform Operasional Kurir

Selamat datang di INSAN MOBILE, sebuah platform operasional kurir visual berbasis web yang dirancang untuk menjadi alat utama bagi kurir di lapangan dan tim manajemen di kantor. Aplikasi ini dibangun dengan filosofi *mobile-first* dan dapat diinstal di perangkat seluler seperti aplikasi native (PWA - Progressive Web App).

---

## 1. Filosofi Desain & Pengalaman Pengguna (UX)

*   **Mobile-First:** Aplikasi ini dirancang untuk ponsel terlebih dahulu. Tombol-tombol dibuat besar, alur kerja dibuat vertikal, dan elemen penting ditempatkan di area yang mudah dijangkau.
*   **Progressive Disclosure:** Aplikasi ini hanya menampilkan informasi dan aksi yang relevan pada waktu yang tepat, memandu pengguna langkah demi langkah untuk mengurangi beban kognitif.
*   **Hierarki Visual yang Jelas:** Penggunaan warna, ukuran font, dan spasi dirancang secara strategis untuk menciptakan antarmuka yang bersih, terorganisir, dan mudah dipahami. Aksi utama menggunakan warna primer, sementara status menggunakan warna aksen (hijau untuk sukses, merah untuk pending/gagal).

---

## 2. Arsitektur & Teknologi yang Digunakan

Aplikasi ini menggunakan tumpukan teknologi modern yang berbasis JavaScript/TypeScript, dipilih untuk kecepatan pengembangan, skalabilitas, dan pengalaman pengguna yang kaya.

### Frontend (Tampilan Pengguna)

*   **Framework:** **Next.js 14+** dengan **App Router**. Menggunakan arsitektur modern *Server Components* untuk performa yang lebih cepat.
*   **Bahasa:** **TypeScript**. Menambahkan sistem tipe yang kuat untuk mengurangi bug dan membuat kode lebih mudah dipelihara.
*   **Komponen UI:** **ShadCN UI**. Kumpulan komponen *reusable* yang dibangun di atas **Radix UI** (untuk aksesibilitas) dan **Tailwind CSS** (untuk styling).
*   **Styling:** **Tailwind CSS**. Framework CSS *utility-first* untuk membangun desain kustom dengan cepat.
*   **PWA (Progressive Web App):** Menggunakan `@ducanh2912/next-pwa`, aplikasi ini dapat "diinstal" ke homescreen ponsel, memberikan pengalaman seperti aplikasi native.

### Backend & Infrastruktur

*   **Platform:** **Firebase (dari Google)**. Menjadi inti dari backend, menyediakan serangkaian layanan siap pakai.
*   **Database:** **Cloud Firestore**. Database NoSQL *real-time* dan skalabel untuk menyimpan semua data aplikasi seperti profil pengguna, tugas, dan absensi.
*   **Autentikasi:** **Firebase Authentication**. Mengelola semua proses pendaftaran, login (email/password), dan keamanan sesi pengguna.
*   **Penyimpanan File:** **Cloud Storage for Firebase**. Semua file yang diunggah, seperti foto bukti pengiriman dan avatar profil, disimpan dengan aman di sini.
*   **Logika Sisi Server:** Menggunakan **Next.js Server Actions** dan **Firebase Admin SDK**. Ini memungkinkan frontend untuk memanggil fungsi yang berjalan aman di server tanpa perlu membuat API endpoint secara manual, digunakan untuk semua operasi sensitif.

---

## 3. Rincian Fitur Utama

Aplikasi ini memiliki fitur yang dirancang khusus untuk empat peran utama: **Kurir, PIC, Admin, dan MasterAdmin**.

### Fitur untuk Kurir

1.  **Dashboard Kurir:** Memandu alur kerja harian dari input data paket, pemindaian barcode resi, hingga proses pengantaran.
2.  **Upload Bukti Pengiriman:** Mengambil foto bukti pengiriman dan memasukkan nama penerima langsung dari lapangan.
3.  **Penyelesaian Hari:** Menyelesaikan tugas dan mengunggah bukti serah terima paket retur ke atasan.
4.  **Absensi (Attendance):** Melakukan *check-in* dan *check-out* dengan deteksi keterlambatan otomatis.
5.  **Halaman Performa:** Melihat statistik personal, tingkat keberhasilan, dan tren pengiriman.

### Fitur untuk Manajemen (PIC, Admin, MasterAdmin)

1.  **Dashboard Manajerial:** Memantau statistik *real-time* (kurir aktif, paket terkirim), feed aktivitas, dan grafik performa tim.
2.  **Manajemen Pengguna (Berjenjang):** Mengelola akun pengguna sesuai dengan hak akses perannya.
3.  **Alur Persetujuan (Approval Workflow):** Halaman khusus bagi Admin/MasterAdmin untuk menyetujui atau menolak permintaan dari PIC (misalnya, penambahan kurir baru).
4.  **Monitoring & Pelaporan:**
    *   **Monitoring Kurir:** Melihat daftar kurir dan detail riwayat tugas beserta bukti pengiriman.
    *   **Pusat Bukti Pengiriman:** Mencari bukti pengiriman berdasarkan resi, nama kurir, atau tanggal.
    *   **Pusat Laporan:** Mengunduh laporan detail dalam format Excel dengan kemampuan filter yang kuat.

---

## 4. Struktur Data di Firestore

Data aplikasi diorganisir dalam beberapa koleksi utama di Cloud Firestore untuk efisiensi dan skalabilitas:

*   **`users/{uid}`**: Menyimpan profil untuk semua pengguna. `{uid}` adalah ID unik dari Firebase Authentication.
*   **`attendance/{kurirUid_yyyy-MM-dd}`**: Menyimpan catatan absensi harian. Nama dokumen komposit memungkinkan pengambilan data yang sangat cepat.
*   **`kurir_daily_tasks/{kurirUid_yyyy-MM-dd}`**: Menyimpan ringkasan tugas harian kurir.
    *   **Sub-koleksi: `.../packages/{resi_paket}`**: Menyimpan detail setiap paket yang ditangani pada hari itu. Desain ini mencegah dokumen utama membengkak dan menjaga performa.
*   **`approval_requests/{requestId}`**: Mencatat setiap permintaan yang memerlukan persetujuan, menciptakan jejak audit yang jelas.
*   **`notifications/{notificationId}`**: Menyimpan notifikasi sistem untuk manajer, seperti adanya permintaan persetujuan baru.

---

## 5. Keamanan & Skalabilitas

*   **Keamanan:** Aplikasi dilindungi oleh **Firebase Security Rules** di sisi server yang memastikan pengguna hanya dapat mengakses data yang menjadi haknya. Selain itu, **Role-Based Access Control (RBAC)** diimplementasikan di frontend untuk menampilkan menu dan halaman yang sesuai dengan peran pengguna.
*   **Skalabilitas:** Dibangun di atas infrastruktur *serverless* dari Firebase dan Vercel, aplikasi ini dapat menangani pertumbuhan pengguna dari puluhan hingga ribuan kurir tanpa perlu mengelola server fisik. Biaya operasional mengikuti model *pay-as-you-go*, membuatnya efisien untuk memulai dan berkembang.