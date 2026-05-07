# Quiet Pomo

Quiet Pomo adalah website Pomodoro sederhana dan bersih untuk membantu pengguna bekerja lebih fokus tanpa tampilan yang ramai. Aplikasi ini dibuat sebagai website statis sehingga mudah diakses.

## Fitur Utama

- Timer Pomodoro dengan mode `Pomodoro`, `Short Break`, dan `Long Break`.
- Durasi setiap mode bisa diatur sesuai kebutuhan.
- Tombol `Start`, `Pause`, `Skip`, dan `Reset` untuk mengontrol sesi.
- Statistik sesi dan total waktu fokus tersimpan otomatis di perangkat.
- Task list harian dengan estimasi jumlah Pomodoro.
- Estimasi waktu selesai berdasarkan daftar tugas.
- Panel pengaturan tersembunyi agar tampilan utama tetap clean dan fokus.
- Tema background: putih, sage, clay, ink, dan custom color.
- Audio loop dari folder `assets/audio`, misalnya Fire burning, Rain, Library, Coffee shop, Ocean shore, dan Wind.
- Suara alarm/notifikasi dari folder `assets/notification`.
- Teks notifikasi browser bisa dikustomisasi.
- Responsive untuk desktop dan mobile.

## Cara Menggunakan

1. Buka website Quiet Pomo.
2. Tekan `Start` untuk mulai sesi Pomodoro.
3. Fokus sampai waktu selesai.
4. Setelah sesi selesai, alarm akan berbunyi dan timer berpindah ke break.
5. Gunakan panel pengaturan untuk mengubah durasi, audio, tema, task, dan notifikasi.

## Penjelasan Tombol

### Tombol di Timer

- `Start`: memulai timer.
- `Pause`: menghentikan timer sementara.
- `Skip`: melewati sesi saat ini dan langsung lanjut ke sesi berikutnya.
- `Reset`: mengembalikan waktu pada mode yang sedang aktif ke durasi utuh, tanpa berpindah mode.

### Tombol di Kanan Atas

- Ikon pengaturan: membuka panel `Tasks & settings`.
- Ikon lonceng: meminta izin notifikasi browser. Jika izin sudah aktif, ikon akan berubah menjadi lonceng normal.
- Ikon restart: mereset seluruh data aplikasi setelah konfirmasi, termasuk sesi, waktu fokus, task, dan pengaturan tersimpan.

## Panel Tasks & Settings

Panel ini dibuka dari ikon pengaturan di kanan atas.

### Tasks

Gunakan bagian `Tasks` untuk menambahkan daftar pekerjaan harian. Setiap task dapat diberi estimasi jumlah Pomodoro. Saat sesi Pomodoro selesai, progress task aktif akan bertambah otomatis.

### Focus Setup

Pengaturan yang tersedia:

- `Pomodoro`: durasi sesi fokus.
- `Short break`: durasi istirahat pendek.
- `Long break`: durasi istirahat panjang.
- `Long interval`: jumlah sesi Pomodoro sebelum Long Break.
- `Auto-start breaks`: break otomatis mulai setelah Pomodoro selesai.
- `Auto-start pomodoros`: Pomodoro otomatis mulai setelah break selesai.
- `Alarm`: memilih suara notifikasi saat sesi selesai.
- `Audio loop`: memilih ambience yang diputar saat timer berjalan.
- `Volume audio`: mengatur volume audio loop.
- `Notifikasi custom`: mengubah pesan notifikasi browser.
- Theme picker: memilih warna background atau custom color.

## Menjalankan Project

### Akses Online

Cara paling mudah untuk menggunakan Quiet Pomo adalah langsung membuka link berikut:

[Buka Quiet Pomo](https://andikapramudyadika.github.io/Quiet-Pomo/)

Setelah halaman terbuka, tekan `Start` untuk memulai timer. Semua pengaturan, task, sesi, dan waktu fokus akan tersimpan otomatis di perangkat yang digunakan.

### Menjalankan Secara Lokal

Jika ingin menjalankan project dari file lokal, buka `index.html` langsung di browser.

Untuk pengalaman terbaik, terutama audio dan notifikasi browser, jalankan melalui local server:

```bash
python -m http.server 5173
```

Lalu buka:

```text
http://localhost:5173
```

## Catatan Browser

Beberapa browser hanya mengizinkan audio dan notifikasi setelah pengguna melakukan interaksi, misalnya menekan tombol `Start` atau mengaktifkan izin notifikasi.
