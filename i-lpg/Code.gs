/**
 * Ilpg/i-lpg Backend — Google Apps Script
 * =====================================
 * Deploy sebagai Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 * Salin URL deployment ke CONFIG.GAS_URL di js/app.js
 */

/* ══════════════════════════════════════════════
   KONFIGURASI
══════════════════════════════════════════════ */
const GAS_CONFIG = {
  MASTER_SS_ID: 'YOUR_MASTER_SPREADSHEET_ID', // Ganti dengan ID Master Spreadsheet
  TOKEN_EXPIRY_HOURS: 8,
  DEFAULT_PASSWORD: 'ilpg123',
  APP_NAME: 'Ilpg/i-lpg',
  VERSION: '1.0.0',
};

/* ══════════════════════════════════════════════
   ENTRY POINT — doPost / doGet
══════════════════════════════════════════════ */
function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    let params = {};

    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      params = e.parameter;
    }

    const action = params.action || '';

    // Public actions (no token required)
    const publicActions = ['login', 'get_companies', 'register_company', 'check_company_code'];
    if (!publicActions.includes(action)) {
      const authResult = validateToken(params.token);
      if (!authResult.valid) {
        return buildResponse({ status: 'unauthorized', message: 'Token tidak valid atau sudah kadaluarsa.' }, headers);
      }
      params._user = authResult.user;
      params._company = authResult.company;
    }

    const result = routeAction(action, params);
    return buildResponse(result, headers);

  } catch (err) {
    logError('handleRequest', err);
    return buildResponse({ status: 'error', message: 'Internal server error: ' + err.message }, headers);
  }
}

function buildResponse(data, headers) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/* ══════════════════════════════════════════════
   ROUTER
══════════════════════════════════════════════ */
function routeAction(action, params) {
  const routes = {
    // Auth
    'login':              () => actionLogin(params),
    'logout':             () => actionLogout(params),
    'get_companies':      () => actionGetCompanies(params),
    'register_company':   () => actionRegisterCompany(params),
    'check_company_code': () => actionCheckCompanyCode(params),

    // Dashboard
    'get_dashboard_stats': () => actionGetDashboardStats(params),

    // Attendance
    'attendance_checkin':  () => actionCheckin(params),
    'attendance_checkout': () => actionCheckout(params),
    'get_attendance':      () => actionGetAttendance(params),

    // Deliveries
    'get_deliveries':    () => actionGetDeliveries(params),
    'create_delivery':   () => actionCreateDelivery(params),
    'update_delivery':   () => actionUpdateDelivery(params),
    'delete_delivery':   () => actionDeleteDelivery(params),
    'report_delivery':   () => actionReportDelivery(params),
    'takeover_delivery': () => actionTakeoverDelivery(params),

    // Pangkalan
    'get_pangkalan':    () => actionGetPangkalan(params),
    'create_pangkalan': () => actionCreatePangkalan(params),
    'update_pangkalan': () => actionUpdatePangkalan(params),
    'delete_pangkalan': () => actionDeletePangkalan(params),

    // Users / Drivers
    'get_drivers':    () => actionGetDrivers(params),
    'get_users':      () => actionGetUsers(params),
    'create_user':    () => actionCreateUser(params),
    'update_user':    () => actionUpdateUser(params),
    'approve_user':   () => actionApproveUser(params),
    'reset_password': () => actionResetPassword(params),
    'change_password': () => actionChangePassword(params),

    // SPBE
    'get_spbe': () => actionGetSPBE(params),

    // Payments
    'get_payments':    () => actionGetPayments(params),
    'create_payment':  () => actionCreatePayment(params),
    'update_payment':  () => actionUpdatePayment(params),

    // Bagi Hasil
    'get_bagi_hasil': () => actionGetBagiHasil(params),

    // Notifications
    'get_notifications': () => actionGetNotifications(params),
    'mark_notif_read':   () => actionMarkNotifRead(params),

    // Audit Log
    'get_audit_log': () => actionGetAuditLog(params),

    // Refill
    'get_refill':    () => actionGetRefill(params),
    'create_refill': () => actionCreateRefill(params),

    // Purchases
    'create_purchase': () => actionCreatePurchase(params),
    'get_purchases':   () => actionGetPurchases(params),
  };

  const handler = routes[action];
  if (!handler) return { status: 'error', message: `Action tidak ditemukan: ${action}` };

  return handler();
}

/* ══════════════════════════════════════════════
   SPREADSHEET HELPERS
══════════════════════════════════════════════ */
function getMasterSS() {
  return SpreadsheetApp.openById(GAS_CONFIG.MASTER_SS_ID);
}

function getCompanySS(companyCode) {
  const master = getMasterSS();
  const sheet  = master.getSheetByName('Perusahaan');
  if (!sheet) throw new Error('Sheet Perusahaan tidak ditemukan');

  const data = sheetToObjects(sheet);
  const company = data.find(c => c.kode === companyCode);
  if (!company) throw new Error('Perusahaan tidak ditemukan: ' + companyCode);
  if (!company.spreadsheet_id) throw new Error('Spreadsheet ID perusahaan belum dikonfigurasi');

  return SpreadsheetApp.openById(company.spreadsheet_id);
}

function getOrCreateSheet(ss, sheetName, headers = []) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground('#E85D04')
        .setFontColor('#FFFFFF')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  }).filter(row => Object.values(row).some(v => v !== '' && v !== null));
}

function appendRow(sheet, rowData) {
  sheet.appendRow(rowData);
  return sheet.getLastRow();
}

function findRowById(sheet, id, idColumn = 'id') {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf(idColumn);
  if (idIdx === -1) return -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === String(id)) return i + 1; // 1-indexed row
  }
  return -1;
}

function updateRowById(sheet, id, updates, idColumn = 'id') {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf(idColumn);
  if (idIdx === -1) return false;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === String(id)) {
      Object.entries(updates).forEach(([key, val]) => {
        const colIdx = headers.indexOf(key);
        if (colIdx !== -1) {
          sheet.getRange(i + 1, colIdx + 1).setValue(val);
        }
      });
      return true;
    }
  }
  return false;
}

function deleteRowById(sheet, id, idColumn = 'id') {
  const rowNum = findRowById(sheet, id, idColumn);
  if (rowNum === -1) return false;
  sheet.deleteRow(rowNum);
  return true;
}

function generateId(prefix = '') {
  return prefix + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();
}

function generateDeliveryNo(lastId) {
  return 'DEL' + String(lastId).padStart(6, '0');
}

/* ══════════════════════════════════════════════
   TOKEN / AUTH
══════════════════════════════════════════════ */
function generateToken() {
  return Utilities.getUuid().replace(/-/g, '');
}

function validateToken(token) {
  if (!token) return { valid: false };

  try {
    const master = getMasterSS();
    const sheet  = master.getSheetByName('Sessions');
    if (!sheet) return { valid: false };

    const data = sheetToObjects(sheet);
    const session = data.find(s => s.token === token);

    if (!session) return { valid: false };

    const expiry = new Date(session.expires_at);
    if (new Date() > expiry) {
      // Clean up expired token
      deleteRowById(sheet, token, 'token');
      return { valid: false };
    }

    return {
      valid: true,
      user: {
        id: session.user_id,
        name: session.user_name,
        role: session.role,
        company: session.company_code,
      },
      company: { code: session.company_code }
    };
  } catch (e) {
    logError('validateToken', e);
    return { valid: false };
  }
}

