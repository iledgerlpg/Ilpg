/**
 * i-LPG Core JavaScript
 * Enterprise LPG Distribution Management
 * ==========================================
 */

'use strict';

/* ──────────────────────────────────────────
   CONFIG
────────────────────────────────────────── */
const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbwWjBpAi7GOxcL1TGJ7xmUKp9C1IrqU32UuovAJq4mTmeowwAn3ubcOPiaycSViGQOrcw/exec',
  APP_NAME: 'i-LPG',
  VERSION: '1.0.0',
  TOKEN_KEY: 'ilpg_token',
  USER_KEY:  'ilpg_user',
  THEME_KEY: 'ilpg_theme',
  POLL_INTERVAL: 30000, // 30 seconds
  SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 hours
};

/* ──────────────────────────────────────────
   SESSION / AUTH
────────────────────────────────────────── */
const Auth = {
  getToken() { return sessionStorage.getItem(CONFIG.TOKEN_KEY); },
  getUser()  {
    try { return JSON.parse(sessionStorage.getItem(CONFIG.USER_KEY)); }
    catch { return null; }
  },
  setSession(token, user) {
    sessionStorage.setItem(CONFIG.TOKEN_KEY, token);
    sessionStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
  },
  clearSession() {
    sessionStorage.removeItem(CONFIG.TOKEN_KEY);
    sessionStorage.removeItem(CONFIG.USER_KEY);
  },
  isLoggedIn() {
    return !!this.getToken() && !!this.getUser();
  },
  hasRole(role) {
    const user = this.getUser();
    return user && user.role === role;
  },
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/index.html';
    }
  },
  requireRole(...roles) {
    const user = this.getUser();
    if (!user || !roles.includes(user.role)) {
      Toast.show('Akses ditolak', 'Anda tidak memiliki hak akses halaman ini.', 'error');
      setTimeout(() => window.location.href = '/index.html', 1500);
    }
  }
};

