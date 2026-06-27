/* =============================================
   admin-helpers.js
   Shared utilities untuk semua halaman admin
   ============================================= */

function statCard(icon, value, label, color) {
  return `<div class="stat-card"><div class="stat-icon ${color}">${icon}</div>
    <div class="stat-body"><div class="stat-label">${label}</div>
    <div class="stat-value">${Fmt.number(value)}</div></div></div>`;
}

function skeletons(count, h = '90px') {
  return Array(count).fill(0).map(() =>
    `<div class="skeleton" style="height:${h};border-radius:12px"></div>`
  ).join('');
}

function viewPhoto(src) {
  Modal.create({
    id: 'modal-photo', title: 'Foto Bukti',
    body: `<img src="${src}" style="width:100%;border-radius:8px"/>`
  });
  Modal.open('modal-photo');
}

function apiErr(e, containerIdOrEl) {
  const el = typeof containerIdOrEl === 'string'
    ? document.getElementById(containerIdOrEl)
    : containerIdOrEl;
  if (!el) { Toast.error('Gagal', e?.message || 'Koneksi ke server gagal.'); return; }
  el.innerHTML = `
    <div class="empty-state" style="padding:32px">
      <div style="font-size:40px;margin-bottom:12px">⚠️</div>
      <div class="fw-700" style="color:var(--danger);margin-bottom:6px">Gagal Memuat Data</div>
      <div class="text-secondary text-sm" style="margin-bottom:16px">
        ${e?.message || 'Tidak dapat terhubung ke server. Periksa koneksi dan coba lagi.'}
      </div>
      <button class="btn btn-outline btn-sm" onclick="location.reload()">🔄 Coba Lagi</button>
    </div>`;
}

function bhStatusBadge(s) {
  const map = {
    sudah_bayar:  ['success', '✅ Sudah Bayar'],
    belum_bayar:  ['danger',  '🔴 Belum Bayar'],
    kurang_bayar: ['warning', '⚠️ Kurang Bayar'],
  };
  const [c, l] = map[s] || ['gray', s];
  return `<span class="badge badge-${c}">${l}</span>`;
}

async function doLogout() {
  const ok = await Alert.confirm('Keluar?', 'Anda akan keluar dari sistem.');
  if (!ok) return;
  await API.logout();
  window.location.href = '/index.html';
}

async function markAllRead() {
  await API.markNotifRead([]);
  Notif.updateBadge(0);
}

// Dropdown loaders — dipakai di beberapa modul
async function loadDriverDropdown(selId = 'sel-driver') {
  try {
    const res = await API.getDrivers();
    Form.populateSelect(selId, res?.data || [], { value: 'id', label: 'name', placeholder: '-- Pilih Driver --' });
  } catch (e) { Toast.error('Gagal memuat daftar driver', e?.message); }
}

async function loadSPBEDropdown(selId = 'sel-spbe') {
  try {
    const res = await API.getSPBE();
    Form.populateSelect(selId, res?.data || [], { value: 'id', label: 'name', placeholder: '-- Pilih SPBE --' });
  } catch (e) { Toast.error('Gagal memuat daftar SPBE', e?.message); }
}

async function loadPangkalanDropdown(selId = 'sel-pangkalan') {
  try {
    const res = await API.getPangkalan();
    Form.populateSelect(selId, res?.data || [], { value: 'id', label: 'nama', placeholder: '-- Pilih Pangkalan --' });
  } catch (e) { Toast.error('Gagal memuat daftar pangkalan', e?.message); }
}
