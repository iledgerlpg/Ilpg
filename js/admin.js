(function(){ const t=localStorage.getItem('ilpg_theme')||'light'; document.documentElement.setAttribute('data-theme',t); })();

Auth.requireAuth();
Auth.requireRole('admin');

const user = Auth.getUser();
document.getElementById('user-name').textContent = user?.name || 'Admin';
document.getElementById('user-avatar').textContent = (user?.name||'A')[0].toUpperCase();

/* ── Router ── */
const Page = {
  go(name, params={}) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page===name));
    const titles = {
      dashboard:'Dashboard', absensi:'Absensi Saya', 'upload-jadwal':'Upload Jadwal',
      'riwayat-jadwal':'Riwayat Jadwal', 'monitoring-kirim':'Monitoring Pengiriman',
      'laporan-driver':'Laporan Driver', pembayaran:'Pembayaran Pangkalan',
      'bagi-hasil':'Bagi Hasil', tagihan:'Monitoring Tagihan', pangkalan:'Manajemen Pangkalan',
      'monitoring-refill':'Monitoring Refill', 'monitoring-lpg':'Monitoring LPG 3KG',
      'pembelian-tabung':'Pembelian Tabung',
    };
    document.getElementById('page-title').textContent = titles[name]||name;
    const fns = {
      dashboard: renderDashboard, absensi: renderAbsensi,
      'upload-jadwal': renderUploadJadwal, 'riwayat-jadwal': renderRiwayatJadwal,
      'monitoring-kirim': renderMonitoringKirim, 'laporan-driver': renderLaporanDriver,
      pembayaran: renderPembayaran, 'bagi-hasil': renderBagiHasil,
      tagihan: renderTagihan, pangkalan: renderPangkalan,
      'monitoring-refill': renderMonitoringRefill, 'monitoring-lpg': renderMonitoringLPG,
      'pembelian-tabung': renderPembelianTabung,
    };
    const fn = fns[name];
    if(fn) fn(params);
    Sidebar.closeMobile();
  }
};

/* ══════════════════════════════════════
   DASHBOARD
══════════════════════════════════════ */
async function renderDashboard() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Dashboard Admin</div>
        <div class="page-sub">${Fmt.date(new Date().toISOString())} — Overview distribusi LPG</div>
      </div>
      <div class="page-header-right">
        <button class="btn btn-primary" onclick="Page.go('upload-jadwal')">+ Jadwal Baru</button>
      </div>
    </div>

    <div class="grid-4 mb-6" id="stat-cards">
      ${skeletons(4,'90px')}
    </div>

    <div class="grid-2 mb-6">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">📈</span> Distribusi LPG — 7 Hari</div>
        </div>
        <div class="card-body">
          <div class="chart-container"><canvas id="chart-distribusi"></canvas></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">🏪</span> Status Pangkalan</div>
        </div>
        <div class="card-body">
          <div class="chart-container"><canvas id="chart-pangkalan"></canvas></div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">⏳</span> Pengiriman Pending</div>
          <button class="btn btn-sm btn-outline" onclick="Page.go('monitoring-kirim')">Lihat Semua</button>
        </div>
        <div class="card-body" id="pending-list">${skeletons(1,'80px')}</div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">🧾</span> Tagihan Berjalan</div>
          <button class="btn btn-sm btn-outline" onclick="Page.go('tagihan')">Lihat Semua</button>
        </div>
        <div class="card-body" id="tagihan-list">${skeletons(1,'80px')}</div>
      </div>
    </div>`;

  try {
    const res = await API.getDashboardStats();
    const d = res?.data || {};
    renderAdminStats(d);
    renderCharts(d);
    renderPendingMini(d.pending_deliveries || []);
    renderTagihanMini(d.unpaid_bills || []);
    if (d.pending_count) document.getElementById('badge-pending').textContent = d.pending_count;
  } catch (e) {
    apiErr(e, 'stat-cards');
    apiErr(e, 'pending-list');
    apiErr(e, 'tagihan-list');
  }
}

function renderAdminStats(d) {
  document.getElementById('stat-cards').innerHTML = `
    ${statCard('📦', d.total_today||0, 'Pengiriman Hari Ini', 'orange')}
    ${statCard('✅', d.selesai||0, 'Selesai', 'green')}
    ${statCard('⏳', d.pending||0, 'Pending', 'yellow')}
    ${statCard('🏪', d.total_pangkalan||0, 'Total Pangkalan', 'blue')}`;
}

function renderPendingMini(items) {
  const el = document.getElementById('pending-list');
  if (!items.length) { el.innerHTML=`<div class="empty-state" style="padding:16px"><div class="empty-icon">✅</div><div class="empty-title">Semua terkirim</div></div>`; return; }
  el.innerHTML = items.slice(0,4).map(d=>`
    <div class="d-flex gap-3 mb-3" style="align-items:center">
      <div class="flex-1">
        <div class="fw-600">${d.driver_name} → ${d.pangkalan}</div>
        <div class="text-sm text-secondary">${Fmt.number(d.jumlah)} tabung · ${d.spbe}</div>
      </div>
      ${Fmt.statusBadge(d.status)}
    </div>`).join('');
}

function renderTagihanMini(items) {
  const el = document.getElementById('tagihan-list');
  if (!items.length) { el.innerHTML=`<div class="empty-state" style="padding:16px"><div class="empty-icon">✅</div><div class="empty-title">Semua lunas</div></div>`; return; }
  el.innerHTML = items.slice(0,4).map(t=>`
    <div class="d-flex gap-3 mb-3" style="align-items:center">
      <div class="flex-1">
        <div class="fw-600">${t.pangkalan}</div>
        <div class="text-sm text-secondary">${Fmt.currency(t.nominal)}</div>
      </div>
      ${Fmt.statusBadge(t.status)}
    </div>`).join('');
}

function renderCharts(d) {
  const labels = d.chart_labels || ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
  const vals   = d.chart_data  || [45,60,55,80,70,95,88];

  Charts.renderDistribusiLine('chart-distribusi', labels, vals);

  const pkData = d.pangkalan_status || [14,6,4];
  Charts.renderDoughnut('chart-pangkalan', ['Sudah Bayar','Belum Bayar','Cicilan'], pkData);
}



/* ══════════════════════════════════════
   UPLOAD JADWAL
══════════════════════════════════════ */
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

  // Set default date = today
  document.getElementById('input-tanggal').value = DateUtil.today();

  // Load dropdowns
  await Promise.all([loadDriverDropdown(), loadSPBEDropdown(), loadPangkalanDropdown('sel-pangkalan')]);

  document.getElementById('jadwal-form').addEventListener('submit', submitJadwal);
}

async function loadDriverDropdown(selId='sel-driver') {
  try {
    const res = await API.getDrivers();
    Form.populateSelect(selId, res?.data||[], { value:'id', label:'name', placeholder:'-- Pilih Driver --' });
  } catch (e) {
    Toast.error('Gagal memuat daftar driver', e?.message);
  }
}

async function loadSPBEDropdown(selId='sel-spbe') {
  try {
    const res = await API.getSPBE();
    Form.populateSelect(selId, res?.data||[], { value:'id', label:'name', placeholder:'-- Pilih SPBE --' });
  } catch (e) {
    Toast.error('Gagal memuat daftar SPBE', e?.message);
  }
}

async function loadPangkalanDropdown(selId='sel-pangkalan') {
  try {
    const res = await API.getPangkalan();
    Form.populateSelect(selId, res?.data||[], { value:'id', label:'nama', placeholder:'-- Pilih Pangkalan --' });
  } catch (e) {
    Toast.error('Gagal memuat daftar pangkalan', e?.message);
  }
}

async function submitJadwal(e) {
  e.preventDefault();
  const data = Form.getData('jadwal-form');
  if (!data.driver_id||!data.spbe_id||!data.pangkalan_id) {
    Toast.warning('Form Tidak Lengkap','Isi semua field yang wajib.'); return;
  }
  Loading.show('Menyimpan jadwal...');
  try {
    const res = await API.createDelivery(data);
    if (res?.status==='ok') {
      await Alert.success('Jadwal Disimpan!', `No. Pengiriman: ${Fmt.deliveryNo(res.data?.id||0)}`);
      Form.reset('jadwal-form');
      document.getElementById('input-tanggal').value = DateUtil.today();
    } else { Toast.error('Gagal', res?.message||'Terjadi kesalahan.'); }
  } catch { Toast.error('Koneksi Error','Periksa koneksi internet.'); }
  finally { Loading.hide(); }
}

/* ══════════════════════════════════════
   RIWAYAT JADWAL
══════════════════════════════════════ */
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

    <div id="jadwal-table">${skeletons(1,'200px')}</div>`;

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
  const s  = document.getElementById('search-jadwal')?.value?.toLowerCase()||'';
  const st = document.getElementById('filter-jadwal-status')?.value||'';
  const dt = document.getElementById('filter-jadwal-date')?.value||'';
  const mo = document.getElementById('filter-jadwal-month')?.value||'';
  let f = allJadwal;
  if(s)  f = f.filter(d=>(d.driver_name+d.pangkalan).toLowerCase().includes(s));
  if(st) f = f.filter(d=>d.status===st);
  if(dt) f = f.filter(d=>d.tanggal===dt);
  if(mo) f = f.filter(d=>d.tanggal?.startsWith(mo));
  renderJadwalTable(f);
}