function saveSession(token, user, companyCode) {
  const master  = getMasterSS();
  const sheet   = getOrCreateSheet(master, 'Sessions',
    ['token','user_id','user_name','role','company_code','created_at','expires_at','ip']);

  const expiresAt = new Date(Date.now() + GAS_CONFIG.TOKEN_EXPIRY_HOURS * 3600000);
  appendRow(sheet, [token, user.id, user.name, user.role, companyCode,
    new Date().toISOString(), expiresAt.toISOString(), '']);
}

function deleteSession(token) {
  const master = getMasterSS();
  const sheet  = master.getSheetByName('Sessions');
  if (sheet) deleteRowById(sheet, token, 'token');
}

function hashPassword(password) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

/* ══════════════════════════════════════════════
   ACTION: LOGIN
══════════════════════════════════════════════ */
function actionLogin(params) {
  const { username, password, companyCode } = params;
  if (!username || !password || !companyCode) {
    return { status: 'error', message: 'Username, password, dan kode perusahaan wajib diisi.' };
  }

  try {
    const master = getMasterSS();
    const sheet  = master.getSheetByName('Users');
    if (!sheet) return { status: 'error', message: 'Sistem belum dikonfigurasi.' };

    const users = sheetToObjects(sheet);
    const user  = users.find(u =>
      (u.username === username || u.email === username) &&
      u.company_code === companyCode
    );

    if (!user) return { status: 'error', message: 'Username atau password salah.' };
    if (user.status === 'nonaktif') return { status: 'error', message: 'Akun Anda telah dinonaktifkan.' };
    if (user.status === 'pending') return { status: 'error', message: 'Akun Anda belum diapprove oleh HRD.' };

    const pwHash = hashPassword(password);
    if (user.password_hash !== pwHash) {
      return { status: 'error', message: 'Username atau password salah.' };
    }

    const token = generateToken();
    saveSession(token, user, companyCode);

    // Log audit
    writeAuditLog(master, user, 'login', 'Login berhasil', companyCode);

    return {
      status: 'ok',
      token,
      user: {
        id:      user.id,
        name:    user.name,
        role:    user.role,
        email:   user.email,
        company: companyCode,
      }
    };
  } catch (e) {
    logError('actionLogin', e);
    return { status: 'error', message: 'Login gagal: ' + e.message };
  }
}

/* ══════════════════════════════════════════════
   ACTION: LOGOUT
══════════════════════════════════════════════ */
function actionLogout(params) {
  try {
    deleteSession(params.token);
    const master = getMasterSS();
    writeAuditLog(master, params._user, 'logout', 'Logout dari sistem', params._company?.code);
    return { status: 'ok' };
  } catch (e) {
    return { status: 'ok' }; // Always succeed
  }
}

/* ══════════════════════════════════════════════
   ACTION: GET COMPANIES
══════════════════════════════════════════════ */
function actionGetCompanies() {
  try {
    const master = getMasterSS();
    const sheet  = master.getSheetByName('Perusahaan');
    if (!sheet) return { status: 'ok', data: [] };

    const data = sheetToObjects(sheet)
      .filter(c => c.status === 'aktif')
      .map(c => ({ code: c.kode, name: c.nama }));

    return { status: 'ok', data };
  } catch (e) {
    logError('actionGetCompanies', e);
    return { status: 'error', message: e.message };
  }
}

/* ══════════════════════════════════════════════
   ACTION: CHECK COMPANY CODE AVAILABILITY
══════════════════════════════════════════════ */
function actionCheckCompanyCode(params) {
  try {
    const code = String(params.code || '').trim().toUpperCase();
    if (!code) return { status: 'error', message: 'Kode tidak boleh kosong.' };
    if (!/^[A-Z0-9]{3,10}$/.test(code)) {
      return { status: 'error', message: 'Kode harus 3-10 karakter huruf/angka (tanpa spasi).' };
    }

    const master = getMasterSS();
    const sheet  = master.getSheetByName('Perusahaan');
    const data   = sheet ? sheetToObjects(sheet) : [];
    const taken  = data.some(c => String(c.kode).toUpperCase() === code);

    return { status: 'ok', data: { available: !taken, code } };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

/* ══════════════════════════════════════════════
   ACTION: REGISTER COMPANY (FULL AUTOMATION)
   ─────────────────────────────────────────────
   1. Validasi input & kode unik
   2. Buat Google Spreadsheet baru via SpreadsheetApp.create()
   3. Isi semua sheet wajib (Driver, Pangkalan, SPBE, dst)
   4. Simpan ID spreadsheet ke Master > Perusahaan
   5. Buat akun HRD pertama untuk perusahaan tsb
══════════════════════════════════════════════ */
function actionRegisterCompany(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // Cegah race condition kalau ada 2 pendaftaran bersamaan

    // ── 1. Validasi input ──
    const companyName = String(params.companyName || '').trim();
    const companyCode = String(params.companyCode || '').trim().toUpperCase();
    const address      = String(params.address || '').trim();
    const phone        = String(params.phone || '').trim();
    const hrdName      = String(params.hrdName || '').trim();
    const hrdUsername  = String(params.hrdUsername || '').trim();
    const hrdEmail     = String(params.hrdEmail || '').trim();
    const hrdPhone     = String(params.hrdPhone || '').trim();
    const hrdPassword  = String(params.hrdPassword || '').trim();

    const errors = [];
    if (!companyName || companyName.length < 3) errors.push('Nama perusahaan minimal 3 karakter.');
    if (!/^[A-Z0-9]{3,10}$/.test(companyCode))    errors.push('Kode perusahaan harus 3-10 karakter huruf/angka.');
    if (!hrdName || hrdName.length < 3)           errors.push('Nama HRD minimal 3 karakter.');
    if (!hrdUsername || hrdUsername.length < 4)   errors.push('Username HRD minimal 4 karakter.');
    if (!hrdPassword || hrdPassword.length < 6)   errors.push('Password HRD minimal 6 karakter.');
    if (hrdEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hrdEmail)) errors.push('Format email tidak valid.');

    if (errors.length) {
      return { status: 'error', message: errors.join(' ') };
    }

    // ── 2. Cek kode perusahaan belum dipakai ──
    const master = getMasterSS();
    const coSheet = getOrCreateSheet(master, 'Perusahaan', HEADERS.PERUSAHAAN);
    const existingCo = sheetToObjects(coSheet);
    if (existingCo.some(c => String(c.kode).toUpperCase() === companyCode)) {
      return { status: 'error', message: `Kode perusahaan "${companyCode}" sudah digunakan.` };
    }

    // ── 3. Cek username HRD belum dipakai (global, karena dipakai utk login) ──
    const userSheet = getOrCreateSheet(master, 'Users', HEADERS.USERS);
    const existingUsers = sheetToObjects(userSheet);
    if (existingUsers.some(u => u.username === hrdUsername && u.company_code === companyCode)) {
      return { status: 'error', message: 'Username HRD sudah digunakan di perusahaan ini.' };
    }

    // ── 4. Buat Spreadsheet baru secara otomatis ──
    const newSS = SpreadsheetApp.create(`Ilpg/i-lpg — ${companyName} [${companyCode}]`);
    const newSSId = newSS.getId();

    // Hapus sheet default "Sheet1" setelah sheet lain dibuat (tidak boleh hapus sheet terakhir)
    const defaultSheet = newSS.getSheetByName('Sheet1');

    // Isi semua sheet wajib perusahaan dengan header standar
    const companySheets = {
      'Driver':           HEADERS.DRIVER,
      'Pangkalan':        HEADERS.PANGKALAN,
      'SPBE':             HEADERS.SPBE,
      'Pengiriman':       HEADERS.PENGIRIMAN,
      'Absensi':          HEADERS.ABSENSI,
      'Pembayaran':       HEADERS.PEMBAYARAN,
      'BagiHasil':        HEADERS.BAGI_HASIL,
      'Notifikasi':       HEADERS.NOTIFIKASI,
      'Refill':           HEADERS.REFILL,
      'PembelianTabung':  HEADERS.PEMBELIAN,
    };

    Object.entries(companySheets).forEach(([name, headers]) => {
      getOrCreateSheet(newSS, name, headers);
    });

    // Sekarang aman menghapus Sheet1 karena sudah ada sheet lain
    if (defaultSheet && newSS.getSheets().length > 1) {
      newSS.deleteSheet(defaultSheet);
    }

    // Seed data awal SPBE & Pangkalan supaya admin tidak mulai dari kosong total (opsional, bisa dihapus user)
    const spbeSheet = newSS.getSheetByName('SPBE');
    appendRow(spbeSheet, [generateId('SPB'), 'SPBE Default', address || '-', phone || '-', 'aktif', new Date().toISOString()]);

    // ── 5. Daftarkan perusahaan ke Master ──
    appendRow(coSheet, [
      companyCode, companyName, address, phone, newSSId, 'aktif', new Date().toISOString(),
    ]);

    // ── 6. Buat akun HRD pertama ──
    const hrdId = generateId('HRD');
    appendRow(userSheet, [
      hrdId, hrdName, hrdUsername, hrdEmail, hrdPhone,
      hashPassword(hrdPassword), 'hrd', 'aktif', companyCode,
      new Date().toISOString(), '', '', '', '',
    ]);

    // ── 7. Audit log ──
    writeAuditLog(master, { id: hrdId, name: hrdName, role: 'hrd' }, 'create',
      `Registrasi perusahaan baru: ${companyName} (${companyCode})`, companyCode);

    return {
      status: 'ok',
      data: {
        companyCode,
        companyName,
        spreadsheetId: newSSId,
        spreadsheetUrl: newSS.getUrl(),
        hrdUsername,
      }
    };

  } catch (e) {
    logError('actionRegisterCompany', e);
    return { status: 'error', message: 'Registrasi gagal: ' + e.message };
  } finally {
    lock.releaseLock();
  }
}

