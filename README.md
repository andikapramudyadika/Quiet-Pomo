# Quiet Pomo

Quiet Pomo adalah website Pomodoro sederhana, elegan, dan bergaya Notion-like. Project ini dibuat sebagai aplikasi statis sehingga mudah di-upload ke GitHub atau GitHub Pages.

## Fitur

- Mode Pomodoro, Short Break, dan Long Break.
- Durasi timer bisa diatur.
- Auto-start untuk break dan pomodoro berikutnya.
- Daftar tugas harian dengan estimasi jumlah sesi.
- Estimasi waktu selesai.
- Pilihan warna background dan custom color.
- Suara alarm dan opsi suara jarum jam terus menerus.
- Custom teks notifikasi browser.
- Data tersimpan otomatis di browser lewat localStorage.
- Responsive untuk desktop dan mobile.

## Cara menjalankan

Buka `index.html` langsung di browser, atau jalankan server lokal sederhana:

```bash
python -m http.server 5173
```

Lalu buka:

```text
http://localhost:5173
```

Untuk notifikasi browser, akses lewat `localhost` lebih disarankan daripada membuka file langsung.

## Menambahkan audio loop dari file MP3

Gunakan langkah ini kalau ingin menambahkan suara luar seperti api unggun, hujan, white noise, atau ambience lain.

1. Buat folder `assets/audio` di dalam project.
2. Masukkan file MP3 ke folder tersebut, misalnya `assets/audio/api-unggun.mp3`.
3. Tambahkan elemen audio sebelum baris `<script src="app.js"></script>` di `index.html`:

```html
<audio id="ambientAudio" src="assets/audio/api-unggun.mp3" loop preload="none"></audio>
```

4. Tambahkan tombol atau switch di bagian settings, misalnya:

```html
<label class="switch-row">
  <span>Suara api unggun</span>
  <input id="ambientSound" type="checkbox" />
</label>
```

5. Tambahkan kode ini di `app.js` setelah elemen lain terdaftar:

```js
const ambientAudio = document.querySelector("#ambientAudio");
const ambientSound = document.querySelector("#ambientSound");

ambientSound.addEventListener("change", async (event) => {
  if (event.target.checked) {
    ambientAudio.volume = 0.45;
    await ambientAudio.play();
  } else {
    ambientAudio.pause();
  }
});
```

Catatan: browser biasanya hanya mengizinkan audio diputar setelah pengguna menekan tombol atau switch. Untuk GitHub Pages, pastikan nama folder dan file sama persis, termasuk huruf besar-kecil.
