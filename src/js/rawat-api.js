const API_HOST = "http://127.0.0.1:8000/api"; // Test Local
// const API_HOST = "https://rawat4b06.vps-poliban.my.id/api"; // Test server


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
  const apiPath = API_HOST + "/antrian/unit/" + idUnit;
  const total = document.getElementById("total-antrian");
  const menunggu = document.getElementById("menunggu");
  const nama = document.getElementById("nama-dipanggil");
  const nomorAntrian = document.getElementById("nomor-dipanggil");
  const queueTableBody = document.getElementById("queue-table-body");
  const queueDate = document.getElementById("queue-date");

  fetch(apiPath)
    .then((res) => res.json())
    .then((data) => {
      if (!data || data.success === false) {
        throw new Error(data?.message || "Respons API tidak valid.");
      }

      const antrian = data.data || {};
      const menungguList = Array.isArray(antrian.menunggu)
        ? antrian.menunggu
        : [];
      const dipanggil = antrian.pemeriksaan_awal || null;

      if (total)
        total.innerText = String(menungguList.length + (dipanggil ? 1 : 0));
      if (menunggu) menunggu.innerText = String(menungguList.length);
      if (dipanggil) {
        if (nomorAntrian)
          nomorAntrian.innerText = dipanggil.kode_antrian || "-";
        if (nama) {
          const namaPasien = dipanggil.pendaftaran?.pasien?.nama_lengkap || "-";
          nama.innerText = namaPasien;
        }
      }

      if (queueDate && data.tanggal) {
        queueDate.innerText = new Date(data.tanggal).toLocaleDateString(
          "id-ID",
          {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          },
        );
      }

      if (queueTableBody) {
        if (menungguList.length === 0) {
          queueTableBody.innerHTML = `
            <tr>
              <td colspan="6" class="px-6 py-5 text-center text-sm text-gray-500">
                Tidak ada pasien yang sedang menunggu.
              </td>
            </tr>
          `;
          return;
        }

        queueTableBody.innerHTML = menungguList
          .slice(0, 10)
          .map((item) => {
            const pasien = item.pendaftaran?.pasien || {};
            const statusBadge = `<span class="px-4 py-1.5 rounded-full text-xs font-medium bg-[#fde8cc] text-[#c87d2f]">Menunggu</span>`;
            return `
            <tr class="border-b border-gray-50">
              <td class="px-6 py-5 text-gray-700">${item.kode_antrian || "-"}</td>
              <td class="px-6 py-5 text-gray-800 font-medium">${pasien.nama_lengkap || "-"}</td>
              <td class="px-6 py-5 text-gray-600">-</td>
              <td class="px-6 py-5 text-gray-600 text-xs">-</td>
              <td class="px-6 py-5">${statusBadge}</td>
              <td class="px-6 py-5 text-gray-500 font-medium">
                <button class="px-5 py-2 rounded-lg text-white text-xs font-semibold" style="background-color: #2bb5a0;">Periksa</button>
              </td>
            </tr>
          `;
          })
          .join("");
      }
    })
    .catch((error) => {
      console.error("Gagal memuat data antrian dokter:", error);
      if (queueTableBody) {
        queueTableBody.innerHTML = `
          <tr>
            <td colspan="6" class="px-6 py-5 text-center text-sm text-red-500">
              Terjadi kesalahan saat memuat daftar pasien.
            </td>
          </tr>
        `;
      }
    });
}
