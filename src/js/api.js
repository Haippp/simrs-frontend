const API_HOST = 'http://127.0.0.1:8000/api'

async function kirimAsesmenPasien(formElement) {
    // 1. Ambil data dari element form menggunakan FormData kustom
    const formData = new FormData(formElement);

    // 2. Ambil token JWT perawat dari cookie untuk melewati middleware auth backend
    // const token = getCookie('jwt'); 
    // if (!token) {
    //     alert('Sesi perawat habis/tidak valid. Silakan login ulang.');
    //     window.location.href = '/login.html';
    //     return;
    // }

    // 3. Mapping & konversi tipe data agar presisi sesuai aturan Laravel Validation lu
    const payload = {
        id_perawat: parseInt(formData.get('id_perawat')),
        id_antrian: parseInt(formData.get('id_antrian')),
        id_pasien: parseInt(formData.get('id_pasien')),
        tensi: formData.get('tensi'),                                 // Harus String
        keluhan_utama: formData.get('catatan'),                       // Sesuai validasi: keluhan_utama (diambil dari input name="catatan")
        suhu: parseFloat(formData.get('suhu')),                       // Harus Numeric/Float
        nadi: parseInt(formData.get('nadi')),                         // Harus Integer
        tinggi_badan: parseFloat(formData.get('tinggi_badan')),       // Harus Numeric
        berat_badan: parseFloat(formData.get('berat_badan'))          // Harus Numeric
    };

    try {
        // 4. Kirim data menggunakan Fetch API Native
        const response = await fetch('/api/asesmen', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        // 5. Handling Response dari Backend
        if (response.ok) {
            alert('Sukses! Data asesmen pasien berhasil disimpan dan diteruskan ke dokter.');
            formElement.reset(); // Kosongkan kembali isi form input
            if (typeof closeModal === 'function') closeModal(); // Otomatis tutup modal lu jika fungsinya ada
            window.location.reload(); // Refresh dashboard antrian biar up-to-date
        } else {
            // Menangkap error jika validation laravel return status 422
            alert('Gagal menyimpan data: ' + (result.message || 'Periksa kembali inputan Anda.'));
            console.error('Laravel Validation Errors:', result.errors);
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        alert('Terjadi kendala jaringan, gagal menyambung ke server.');
    }
}

// Fungsi bantu (helper) untuk mengambil Token JWT perawat dari cookie browser
function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for(let i=0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function displayAntrianUnit(idUnit){
    const apiPath = API_HOST + '/antrian/unit/' + idUnit

    const total = document.getElementById('total-antrian')
    const menunggu = document.getElementById('menunggu')

    const nama = document.getElementById('nama-dipanggil')
    const nomorAntrian = document.getElementById('nomor-dipanggil')

    const antrianContainer = document.getElementById('antrian-selanjutnya')

    fetch(apiPath).then(res => res.json()).then(
        data => [data.statistik, data.data]).then(([stats, dataAntrian]) => {
            const antrianMenunggu = dataAntrian["menunggu"]
            const antrianDipanggil = dataAntrian["pemeriksaan_awal"]

            total.innerText = stats.total
            menunggu.innerText = stats.menunggu

            nomorAntrian.innerText = antrianDipanggil.kode_antrian
            nama.innerText = antrianDipanggil.pendaftaran["pasien"]["nama_lengkap"]

            for (let i = 0; i < 4; i++) {
                antrianContainer.innerHTML += `
                    <div class="queue-row">
                        <span class="num">${antrianMenunggu[i].kode_antrian}</span>
                        <div class="divider"></div>
                        <span class="name">${antrianMenunggu[i].pendaftaran["pasien"]["nama_lengkap"]}</span>
                    </div>
                    `
                }
        }
    )
}