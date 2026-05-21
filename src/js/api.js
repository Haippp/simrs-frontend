const API_HOST = 'http://127.0.0.1:8000/api'

function kirimAsesmen(){
    return null
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