/* ══════════════════════════════════════════════
   ACTION: DASHBOARD STATS
══════════════════════════════════════════════ */
function actionGetDashboardStats(params) {
  try {
    const user    = params._user;
    const coCode  = user.company;
    const ss      = getCompanySS(coCode);
    const today   = new Date().toISOString().split('T')[0];

    const deliveries = sheetToObjects(getOrCreateSheet(ss, 'Pengiriman', HEADERS.PENGIRIMAN));
    const todayDel   = deliveries.filter(d => d.tanggal === today);

    const result = {
      total_today:      todayDel.length,
      selesai:          todayDel.filter(d => d.status === 'selesai').length,
      pending:          todayDel.filter(d => d.status === 'pending').length,
      dikirim:          todayDel.filter(d => d.status === 'dikirim').length,
      total_pangkalan:  sheetToObjects(getOrCreateSheet(ss, 'Pangkalan', HEADERS.PANGKALAN)).length,
    };

    // Role-specific stats
    if (user.role === 'driver') {
      const myDel = todayDel.filter(d => d.driver_id === user.id);
      result.tasks       = myDel.map(formatDelivery);
      result.total_today = myDel.length;
      result.selesai     = myDel.filter(d => d.status === 'selesai').length;
      result.pending     = myDel.filter(d => d.status === 'pending').length;

      // Today's attendance
      const absSheet  = getOrCreateSheet(ss, 'Absensi', HEADERS.ABSENSI);
      const absData   = sheetToObjects(absSheet);
      const myAbsensi = absData.find(a => a.user_id === user.id && a.date === today);
      result.absensi  = myAbsensi || null;
    }

    if (user.role === 'admin' || user.role === 'hrd') {
      const payments = sheetToObjects(getOrCreateSheet(ss, 'Pembayaran', HEADERS.PEMBAYARAN));
      result.pending_deliveries = todayDel.filter(d => d.status === 'pending').map(formatDelivery).slice(0, 5);
      result.unpaid_bills       = payments.filter(p => p.status !== 'lunas').slice(0, 5);
      result.pending_count      = result.pending;

      // Chart data: last 7 days
      const labels = [];
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('id-ID', { weekday: 'short' }));
        chartData.push(deliveries.filter(del => del.tanggal === ds && del.status === 'selesai')
          .reduce((sum, del) => sum + (Number(del.jumlah) || 0), 0));
      }
      result.chart_labels = labels;
      result.chart_data   = chartData;

      // Pangkalan payment status
      const bh = sheetToObjects(getOrCreateSheet(ss, 'BagiHasil', HEADERS.BAGI_HASIL));
      result.pangkalan_status = [
        bh.filter(b => b.status === 'sudah_bayar').length,
        bh.filter(b => b.status === 'belum_bayar').length,
        bh.filter(b => b.status === 'kurang_bayar').length,
      ];
    }

    if (user.role === 'hrd') {
      const master  = getMasterSS();
      const users   = sheetToObjects(master.getSheetByName('Users') || getOrCreateSheet(master, 'Users', HEADERS.USERS));
      const coUsers = users.filter(u => u.company_code === coCode);
      result.total_driver     = coUsers.filter(u => u.role === 'driver').length;
      result.total_admin      = coUsers.filter(u => u.role === 'admin').length;
      result.pending_approval = coUsers.filter(u => u.status === 'pending').length;
      result.pending_users    = coUsers.filter(u => u.status === 'pending').map(u => ({
        id: u.id, name: u.name, role: u.role, created: u.created_at
      }));

      // Absensi stats today
      const absData = sheetToObjects(getOrCreateSheet(ss, 'Absensi', HEADERS.ABSENSI));
      const todayAbs = absData.filter(a => a.date === today);
      const drivers = coUsers.filter(u => u.role === 'driver');
      const admins  = coUsers.filter(u => u.role === 'admin');
      result.hadir_hari_ini = todayAbs.length;
      result.absensi_labels = ['Driver', 'Admin'];
      result.absensi_hadir  = [
        todayAbs.filter(a => drivers.find(d => d.id === a.user_id)).length,
        todayAbs.filter(a => admins.find(d => d.id === a.user_id)).length,
      ];
      result.absensi_absen = [
        Math.max(0, drivers.length - result.absensi_hadir[0]),
        Math.max(0, admins.length  - result.absensi_hadir[1]),
      ];

      // Top drivers
      const driverStats = drivers.map(d => {
        const dDel = deliveries.filter(del => del.driver_id === d.id && del.status === 'selesai');
        const dAbs = absData.filter(a => a.user_id === d.id);
        const workDays = 22; // Assume 22 workdays/month
        return {
          name: d.name,
          total_kirim: dDel.length,
          kehadiran: Math.round((dAbs.length / workDays) * 100),
        };
      }).sort((a, b) => b.total_kirim - a.total_kirim).slice(0, 5);
      result.top_drivers = driverStats;
    }

    return { status: 'ok', data: result };
  } catch (e) {
    logError('actionGetDashboardStats', e);
    return { status: 'error', message: e.message };
  }
}