/* ──────────────────────────────────────────
   API CLIENT
────────────────────────────────────────── */
const API = {
  async call(action, params = {}, method = 'POST') {
    const token = Auth.getToken();
    const payload = { action, token, ...params };

    try {
      const opts = {
        method,
        // text/plain avoids CORS preflight — GAS cannot respond to OPTIONS requests.
        // Apps Script still reads e.postData.contents as the raw JSON string.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      };

      const res = await fetch(CONFIG.GAS_URL, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (data.status === 'unauthorized') {
        Auth.clearSession();
        window.location.href = '/index.html';
        return null;
      }

      return data;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  },

  async login(username, password, companyCode) {
    return this.call('login', { username, password, companyCode }, 'POST');
  },

  async logout() {
    await this.call('logout');
    Auth.clearSession();
  },

  // Attendance
  async checkin(data)  { return this.call('attendance_checkin',  data); },
  async checkout(data) { return this.call('attendance_checkout', data); },
  async getAttendance(filters) { return this.call('get_attendance', filters); },

  // Deliveries
  async getDeliveries(filters)    { return this.call('get_deliveries', filters); },
  async createDelivery(data)      { return this.call('create_delivery', data); },
  async updateDelivery(id, data)  { return this.call('update_delivery', { id, ...data }); },
  async deleteDelivery(id)        { return this.call('delete_delivery', { id }); },
  async reportDelivery(data)      { return this.call('report_delivery', data); },
  async takeoverDelivery(id)      { return this.call('takeover_delivery', { id }); },

  // Pangkalan
  async getPangkalan()        { return this.call('get_pangkalan'); },
  async createPangkalan(data) { return this.call('create_pangkalan', data); },
  async updatePangkalan(id, data) { return this.call('update_pangkalan', { id, ...data }); },
  async deletePangkalan(id)   { return this.call('delete_pangkalan', { id }); },

  // Drivers
  async getDrivers()          { return this.call('get_drivers'); },
  async createDriver(data)    { return this.call('create_driver', data); },
  async updateDriver(id, data){ return this.call('update_driver', { id, ...data }); },

  // SPBE
  async getSPBE() { return this.call('get_spbe'); },

  // Payments
  async getPayments(filters) { return this.call('get_payments', filters); },
  async createPayment(data)  { return this.call('create_payment', data); },
  async updatePayment(id, data) { return this.call('update_payment', { id, ...data }); },

  // Bagi Hasil
  async getBagiHasil(filters) { return this.call('get_bagi_hasil', filters); },

  // Notifications
  async getNotifications()    { return this.call('get_notifications'); },
  async markNotifRead(ids)    { return this.call('mark_notif_read', { ids }); },

  // Users (HRD)
  async getUsers(filters)     { return this.call('get_users', filters); },
  async createUser(data)      { return this.call('create_user', data); },
  async updateUser(id, data)  { return this.call('update_user', { id, ...data }); },
  async resetPassword(id)     { return this.call('reset_password', { id }); },
  async changePassword(oldPw, newPw) { return this.call('change_password', { old_password: oldPw, new_password: newPw }); },
  async approveUser(id)       { return this.call('approve_user', { id }); },

  // Dashboard stats
  async getDashboardStats()   { return this.call('get_dashboard_stats'); },

  // Audit log
  async getAuditLog(filters)  { return this.call('get_audit_log', filters); },

  // Refill
  async getRefill(filters)    { return this.call('get_refill', filters); },
  async createRefill(data)    { return this.call('create_refill', data); },

  // Purchases
  async createPurchase(data)  { return this.call('create_purchase', data); },
  async getPurchases(filters) { return this.call('get_purchases', filters); },

  /**
   * Upload foto ke Google Drive via GAS backend.
   * @param {string} base64DataUrl - dataURL dari canvas.toDataURL()
   * @param {string} photoType     - 'absensi_in' | 'absensi_out' | 'laporan' | 'pembayaran'
   * @returns {Promise<string>}      URL Drive publik
   */
  async uploadPhoto(base64DataUrl, photoType) {
    const res = await this.call('upload_photo', {
      photoData: base64DataUrl,
      photoType,
    });
    if (res?.status === 'ok') return res.data.url;
    throw new Error(res?.message || 'Upload foto gagal.');
  },
};

/* ──────────────────────────────────────────
   TOAST NOTIFICATIONS
────────────────────────────────────────── */
const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(title, message = '', type = 'info', duration = 4000) {
    if (!this.container) this.init();

    const icons = {
      success: '✅',
      error:   '❌',
      warning: '⚠️',
      info:    'ℹ️',
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-msg">${message}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
    `;

    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    return toast;
  },

  success(title, msg) { return this.show(title, msg, 'success'); },
  error(title, msg)   { return this.show(title, msg, 'error'); },
  warning(title, msg) { return this.show(title, msg, 'warning'); },
  info(title, msg)    { return this.show(title, msg, 'info'); },
};

/* ──────────────────────────────────────────
   LOADING
────────────────────────────────────────── */
const Loading = {
  overlay: null,

  show(text = 'Memuat...') {
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'loading-overlay';
      this.overlay.innerHTML = `
        <div style="text-align:center">
          <div class="loading-spinner"></div>
          <p style="color:white;margin-top:12px;font-size:14px">${text}</p>
        </div>
      `;
      document.body.appendChild(this.overlay);
    }
    this.overlay.style.display = 'flex';
  },

  hide() {
    if (this.overlay) this.overlay.style.display = 'none';
  },
};

/* ──────────────────────────────────────────
   MODAL MANAGER
────────────────────────────────────────── */
const Modal = {
  stack: [],

  open(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.style.display = 'flex';
    this.stack.push(id);
    document.body.style.overflow = 'hidden';
  },

  close(id) {
    const overlay = id ? document.getElementById(id) : null;
    if (overlay) {
      overlay.style.display = 'none';
    } else if (this.stack.length) {
      const lastId = this.stack.pop();
      const last = document.getElementById(lastId);
      if (last) last.style.display = 'none';
    }
    if (!this.stack.length) document.body.style.overflow = '';
  },

  create({ id, title, body, footer = '', size = '' }) {
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = 'modal-overlay';
    el.id = id;
    el.style.display = 'none';
    el.innerHTML = `
      <div class="modal ${size}" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h5 class="modal-title">${title}</h5>
          <button class="modal-close" onclick="Modal.close('${id}')">×</button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;

    // Close on backdrop click
    el.addEventListener('click', (e) => {
      if (e.target === el) Modal.close(id);
    });

    document.body.appendChild(el);
    return el;
  }
};

/* ──────────────────────────────────────────
   THEME MANAGER
────────────────────────────────────────── */
const Theme = {
  current: 'light',

  init() {
    this.current = localStorage.getItem(CONFIG.THEME_KEY) || 'light';
    this.apply(this.current);
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.current = theme;
    localStorage.setItem(CONFIG.THEME_KEY, theme);

    // Update toggle icons
    document.querySelectorAll('.theme-toggle-icon').forEach(el => {
      el.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
  },

  toggle() {
    this.apply(this.current === 'dark' ? 'light' : 'dark');
  },
};

/* ──────────────────────────────────────────
   SIDEBAR MANAGER
────────────────────────────────────────── */
const Sidebar = {
  collapsed: false,
  mobileOpen: false,

  init() {
    this.collapsed = localStorage.getItem('ilpg_sidebar_collapsed') === 'true';
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main-content');
    if (this.collapsed && window.innerWidth > 768) {
      sidebar?.classList.add('collapsed');
    }

    // Mobile overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebar-overlay';
    overlay.addEventListener('click', () => this.closeMobile());
    document.body.appendChild(overlay);
  },

  toggle() {
    if (window.innerWidth <= 768) {
      this.toggleMobile();
    } else {
      this.toggleDesktop();
    }
  },

  toggleDesktop() {
    this.collapsed = !this.collapsed;
    document.querySelector('.sidebar')?.classList.toggle('collapsed');
    localStorage.setItem('ilpg_sidebar_collapsed', this.collapsed);
  },

  toggleMobile() {
    this.mobileOpen = !this.mobileOpen;
    document.querySelector('.sidebar')?.classList.toggle('mobile-open');
    document.getElementById('sidebar-overlay').style.opacity = this.mobileOpen ? '1' : '0';
    document.getElementById('sidebar-overlay').style.pointerEvents = this.mobileOpen ? 'all' : 'none';
  },

  closeMobile() {
    this.mobileOpen = false;
    document.querySelector('.sidebar')?.classList.remove('mobile-open');
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) { overlay.style.opacity = '0'; overlay.style.pointerEvents = 'none'; }
  },

  setActive(page) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
  }
};

/* ──────────────────────────────────────────
   GPS UTILITY
────────────────────────────────────────── */
const GPS = {
  current: null,
  watching: false,
  watchId: null,

  async getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation tidak didukung'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        pos => {
          this.current = {
            lat: pos.coords.latitude.toFixed(6),
            lng: pos.coords.longitude.toFixed(6),
            accuracy: Math.round(pos.coords.accuracy),
            timestamp: Date.now(),
          };
          resolve(this.current);
        },
        err => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  },

  startWatch(callback) {
    if (!navigator.geolocation) return;
    this.watchId = navigator.geolocation.watchPosition(
      pos => {
        this.current = {
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: Date.now(),
        };
        callback?.(this.current);
      },
      err => console.warn('GPS watch error:', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    this.watching = true;
  },

  stopWatch() {
    if (this.watchId != null) navigator.geolocation.clearWatch(this.watchId);
    this.watching = false;
  },

  formatCoords(lat, lng) {
    return `${lat}°, ${lng}°`;
  },

  validate(loc) {
    // Basic anti-spoofing: check reasonable Indonesia bounds
    return loc &&
      loc.lat >= -11 && loc.lat <= 6 &&
      loc.lng >= 95  && loc.lng <= 141;
  },
};

/* ──────────────────────────────────────────
   CAMERA / CANVAS
────────────────────────────────────────── */
const Camera = {
  stream: null,

  async start(videoEl) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      videoEl.srcObject = this.stream;
      await videoEl.play();
      return true;
    } catch (err) {
      console.error('Camera error:', err);
      return false;
    }
  },

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  },

  capture(videoEl, canvasEl, watermarkData = {}) {
    const ctx = canvasEl.getContext('2d');
    canvasEl.width  = videoEl.videoWidth  || 1280;
    canvasEl.height = videoEl.videoHeight || 720;

    // Draw video frame
    ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);

    // Draw watermark overlay
    const { name = '', date = '', time = '', location = '' } = watermarkData;
    const lines = [name, date + ' ' + time, location].filter(Boolean);

    const padding = 12;
    const lineH   = 20;
    const boxH    = lines.length * lineH + padding * 2;
    const boxW    = 320;
    const x       = canvasEl.width  - boxW - 12;
    const y       = canvasEl.height - boxH - 12;

    // Box background — use rect fallback if roundRect not supported (Safari <16)
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, boxW, boxH, 8);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, boxW, boxH);
    }

    // Watermark text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px monospace';
    lines.forEach((line, i) => {
      ctx.fillText(line, x + padding, y + padding + 14 + i * lineH);
    });

    // Brand tag bottom-left
    ctx.fillStyle = 'rgba(232,93,4,0.85)';
    ctx.fillRect(12, canvasEl.height - 34, 90, 22);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('i-LPG', 20, canvasEl.height - 18);

    return canvasEl.toDataURL('image/jpeg', 0.85);
  },
};

