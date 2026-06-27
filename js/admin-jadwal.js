/* =============================================
   admin-jadwal.js
   Upload Jadwal, Riwayat, Monitoring Kirim,
   Laporan Driver
   ============================================= */

/* ── UPLOAD JADWAL ── */
async function renderUploadJadwal() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Upload Jadwal Pengiriman</div>
        <div class="page-sub">Buat jadwal pengiriman LPG untuk driver</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title"><span class="icon">📤</span> Form Jadwal Pengiriman</div></div>
      <div class="card-body">
        <form id="jadwal-form">
          <div class="grid-2 gap-4">
            <div class="form-group">
              <label class="form-label">Driver <span class="required">*</span></label>
              <div class="select-wrapper">
                <select class="form-control" name="driver_id" id="sel-driver" required>
                  <option value="">-- Pilih Driver --</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">SPBE <span class="required">*</span></label>
              <div class="select-wrapper">
                <select class="form-control" name="spbe_id" id="sel-spbe" required>
                  <option value="">-- Pilih SPBE --</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Pangkalan Tujuan <span class="required">*</span></label>
              <div class="select-wrapper">
                <select class="form-control" name="pangkalan_id" id="sel-pangkalan" required>
                  <option value="">-- Pilih Pangkalan --</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Jumlah Tabung <span class="required">*</span></label>
              <input type="number" class="form-control" name="jumlah" min="1" required placeholder="Jumlah tabung" />
            </div>
            <div class="form-group">
              <label class="form-label">Tanggal Pengiriman <span class="required">*</span></label>
              <input type="date" class="form-control" name="tanggal" required id="input-tanggal" />
            </div>
            <div class="form-group">
              <label class="form-label">Catatan</label>
              <input type="text" class="form-control" name="catatan" placeholder="Opsional..." />
            </div>
          </div>

          <div class="alert alert-info mb-4">
            <span class="alert-icon">ℹ️</span>
            <div class="alert-body">Nomor pengiriman akan dibuat otomatis oleh sistem setelah jadwal disimpan.</div>
          </div>

          <div class="d-flex gap-3">
            <button type="submit" class="btn btn-primary flex-1">💾 Simpan Jadwal</button>
            <button type="reset" class="btn btn-ghost">Reset</button>
          </div>
        </form>
      </div>
    </div>`;

  document.getElementById('input-tanggal').value = DateUtil.today();
  await Promise.all([
    loadDriverDropdown('sel-driver'),
    loadSPBEDropdown('sel-spbe'),
    loadPangkalanDropdown('sel-pangkalan'),
  ]);
  document.getElementById('jadwal-form').addEventListener('submit', submitJadwal);
}

async function submitJadwal(e) {
  e.preventDefault();
  const data = Form.getData('jadwal-form');
  if (!data.driver_id || !data.spbe_id || !data.pangkalan_id) {
    Toast.warning('Form Tidak Lengkap', 'Isi semua field yang wajib.'); return;
  }
  Loading.show('Menyimpan jadwal...');
  try {
    const res = await API.createDelivery(data);
    if (res?.status === 'ok') {
      await Alert.success('Jadwal Disimpan!', `No. Pengiriman: ${Fmt.deliveryNo(res.data?.id || 0)}`);
      Form.reset('jadwal-form');
      document.getElementById('input-tanggal').value = DateUtil.today();
    } else { Toast.error('Gagal', res?.message || 'Terjadi kesalahan.'); }
  } catch { Toast.error('Koneksi Error', 'Periksa koneksi internet.'); }
  finally { Loading.hide(); }
}

/* ── RIWAYAT JADWAL ── */
let allJadwal = [];

async function renderRiwayatJadwal() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Riwayat Jadwal</div>
        <div class="page-sub">Semua jadwal pengiriman yang telah dibuat</div>
      </div>
      <div class="page-header-right d-flex gap-2">
        <button class="btn btn-ghost" onclick="exportJadwal()">📊 Export Excel</button>
        <button class="btn btn-outline" onclick="printJadwal()">🖨️ Print</button>
        <button class="btn btn-primary" onclick="Page.go('upload-jadwal')">+ Jadwal Baru</button>
      </div>
    </div>

    <div class="card mb-4">
      <div class="filter-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="search-jadwal" placeholder="Cari driver / pangkalan..." oninput="filterJadwal()" />
        </div>
        <div class="select-wrapper">
          <select class="form-control" id="filter-jadwal-status" onchange="filterJadwal()" style="width:160px">
            <option value="">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="dikirim">Dikirim</option>
            <option value="selesai">Selesai</option>
            <option value="batal">Batal</option>
          </select>
        </div>
        <input type="date" class="form-control" id="filter-jadwal-date" style="width:160px" onchange="filterJadwal()" />
        <input type="month" class="form-control" id="filter-jadwal-month" style="width:140px" onchange="filterJadwal()" />
      </div>
    </div>

    <div id="jadwal-table">${skeletons(1, '200px')}</div>`;

  await loadJadwal();
}