/* ══════════════════════════════════════════════
   ATTENDANCE
══════════════════════════════════════════════ */
function actionCheckin(params) {
  try {
    const user   = params._user;
    const ss     = getCompanySS(user.company);
    const sheet  = getOrCreateSheet(ss, 'Absensi', HEADERS.ABSENSI);
    const today  = new Date().toISOString().split('T')[0];

    // Check if already checked in today
    const existing = sheetToObjects(sheet).find(a =>
      a.user_id === user.id && a.date === today && a.type === 'in'
    );
    if (existing) return { status: 'error', message: 'Anda sudah absen masuk hari ini.' };

    // Validate GPS (basic bounds check Indonesia)
    const lat = parseFloat(params.lat);
    const lng = parseFloat(params.lng);
    if (isNaN(lat) || isNaN(lng)) return { status: 'error', message: 'Koordinat GPS tidak valid.' };

    const id = generateId('ABS');
    appendRow(sheet, [
      id, user.id, user.name, user.role, today, 'in',
      params.timestamp || new Date().toISOString(),
      params.lat, params.lng, params.accuracy || 0,
      params.photo || '', 'hadir',
    ]);

    writeAuditLog(getMasterSS(), user, 'create', `Absen masuk: ${today}`, user.company);
    return { status: 'ok', data: { id } };
  } catch (e) {
    logError('actionCheckin', e);
    return { status: 'error', message: e.message };
  }
}

function actionCheckout(params) {
  try {
    const user  = params._user;
    const ss    = getCompanySS(user.company);
    const sheet = getOrCreateSheet(ss, 'Absensi', HEADERS.ABSENSI);
    const today = new Date().toISOString().split('T')[0];

    // Find today's check-in
    const data = sheetToObjects(sheet);
    const checkinRow = data.find(a => a.user_id === user.id && a.date === today && a.type === 'in');
    if (!checkinRow) return { status: 'error', message: 'Belum ada data absen masuk hari ini.' };

    const existCheckout = data.find(a => a.user_id === user.id && a.date === today && a.type === 'out');
    if (existCheckout) return { status: 'error', message: 'Anda sudah absen pulang hari ini.' };

    const id = generateId('ABS');
    appendRow(sheet, [
      id, user.id, user.name, user.role, today, 'out',
      params.timestamp || new Date().toISOString(),
      params.lat, params.lng, params.accuracy || 0,
      params.photo || '', 'hadir',
    ]);

    writeAuditLog(getMasterSS(), user, 'create', `Absen pulang: ${today}`, user.company);
    return { status: 'ok', data: { id } };
  } catch (e) {
    logError('actionCheckout', e);
    return { status: 'error', message: e.message };
  }
}

function actionGetAttendance(params) {
  try {
    const user  = params._user;
    const ss    = getCompanySS(user.company);
    const sheet = getOrCreateSheet(ss, 'Absensi', HEADERS.ABSENSI);
    let   data  = sheetToObjects(sheet);

    // Filter by user if driver
    if (user.role === 'driver') {
      data = data.filter(a => a.user_id === user.id);
    }
    // Filter by role
    if (params.role) data = data.filter(a => a.role === params.role);

    // Filter by period
    const today = new Date();
    if (params.period === 'harian' || params.period === 'hari') {
      const d = params.date || today.toISOString().split('T')[0];
      data = data.filter(a => a.date === d);
    } else if (params.period === 'mingguan' || params.period === 'minggu') {
      const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
      data = data.filter(a => new Date(a.date) >= weekAgo);
    } else if (params.period === 'bulanan' || params.period === 'bulan') {
      const month = today.toISOString().substr(0, 7);
      data = data.filter(a => a.date?.startsWith(month));
    }
    if (params.date && params.period === 'custom') {
      data = data.filter(a => a.date === params.date);
    }

    // Group check-in & check-out by user+date
    const grouped = {};
    data.forEach(a => {
      const key = `${a.user_id}_${a.date}`;
      if (!grouped[key]) grouped[key] = { name: a.user_name, role: a.role, date: a.date, status: 'hadir' };
      if (a.type === 'in') {
        grouped[key].checkin_time  = a.timestamp;
        grouped[key].checkin_lat   = a.lat;
        grouped[key].checkin_lng   = a.lng;
        grouped[key].checkin_photo = a.photo;
      } else {
        grouped[key].checkout_time  = a.timestamp;
        grouped[key].checkout_lat   = a.lat;
        grouped[key].checkout_lng   = a.lng;
        grouped[key].checkout_photo = a.photo;
      }
    });

    return { status: 'ok', data: Object.values(grouped).sort((a,b) => b.date.localeCompare(a.date)) };
  } catch (e) {
    logError('actionGetAttendance', e);
    return { status: 'error', message: e.message };
  }
}

/* ══════════════════════════════════════════════
   DELIVERIES
══════════════════════════════════════════════ */
function actionGetDeliveries(params) {
  try {
    const user  = params._user;
    const ss    = getCompanySS(user.company);
    const sheet = getOrCreateSheet(ss, 'Pengiriman', HEADERS.PENGIRIMAN);
    let   data  = sheetToObjects(sheet).map(formatDelivery);

    if (params.driver_only === true || params.driver_only === 'true') {
      data = data.filter(d => d.driver_id === user.id);
    }
    if (params.status) data = data.filter(d => d.status === params.status);
    if (params.date)   data = data.filter(d => d.tanggal === params.date);
    if (params.has_report === true || params.has_report === 'true') {
      data = data.filter(d => d.jumlah_kirim > 0 || d.report_time);
    }

    return { status: 'ok', data: data.sort((a, b) => b.id - a.id) };
  } catch (e) {
    logError('actionGetDeliveries', e);
    return { status: 'error', message: e.message };
  }
}

function formatDelivery(d) {
  return {
    id:           d.id,
    driver_id:    d.driver_id,
    driver_name:  d.driver_name,
    spbe:         d.spbe_name || d.spbe,
    spbe_id:      d.spbe_id,
    pangkalan_id: d.pangkalan_id,
    pangkalan:    d.pangkalan_name || d.pangkalan,
    jumlah:       Number(d.jumlah) || 0,
    tanggal:      d.tanggal,
    status:       d.status || 'pending',
    jumlah_kirim: Number(d.jumlah_kirim) || 0,
    keterangan:   d.keterangan || '',
    photo:        d.photo || '',
    report_time:  d.report_time || '',
    catatan:      d.catatan || '',
  };
}