function renderJadwalTable(data) {
  const el = document.getElementById('jadwal-table');
  if(!data?.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">Tidak ada data</div></div>`;return;}
  el.innerHTML = `
    <div class="table-wrapper card" id="jadwal-printable">
      <table>
        <thead><tr>
          <th>No. Kirim</th><th>Driver</th><th>SPBE</th><th>Jumlah</th>
          <th>Pangkalan</th><th>Tanggal</th><th>Status</th><th>Aksi</th>
        </tr></thead>
        <tbody>${data.map(d=>`
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
  Export.toCSV(allJadwal.map(d=>({
    'No. Pengiriman': Fmt.deliveryNo(d.id),
    Driver: d.driver_name, SPBE: d.spbe, Jumlah: d.jumlah,
    Pangkalan: d.pangkalan, Tanggal: d.tanggal, Status: d.status,
  })), 'jadwal-pengiriman.csv');
  Toast.success('Export Berhasil','File CSV telah diunduh.');
}

function printJadwal() { Report.printDeliveries(allJadwal, 'Riwayat Jadwal Pengiriman'); }

async function editJadwal(id) {
  const item = allJadwal.find(d=>String(d.id)===String(id));
  if(!item) return;

  Modal.create({
    id:'modal-edit-jadwal', title:'Edit Jadwal Pengiriman', size:'modal-lg',
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
              <option value="pending" ${item.status==='pending'?'selected':''}>Pending</option>
              <option value="dikirim" ${item.status==='dikirim'?'selected':''}>Dikirim</option>
              <option value="selesai" ${item.status==='selesai'?'selected':''}>Selesai</option>
              <option value="batal"   ${item.status==='batal'?'selected':''}>Batal</option>
            </select></div></div>
        </div>
      </form>`,
    footer:`<button class="btn btn-ghost" onclick="Modal.close('modal-edit-jadwal')">Batal</button>
            <button class="btn btn-primary" onclick="saveEditJadwal('${id}')">💾 Simpan</button>`
  });
  Modal.open('modal-edit-jadwal');

  await Promise.all([
    loadDriverDropdown('edit-sel-driver'), loadSPBEDropdown('edit-sel-spbe'),
    loadPangkalanDropdown('edit-sel-pangkalan-edit')
  ]);
}

async function saveEditJadwal(id) {
  const data = Form.getData('edit-jadwal-form');
  Loading.show('Menyimpan...');
  try {
    const res = await API.updateDelivery(id, data);
    if(res?.status==='ok') {
      Toast.success('Berhasil','Jadwal berhasil diperbarui.');
      Modal.close('modal-edit-jadwal');
      loadJadwal();
    }
  } catch { Toast.error('Gagal','Tidak dapat menyimpan.'); }
  finally { Loading.hide(); }
}

async function deleteJadwal(id) {
  const ok = await Alert.confirm('Hapus Jadwal?','Data tidak dapat dikembalikan.','danger');
  if(!ok) return;
  Loading.show();
  try {
    const res = await API.deleteDelivery(id);
    if(res?.status==='ok') { Toast.success('Dihapus','Jadwal berhasil dihapus.'); loadJadwal(); }
  } catch { Toast.error('Gagal','Tidak dapat menghapus.'); }
  finally { Loading.hide(); }
}

/* ══════════════════════════════════════
   MONITORING PENGIRIMAN
══════════════════════════════════════ */
async function renderMonitoringKirim() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Monitoring Pengiriman</div>
        <div class="page-sub">Status real-time semua pengiriman</div>
      </div>
    </div>

    <div class="grid-3 mb-6" id="monitor-stats">${skeletons(3,'80px')}</div>

    <div class="tabs mb-4" id="monitor-tabs">
      <button class="tab active" onclick="filterMonitor('all',this)">Semua</button>
      <button class="tab" onclick="filterMonitor('pending',this)">⏳ Pending</button>
      <button class="tab" onclick="filterMonitor('dikirim',this)">🚚 Dikirim</button>
      <button class="tab" onclick="filterMonitor('selesai',this)">✅ Selesai</button>
    </div>

    <div id="monitor-list">${skeletons(1,'200px')}</div>`;

  loadMonitorData('all');
}

let allMonitor = [];
async function loadMonitorData(statusFilter) {
  try {
    const res = await API.getDeliveries({ date: DateUtil.today() });
    allMonitor = res?.data || [];
  } catch (e) { apiErr(e, 'monitor-list'); }

  const pending  = allMonitor.filter(d=>d.status==='pending').length;
  const dikirim  = allMonitor.filter(d=>d.status==='dikirim').length;
  const selesai  = allMonitor.filter(d=>d.status==='selesai').length;

  document.getElementById('monitor-stats').innerHTML = `
    ${statCard('⏳', pending, 'Belum Dikirim', 'yellow')}
    ${statCard('🚚', dikirim, 'Sedang Dikirim', 'blue')}
    ${statCard('✅', selesai, 'Selesai', 'green')}`;

  document.getElementById('badge-pending').textContent = pending;
  filterMonitorRender(statusFilter);
}

function filterMonitor(status, btn) {
  document.querySelectorAll('#monitor-tabs .tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  filterMonitorRender(status);
}

function filterMonitorRender(status) {
  const data = status==='all' ? allMonitor : allMonitor.filter(d=>d.status===status);
  const el = document.getElementById('monitor-list');
  if(!data.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">Tidak ada data</div></div>`;return;}
  el.innerHTML = `
    <div class="table-wrapper card">
      <table>
        <thead><tr><th>No. Kirim</th><th>Driver</th><th>SPBE</th><th>Jumlah</th><th>Pangkalan</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${data.map(d=>`
          <tr>
            <td><span style="font-family:var(--font-mono);font-size:11px">${Fmt.deliveryNo(d.id)}</span></td>
            <td class="fw-600">${d.driver_name}</td>
            <td>${d.spbe}</td>
            <td>${Fmt.number(d.jumlah)} tbg</td>
            <td>${d.pangkalan}</td>
            <td>${Fmt.statusBadge(d.status)}</td>
            <td>
              ${d.status==='pending'?`<button class="btn btn-sm btn-warning" onclick="ubahStatusKirim('${d.id}','dikirim')">▶ Mulai</button>`:''}
              ${d.status==='dikirim'?`<button class="btn btn-sm btn-success" onclick="ubahStatusKirim('${d.id}','selesai')">✅ Selesai</button>`:''}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function ubahStatusKirim(id, status) {
  const ok = await Alert.confirm('Ubah Status?',`Status akan diubah menjadi "${status}".`);
  if(!ok) return;
  Loading.show();
  try {
    await API.updateDelivery(id, {status});
    Toast.success('Berhasil','Status pengiriman diperbarui.');
    loadMonitorData('all');
  } catch { Toast.error('Gagal'); }
  finally { Loading.hide(); }
}

/* ══════════════════════════════════════
   LAPORAN DRIVER
══════════════════════════════════════ */
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
        <input type="date" class="form-control" id="filter-laporan-date" style="width:160px" onchange="filterLaporan()" value="${DateUtil.today()}" />
      </div>
    </div>

    <div id="laporan-list">${skeletons(1,'200px')}</div>`;

  loadLaporanDriver();
}

let allLaporan = [];
async function loadLaporanDriver() {
  try {
    const date = document.getElementById('filter-laporan-date')?.value;
    const res = await API.getDeliveries({ has_report: true, date });
    allLaporan = res?.data || [];
  } catch { allLaporan = []; }
  renderLaporanList(allLaporan);
}

function filterLaporan() {
  const s  = document.getElementById('search-laporan')?.value?.toLowerCase()||'';
  let f = allLaporan;
  if(s) f = f.filter(d=>(d.driver_name+d.pangkalan).toLowerCase().includes(s));
  renderLaporanList(f);
}

function renderLaporanList(data) {
  const el = document.getElementById('laporan-list');
  if(!data?.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-title">Belum ada laporan</div></div>`;return;}
  el.innerHTML = data.map(d=>`
    <div class="card mb-3">
      <div class="card-body">
        <div class="d-flex gap-3 mb-3" style="align-items:center">
          <div class="flex-1">
            <div class="d-flex gap-2 mb-1">
              <span class="text-sm text-muted" style="font-family:var(--font-mono)">${Fmt.deliveryNo(d.id)}</span>
              ${Fmt.statusBadge(d.status)}
            </div>
            <div class="fw-700">${d.driver_name} → ${d.pangkalan}</div>
            <div class="text-sm text-secondary">${d.spbe} · ${Fmt.datetime(d.report_time||d.tanggal)}</div>
          </div>
          <div class="text-right">
            <div class="fw-800 text-xl text-primary-c">${Fmt.number(d.jumlah_kirim||d.jumlah)}</div>
            <div class="text-sm text-secondary">tabung</div>
          </div>
        </div>
        ${d.keterangan?`<div class="text-sm text-secondary mb-3">📝 ${d.keterangan}</div>`:''}
        <div class="d-flex gap-2">
          ${d.photo?`<button class="btn btn-sm btn-ghost" onclick="viewPhoto('${d.photo}')">🖼️ Foto</button>`:''}
          <button class="btn btn-sm btn-outline" onclick="editLaporan('${d.id}')">✏️ Koreksi</button>
        </div>
      </div>
    </div>`).join('');
}

function editLaporan(id) {
  const item = allLaporan.find(d=>String(d.id)===String(id));
  Modal.create({
    id:'modal-edit-laporan', title:'Koreksi Laporan',
    body:`
      <form id="edit-laporan-form">
        <div class="form-group"><label class="form-label">Jumlah Terkirim</label>
          <input type="number" class="form-control" name="jumlah_kirim" value="${item?.jumlah_kirim||item?.jumlah||0}" /></div>
        <div class="form-group"><label class="form-label">Status</label>
          <div class="select-wrapper"><select class="form-control" name="status">
            <option value="selesai" ${item?.status==='selesai'?'selected':''}>Selesai</option>
            <option value="sebagian" ${item?.status==='sebagian'?'selected':''}>Sebagian</option>
            <option value="batal" ${item?.status==='batal'?'selected':''}>Batal</option>
          </select></div></div>
        <div class="form-group"><label class="form-label">Keterangan Koreksi</label>
          <textarea class="form-control" name="keterangan_koreksi" placeholder="Alasan koreksi..."></textarea></div>
      </form>`,
    footer:`<button class="btn btn-ghost" onclick="Modal.close('modal-edit-laporan')">Batal</button>
            <button class="btn btn-primary" onclick="saveLaporanKoreksi('${id}')">💾 Simpan</button>`
  });
  Modal.open('modal-edit-laporan');
}

async function saveLaporanKoreksi(id) {
  const data = Form.getData('edit-laporan-form');
  Loading.show();
  try {
    await API.updateDelivery(id, data);
    Toast.success('Koreksi Tersimpan','Laporan berhasil dikoreksi.');
    Modal.close('modal-edit-laporan');
    loadLaporanDriver();
  } catch { Toast.error('Gagal'); }
  finally { Loading.hide(); }
}

/* ══════════════════════════════════════
   PEMBAYARAN PANGKALAN
══════════════════════════════════════ */
async function renderPembayaran() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Pembayaran Pangkalan</div>
        <div class="page-sub">Input dan monitoring pembayaran</div>
      </div>
      <div class="page-header-right">
        <button class="btn btn-primary" onclick="openModalPembayaran()">+ Input Pembayaran</button>
      </div>
    </div>

    <div class="grid-3 mb-6" id="pay-stats">${skeletons(3,'80px')}</div>

    <div class="card mb-4">
      <div class="filter-bar">
        <div class="select-wrapper">
          <select class="form-control" id="filter-pay-status" onchange="loadPembayaran()" style="width:160px">
            <option value="">Semua Status</option>
            <option value="lunas">Lunas</option>
            <option value="belum_lunas">Belum Lunas</option>
            <option value="cicilan">Cicilan</option>
          </select>
        </div>
        <input type="month" class="form-control" id="filter-pay-month" style="width:140px" onchange="loadPembayaran()" />
      </div>
    </div>

    <div id="pay-list">${skeletons(1,'200px')}</div>

    <!-- Modal Input -->
    <div class="modal-overlay" id="modal-pembayaran" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h5 class="modal-title">Input Pembayaran</h5>
          <button class="modal-close" onclick="Modal.close('modal-pembayaran')">×</button>
        </div>
        <div class="modal-body">
          <form id="pay-form">
            <div class="form-group"><label class="form-label">Pangkalan <span class="required">*</span></label>
              <div class="select-wrapper"><select class="form-control" name="pangkalan_id" id="pay-sel-pangkalan" required></select></div></div>
            <div class="form-group"><label class="form-label">Nominal (Rp) <span class="required">*</span></label>
              <input type="number" class="form-control" name="nominal" placeholder="0" required min="1" /></div>
            <div class="form-group"><label class="form-label">Tanggal <span class="required">*</span></label>
              <input type="date" class="form-control" name="tanggal" value="${DateUtil.today()}" required /></div>
            <div class="form-group"><label class="form-label">Status Pembayaran <span class="required">*</span></label>
              <div class="select-wrapper"><select class="form-control" name="status" required>
                <option value="">-- Pilih Status --</option>
                <option value="lunas">✅ Lunas</option>
                <option value="cicilan">🟡 Cicilan</option>
                <option value="belum_lunas">🔴 Belum Lunas</option>
              </select></div></div>
            <div class="form-group"><label class="form-label">Catatan</label>
              <textarea class="form-control" name="catatan" rows="2"></textarea></div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="Modal.close('modal-pembayaran')">Batal</button>
          <button class="btn btn-primary" onclick="submitPembayaran()">💾 Simpan</button>
        </div>
      </div>
    </div>`;

  loadPembayaran();
}

async function openModalPembayaran() {
  await loadPangkalanDropdown('pay-sel-pangkalan');
  Modal.open('modal-pembayaran');
}

async function loadPembayaran() {
  const status = document.getElementById('filter-pay-status')?.value||'';
  const month  = document.getElementById('filter-pay-month')?.value||'';
  try {
    const res = await API.getPayments({status, month});
    const data = res?.data || [];
    renderPayStats(data);
    renderPayList(data);
  } catch (e) {
    apiErr(e, 'pay-stats');
    apiErr(e, 'pay-list');
  }
}


function renderPayStats(data) {
  const lunas     = data.filter(d=>d.status==='lunas').length;
  const belum     = data.filter(d=>d.status==='belum_lunas').length;
  const cicilan   = data.filter(d=>d.status==='cicilan').length;
  document.getElementById('pay-stats').innerHTML = `
    ${statCard('✅', lunas, 'Lunas', 'green')}
    ${statCard('🔴', belum, 'Belum Lunas', 'red')}
    ${statCard('🟡', cicilan, 'Cicilan', 'yellow')}`;
}

function renderPayList(data) {
  const el = document.getElementById('pay-list');
  if(!data?.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon">💳</div><div class="empty-title">Tidak ada data</div></div>`;return;}
  el.innerHTML = `
    <div class="table-wrapper card">
      <table>
        <thead><tr><th>Pangkalan</th><th>Nominal</th><th>Tanggal</th><th>Status</th><th>Catatan</th><th>Aksi</th></tr></thead>
        <tbody>${data.map(d=>`
          <tr>
            <td class="fw-600">${d.pangkalan}</td>
            <td class="fw-700 text-primary-c">${Fmt.currency(d.nominal)}</td>
            <td>${Fmt.date(d.tanggal)}</td>
            <td>${Fmt.statusBadge(d.status)}</td>
            <td class="text-muted text-sm">${d.catatan||'-'}</td>
            <td>
              <button class="btn btn-sm btn-ghost" onclick="editPembayaran('${d.id}')">✏️</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function submitPembayaran() {
  const data = Form.getData('pay-form');
  if(!data.pangkalan_id||!data.nominal) {Toast.warning('Lengkapi form'); return;}
  Loading.show();
  try {
    await API.createPayment(data);
    Toast.success('Tersimpan','Pembayaran berhasil dicatat.');
    Modal.close('modal-pembayaran');
    loadPembayaran();
  } catch { Toast.error('Gagal'); }
  finally { Loading.hide(); }
}

function editPembayaran(id) {
  Toast.info('Edit Pembayaran','Fitur edit pembayaran tersedia di backend.');
}

/* ══════════════════════════════════════
   BAGI HASIL
══════════════════════════════════════ */
async function renderBagiHasil() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Manajemen Bagi Hasil</div>
        <div class="page-sub">Kalkulasi otomatis bagi hasil per pangkalan</div>
      </div>
    </div>

    <div class="alert alert-info mb-4">
      <span class="alert-icon">ℹ️</span>
      <div class="alert-body">Bagi hasil = Tarif per tabung × Jumlah tabung terkirim. Tarif dikonfigurasi di data pangkalan.</div>
    </div>

    <div class="card mb-4">
      <div class="filter-bar">
        <input type="month" class="form-control" id="bh-month" style="width:160px" onchange="loadBagiHasil()" />
        <div class="select-wrapper">
          <select class="form-control" id="bh-status" onchange="loadBagiHasil()" style="width:160px">
            <option value="">Semua Status</option>
            <option value="sudah_bayar">Sudah Bayar</option>
            <option value="belum_bayar">Belum Bayar</option>
            <option value="kurang_bayar">Kurang Bayar</option>
          </select>
        </div>
        <button class="btn btn-ghost" onclick="exportBagiHasil()">📊 Export</button>
        <button class="btn btn-outline" onclick="printBagiHasilReport()">🖨️ Print</button>
      </div>
    </div>

    <div id="bh-list">${skeletons(1,'200px')}</div>`;

  // Default current month
  const now = new Date();
  document.getElementById('bh-month').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  loadBagiHasil();
}

let allBH = [];
async function loadBagiHasil() {
  const month  = document.getElementById('bh-month')?.value||'';
  const status = document.getElementById('bh-status')?.value||'';
  try {
    const res = await API.getBagiHasil({month, status});
    allBH = res?.data || [];
  } catch (e) { apiErr(e, 'bh-list'); }
  renderBagiHasilTable(allBH);
}


function renderBagiHasilTable(data) {
  const el = document.getElementById('bh-list');
  const total = data.reduce((s,d)=>s+d.total,0);
  el.innerHTML = `
    <div class="table-wrapper card">
      <table>
        <thead><tr><th>Pangkalan</th><th>Tarif/Tbg</th><th>Jumlah Tbg</th><th>Total BH</th><th>Status</th></tr></thead>
        <tbody>
          ${data.map(d=>`
          <tr>
            <td class="fw-600">${d.pangkalan}</td>
            <td>${Fmt.currency(d.tarif)}</td>
            <td>${Fmt.number(d.jumlah)}</td>
            <td class="fw-700 text-primary-c">${Fmt.currency(d.total)}</td>
            <td>${bhStatusBadge(d.status)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr style="background:var(--bg-input)">
          <td colspan="3" class="fw-700">Total</td>
          <td class="fw-800 text-primary-c">${Fmt.currency(total)}</td>
          <td></td>
        </tr></tfoot>
      </table>
    </div>`;
}

function bhStatusBadge(s) {
  const map = {sudah_bayar:['success','✅ Sudah Bayar'],belum_bayar:['danger','🔴 Belum Bayar'],kurang_bayar:['warning','⚠️ Kurang Bayar']};
  const [c,l] = map[s]||['gray',s];
  return `<span class="badge badge-${c}">${l}</span>`;
}

function exportBagiHasil() {
  Export.toCSV(allBH.map(d=>({Pangkalan:d.pangkalan,'Tarif/Tabung':d.tarif,'Jumlah Tabung':d.jumlah,'Total Bagi Hasil':d.total,Status:d.status})),'bagi-hasil.csv');
  Toast.success('Export Berhasil');
}

function printBagiHasilReport() {
  const month = document.getElementById('bh-month')?.value || DateUtil.today().slice(0,7);
  Report.printBagiHasil(allBH, month, 'Laporan Bagi Hasil Pangkalan');
}

/* ══════════════════════════════════════
   MONITORING TAGIHAN
══════════════════════════════════════ */
async function renderTagihan() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Monitoring Tagihan Bagi Hasil</div>
        <div class="page-sub">Status pembayaran bagi hasil semua pangkalan</div>
      </div>
    </div>
    <div class="grid-3 mb-6" id="tag-stats">${skeletons(3,'80px')}</div>
    <div id="tag-list">${skeletons(1,'200px')}</div>`;

  try {
    const res = await API.getBagiHasil({});
    const data = res?.data || [];
    const sudah   = data.filter(d=>d.status==='sudah_bayar').length;
    const belum   = data.filter(d=>d.status==='belum_bayar').length;
    const kurang  = data.filter(d=>d.status==='kurang_bayar').length;
    document.getElementById('tag-stats').innerHTML = `
      ${statCard('✅', sudah,'Sudah Bayar','green')}
      ${statCard('🔴', belum,'Belum Bayar','red')}
      ${statCard('⚠️', kurang,'Kurang Bayar','yellow')}`;
    renderBagiHasilInEl(data, 'tag-list');
  } catch (e) {
    apiErr(e, 'tag-stats');
    apiErr(e, 'tag-list');
  }
}

function renderBagiHasilInEl(data, elId) {
  document.getElementById(elId).innerHTML = `
    <div class="table-wrapper card">
      <table>
        <thead><tr><th>Pangkalan</th><th>Tarif/Tbg</th><th>Jumlah</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>${data.map(d=>`<tr>
          <td class="fw-600">${d.pangkalan}</td>
          <td>${Fmt.currency(d.tarif)}</td>
          <td>${Fmt.number(d.jumlah)} tbg</td>
          <td class="fw-700">${Fmt.currency(d.total)}</td>
          <td>${bhStatusBadge(d.status)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

/* ══════════════════════════════════════
   MANAJEMEN PANGKALAN
══════════════════════════════════════ */
let allPangkalan = [];

async function renderPangkalan() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Manajemen Pangkalan</div>
        <div class="page-sub">CRUD data pangkalan distribusi LPG</div>
      </div>
      <div class="page-header-right">
        <button class="btn btn-primary" onclick="openTambahPangkalan()">+ Tambah Pangkalan</button>
      </div>
    </div>

    <div class="card mb-4">
      <div class="filter-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="search-pk" placeholder="Cari pangkalan..." oninput="filterPangkalan()" />
        </div>
        <div class="select-wrapper">
          <select class="form-control" id="filter-pk-status" onchange="filterPangkalan()" style="width:160px">
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
        </div>
      </div>
    </div>

    <div id="pk-list">${skeletons(1,'200px')}</div>

    <!-- Modal Pangkalan -->
    <div class="modal-overlay" id="modal-pangkalan" style="display:none">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h5 class="modal-title" id="modal-pk-title">Tambah Pangkalan</h5>
          <button class="modal-close" onclick="Modal.close('modal-pangkalan')">×</button>
        </div>
        <div class="modal-body">
          <form id="pk-form">
            <input type="hidden" name="id" id="pk-id" />
            <div class="grid-2 gap-4">
              <div class="form-group"><label class="form-label">Nama Pangkalan <span class="required">*</span></label>
                <input type="text" class="form-control" name="nama" placeholder="Nama pangkalan" required /></div>
              <div class="form-group"><label class="form-label">Nama Pemilik <span class="required">*</span></label>
                <input type="text" class="form-control" name="pemilik" placeholder="Nama pemilik" required /></div>
              <div class="form-group"><label class="form-label">Nomor Telepon</label>
                <input type="tel" class="form-control" name="telepon" placeholder="08xxxxxxxxxx" /></div>
              <div class="form-group"><label class="form-label">Tarif Bagi Hasil (Rp/tbg) <span class="required">*</span></label>
                <input type="number" class="form-control" name="tarif_bagi_hasil" placeholder="500" required min="0" /></div>
            </div>
            <div class="form-group"><label class="form-label">Alamat</label>
              <textarea class="form-control" name="alamat" rows="2" placeholder="Alamat lengkap"></textarea></div>
            <div class="form-group"><label class="form-label">Status</label>
              <div class="select-wrapper"><select class="form-control" name="status">
                <option value="aktif">✅ Aktif</option>
                <option value="nonaktif">⚫ Nonaktif</option>
              </select></div></div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="Modal.close('modal-pangkalan')">Batal</button>
          <button class="btn btn-primary" onclick="savePangkalan()">💾 Simpan</button>
        </div>
      </div>
    </div>`;

  loadPangkalanList();
}

async function loadPangkalanList() {
  try {
    const res = await API.getPangkalan();
    allPangkalan = res?.data || [];
  } catch (e) { apiErr(e, 'pk-list'); }
  filterPangkalan();
}


function filterPangkalan() {
  const s  = document.getElementById('search-pk')?.value?.toLowerCase()||'';
  const st = document.getElementById('filter-pk-status')?.value||'';
  let f = allPangkalan;
  if(s)  f = f.filter(d=>d.nama.toLowerCase().includes(s)||d.pemilik.toLowerCase().includes(s));
  if(st) f = f.filter(d=>d.status===st);
  renderPangkalanList(f);
}

function renderPangkalanList(data) {
  const el = document.getElementById('pk-list');
  if(!data?.length){el.innerHTML=`<div class="empty-state"><div class="empty-icon">🏪</div><div class="empty-title">Tidak ada pangkalan</div></div>`;return;}
  el.innerHTML = `
    <div class="table-wrapper card">
      <table>
        <thead><tr><th>Nama</th><th>Pemilik</th><th>Telepon</th><th>Alamat</th><th>Tarif BH</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${data.map(d=>`
          <tr>
            <td class="fw-700">${d.nama}</td>
            <td>${d.pemilik}</td>
            <td style="font-family:var(--font-mono);font-size:12px">${d.telepon||'-'}</td>
            <td class="text-sm text-secondary truncate" style="max-width:160px">${d.alamat||'-'}</td>
            <td class="fw-600">${Fmt.currency(d.tarif_bagi_hasil)}/tbg</td>
            <td>${Fmt.statusBadge(d.status)}</td>
            <td>
              <div class="d-flex gap-1">
                <button class="btn btn-sm btn-ghost" onclick="openEditPangkalan('${d.id}')" title="Edit">✏️</button>
                <button class="btn btn-sm btn-ghost" onclick="togglePangkalan('${d.id}','${d.status}')" title="Toggle">
                  ${d.status==='aktif'?'⏸️':'▶️'}
                </button>
                <button class="btn btn-sm btn-ghost" onclick="deletePangkalan('${d.id}')" title="Hapus">🗑️</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function openTambahPangkalan() {
  document.getElementById('modal-pk-title').textContent = 'Tambah Pangkalan';
  Form.reset('pk-form');
  document.getElementById('pk-id').value = '';
  Modal.open('modal-pangkalan');
}

function openEditPangkalan(id) {
  const item = allPangkalan.find(d=>String(d.id)===String(id));
  if(!item) return;
  document.getElementById('modal-pk-title').textContent = 'Edit Pangkalan';
  Form.setValues('pk-form', item);
  Modal.open('modal-pangkalan');
}

async function savePangkalan() {
  const data = Form.getData('pk-form');
  if(!data.nama||!data.pemilik){Toast.warning('Form Tidak Lengkap');return;}
  Loading.show();
  try {
    const res = data.id ? await API.updatePangkalan(data.id, data) : await API.createPangkalan(data);
    if(res?.status==='ok') {
      Toast.success('Tersimpan','Data pangkalan berhasil disimpan.');
      Modal.close('modal-pangkalan');
      loadPangkalanList();
    }
  } catch { Toast.error('Gagal'); }
  finally { Loading.hide(); }
}

async function togglePangkalan(id, currentStatus) {
  const newStatus = currentStatus==='aktif'?'nonaktif':'aktif';
  const ok = await Alert.confirm(`${newStatus==='nonaktif'?'Nonaktifkan':'Aktifkan'} Pangkalan?`,'Status akan diubah.');
  if(!ok) return;
  Loading.show();
  try {
    await API.updatePangkalan(id, {status:newStatus});
    Toast.success('Berhasil',`Pangkalan di${newStatus==='nonaktif'?'nonaktifkan':'aktifkan'}.`);
    loadPangkalanList();
  } catch { Toast.error('Gagal'); }
  finally { Loading.hide(); }
}

async function deletePangkalan(id) {
  const ok = await Alert.confirm('Hapus Pangkalan?','Data tidak dapat dikembalikan.','danger');
  if(!ok) return;
  Loading.show();
  try {
    await API.deletePangkalan(id);
    Toast.success('Dihapus');
    loadPangkalanList();
  } catch { Toast.error('Gagal'); }
  finally { Loading.hide(); }
}

/* ══════════════════════════════════════
   MONITORING REFILL
══════════════════════════════════════ */
async function renderMonitoringRefill() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Monitoring Refill LPG</div>
        <div class="page-sub">Status refill tabung per pangkalan</div>
      </div>
    </div>
    <div class="grid-2 mb-6" id="refill-stats">${skeletons(2,'80px')}</div>
    <div id="refill-list">${skeletons(1,'200px')}</div>`;

  try {
    const res = await API.getRefill({});
    const data = res?.data || [];
    const sudah = data.filter(d=>d.sudah_refill).length;
    const belum = data.filter(d=>!d.sudah_refill).length;
    document.getElementById('refill-stats').innerHTML = `
      ${statCard('✅', sudah,'Sudah Refill','green')}
      ${statCard('🔄', belum,'Belum Refill','yellow')}`;
    renderRefillList(data);
  } catch (e) {
    apiErr(e, 'refill-stats');
    apiErr(e, 'refill-list');
  }
}


function renderRefillList(data) {
  document.getElementById('refill-list').innerHTML = `
    <div class="table-wrapper card">
      <table>
        <thead><tr><th>Pangkalan</th><th>Status Refill</th><th>Tanggal Refill</th><th>Jumlah</th></tr></thead>
        <tbody>${data.map(d=>`<tr>
          <td class="fw-600">${d.pangkalan}</td>
          <td>${d.sudah_refill?'<span class="badge badge-success">✅ Sudah</span>':'<span class="badge badge-warning">🔄 Belum</span>'}</td>
          <td>${d.tanggal_refill?Fmt.date(d.tanggal_refill):'-'}</td>
          <td>${d.jumlah?Fmt.number(d.jumlah)+' tbg':'-'}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

/* ══════════════════════════════════════
   MONITORING LPG 3KG
══════════════════════════════════════ */
async function renderMonitoringLPG() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Monitoring LPG 3KG</div>
        <div class="page-sub">Status pembayaran LPG 3KG per pangkalan</div>
      </div>
    </div>
    <div class="grid-2 mb-6" id="lpg-stats">${skeletons(2,'80px')}</div>
    <div id="lpg-list">${skeletons(1,'200px')}</div>`;

  try {
    const res = await API.getPayments({type:'lpg3kg'});
    const data = res?.data || [];
    const sudah = data.filter(d=>d.status==='lunas').length;
    const belum = data.filter(d=>d.status!=='lunas').length;
    document.getElementById('lpg-stats').innerHTML = `
      ${statCard('✅', sudah,'Sudah Bayar','green')}
      ${statCard('🔴', belum,'Belum Bayar','red')}`;
    renderLPGList(data);
  } catch (e) {
    apiErr(e, 'lpg-stats');
    apiErr(e, 'lpg-list');
  }
}


function renderLPGList(data) {
  document.getElementById('lpg-list').innerHTML = `
    <div class="table-wrapper card">
      <table>
        <thead><tr><th>Pangkalan</th><th>Jumlah</th><th>Nominal</th><th>Status Bayar</th></tr></thead>
        <tbody>${data.map(d=>`<tr>
          <td class="fw-600">${d.pangkalan}</td>
          <td>${Fmt.number(d.jumlah)} tbg</td>
          <td class="fw-700">${Fmt.currency(d.nominal)}</td>
          <td>${Fmt.statusBadge(d.status)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

/* ══════════════════════════════════════
   PEMBELIAN TABUNG
══════════════════════════════════════ */
async function renderPembelianTabung() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Input Pembelian Tabung</div>
        <div class="page-sub">Catat pembelian tabung dari SPBE</div>
      </div>
    </div>

    <div class="grid-2 gap-4">
      <div class="card">
        <div class="card-header"><div class="card-title"><span class="icon">🛒</span> Form Pembelian</div></div>
        <div class="card-body">
          <form id="beli-form">
            <div class="form-group"><label class="form-label">SPBE <span class="required">*</span></label>
              <div class="select-wrapper"><select class="form-control" name="spbe_id" id="beli-sel-spbe" required></select></div></div>
            <div class="form-group"><label class="form-label">Jumlah Tabung <span class="required">*</span></label>
              <input type="number" class="form-control" name="jumlah" min="1" required placeholder="0" /></div>
            <div class="form-group"><label class="form-label">Harga Total (Rp) <span class="required">*</span></label>
              <input type="number" class="form-control" name="harga" min="0" required placeholder="0" /></div>
            <div class="form-group"><label class="form-label">Tanggal <span class="required">*</span></label>
              <input type="date" class="form-control" name="tanggal" value="${DateUtil.today()}" required /></div>
            <div class="form-group"><label class="form-label">Catatan</label>
              <textarea class="form-control" name="catatan" rows="2"></textarea></div>
            <button type="submit" class="btn btn-primary w-full">💾 Simpan</button>
          </form>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title"><span class="icon">📋</span> Riwayat Pembelian</div></div>
        <div class="card-body" style="padding:0">
          <div id="beli-list">${skeletons(1,'150px')}</div>
        </div>
      </div>
    </div>`;

  loadSPBEDropdown('beli-sel-spbe');
  loadBeliRiwayat();

  document.getElementById('beli-form').addEventListener('submit', async(e)=>{
    e.preventDefault();
    Loading.show();
    try {
      await API.createPurchase(Form.getData('beli-form'));
      Toast.success('Tersimpan','Pembelian berhasil dicatat.');
      Form.reset('beli-form');
      document.querySelector('[name=tanggal]').value = DateUtil.today();
      loadBeliRiwayat();
    } catch { Toast.error('Gagal'); }
    finally { Loading.hide(); }
  });
}

async function loadBeliRiwayat() {
  try {
    const res = await API.getPurchases({});
    const data = res?.data || [];
    const el = document.getElementById('beli-list');
    el.innerHTML = `
      <table>
        <thead><tr><th>SPBE</th><th>Jumlah</th><th>Harga</th><th>Tanggal</th></tr></thead>
        <tbody>${data.map(d=>`<tr>
          <td class="fw-600 text-sm">${d.spbe}</td>
          <td>${Fmt.number(d.jumlah)}</td>
          <td class="fw-700 text-sm">${Fmt.currency(d.harga)}</td>
          <td class="text-sm text-muted">${Fmt.date(d.tanggal)}</td>
        </tr>`).join('')}</tbody>
      </table>`;
  } catch (e) { apiErr(e, 'beli-list'); }
}


/* ══════════════════════════════════════
   ABSENSI ADMIN (same as driver)
══════════════════════════════════════ */
async function renderAbsensi() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Absensi Admin</div>
        <div class="page-sub">Absensi masuk & pulang dengan GPS dan kamera</div>
      </div>
    </div>

    <div class="alert alert-info mb-4">
      <span class="alert-icon">ℹ️</span>
      <div class="alert-body">Fitur absensi admin identik dengan driver — GPS realtime, foto selfie dari kamera, dan watermark otomatis.</div>
    </div>

    <div class="card">
      <div class="card-body text-center" style="padding:40px">
        <div style="font-size:64px;margin-bottom:16px">📍</div>
        <div class="fw-700 text-xl mb-2">Absensi Admin</div>
        <div class="text-secondary mb-4">Gunakan halaman absensi yang sama seperti driver</div>
        <a href="pages/driver.html" class="btn btn-primary">Buka Halaman Absensi</a>
      </div>
    </div>`;
}

/* ── Shared Helpers ── */
function statCard(icon, value, label, color) {
  return `<div class="stat-card"><div class="stat-icon ${color}">${icon}</div>
    <div class="stat-body"><div class="stat-label">${label}</div>
    <div class="stat-value">${Fmt.number(value)}</div></div></div>`;
}

function skeletons(count, h='90px') {
  return Array(count).fill(0).map(()=>`<div class="skeleton" style="height:${h};border-radius:12px"></div>`).join('');
}

function viewPhoto(src) {
  Modal.create({id:'modal-photo',title:'Foto Bukti',body:`<img src="${src}" style="width:100%;border-radius:8px"/>`});
  Modal.open('modal-photo');
}

async function doLogout() {
  const ok = await Alert.confirm('Keluar?','Anda akan keluar dari sistem.');
  if(!ok) return;
  await API.logout();
  window.location.href = 'index.html';
}

async function markAllRead() {
  await API.markNotifRead([]);
  Notif.updateBadge(0);
}

/* ── Init ── */
Sidebar.init();
Notif.init();
Page.go('dashboard');
</script>

/* ── Production error handler (no demo fallback) ── */
function apiErr(e, containerIdOrEl) {
  const el = typeof containerIdOrEl === 'string'
    ? document.getElementById(containerIdOrEl)
    : containerIdOrEl;
  if (!el) { Toast.error('Gagal', e?.message || 'Koneksi ke server gagal.'); return; }
  el.innerHTML = `
    <div class="empty-state" style="padding:32px">
      <div style="font-size:40px;margin-bottom:12px">⚠️</div>
      <div class="fw-700" style="color:var(--danger);margin-bottom:6px">Gagal Memuat Data</div>
      <div class="text-secondary text-sm" style="margin-bottom:16px">${e?.message || 'Tidak dapat terhubung ke server. Periksa koneksi dan coba lagi.'}</div>
      <button class="btn btn-outline btn-sm" onclick="location.reload()">🔄 Coba Lagi</button>
    </div>`;
}

if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
