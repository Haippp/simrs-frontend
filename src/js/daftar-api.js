// ============================================================
//  daftar-api.js — Kumpulan fungsi API untuk SIMRS
// ============================================================

const API_BASE_URL = "https://4fb9-2404-c0-c201-ad34-6d93-8e6b-958b-7ca4.ngrok-free.app/api";

// ------------------------------------------------------------
//  Utilitas Cookie
// ------------------------------------------------------------

/**
 * Membaca nilai cookie berdasarkan nama.
 * @param {string} name
 * @returns {string|null}
 */
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

/**
 * Menyimpan cookie.
 * @param {string} name
 * @param {string} value
 * @param {number} days  — 0 berarti session cookie
 */
function setCookie(name, value, days = 0) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = `${name}=${value}${expires}; path=/; SameSite=Lax`;
}

/**
 * Menghapus cookie (dengan mengatur expires ke masa lalu).
 * @param {string} name
 */
function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

// ------------------------------------------------------------
//  API Auth
// ------------------------------------------------------------

/**
 * Memverifikasi token ke server dan mengembalikan data user.
 * Endpoint: POST /auth/verify_token
 *
 * @param {string} token — JWT atau token sesi yang tersimpan di cookie
 * @returns {Promise<{valid: boolean, role: string|null, data: object|null}>}
 */
async function verifyToken(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        // "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      // Token tidak valid / expired / unauthorized
      console.warn("[verifyToken] Server menolak token:", response.status);
      return { valid: false, role: null, data: null };
    }

    const json = await response.json();

    // Sesuaikan key berikut dengan respons aktual dari API Anda.
    // Contoh respons yang umum:
    //   { "valid": true, "user": { "role": "dokter", "nama": "..." } }
    const role = json?.user?.role ?? json?.role ?? null;

    return {
      valid: true,
      role,
      data: json,
    };
  } catch (error) {
    console.error("[verifyToken] Gagal terhubung ke server:", error);
    return { valid: false, role: null, data: null };
  }
}

/**
 * Melakukan logout: hapus semua cookie sesi lalu redirect ke login.
 */
function logout() {
  deleteCookie("token");
  deleteCookie("role");
  window.location.href = "/login.html";
}

/**
 * Melakukan login ke server.
 * Endpoint: POST /auth/login
 *
 * @param {string} email
 * @param {string} password
 * @param {boolean} remember_me — true = simpan token 30 hari, false = session cookie
 * @returns {Promise<{success: boolean, message: string, token: string|null, role: string|null}>}
 */
async function login(email, password, remember_me = false) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ email, password, remember_me }),
    });

    const json = await response.json();

    if (!response.ok) {
      // Server mengembalikan error (401, 422, dst)
      const message = json?.message ?? json?.error ?? "Email atau kata sandi salah.";
      return { success: false, message, token: null, role: null };
    }

    // Struktur respons server:
    // { success, message, data: { token, user: { roles: ["dokter"] } } }
    const token = json?.data?.token ?? null;
    const role  = json?.data?.user?.roles?.[0] ?? null;

    if (!token) {
      return { success: false, message: "Respons server tidak valid.", token: null, role: null };
    }

    // Simpan token: 30 hari jika remember_me, session cookie jika tidak
    const days = remember_me ? 30 : 0;
    setCookie("token", token, days);
    setCookie("role",  role,  days);

    return { success: true, message: "Login berhasil.", token, role };

  } catch (error) {
    console.error("[login] Gagal terhubung ke server:", error);
    return { success: false, message: "Tidak dapat terhubung ke server. Periksa koneksi Anda.", token: null, role: null };
  }
}

// ------------------------------------------------------------
//  Logika Redirect Utama (dipanggil dari index.html)
// ------------------------------------------------------------

/**
 * Memeriksa status login dan mengarahkan user ke halaman yang sesuai.
 *
 * Alur:
 *  1. Ambil token dari cookie.
 *  2. Jika tidak ada token → redirect ke login.
 *  3. Panggil verifyToken() ke server.
 *  4. Jika token valid  → redirect sesuai role (dokter / perawat).
 *  5. Jika token invalid → hapus cookie lama → redirect ke login.
 */
async function checkAuthAndRedirect() {
  const token = getCookie("token");

  if (!token) {
    console.log("[checkAuthAndRedirect] Tidak ada token, redirect ke login.");
    window.location.href = "login.html";
    return;
  }

  const { valid, role } = await verifyToken(token);

  if (!valid) {
    console.warn("[checkAuthAndRedirect] Token tidak valid, hapus sesi dan redirect ke login.");
    deleteCookie("token");
    deleteCookie("role");
    window.location.href = "login.html";
    return;
  }

  // Simpan role terbaru dari server (agar selalu sinkron)
  setCookie("role", role);

  switch (role) {
    case "dokter":
      window.location.href = "dashboard/dokter";
      break;
    case "perawat":
      window.location.href = "dashboard/perawat";
      break;
    default:
      console.warn("[checkAuthAndRedirect] Role tidak dikenal:", role);
      window.location.href = "login.html";
  }
}