function actionCreateDelivery(params) {
  try {
    const user  = params._user;
    if (user.role === 'driver') return { status: 'error', message: 'Tidak ada akses.' };

    const ss    = getCompanySS(user.company);
    const sheet = getOrCreateSheet(ss, 'Pengiriman', HEADERS.PENGIRIMAN);

    // Get driver & pangkalan names
    const drivers   = sheetToObjects(getOrCreateSheet(ss, 'Driver', HEADERS.DRIVER));
    const pangkalan = sheetToObjects(getOrCreateSheet(ss, 'Pangkalan', HEADERS.PANGKALAN));
    const spbeList  = sheetToObjects(getOrCreateSheet(ss, 'SPBE', HEADERS.SPBE));

    const driver  = drivers.find(d => d.id === params.driver_id);
    const pk      = pangkalan.find(p => p.id === params.pangkalan_id);
    const spbe    = spbeList.find(s => s.id === params.spbe_id);

    const id = generateId('');
    appendRow(sheet, [
      id, params.driver_id, driver?.name || params.driver_id,
      params.spbe_id, spbe?.nama || params.spbe_id,
      params.pangkalan_id, pk?.nama || params.pangkalan_id,
      Number(params.jumlah) || 0, params.tanggal,
      'pending', 0, '', '', '', params.catatan || '',
      new Date().toISOString(), user.id,
    ]);

    // Create notification for driver
    createNotification(ss, params.driver_id, 'new_schedule',
      `Jadwal pengiriman baru ke ${pk?.nama || 'pangkalan'} pada ${params.tanggal}`);

    writeAuditLog(getMasterSS(), user, 'create',
      `Buat jadwal pengiriman: ${pk?.nama || ''} - ${params.jumlah} tabung`, user.company);

    return { status: 'ok', data: { id } };
  } catch (e) {
    logError('actionCreateDelivery', e);
    return { status: 'error', message: e.message };
  }
}

function actionUpdateDelivery(params) {
  try {
    const user  = params._user;
    const ss    = getCompanySS(user.company);
    const sheet = getOrCreateSheet(ss, 'Pengiriman', HEADERS.PENGIRIMAN);

    const allowed = ['status','jumlah','tanggal','driver_id','pangkalan_id','jumlah_kirim',
      'keterangan','catatan','takeover_status'];
    const updates = {};
    allowed.forEach(k => { if (params[k] !== undefined) updates[k] = params[k]; });
    updates.updated_at = new Date().toISOString();
    updates.updated_by = user.id;

    const ok = updateRowById(sheet, params.id, updates);
    if (!ok) return { status: 'error', message: 'Data tidak ditemukan.' };

    writeAuditLog(getMasterSS(), user, 'update',
      `Update pengiriman #${params.id}: ${JSON.stringify(updates)}`, user.company);

    return { status: 'ok' };
  } catch (e) {
    logError('actionUpdateDelivery', e);
    return { status: 'error', message: e.message };
  }
}

function actionDeleteDelivery(params) {
  try {
    const user  = params._user;
    if (user.role === 'driver') return { status: 'error', message: 'Tidak ada akses.' };

    const ss    = getCompanySS(user.company);
    const sheet = getOrCreateSheet(ss, 'Pengiriman', HEADERS.PENGIRIMAN);
    const ok    = deleteRowById(sheet, params.id);

    if (!ok) return { status: 'error', message: 'Data tidak ditemukan.' };

    writeAuditLog(getMasterSS(), user, 'delete', `Hapus pengiriman #${params.id}`, user.company);
    return { status: 'ok' };
  } catch (e) {
    logError('actionDeleteDelivery', e);
    return { status: 'error', message: e.message };
  }
}

function actionReportDelivery(params) {
  try {
    const user  = params._user;
    const ss    = getCompanySS(user.company);
    const sheet = getOrCreateSheet(ss, 'Pengiriman', HEADERS.PENGIRIMAN);

    const updates = {
      jumlah_kirim: Number(params.jumlah_kirim) || 0,
      status:       params.status || 'selesai',
      keterangan:   params.keterangan || '',
      photo:        params.photo || '',
      report_time:  params.timestamp || new Date().toISOString(),
      report_lat:   params.lat || '',
      report_lng:   params.lng || '',
      updated_at:   new Date().toISOString(),
      updated_by:   user.id,
    };

    updateRowById(sheet, params.delivery_id, updates);

    // Notify admins
    const master = getMasterSS();
    const admins = sheetToObjects(master.getSheetByName('Users') || master.insertSheet('Users'))
      .filter(u => u.company_code === user.company && u.role === 'admin');
    admins.forEach(admin => {
      createNotification(ss, admin.id, 'report_submitted',
        `${user.name} melaporkan pengiriman selesai`);
    });

    writeAuditLog(master, user, 'create',
      `Laporan pengiriman #${params.delivery_id}: ${params.jumlah_kirim} tabung`, user.company);

    return { status: 'ok' };
  } catch (e) {
    logError('actionReportDelivery', e);
    return { status: 'error', message: e.message };
  }
}

function actionTakeoverDelivery(params) {
  try {
    const user  = params._user;
    const ss    = getCompanySS(user.company);
    const sheet = getOrCreateSheet(ss, 'Pengiriman', HEADERS.PENGIRIMAN);

    const data = sheetToObjects(sheet);
    const item = data.find(d => String(d.id) === String(params.id));
    if (!item) return { status: 'error', message: 'Jadwal tidak ditemukan.' };
    if (item.status !== 'pending') return { status: 'error', message: 'Jadwal sudah tidak bisa diambil alih.' };

    updateRowById(sheet, params.id, {
      original_driver_id: item.driver_id,
      original_driver:    item.driver_name,
      driver_id:          user.id,
      driver_name:        user.name,
      takeover_status:    'approved',
      takeover_by:        user.id,
      takeover_time:      new Date().toISOString(),
    });

    writeAuditLog(getMasterSS(), user, 'update',
      `Takeover jadwal #${params.id} dari ${item.driver_name}`, user.company);

    return { status: 'ok' };
  } catch (e) {
    logError('actionTakeoverDelivery', e);
    return { status: 'error', message: e.message };
  }
}