async function loadJadwal() {
  try {
    const res = await API.getDeliveries({});
    allJadwal = res?.data || [];
    renderJadwalTable(allJadwal);
  } catch (e) { apiErr(e, 'jadwal-table'); }
}

function filterJadwal() {
  const s  = document.getElementById('search-jadwal')?.value?.toLowerCase() || '';
  const st = document.getElementById('filter-jadwal-status')?.value || '';
  const dt = document.getElementById('filter-jadwal-date')?.value || '';
  const mo = document.getElementById('filter-jadwal-month')?.value || '';
  let f = allJadwal;
  if (s)  f = f.filter(d => (d.driver_name + d.pangkalan).toLowerCase().includes(s));
  if (st) f = f.filter(d => d.status === st);
  if (dt) f = f.filter(d => d.tanggal === dt);
  if (mo) f = f.filter(d => d.tanggal?.startsWith(mo));
  renderJadwalTable(f);
}

function renderJadwalTable(data) {
  const el = document.getElementById('jadwal-table');
  if (!data?.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">Tidak ada data</div></div>`;
    return;
  }
  el.innerHTML = `
    <div class="table-wrapper card" id="jadwal-printable">
      <table>
        <thead><tr>
          <th>No. Kirim</th><th>Driver</th><th>SPBE</th><th>Jumlah</th>
          <th>Pangkalan</th><th>Tanggal</th><th>Status</th><th>Aksi</th>
        </tr></thead>
        <tbody>${data.map(d => `
          <tr>
            <td><span style="font-family:var(--font-mono);font-size:11px">${Fmt.deliveryNo(d.id)}</span></td>
            <td class="fw-600">${d.driver_name}</td>
            <td>${d.spbe}</td>
            <td class="fw-700">${Fmt.number(d.jumlah)} tbg</td>
            <td>${d.pangkalan}</td>
            <td>${Fmt.date(d.tanggal)}</td>
            <td>${Fmt.statusBadge(d.status)}</td>
            <td>
              <div class="d-flex gap-1">
                <button class="btn btn-sm btn-ghost" onclick="editJadwal('${d.id}')" title="Edit">✏️</button>
                <button class="btn btn-sm btn-ghost" onclick="deleteJadwal('${d.id}')" title="Hapus">🗑️</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function exportJadwal() {
  Export.toCSV(allJadwal.map(d => ({
    'No. Pengiriman': Fmt.deliveryNo(d.id),
    Driver: d.driver_name, SPBE: d.spbe, Jumlah: d.jumlah,
    Pangkalan: d.pangkalan, Tanggal: d.tanggal, Status: d.status,
  })), 'jadwal-pengiriman.csv');
  Toast.success('Export Berhasil', 'File CSV telah diunduh.');
}

function printJadwal() { Report.printDeliveries(allJadwal, 'Riwayat Jadwal Pengiriman'); }

async function editJadwal(id) {
  const item = allJadwal.find(d => String(d.id) === String(id));
  if (!item) return;

  Modal.create({
    id: 'modal-edit-jadwal', title: 'Edit Jadwal Pengiriman', size: 'modal-lg',
    body: `
      <form id="edit-jadwal-form">
        <div class="grid-2 gap-4">
          <div class="form-group"><label class="form-label">Driver</label>
            <div class="select-wrapper"><select class="form-control" name="driver_id" id="edit-sel-driver"></select></div></div>
          <div class="form-group"><label class="form-label">SPBE</label>
            <div class="select-wrapper"><select class="form-control" name="spbe_id" id="edit-sel-spbe"></select></div></div>
          <div class="form-group"><label class="form-label">Pangkalan</label>
            <div class="select-wrapper"><select class="form-control" name="pangkalan_id" id="edit-sel-pangkalan-edit"></select></div></div>
          <div class="form-group"><label class="form-label">Jumlah</label>
            <input type="number" class="form-control" name="jumlah" value="${item.jumlah}" min="1" /></div>
          <div class="form-group"><label class="form-label">Tanggal</label>
            <input type="date" class="form-control" name="tanggal" value="${item.tanggal}" /></div>
          <div class="form-group"><label class="form-label">Status</label>
            <div class="select-wrapper"><select class="form-control" name="status">
              <option value="pending"  ${item.status === 'pending'  ? 'selected' : ''}>Pending</option>
              <option value="dikirim"  ${item.status === 'dikirim'  ? 'selected' : ''}>Dikirim</option>
              <option value="selesai"  ${item.status === 'selesai'  ? 'selected' : ''}>Selesai</option>
              <option value="batal"    ${item.status === 'batal'    ? 'selected' : ''}>Batal</option>
            </select></div></div>
        </div>
      </form>`,
    footer: `<button class="btn btn-ghost" onclick="Modal.close('modal-edit-jadwal')">Batal</button>
             <button class="btn btn-primary" onclick="saveEditJadwal('${id}')">💾 Simpan</button>`
  });
  Modal.open('modal-edit-jadwal');

  await Promise.all([
    loadDriverDropdown('edit-sel-driver'),
    loadSPBEDropdown('edit-sel-spbe'),
    loadPangkalanDropdown('edit-sel-pangkalan-edit'),
  ]);
}

async function saveEditJadwal(id) {
  const data = Form.getData('edit-jadwal-form');
  Loading.show('Menyimpan...');
  try {
    const res = await API.updateDelivery(id, data);
    if (res?.status === 'ok') {
      Toast.success('Berhasil', 'Jadwal berhasil diperbarui.');
      Modal.close('modal-edit-jadwal');
      loadJadwal();
    }
  } catch { Toast.error('Gagal', 'Tidak dapat menyimpan.'); }
  finally { Loading.hide(); }
}

async function deleteJadwal(id) {
  const ok = await Alert.confirm('Hapus Jadwal?', 'Data tidak dapat dikembalikan.', 'danger');
  if (!ok) return;
  Loading.show();
  try {
    const res = await API.deleteDelivery(id);
    if (res?.status === 'ok') { Toast.success('Dihapus', 'Jadwal berhasil dihapus.'); loadJadwal(); }
  } catch { Toast.error('Gagal', 'Tidak dapat menghapus.'); }
  finally { Loading.hide(); }
}

/* ── MONITORING PENGIRIMAN ── */
let allMonitor = [];

async function renderMonitoringKirim() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Monitoring Pengiriman</div>
        <div class="page-sub">Status real-time semua pengiriman</div>
      </div>
    </div>

    <div class="grid-3 mb-6" id="monitor-stats">${skeletons(3, '80px')}</div>

    <div class="tabs mb-4" id="monitor-tabs">
      <button class="tab active" onclick="filterMonitor('all',this)">Semua</button>
      <button class="tab" onclick="filterMonitor('pending',this)">⏳ Pending</button>
      <button class="tab" onclick="filterMonitor('dikirim',this)">🚚 Dikirim</button>
      <button class="tab" onclick="filterMonitor('selesai',this)">✅ Selesai</button>
    </div>

    <div id="monitor-list">${skeletons(1, '200px')}</div>`;

  loadMonitorData('all');
}

async function loadMonitorData(statusFilter) {
  try {
    const res = await API.getDeliveries({ date: DateUtil.today() });
    allMonitor = res?.data || [];
  } catch (e) { apiErr(e, 'monitor-list'); return; }

  const pending = allMonitor.filter(d => d.status === 'pending').length;
  const dikirim = allMonitor.filter(d => d.status === 'dikirim').length;
  const selesai = allMonitor.filter(d => d.status === 'selesai').length;

  document.getElementById('monitor-stats').innerHTML = `
    ${statCard('⏳', pending, 'Belum Dikirim', 'yellow')}
    ${statCard('🚚', dikirim, 'Sedang Dikirim', 'blue')}
    ${statCard('✅', selesai, 'Selesai', 'green')}`;

  document.getElementById('badge-pending').textContent = pending;
  filterMonitorRender(statusFilter);
}

function filterMonitor(status, btn) {
  document.querySelectorAll('#monitor-tabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  filterMonitorRender(status);
}

function filterMonitorRender(status) {
  const data = status === 'all' ? allMonitor : allMonitor.filter(d => d.status === status);
  const el = document.getElementById('monitor-list');
  if (!data.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">Tidak ada data</div></div>`;
    return;
  }
  el.innerHTML = `
    <div class="table-wrapper card">
      <table>
        <thead><tr><th>No. Kirim</th><th>Driver</th><th>SPBE</th><th>Jumlah</th><th>Pangkalan</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${data.map(d => `
          <tr>
            <td><span style="font-family:var(--font-mono);font-size:11px">${Fmt.deliveryNo(d.id)}</span></td>
            <td class="fw-600">${d.driver_name}</td>
            <td>${d.spbe}</td>
            <td>${Fmt.number(d.jumlah)} tbg</td>
            <td>${d.pangkalan}</td>
            <td>${Fmt.statusBadge(d.status)}</td>
            <td>
              ${d.status === 'pending'  ? `<button class="btn btn-sm btn-warning" onclick="ubahStatusKirim('${d.id}','dikirim')">▶ Mulai</button>` : ''}
              ${d.status === 'dikirim'  ? `<button class="btn btn-sm btn-success" onclick="ubahStatusKirim('${d.id}','selesai')">✅ Selesai</button>` : ''}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function ubahStatusKirim(id, status) {
  const ok = await Alert.confirm('Ubah Status?', `Status akan diubah menjadi "${status}".`);
  if (!ok) return;
  Loading.show();
  try {
    await API.updateDelivery(id, { status });
    Toast.success('Berhasil', 'Status pengiriman diperbarui.');
    loadMonitorData('all');
  } catch { Toast.error('Gagal'); }
  finally { Loading.hide(); }
}

