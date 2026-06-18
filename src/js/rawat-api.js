// const API_HOST = "http://192.168.238.180:8000/api"; // Test Local
const API_HOST = "https://rawat4b06.vps-poliban.my.id/api"; // server
const API_BASE_URL = "https://daftar4b06.vps-poliban.my.id/api";
// const API_HOST = "https://8e59-2404-c0-c201-ad34-41ca-403b-fc3-3216.ngrok-free.app/api"; // ngrok

// ------------------------------------------------------------
//  Header default — dipakai di semua request
// ------------------------------------------------------------

// Fallback getCookie — jika daftar-api.js belum diload
if (typeof getCookie === "undefined") {
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  }
}

const HEADERS_GET = {
  "Accept": "application/json",
  "ngrok-skip-browser-warning": "true",
};

const HEADERS_POST = {
  "Accept": "application/json",
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true",
};

// ------------------------------------------------------------
//  Asesmen Pasien
// ------------------------------------------------------------

async function kirimAsesmenPasien(formElement) {
  const formData = new FormData(formElement);

  const alergiInput = formData.get("alergi");
  const alergi = alergiInput && alergiInput.trim() !== "" ? alergiInput : null;

  const payload = {
    id_perawat:    parseInt(formData.get("id_perawat")),
    id_antrian:    parseInt(formData.get("id_antrian")),
    id_pasien:     parseInt(formData.get("id_pasien")),
    tensi:         formData.get("tensi"),
    keluhan_utama: formData.get("catatan"),
    suhu:          parseFloat(formData.get("suhu")),
    nadi:          parseInt(formData.get("nadi")),
    respirasi:     parseInt(formData.get("respirasi")),
    tinggi_badan:  parseFloat(formData.get("tinggi_badan")),
    berat_badan:   parseFloat(formData.get("berat_badan")),
    alergi,
  };

  try {
    const response = await fetch(API_HOST + "/asesmen", {
      method: "POST",
      headers: HEADERS_POST,
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok) {
      alert("Sukses! Data asesmen pasien berhasil disimpan dan diteruskan ke dokter.");
      formElement.reset();
      if (typeof closeModal === "function") closeModal();
      window.location.reload();
    } else {
      alert("Gagal menyimpan data: " + (result.message || "Periksa kembali inputan Anda."));
      console.error("Laravel Validation Errors:", result.errors);
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    alert("Terjadi kendala jaringan, gagal menyambung ke server.");
  }
}

// ------------------------------------------------------------
//  Asesmen Hari Ini
// ------------------------------------------------------------

async function fetchAsesmenToday() {
  try {
    const response = await fetch(API_HOST + "/asesmen/today", {
      method: "GET",
      headers: HEADERS_GET,
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

// ------------------------------------------------------------
//  Antrian Unit
// ------------------------------------------------------------

async function displayAntrianUnit(idUnit) {
  const unitId = Number(idUnit) || 1;

  const total             = document.getElementById("total-antrian");
  const elMenunggu        = document.getElementById("menunggu");
  const nama              = document.getElementById("nama-dipanggil");
  const nomorAntrian      = document.getElementById("nomor-dipanggil");
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

  try {
    const response = await fetch(API_BASE_URL + "/antrian/unit/" + unitId, {
      method: "GET",
      headers: HEADERS_GET,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data    = await response.json();
    const payload = data?.data || data || {};
    const antrian = typeof payload === "object" ? payload : {};

    const menungguList = Array.isArray(antrian.menunggu) ? antrian.menunggu : [];
    const dipanggil    = antrian.pemeriksaan_awal || null;

    if (total)     total.innerText    = String(menungguList.length + (dipanggil ? 1 : 0));
    if (elMenunggu) elMenunggu.innerText = String(menungguList.length);

    if (dipanggil) {
      if (nomorAntrian) nomorAntrian.innerText = dipanggil.kode_antrian || dipanggil.nomor_antrian || "-";
      if (nama)         nama.innerText         = getNamaPasien(dipanggil);
    } else {
      if (nomorAntrian) nomorAntrian.innerText = "–";
      if (nama)         nama.innerText         = "Tidak ada";
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
        const kode       = item.kode_antrian || item.nomor_antrian || "-";
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

  } catch (error) {
    console.error("Gagal memuat data antrian:", error);
    if (antrianSelanjutnya) {
      antrianSelanjutnya.innerHTML = `
        <div class="section-label mb-1">Antrian Selanjutnya</div>
        <div class="queue-row">
          <span class="name" style="color:#ef4444;">Gagal memuat data antrian.</span>
        </div>
      `;
    }
  }
}

// ------------------------------------------------------------
//  Profil User (Perawat / Dokter)
// ------------------------------------------------------------

async function checkProfileUser(role, userId) {
  try {
    const response = await fetch(API_HOST + `/${role}`, {
      method: "GET",
      headers: HEADERS_GET,
    });

    if (!response.ok) {
      console.warn("[checkProfileUser] Gagal:", response.status);
      return null;
    }

    const result = await response.json();

    // Cari data user berdasarkan user_id
    for (const data of result.data) {
      if (String(data.id_user) === String(userId)) {
        return data;
      }
    }

    console.warn("[checkProfileUser] User ID", userId, "tidak ditemukan di list", role);
    return null;

  } catch (error) {
    console.error("[checkProfileUser] Fetch error:", error);
    return null;
  }
}

async function ShowDetailProfile(userId, role) {
  const unitNameEls = document.getElementsByClassName("nama-unit");
  const usernameEl  = document.getElementById("nama-user");
  const usernameElClass  = document.getElementsByClassName("nama-user");

  const userProfile = await checkProfileUser(role, userId);

  if (!userProfile) {
    console.warn("[ShowDetailProfile] Profil user tidak ditemukan.");
    return;
  }

  console.log(userProfile)
  const unitText = await getUnitName(userProfile.id_unit);
  const username = userProfile.nama_perawat || userProfile.nama_dokter

  if (usernameEl) {
    usernameEl.innerText = username
  }

  for (const el of usernameElClass) {
    el.textContent = username || "-";
  }

  for (const el of unitNameEls) {
    el.textContent = unitText || "-";
  }
}

// ------------------------------------------------------------
//  Event Listeners (DOMContentLoaded)
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  // Toggle input alergi
  const cekAlergi        = document.getElementById("cekAlergi");
  const formAlergiWrapper = document.getElementById("formAlergiWrapper");

  if (cekAlergi && formAlergiWrapper) {
    cekAlergi.addEventListener("change", () => {
      if (cekAlergi.checked) {
        formAlergiWrapper.classList.remove("hidden");
      } else {
        formAlergiWrapper.classList.add("hidden");
        const alergiInput = formAlergiWrapper.querySelector('input[name="alergi"]');
        if (alergiInput) alergiInput.value = "";
      }
    });
  }

  // Submit form asesmen
  const form = document.getElementById("formAsesmen");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await kirimAsesmenPasien(form);
    });
  }

  // Load antrian jika tabel ada — unit_id diambil dari cookie hasil auth
  const queueTableBody = document.getElementById("queue-table-body");
  if (queueTableBody) {
    const unitId = getCookie("unit_id") || 1;
    displayAntrianUnit(unitId);
  }
});