/* ──────────────────────────────────────────
   NOTIFICATIONS POLLING
────────────────────────────────────────── */
const Notif = {
  unread: 0,
  timer: null,

  init() {
    if (Auth.isLoggedIn()) this.poll();
  },

  async poll() {
    try {
      const res = await API.getNotifications();
      if (res?.status === 'ok') {
        this.unread = res.data?.filter(n => !n.read).length || 0;
        this.updateBadge(this.unread);
      }
    } catch {}
    this.timer = setTimeout(() => this.poll(), CONFIG.POLL_INTERVAL);
  },

  stop() {
    clearTimeout(this.timer);
  },

  updateBadge(count) {
    const badge = document.getElementById('notif-badge');
    const dot   = document.getElementById('notif-dot');
    if (badge) badge.textContent = count;
    if (dot)   dot.style.display = count > 0 ? 'block' : 'none';
  },

  renderList(items, container) {
    if (!container) return;
    if (!items?.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔔</div>
          <div class="empty-title">Belum ada notifikasi</div>
        </div>`;
      return;
    }

    container.innerHTML = items.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
        <div class="notif-dot-badge" style="${n.read ? 'opacity:0' : ''}"></div>
        <div class="notif-content">
          <div class="notif-text">${n.message}</div>
          <div class="notif-time">${Fmt.timeAgo(n.timestamp)}</div>
        </div>
      </div>`).join('');
  },
};