/* ── LAPORAN DRIVER ── */
let allLaporan = [];

async function renderLaporanDriver() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Laporan Driver</div>
        <div class="page-sub">Review dan koreksi laporan pengiriman</div>
      </div>
    </div>

    <div class="card mb-4">
      <div class="filter-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="search-laporan" placeholder="Cari driver / pangkalan..." oninput="filterLaporan()" />
        </div>
        <input type="date" class="form-control" id="filter-laporan-date" style="width:160px"
          onchange="loadLaporanDriver()" value="${DateUtil.today()}" />
      </div>
    </div>

    <div id="laporan-list">${skeletons(1, '200px')}</div>`;

  loadLaporanDriver();
}

async function loadLaporanDriver() {
  try {
    const date = document.getElementById('filter-laporan-date')?.value;
    const res = await API.getDeliveries({ has_report: true, date });
    allLaporan = res?.data || [];
  } catch { allLaporan = []; }
  renderLaporanList(allLaporan);
}

function filterLaporan() {
  const s = document.getElementById('search-laporan')?.value?.toLowerCase() || '';
  renderLaporanList(s ? allLaporan.filter(d => (d.driver_name + d.pangkalan).toLowerCase().includes(s)) : allLaporan);
}

function renderLaporanList(data) {
  const el = document.getElementById('laporan-list');
  if (!data?.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-title">Belum ada laporan</div></div>`;
    return;
  }
  el.innerHTML = data.map(d => `
    <div class="card mb-3">
      <div class="card-body">
        <div class="d-flex gap-3 mb-3" style="align-items:center">
          <div class="flex-1">
            <div class="d-flex gap-2 mb-1">
              <span class="text-sm text-muted" style="font-family:var(--font-mono)">${Fmt.deliveryNo(d.id)}</span>
              ${Fmt.statusBadge(d.status)}
            </div>
            <div class="fw-700">${d.driver_name} → ${d.pangkalan}</div>
            <div class="text-sm text-secondary">${d.spbe} · ${Fmt.datetime(d.report_time || d.tanggal)}</div>
          </div>
          <div class="text-right">
            <div class="fw-800 text-xl text-primary-c">${Fmt.number(d.jumlah_kirim || d.jumlah)}</div>
            <div class="text-sm text-secondary">tabung</div>
          </div>
        </div>
        ${d.keterangan ? `<div class="text-sm text-secondary mb-3">📝 ${d.keterangan}</div>` : ''}
        <div class="d-flex gap-2">
          ${d.photo ? `<button class="btn btn-sm btn-ghost" onclick="viewPhoto('${d.photo}')">🖼️ Foto</button>` : ''}
          <button class="btn btn-sm btn-outline" onclick="editLaporan('${d.id}')">✏️ Koreksi</button>
        </div>
      </div>
    </div>`).join('');
}

