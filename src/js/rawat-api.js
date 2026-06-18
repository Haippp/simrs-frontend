// kel1.auth_token user_id -> kel2.dokter user_id -> kel1.unit nama_unit
// const API_HOST = "http://192.168.238.180:8000/api"; // Test Local
// const API_HOST = "https://rawat4b06.vps-poliban.my.id/api"; // server
const API_HOST = "https://8e59-2404-c0-c201-ad34-41ca-403b-fc3-3216.ngrok-free.app/api"; // ngrox

async function kirimAsesmenPasien(formElement) {
  // 1. Ambil data dari element form menggunakan FormData kustom
  const formData = new FormData(formElement);

  // 2. Ambil token JWT perawat dari cookie untuk melewati middleware auth backend
  //   const token = getCookie("jwt");
  //   if (!token) {
  //     console.warn(
  //       "JWT token not found in cookies — request will be sent without Authorization header.",
  //     );
  //   }

  // 3. Mapping & konversi tipe data agar presisi sesuai aturan Laravel Validation lu
  const alergiInput = formData.get("alergi");
  const alergi = alergiInput && alergiInput.trim() !== "" ? alergiInput : null;

  const payload = {
    id_perawat: parseInt(formData.get("id_perawat")),
    id_antrian: parseInt(formData.get("id_antrian")),
    id_pasien: parseInt(formData.get("id_pasien")),
    tensi: formData.get("tensi"), // Harus String
    keluhan_utama: formData.get("catatan"), // Sesuai validasi: keluhan_utama (diambil dari input name="catatan")
    suhu: parseFloat(formData.get("suhu")), // Harus Numeric/Float
    nadi: parseInt(formData.get("nadi")), // Harus Integer
    respirasi: parseInt(formData.get("respirasi")), // Harus Integer
    tinggi_badan: parseFloat(formData.get("tinggi_badan")), // Harus Numeric
    berat_badan: parseFloat(formData.get("berat_badan")), // Harus Numeric
    alergi: alergi, // Null jika kosong, String jika ada
  };

  try {
    // 4. Kirim data menggunakan Fetch API Native
    const url = API_HOST + "/asesmen";
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    // if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // 5. Handling Response dari Backend
    if (response.ok) {
      alert(
        "Sukses! Data asesmen pasien berhasil disimpan dan diteruskan ke dokter.",
      );
      formElement.reset(); // Kosongkan kembali isi form input
      if (typeof closeModal === "function") closeModal(); // Otomatis tutup modal lu jika fungsinya ada
      window.location.reload(); // Refresh dashboard antrian biar up-to-date
    } else {
      // Menangkap error jika validation laravel return status 422
      alert(
        "Gagal menyimpan data: " +
          (result.message || "Periksa kembali inputan Anda."),
      );
      console.error("Laravel Validation Errors:", result.errors);
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    alert("Terjadi kendala jaringan, gagal menyambung ke server.");
  }
}

async function fetchAsesmenToday() {
  const url = API_HOST + "/asesmen/today";
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const token = getCookie("jwt");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Gagal mengambil data asesmen hari ini:", result);
      return null;
    }

    return result.data || [];
  } catch (error) {
    console.error("Fetch Asesmen Today Error:", error);
    return null;
  }
}

// Attach submit handler to the asesmen form so it uses our function
// dan toggle tampilan input alergi saat checkbox diklik
document.addEventListener("DOMContentLoaded", () => {
  const cekAlergi = document.getElementById("cekAlergi");
  const formAlergiWrapper = document.getElementById("formAlergiWrapper");

  if (cekAlergi && formAlergiWrapper) {
    cekAlergi.addEventListener("change", () => {
      if (cekAlergi.checked) {
        formAlergiWrapper.classList.remove("hidden");
      } else {
        formAlergiWrapper.classList.add("hidden");
        // Kosongkan nilai alergi jika checkbox di-uncheck
        const alergiInput = formAlergiWrapper.querySelector(
          'input[name="alergi"]',
        );
        if (alergiInput) alergiInput.value = "";
      }
    });
  }

  const form = document.getElementById("formAsesmen");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await kirimAsesmenPasien(form);
    });
  }

  const queueTableBody = document.getElementById("queue-table-body");
  if (queueTableBody) {
    displayAntrianUnit(1);
  }
});