/* ──────────────────────────────────────────
   FORMATTERS
────────────────────────────────────────── */
const Fmt = {
  currency(val) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);
  },

  number(val) {
    return new Intl.NumberFormat('id-ID').format(val || 0);
  },

  date(val) {
    if (!val) return '-';
    return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  datetime(val) {
    if (!val) return '-';
    return new Date(val).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  },

  time(val) {
    if (!val) return '-';
    return new Date(val).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  },

  timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000)  return 'Baru saja';
    if (diff < 3600000) return `${Math.floor(diff/60000)} menit lalu`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)} jam lalu`;
    return `${Math.floor(diff/86400000)} hari lalu`;
  },

  statusBadge(status) {
    const map = {
      'selesai':   ['success', '✅ Selesai'],
      'dikirim':   ['info',    '🚚 Dikirim'],
      'pending':   ['warning', '⏳ Pending'],
      'batal':     ['danger',  '❌ Batal'],
      'lunas':     ['success', '✅ Lunas'],
      'belum_lunas':['danger', '🔴 Belum Lunas'],
      'cicilan':   ['warning', '🟡 Cicilan'],
      'aktif':     ['success', '✅ Aktif'],
      'nonaktif':  ['gray',    '⚫ Nonaktif'],
      'hadir':     ['success', '✅ Hadir'],
      'absen':     ['danger',  '❌ Absen'],
      'izin':      ['info',    'ℹ️ Izin'],
    };
    const [cls, label] = map[status?.toLowerCase()] || ['gray', status || '-'];
    return `<span class="badge badge-${cls}">${label}</span>`;
  },

  deliveryNo(id) {
    return 'DEL' + String(id).padStart(6, '0');
  },
};

/* ──────────────────────────────────────────
   DOM HELPERS
────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function el(tag, attrs = {}, ...children) {
  const elem = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') elem.className = v;
    else if (k === 'html') elem.innerHTML = v;
    else elem.setAttribute(k, v);
  });
  children.forEach(c => typeof c === 'string' ? elem.appendChild(document.createTextNode(c)) : elem.appendChild(c));
  return elem;
}

/* ──────────────────────────────────────────
   TABLE BUILDER
────────────────────────────────────────── */
const Table = {
  render(containerId, { columns, data, actions = [], emptyMsg = 'Tidak ada data' }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!data?.length) {
      container.innerHTML = `<div class="empty-state p-4">${emptyMsg}</div>`;
      return;
    }

    const thead = columns.map(c => `<th>${c.label}</th>`).join('');
    const tbody = data.map((row, i) => {
      const cells = columns.map(c => {
        if (c.render) return `<td>${c.render(row[c.key], row, i)}</td>`;
        return `<td>${row[c.key] ?? '-'}</td>`;
      }).join('');
      const acts = actions.map(a => `
        <button class="btn btn-sm ${a.class || 'btn-ghost'}" 
          onclick="${a.onclick}('${row.id}')" title="${a.title || ''}">
          ${a.icon} ${a.label || ''}
        </button>`).join('');
      return `<tr>${cells}${acts ? `<td class="d-flex gap-1">${acts}</td>` : ''}</tr>`;
    }).join('');

    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr>${thead}${actions.length ? '<th>Aksi</th>' : ''}</tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>`;
  },
};