function editLaporan(id) {
  const item = allLaporan.find(d => String(d.id) === String(id));
  Modal.create({
    id: 'modal-edit-laporan', title: 'Koreksi Laporan',
    body: `
      <form id="edit-laporan-form">
        <div class="form-group"><label class="form-label">Jumlah Terkirim</label>
          <input type="number" class="form-control" name="jumlah_kirim" value="${item?.jumlah_kirim || item?.jumlah || 0}" /></div>
        <div class="form-group"><label class="form-label">Status</label>
          <div class="select-wrapper"><select class="form-control" name="status">
            <option value="selesai"  ${item?.status === 'selesai'  ? 'selected' : ''}>Selesai</option>
            <option value="sebagian" ${item?.status === 'sebagian' ? 'selected' : ''}>Sebagian</option>
            <option value="batal"    ${item?.status === 'batal'    ? 'selected' : ''}>Batal</option>
          </select></div></div>
        <div class="form-group"><label class="form-label">Keterangan Koreksi</label>
          <textarea class="form-control" name="keterangan_koreksi" placeholder="Alasan koreksi..."></textarea></div>
      </form>`,
    footer: `<button class="btn btn-ghost" onclick="Modal.close('modal-edit-laporan')">Batal</button>
             <button class="btn btn-primary" onclick="saveLaporanKoreksi('${id}')">💾 Simpan</button>`
  });
  Modal.open('modal-edit-laporan');
}

async function saveLaporanKoreksi(id) {
  const data = Form.getData('edit-laporan-form');
  Loading.show();
  try {
    await API.updateDelivery(id, data);
    Toast.success('Koreksi Tersimpan', 'Laporan berhasil dikoreksi.');
    Modal.close('modal-edit-laporan');
    loadLaporanDriver();
  } catch { Toast.error('Gagal'); }
  finally { Loading.hide(); }
}