// Fungsi bantu (helper) untuk mengambil Token JWT perawat dari cookie browser
function getCookie(name) {
  let nameEQ = name + "=";
  let ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function displayAntrianUnit(idUnit) {
  const unitId = Number(idUnit) || 1;
  const apiPath = API_HOST + "/antrian/unit/" + unitId;
  const total = document.getElementById("total-antrian");
  const menunggu = document.getElementById("menunggu");
  const nama = document.getElementById("nama-dipanggil");
  const nomorAntrian = document.getElementById("nomor-dipanggil");
  const antrianSelanjutnya = document.getElementById("antrian-selanjutnya");

  const getPasienObject = (item) =>
    item?.pendaftaran?.pasien ||
    item?.pasien ||
    item?.data?.pasien ||
    item?.data?.patient ||
    {};

  const getNamaPasien = (item) => {
    const pasien = getPasienObject(item);
    return (
      pasien?.nama_lengkap ||
      pasien?.nama ||
      pasien?.nama_pasien ||
      item?.nama_lengkap ||
      item?.nama ||
      "-"
    );
  };

  fetch(apiPath)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      const payload = data && typeof data === "object" ? data.data || data : {};
      const antrian = payload && typeof payload === "object" ? payload : {};
      const menungguList = Array.isArray(antrian.menunggu) ? antrian.menunggu : [];
      const dipanggil = antrian.pemeriksaan_awal || null;

      if (total) total.innerText = String(menungguList.length + (dipanggil ? 1 : 0));
      if (menunggu) menunggu.innerText = String(menungguList.length);

      if (dipanggil) {
        if (nomorAntrian) nomorAntrian.innerText = dipanggil.kode_antrian || dipanggil.nomor_antrian || "-";
        if (nama) nama.innerText = getNamaPasien(dipanggil);
      } else {
        if (nomorAntrian) nomorAntrian.innerText = "–";
        if (nama) nama.innerText = "Tidak ada";
      }

      if (!antrianSelanjutnya) return;

      if (menungguList.length === 0) {
        antrianSelanjutnya.innerHTML = `
          <div class="section-label mb-1">Antrian Selanjutnya</div>
          <div class="queue-row">
            <span class="name" style="color:#9ca3af;">Tidak ada antrian menunggu.</span>
          </div>
        `;
        return;
      }

      antrianSelanjutnya.innerHTML = `
        <div class="section-label mb-1">Antrian Selanjutnya</div>
        ${menungguList.slice(0, 8).map((item) => {
          const kode = item.kode_antrian || item.nomor_antrian || "-";
          const namaPasien = getNamaPasien(item);
          return `
            <div class="queue-row">
              <span class="num">${kode}</span>
              <div class="divider"></div>
              <span class="name">${namaPasien}</span>
            </div>
          `;
        }).join("")}
      `;
    })
    .catch((error) => {
      console.error("Gagal memuat data antrian:", error);
      if (antrianSelanjutnya) {
        antrianSelanjutnya.innerHTML = `
          <div class="section-label mb-1">Antrian Selanjutnya</div>
          <div class="queue-row">
            <span class="name" style="color:#ef4444;">Gagal memuat data antrian.</span>
          </div>
        `;
      }
    });
}

async function checkProfileUser(role, userId) {
  const url = API_HOST + `/${role}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      // Hapus Content-Type dari GET — ini yang trigger preflight CORS
      "Accept": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
  });

  if (!response.ok) {
    console.warn("[checkProfileUser] Gagal:", response.status);
    return null;
  }

  const result = await response.json();
  for (const data of result.data) {
    if (data.id_user == userId) {
      return data
    }
  }
  return null;
}

async function ShowDetailProfile(userId, role) {
  const unitName = document.getElementsByClassName('nama-unit');
  const NsName = document.getElementById("nama-perawat")

  // Tambah await — sebelumnya lupa await jadi userProfile isinya Promise, bukan data
  const userProfile = await checkProfileUser(role, userId);
  const text = await getUnitName(userProfile.id_unit);

  NsName.innerText = userProfile.nama_perawat
  for (const un of unitName) {
    un.textContent = text;
  }
}