/* ──────────────────────────────────────────
   EXPORT HELPERS
────────────────────────────────────────── */
const Export = {
  toCSV(data, filename = 'export.csv') {
    if (!data?.length) return;
    const keys = Object.keys(data[0]);
    const rows = [keys.join(','), ...data.map(r => keys.map(k => `"${r[k] ?? ''}"`).join(','))];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    this.download(blob, filename);
  },

  download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  printTable(tableId) {
    const el = document.getElementById(tableId);
    if (!el) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>i-LPG Export</title>
      <style>body{font-family:sans-serif;font-size:12px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:6px}</style>
      </head><body>${el.innerHTML}</body></html>`);
    win.print(); win.close();
  },
};

/* ──────────────────────────────────────────
   FORM HELPERS
────────────────────────────────────────── */
const Form = {
  getData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};
    const data = {};
    new FormData(form).forEach((val, key) => {
      data[key] = val;
    });
    return data;
  },

  reset(formId) {
    document.getElementById(formId)?.reset();
  },

  setValues(formId, data) {
    const form = document.getElementById(formId);
    if (!form) return;
    Object.entries(data).forEach(([key, val]) => {
      const el = form.querySelector(`[name="${key}"]`);
      if (el) el.value = val ?? '';
    });
  },

  validate(formId, rules = {}) {
    const form = document.getElementById(formId);
    if (!form) return false;
    let valid = true;

    Object.entries(rules).forEach(([name, rule]) => {
      const el = form.querySelector(`[name="${name}"]`);
      const errEl = form.querySelector(`.error-${name}`);
      if (!el) return;

      let msg = '';
      if (rule.required && !el.value.trim()) {
        msg = rule.label ? `${rule.label} wajib diisi` : 'Field ini wajib diisi';
      } else if (rule.min && el.value < rule.min) {
        msg = `Minimal ${rule.min}`;
      } else if (rule.max && el.value > rule.max) {
        msg = `Maksimal ${rule.max}`;
      }

      if (msg) {
        el.style.borderColor = 'var(--danger)';
        if (errEl) errEl.textContent = msg;
        valid = false;
      } else {
        el.style.borderColor = '';
        if (errEl) errEl.textContent = '';
      }
    });

    return valid;
  },

  populateSelect(selectId, items, { value = 'id', label = 'name', placeholder = '-- Pilih --' } = {}) {
    const el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = `<option value="">${placeholder}</option>` +
      (items || []).map(item => `<option value="${item[value]}">${item[label]}</option>`).join('');
  },
};

/* ──────────────────────────────────────────
   DATE HELPERS
────────────────────────────────────────── */
const DateUtil = {
  today() {
    return new Date().toISOString().split('T')[0];
  },

  now() {
    return new Date().toISOString();
  },

  weekRange() {
    const now = new Date();
    const day = now.getDay();
    const start = new Date(now); start.setDate(now.getDate() - day);
    const end = new Date(now); end.setDate(now.getDate() + (6 - day));
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  },

  monthRange() {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    };
  },

  formatTimestamp() {
    return new Date().toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  },
};

/* ──────────────────────────────────────────
   SWEET ALERT WRAPPERS
────────────────────────────────────────── */
const Alert = {
  async confirm(title, text, { confirmText = 'Ya, Lanjutkan', cancelText = 'Batal', type = 'warning' } = {}) {
    if (typeof Swal !== 'undefined') {
      const result = await Swal.fire({
        title, text,
        icon: type,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        confirmButtonColor: type === 'danger' ? 'var(--danger)' : 'var(--primary)',
      });
      return result.isConfirmed;
    }
    return window.confirm(`${title}\n${text}`);
  },

  async success(title, text) {
    if (typeof Swal !== 'undefined') {
      await Swal.fire({ title, text, icon: 'success', confirmButtonColor: 'var(--primary)' });
    } else {
      Toast.success(title, text);
    }
  },

  async error(title, text) {
    if (typeof Swal !== 'undefined') {
      await Swal.fire({ title, text, icon: 'error', confirmButtonColor: 'var(--primary)' });
    } else {
      Toast.error(title, text);
    }
  },
};

/* ──────────────────────────────────────────
   PAGE ROUTER (SPA-style)
────────────────────────────────────────── */
const Router = {
  current: null,
  pages: {},

  register(name, module) {
    this.pages[name] = module;
  },

  async navigate(name, params = {}) {
    const page = this.pages[name];
    if (!page) { console.warn(`Page "${name}" not found`); return; }

    this.current = name;
    Sidebar.setActive(name);

    const contentEl = document.getElementById('page-content');
    if (!contentEl) return;

    contentEl.innerHTML = `<div class="loading-pulse" style="padding:40px;text-align:center">
      <div class="loading-spinner" style="margin:0 auto"></div>
    </div>`;

    try {
      await page.render(contentEl, params);
    } catch (err) {
      console.error('Page render error:', err);
      contentEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div>
        <div class="empty-title">Gagal memuat halaman</div>
        <div class="empty-sub">${err.message}</div></div>`;
    }
  },
};

/* ──────────────────────────────────────────
   APP INIT
────────────────────────────────────────── */
const App = {
  init() {
    Theme.init();
    Toast.init();

    // Auto-detect current page from body data attribute
    const page = document.body.dataset.page;
    if (page) Sidebar.setActive(page);

    // Sidebar toggle button
    document.querySelector('.sidebar-toggle')?.addEventListener('click', () => Sidebar.toggle());

    // Theme toggle
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => Theme.toggle());
    });

    // Notification panel
    document.getElementById('notif-btn')?.addEventListener('click', () => {
      document.getElementById('notif-panel')?.classList.toggle('open');
    });

    // Close notif panel on outside click
    document.addEventListener('click', e => {
      const panel = document.getElementById('notif-panel');
      const btn = document.getElementById('notif-btn');
      if (panel?.classList.contains('open') && !panel.contains(e.target) && !btn?.contains(e.target)) {
        panel.classList.remove('open');
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') Modal.close();
    });
  },
};

// Auto-init when DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