/* ══════════════════════════════════════════════
   PANGKALAN
══════════════════════════════════════════════ */
function actionGetPangkalan(params) {
  try {
    const ss    = getCompanySS(params._user.company);
    const sheet = getOrCreateSheet(ss, 'Pangkalan', HEADERS.PANGKALAN);
    const data  = sheetToObjects(sheet).map(p => ({
      id: p.id, nama: p.nama, pemilik: p.pemilik,
      alamat: p.alamat, telepon: p.telepon,
      tarif_bagi_hasil: Number(p.tarif_bagi_hasil) || 0,
      status: p.status || 'aktif',
    }));
    return { status: 'ok', data };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function actionCreatePangkalan(params) {
  try {
    const user  = params._user;
    if (user.role === 'driver') return { status: 'error', message: 'Tidak ada akses.' };
    const ss    = getCompanySS(user.company);
    const sheet = getOrCreateSheet(ss, 'Pangkalan', HEADERS.PANGKALAN);
    const id    = generateId('PK');
    appendRow(sheet, [id, params.nama, params.pemilik, params.alamat||'', params.telepon||'',
      Number(params.tarif_bagi_hasil)||0, params.status||'aktif', new Date().toISOString()]);
    writeAuditLog(getMasterSS(), user, 'create', `Tambah pangkalan: ${params.nama}`, user.company);
    return { status: 'ok', data: { id } };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function actionUpdatePangkalan(params) {
  try {
    const user  = params._user;
    if (user.role === 'driver') return { status: 'error', message: 'Tidak ada akses.' };
    const ss    = getCompanySS(user.company);
    const sheet = getOrCreateSheet(ss, 'Pangkalan', HEADERS.PANGKALAN);
    updateRowById(sheet, params.id, {
      nama: params.nama, pemilik: params.pemilik, alamat: params.alamat,
      telepon: params.telepon, tarif_bagi_hasil: params.tarif_bagi_hasil,
      status: params.status, updated_at: new Date().toISOString(),
    });
    writeAuditLog(getMasterSS(), user, 'update', `Update pangkalan #${params.id}`, user.company);
    return { status: 'ok' };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function actionDeletePangkalan(params) {
  try {
    const user  = params._user;
    if (user.role !== 'hrd' && user.role !== 'admin') return { status: 'error', message: 'Tidak ada akses.' };
    const ss    = getCompanySS(user.company);
    const sheet = getOrCreateSheet(ss, 'Pangkalan', HEADERS.PANGKALAN);
    deleteRowById(sheet, params.id);
    writeAuditLog(getMasterSS(), user, 'delete', `Hapus pangkalan #${params.id}`, user.company);
    return { status: 'ok' };
  } catch (e) { return { status: 'error', message: e.message }; }
}

/* ══════════════════════════════════════════════
   USERS / DRIVERS
══════════════════════════════════════════════ */
function actionGetDrivers(params) {
  try {
    const master = getMasterSS();
    const sheet  = master.getSheetByName('Users') || master.insertSheet('Users');
    const data   = sheetToObjects(sheet)
      .filter(u => u.company_code === params._user.company && u.role === 'driver' && u.status === 'aktif')
      .map(u => ({ id: u.id, name: u.name }));
    return { status: 'ok', data };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function actionGetUsers(params) {
  try {
    if (params._user.role !== 'hrd') return { status: 'error', message: 'Tidak ada akses.' };
    const master = getMasterSS();
    const sheet  = master.getSheetByName('Users');
    if (!sheet) return { status: 'ok', data: [] };
    const data = sheetToObjects(sheet)
      .filter(u => u.company_code === params._user.company)
      .map(u => ({
        id: u.id, name: u.name, username: u.username, email: u.email,
        telepon: u.telepon, role: u.role, status: u.status, created_at: u.created_at,
      }));
    return { status: 'ok', data };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function actionCreateUser(params) {
  try {
    if (params._user.role !== 'hrd') return { status: 'error', message: 'Tidak ada akses.' };
    const master = getMasterSS();
    const sheet  = getOrCreateSheet(master, 'Users', HEADERS.USERS);

    const existing = sheetToObjects(sheet).find(u =>
      u.username === params.username && u.company_code === params._user.company);
    if (existing) return { status: 'error', message: 'Username sudah digunakan.' };

    const id = generateId('USR');
    const pw = params.password || GAS_CONFIG.DEFAULT_PASSWORD;
    appendRow(sheet, [
      id, params.name, params.username, params.email||'',
      params.telepon||'', hashPassword(pw), params.role, params.status||'aktif',
      params._user.company, new Date().toISOString(),
    ]);

    writeAuditLog(master, params._user, 'create', `Tambah user: ${params.name} (${params.role})`, params._user.company);
    return { status: 'ok', data: { id } };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function actionUpdateUser(params) {
  try {
    if (params._user.role !== 'hrd') return { status: 'error', message: 'Tidak ada akses.' };
    const master = getMasterSS();
    const sheet  = getOrCreateSheet(master, 'Users', HEADERS.USERS);
    const updates = {};
    ['name','email','telepon','role','status'].forEach(k => {
      if (params[k] !== undefined) updates[k] = params[k];
    });
    updates.updated_at = new Date().toISOString();
    updateRowById(sheet, params.id, updates);
    writeAuditLog(master, params._user, 'update', `Update user #${params.id}`, params._user.company);
    return { status: 'ok' };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function actionApproveUser(params) {
  try {
    if (params._user.role !== 'hrd') return { status: 'error', message: 'Tidak ada akses.' };
    const master = getMasterSS();
    const sheet  = getOrCreateSheet(master, 'Users', HEADERS.USERS);
    updateRowById(sheet, params.id, { status: 'aktif', approved_at: new Date().toISOString(), approved_by: params._user.id });
    writeAuditLog(master, params._user, 'approve', `Approve user #${params.id}`, params._user.company);
    return { status: 'ok' };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function actionResetPassword(params) {
  try {
    if (params._user.role !== 'hrd') return { status: 'error', message: 'Tidak ada akses.' };
    const master  = getMasterSS();
    const sheet   = getOrCreateSheet(master, 'Users', HEADERS.USERS);
    const newPass = GAS_CONFIG.DEFAULT_PASSWORD;
    updateRowById(sheet, params.id, {
      password_hash: hashPassword(newPass),
      password_reset_at: new Date().toISOString(),
    });
    writeAuditLog(master, params._user, 'update', `Reset password user #${params.id}`, params._user.company);
    return { status: 'ok', data: { new_password: newPass } };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function actionChangePassword(params) {
  try {
    const user = params._user;
    const master = getMasterSS();
    const sheet  = getOrCreateSheet(master, 'Users', HEADERS.USERS);
    const data   = sheetToObjects(sheet);
    const record = data.find(u => u.id === user.id);

    if (!record) return { status: 'error', message: 'Akun tidak ditemukan.' };

    const oldHash = hashPassword(params.old_password || '');
    if (record.password_hash !== oldHash) {
      return { status: 'error', message: 'Password saat ini salah.' };
    }
    if (!params.new_password || params.new_password.length < 6) {
      return { status: 'error', message: 'Password baru minimal 6 karakter.' };
    }

    updateRowById(sheet, user.id, {
      password_hash: hashPassword(params.new_password),
      password_reset_at: new Date().toISOString(),
    });

    writeAuditLog(master, user, 'update', 'Ubah password sendiri', user.company);
    return { status: 'ok' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

/* ══════════════════════════════════════════════
   SPBE
══════════════════════════════════════════════ */
function actionGetSPBE(params) {
  try {
    const ss    = getCompanySS(params._user.company);
    const sheet = getOrCreateSheet(ss, 'SPBE', HEADERS.SPBE);
    const data  = sheetToObjects(sheet).map(s => ({ id: s.id, name: s.nama, alamat: s.alamat }));
    return { status: 'ok', data };
  } catch (e) { return { status: 'error', message: e.message }; }
}

/* ══════════════════════════════════════════════
   PAYMENTS
══════════════════════════════════════════════ */
function actionGetPayments(params) {
  try {
    const ss    = getCompanySS(params._user.company);
    const sheet = getOrCreateSheet(ss, 'Pembayaran', HEADERS.PEMBAYARAN);
    let   data  = sheetToObjects(sheet);
    if (params.status) data = data.filter(p => p.status === params.status);
    if (params.month)  data = data.filter(p => p.tanggal?.startsWith(params.month));
    return { status: 'ok', data: data.sort((a,b) => b.tanggal?.localeCompare(a.tanggal)) };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function actionCreatePayment(params) {
  try {
    const user  = params._user;
    if (user.role === 'driver') return { status: 'error', message: 'Tidak ada akses.' };
    const ss    = getCompanySS(user.company);
    const pks   = sheetToObjects(getOrCreateSheet(ss, 'Pangkalan', HEADERS.PANGKALAN));
    const pk    = pks.find(p => p.id === params.pangkalan_id);
    const sheet = getOrCreateSheet(ss, 'Pembayaran', HEADERS.PEMBAYARAN);
    const id    = generateId('PAY');
    appendRow(sheet, [id, params.pangkalan_id, pk?.nama||'', Number(params.nominal)||0,
      params.tanggal, params.status||'lunas', params.catatan||'', new Date().toISOString(), user.id]);
    writeAuditLog(getMasterSS(), user, 'create', `Catat pembayaran ${pk?.nama||''}: ${params.nominal}`, user.company);
    return { status: 'ok', data: { id } };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function actionUpdatePayment(params) {
  try {
    const user  = params._user;
    if (user.role === 'driver') return { status: 'error', message: 'Tidak ada akses.' };
    const ss    = getCompanySS(user.company);
    const sheet = getOrCreateSheet(ss, 'Pembayaran', HEADERS.PEMBAYARAN);
    updateRowById(sheet, params.id, { status: params.status, catatan: params.catatan, updated_at: new Date().toISOString() });
    writeAuditLog(getMasterSS(), user, 'update', `Update pembayaran #${params.id}`, user.company);
    return { status: 'ok' };
  } catch (e) { return { status: 'error', message: e.message }; }
}

/* ══════════════════════════════════════════════
   BAGI HASIL
══════════════════════════════════════════════ */
function actionGetBagiHasil(params) {
  try {
    const ss        = getCompanySS(params._user.company);
    const pks       = sheetToObjects(getOrCreateSheet(ss, 'Pangkalan', HEADERS.PANGKALAN));
    const deliveries = sheetToObjects(getOrCreateSheet(ss, 'Pengiriman', HEADERS.PENGIRIMAN));
    const bhSheet   = getOrCreateSheet(ss, 'BagiHasil', HEADERS.BAGI_HASIL);
    const bhData    = sheetToObjects(bhSheet);

    const month = params.month || new Date().toISOString().substr(0, 7);

    const result = pks.map(pk => {
      const monthDel = deliveries.filter(d =>
        d.pangkalan_id === pk.id &&
        d.status === 'selesai' &&
        d.tanggal?.startsWith(month)
      );
      const totalTabung = monthDel.reduce((s, d) => s + (Number(d.jumlah_kirim) || Number(d.jumlah) || 0), 0);
      const tarif  = Number(pk.tarif_bagi_hasil) || 0;
      const total  = tarif * totalTabung;
      const bhRec  = bhData.find(b => b.pangkalan_id === pk.id && b.month === month);

      let status = 'belum_bayar';
      if (bhRec) status = bhRec.status;
      else if (total === 0) status = 'belum_bayar';

      return {
        id: pk.id, pangkalan: pk.nama,
        tarif, jumlah: totalTabung, total, status,
      };
    });

    let filtered = result;
    if (params.status) filtered = filtered.filter(r => r.status === params.status);
    return { status: 'ok', data: filtered };
  } catch (e) { return { status: 'error', message: e.message }; }
}

/* ══════════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════════ */
function createNotification(ss, userId, type, message) {
  const sheet = getOrCreateSheet(ss, 'Notifikasi', HEADERS.NOTIFIKASI);
  const id    = generateId('NTF');
  appendRow(sheet, [id, userId, type, message, false, new Date().toISOString()]);
}

function actionGetNotifications(params) {
  try {
    const user  = params._user;
    const ss    = getCompanySS(user.company);
    const sheet = getOrCreateSheet(ss, 'Notifikasi', HEADERS.NOTIFIKASI);
    const data  = sheetToObjects(sheet)
      .filter(n => n.user_id === user.id)
      .sort((a, b) => b.timestamp?.localeCompare(a.timestamp))
      .slice(0, 30)
      .map(n => ({ id: n.id, type: n.type, message: n.message, read: n.read === true || n.read === 'TRUE', timestamp: n.timestamp }));
    return { status: 'ok', data };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function actionMarkNotifRead(params) {
  try {
    const user  = params._user;
    const ss    = getCompanySS(user.company);
    const sheet = getOrCreateSheet(ss, 'Notifikasi', HEADERS.NOTIFIKASI);
    const ids   = params.ids || [];
    const data  = sheetToObjects(sheet);
    data.filter(n => n.user_id === user.id && (ids.length === 0 || ids.includes(n.id)))
      .forEach(n => updateRowById(sheet, n.id, { read: true }));
    return { status: 'ok' };
  } catch (e) { return { status: 'error', message: e.message }; }
}

/* ══════════════════════════════════════════════
   AUDIT LOG
══════════════════════════════════════════════ */
function writeAuditLog(master, user, action, detail, company) {
  try {
    const sheet = getOrCreateSheet(master, 'AuditLog', HEADERS.AUDIT_LOG);
    appendRow(sheet, [
      generateId('LOG'), user?.id || '', user?.name || '', user?.role || '',
      action, detail, company || '', new Date().toISOString(), '',
    ]);
  } catch (e) { console.error('Audit log error:', e); }
}

function actionGetAuditLog(params) {
  try {
    if (params._user.role !== 'hrd') return { status: 'error', message: 'Tidak ada akses.' };
    const master = getMasterSS();
    const sheet  = master.getSheetByName('AuditLog');
    if (!sheet) return { status: 'ok', data: [] };
    let data = sheetToObjects(sheet)
      .filter(l => l.company === params._user.company);
    if (params.date) data = data.filter(l => l.timestamp?.startsWith(params.date));
    if (params.action) data = data.filter(l => l.action === params.action);
    return {
      status: 'ok',
      data: data.sort((a,b) => b.timestamp?.localeCompare(a.timestamp))
        .slice(0, 200)
        .map(l => ({ id: l.id, user: l.user_name, role: l.role, action: l.action, detail: l.detail, ip: l.ip, timestamp: l.timestamp }))
    };
  } catch (e) { return { status: 'error', message: e.message }; }
}

/* ══════════════════════════════════════════════
   REFILL & PURCHASES
══════════════════════════════════════════════ */
function actionGetRefill(params) {
  try {
    const ss    = getCompanySS(params._user.company);
    const sheet = getOrCreateSheet(ss, 'Refill', HEADERS.REFILL);
    const data  = sheetToObjects(sheet);
    return { status: 'ok', data };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function actionCreateRefill(params) {
  try {
    const user  = params._user;
    const ss    = getCompanySS(user.company);
    const sheet = getOrCreateSheet(ss, 'Refill', HEADERS.REFILL);
    const id    = generateId('REF');
    appendRow(sheet, [id, params.pangkalan_id, params.pangkalan_name||'',
      true, params.tanggal||DateUtil_today(), Number(params.jumlah)||0,
      new Date().toISOString(), user.id]);
    return { status: 'ok', data: { id } };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function actionCreatePurchase(params) {
  try {
    const user  = params._user;
    if (user.role === 'driver') return { status: 'error', message: 'Tidak ada akses.' };
    const ss    = getCompanySS(user.company);
    const spbeList = sheetToObjects(getOrCreateSheet(ss, 'SPBE', HEADERS.SPBE));
    const spbe  = spbeList.find(s => s.id === params.spbe_id);
    const sheet = getOrCreateSheet(ss, 'PembelianTabung', HEADERS.PEMBELIAN);
    const id    = generateId('BLI');
    appendRow(sheet, [id, params.spbe_id, spbe?.nama||'', Number(params.jumlah)||0,
      Number(params.harga)||0, params.tanggal, params.catatan||'',
      new Date().toISOString(), user.id]);
    writeAuditLog(getMasterSS(), user, 'create', `Beli tabung dari ${spbe?.nama||''}: ${params.jumlah} unit`, user.company);
    return { status: 'ok', data: { id } };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function actionGetPurchases(params) {
  try {
    const ss    = getCompanySS(params._user.company);
    const sheet = getOrCreateSheet(ss, 'PembelianTabung', HEADERS.PEMBELIAN);
    const data  = sheetToObjects(sheet).map(p => ({
      id: p.id, spbe: p.spbe_name||p.spbe_id, jumlah: Number(p.jumlah)||0,
      harga: Number(p.harga)||0, tanggal: p.tanggal, catatan: p.catatan,
    })).sort((a,b) => b.tanggal?.localeCompare(a.tanggal));
    return { status: 'ok', data };
  } catch (e) { return { status: 'error', message: e.message }; }
}

/* ══════════════════════════════════════════════
   SPREADSHEET SCHEMA — HEADERS
══════════════════════════════════════════════ */
const HEADERS = {
  USERS: ['id','name','username','email','telepon','password_hash','role','status',
    'company_code','created_at','updated_at','approved_at','approved_by','password_reset_at'],
  PERUSAHAAN: ['kode','nama','alamat','telepon','spreadsheet_id','status','created_at'],
  SESSIONS: ['token','user_id','user_name','role','company_code','created_at','expires_at','ip'],
  PENGIRIMAN: ['id','driver_id','driver_name','spbe_id','spbe_name','pangkalan_id','pangkalan_name',
    'jumlah','tanggal','status','jumlah_kirim','keterangan','photo','report_time','catatan',
    'created_at','created_by','updated_at','updated_by','original_driver_id','original_driver',
    'takeover_status','takeover_by','takeover_time','report_lat','report_lng'],
  ABSENSI: ['id','user_id','user_name','role','date','type','timestamp','lat','lng','accuracy','photo','status'],
  PANGKALAN: ['id','nama','pemilik','alamat','telepon','tarif_bagi_hasil','status','created_at','updated_at'],
  SPBE: ['id','nama','alamat','telepon','status','created_at'],
  DRIVER: ['id','name','telepon','status','created_at'],
  PEMBAYARAN: ['id','pangkalan_id','pangkalan_name','nominal','tanggal','status','catatan','created_at','created_by'],
  BAGI_HASIL: ['id','pangkalan_id','pangkalan_name','month','jumlah_tabung','tarif','total','status','created_at','updated_at'],
  NOTIFIKASI: ['id','user_id','type','message','read','timestamp'],
  AUDIT_LOG: ['id','user_id','user_name','role','action','detail','company','timestamp','ip'],
  REFILL: ['id','pangkalan_id','pangkalan_name','sudah_refill','tanggal_refill','jumlah','created_at','created_by'],
  PEMBELIAN: ['id','spbe_id','spbe_name','jumlah','harga','tanggal','catatan','created_at','created_by'],
};

/* ══════════════════════════════════════════════
   SETUP FUNCTION — Run once to initialize
══════════════════════════════════════════════ */
function setupMasterSpreadsheet() {
  const master = getMasterSS();

  // Create Perusahaan sheet
  const pkSheet = getOrCreateSheet(master, 'Perusahaan', HEADERS.PERUSAHAAN);
  // Add demo company if empty
  if (sheetToObjects(pkSheet).length === 0) {
    appendRow(pkSheet, ['DEMO', 'PT Demo Energi Nusantara', 'Jl. Demo No. 1', '021-12345678',
      'YOUR_COMPANY_SS_ID', 'aktif', new Date().toISOString()]);
  }

  // Create Users sheet
  const userSheet = getOrCreateSheet(master, 'Users', HEADERS.USERS);
  if (sheetToObjects(userSheet).length === 0) {
    // Create demo users
    const now = new Date().toISOString();
    appendRow(userSheet, ['HRD001','HRD Demo','hrd_demo','hrd@demo.com','08000000001',
      hashPassword('demo123'),'hrd','aktif','DEMO',now,'','','','']);
    appendRow(userSheet, ['ADM001','Admin Demo','admin_demo','admin@demo.com','08000000002',
      hashPassword('demo123'),'admin','aktif','DEMO',now,'','','','']);
    appendRow(userSheet, ['DRV001','Driver Demo','driver_demo','driver@demo.com','08000000003',
      hashPassword('demo123'),'driver','aktif','DEMO',now,'','','','']);
  }

  // Create Sessions sheet
  getOrCreateSheet(master, 'Sessions', HEADERS.SESSIONS);
  getOrCreateSheet(master, 'AuditLog', HEADERS.AUDIT_LOG);

  return 'Setup berhasil! Demo accounts: hrd_demo/demo123, admin_demo/demo123, driver_demo/demo123';
}

function setupCompanySpreadsheet(companyCode) {
  try {
    const ss = getCompanySS(companyCode);

    // Create all company sheets
    Object.entries({
      'Driver': HEADERS.DRIVER,
      'Pangkalan': HEADERS.PANGKALAN,
      'SPBE': HEADERS.SPBE,
      'Pengiriman': HEADERS.PENGIRIMAN,
      'Absensi': HEADERS.ABSENSI,
      'Pembayaran': HEADERS.PEMBAYARAN,
      'BagiHasil': HEADERS.BAGI_HASIL,
      'Notifikasi': HEADERS.NOTIFIKASI,
      'Refill': HEADERS.REFILL,
      'PembelianTabung': HEADERS.PEMBELIAN,
    }).forEach(([name, headers]) => {
      getOrCreateSheet(ss, name, headers);
    });

    // Seed SPBE demo data
    const spbeSheet = ss.getSheetByName('SPBE');
    if (sheetToObjects(spbeSheet).length === 0) {
      appendRow(spbeSheet, ['S001','SPBE Cibiru','Jl. Cibiru No.1','022-11111111','aktif',new Date().toISOString()]);
      appendRow(spbeSheet, ['S002','SPBE Bandung Barat','Jl. BBS No.5','022-22222222','aktif',new Date().toISOString()]);
    }

    // Seed Pangkalan demo data
    const pkSheet = ss.getSheetByName('Pangkalan');
    if (sheetToObjects(pkSheet).length === 0) {
      appendRow(pkSheet, ['P001','Pangkalan Maju Jaya','Bpk. Hendra','Jl. Merdeka 10','081234567890',500,'aktif',new Date().toISOString(),'']);
      appendRow(pkSheet, ['P002','Pangkalan Sejahtera','Ibu. Sari','Jl. Pahlawan 5','082345678901',1000,'aktif',new Date().toISOString(),'']);
      appendRow(pkSheet, ['P003','Pangkalan Harapan','Bpk. Tono','Jl. Sudirman 22','083456789012',750,'aktif',new Date().toISOString(),'']);
    }

    return 'Company setup berhasil untuk: ' + companyCode;
  } catch (e) {
    return 'Setup gagal: ' + e.message;
  }
}

/* ══════════════════════════════════════════════
   ERROR LOGGING
══════════════════════════════════════════════ */
function logError(context, error) {
  console.error(`[Ilpg/i-lpg Error] ${context}: ${error.message}`);
  try {
    const master = getMasterSS();
    const sheet  = getOrCreateSheet(master, 'ErrorLog',
      ['timestamp','context','message','stack']);
    appendRow(sheet, [new Date().toISOString(), context, error.message, error.stack || '']);
  } catch {}
}

function DateUtil_today() {
  return new Date().toISOString().split('T')[0];
}
