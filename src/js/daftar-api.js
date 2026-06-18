// ============================================================
//  daftar-api.js — Kumpulan fungsi API untuk SIMRS
// ============================================================

const API_BASE_URL = "https://cdfb-2404-c0-c201-ad34-41ca-403b-fc3-3216.ngrok-free.app/api";

// ------------------------------------------------------------
//  Utilitas Cookie
// ------------------------------------------------------------

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
    const response = await fetch(`${API_BASE_URL}/auth/verify-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ token }),
    });
 
    const json = await response.json();
 
    // Cek valid dari field "valid" bukan dari response.ok
    // Struktur: { success, valid, data: { roles, user_id, expired_at } }
    if (!json?.valid) {
      console.warn("[verifyToken] Token tidak valid:", json);
      return { valid: false, role: null, userId: null, data: null };
    }
 
    const role   = json?.data?.roles?.[0] ?? null;
    const userId = json?.data?.user_id    ?? null;
 
    console.log("[verifyToken] OK — role:", role, "| user_id:", userId);
 
    // Simpan user_id ke cookie agar bisa dipakai di halaman lain
    setCookie("user_id", userId);
 
    return { valid: true, role, userId, data: json };
 
  } catch (error) {
    console.error("[verifyToken] Gagal terhubung ke server:", error);
    return { valid: false, role: null, userId: null, data: null };
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
 
// ------------------------------------------------------------
//  Auth Guard — dipanggil di setiap halaman protected
// ------------------------------------------------------------
 
/**
 * Pastikan user sudah login dan rolenya sesuai.
 * Panggil ini di awal setiap halaman yang butuh auth.
 *
 * @param {string|string[]|null} allowedRoles
 *   - null / tidak diisi  → semua role boleh masuk
 *   - "dokter"            → hanya dokter
 *   - ["dokter","perawat"]→ dokter atau perawat
 *
 * @returns {Promise<{token: string, role: string, data: object}>}
 *   Jika valid → return sesi. Jika tidak → otomatis redirect ke login.
 *
 * Contoh pemakaian di setiap halaman:
 *   <script src="/daftar-api.js"></script>
 *   <script>
 *     requireAuth("perawat").then(sesi => {
 *       initHalaman(sesi);
 *     });
 *   </script>
 */
async function requireAuth(allowedRoles = null) {
  const token = getCookie("token");
 
  // 1. Tidak ada token → langsung ke login
  if (!token) {
    console.warn("[requireAuth] Tidak ada token → redirect login");
    _redirectToLogin();
    return;
  }
 
  // 2. Verifikasi ke server
  const { valid, role, userId, data } = await verifyToken(token);
 
  // 3. Token expired / ditolak server
  if (!valid) {
    console.warn("[requireAuth] Token tidak valid → hapus sesi, redirect login");
    deleteCookie("token");
    deleteCookie("role");
    _redirectToLogin();
    return;
  }
 
  // 4. Cek role (jika allowedRoles diisi)
  if (allowedRoles !== null) {
    const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!allowed.includes(role)) {
      console.warn(`[requireAuth] Role "${role}" tidak diizinkan → redirect login`);
      _redirectToLogin();
      return;
    }
  }
 
  // 5. Aman — perbarui cookie role dari server
  setCookie("role", role);
  return { token, role, userId };
}
 
/**
 * Ambil data sesi saat ini dari cookie (tanpa hit ke server).
 * Cocok untuk menampilkan nama/role di navbar tanpa request tambahan.
 * Gunakan hanya setelah requireAuth() sudah dipanggil sebelumnya.
 *
 * @returns {{ token: string|null, role: string|null }}
 */
function getSession() {
  return {
    token:  getCookie("token"),
    role:   getCookie("role"),
    userId: getCookie("user_id"),
  };
}
 
/**
 * Helper internal: redirect ke login, simpan halaman asal
 * agar setelah login bisa langsung balik ke halaman yang dituju.
 */
function _redirectToLogin() {
  const current = window.location.pathname + window.location.search;
  if (current !== "/login.html" && current !== "/") {
    sessionStorage.setItem("redirect_after_login", current);
  }
  window.location.href = "/login.html";
}

async function getUnitName(idUnit) {
  try {
    const url = API_BASE_URL + `/units/${idUnit}`;
    const respond = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "ngrok-skip-browser-warning": "true",
        // Hapus "Content-Type" untuk GET request — ini yang sering trigger preflight CORS
      },
    });

    if (!respond.ok) {
      console.warn("[getUnitName] Server error:", respond.status);
      return null;
    }

    const result = await respond.json();

    return result.data["nama_unit"]
  } catch (error) {
    console.error("[getUnitName] CORS belum diaktifkan di backend:", error);
    return null;
  }
}