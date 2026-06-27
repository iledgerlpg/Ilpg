/* =============================================
   admin-keuangan.js
   Pembayaran Pangkalan, Bagi Hasil, Tagihan
   ============================================= */

/* ── PEMBAYARAN ── */
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

    <div class="grid-3 mb-6" id="pay-stats">${skeletons(3, '80px')}</div>

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

    <div id="pay-list">${skeletons(1, '200px')}</div>

    <!-- Modal Input Pembayaran -->
    <div class="modal-overlay" id="modal-pembayaran" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h5 class="modal-title">Input Pembayaran</h5>
          <button class="modal-close" onclick="Modal.close('modal-pembayaran')">x</button>
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
  const status = document.getElementById('filter-pay-status')?.value || '';
  const month  = document.getElementById('filter-pay-month')?.value || '';
  try {
    const res = await API.getPayments({ status, month });
    const data = res?.data || [];
    renderPayStats(data);
    renderPayList(data);
  } catch (e) {
    apiErr(e, 'pay-stats');
    apiErr(e, 'pay-list');
  }
}

function renderPayStats(data) {
  const lunas   = data.filter(d => d.status === 'lunas').length;
  const belum   = data.filter(d => d.status === 'belum_lunas').length;
  const cicilan = data.filter(d => d.status === 'cicilan').length;
  document.getElementById('pay-stats').innerHTML = `
    ${statCard('✅', lunas,   'Lunas',       'green')}
    ${statCard('🔴', belum,   'Belum Lunas', 'red')}
    ${statCard('🟡', cicilan, 'Cicilan',     'yellow')}`;
}

function renderPayList(data) {
  const el = document.getElementById('pay-list');
  if (!data?.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">💳</div><div class="empty-title">Tidak ada data</div></div>`;
    return;
  }
  el.innerHTML = `
    <div class="table-wrapper card">
      <table>
        <thead><tr><th>Pangkalan</th><th>Nominal</th><th>Tanggal</th><th>Status</th><th>Catatan</th><th>Aksi</th></tr></thead>
        <tbody>${data.map(d => `
          <tr>
            <td class="fw-600">${d.pangkalan}</td>
            <td class="fw-700 text-primary-c">${Fmt.currency(d.nominal)}</td>
            <td>${Fmt.date(d.tanggal)}</td>
            <td>${Fmt.statusBadge(d.status)}</td>
            <td class="text-muted text-sm">${d.catatan || '-'}</td>
            <td><button class="btn btn-sm btn-ghost" onclick="editPembayaran('${d.id}')">✏️</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function submitPembayaran() {
  const data = Form.getData('pay-form');
  if (!data.pangkalan_id || !data.nominal) { Toast.warning('Lengkapi form'); return; }
  Loading.show();
  try {
    await API.createPayment(data);
    Toast.success('Tersimpan', 'Pembayaran berhasil dicatat.');
    Modal.close('modal-pembayaran');
    loadPembayaran();
  } catch { Toast.error('Gagal'); }
  finally { Loading.hide(); }
}

function editPembayaran(id) {
  Toast.info('Edit Pembayaran', 'Fitur edit pembayaran tersedia di backend.');
}

/* ── BAGI HASIL ── */
let allBH = [];

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
      <div class="alert-body">Bagi hasil = Tarif per tabung x Jumlah tabung terkirim. Tarif dikonfigurasi di data pangkalan.</div>
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

    <div id="bh-list">${skeletons(1, '200px')}</div>`;

  const now = new Date();
  document.getElementById('bh-month').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  loadBagiHasil();
}

async function loadBagiHasil() {
  const month  = document.getElementById('bh-month')?.value || '';
  const status = document.getElementById('bh-status')?.value || '';
  try {
    const res = await API.getBagiHasil({ month, status });
    allBH = res?.data || [];
  } catch (e) { apiErr(e, 'bh-list'); return; }
  renderBagiHasilTable(allBH);
}

function renderBagiHasilTable(data) {
  const el    = document.getElementById('bh-list');
  const total = data.reduce((s, d) => s + d.total, 0);
  el.innerHTML = `
    <div class="table-wrapper card">
      <table>
        <thead><tr><th>Pangkalan</th><th>Tarif/Tbg</th><th>Jumlah Tbg</th><th>Total BH</th><th>Status</th></tr></thead>
        <tbody>${data.map(d => `
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

function exportBagiHasil() {
  Export.toCSV(allBH.map(d => ({
    Pangkalan: d.pangkalan, 'Tarif/Tabung': d.tarif,
    'Jumlah Tabung': d.jumlah, 'Total Bagi Hasil': d.total, Status: d.status,
  })), 'bagi-hasil.csv');
  Toast.success('Export Berhasil');
}

function printBagiHasilReport() {
  const month = document.getElementById('bh-month')?.value || DateUtil.today().slice(0, 7);
  Report.printBagiHasil(allBH, month, 'Laporan Bagi Hasil Pangkalan');
}

/* ── MONITORING TAGIHAN ── */
async function renderTagihan() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Monitoring Tagihan Bagi Hasil</div>
        <div class="page-sub">Status pembayaran bagi hasil semua pangkalan</div>
      </div>
    </div>
    <div class="grid-3 mb-6" id="tag-stats">${skeletons(3, '80px')}</div>
    <div id="tag-list">${skeletons(1, '200px')}</div>`;

  try {
    const res  = await API.getBagiHasil({});
    const data = res?.data || [];
    const sudah  = data.filter(d => d.status === 'sudah_bayar').length;
    const belum  = data.filter(d => d.status === 'belum_bayar').length;
    const kurang = data.filter(d => d.status === 'kurang_bayar').length;
    document.getElementById('tag-stats').innerHTML = `
      ${statCard('✅', sudah,  'Sudah Bayar',  'green')}
      ${statCard('🔴', belum,  'Belum Bayar',  'red')}
      ${statCard('⚠️', kurang, 'Kurang Bayar', 'yellow')}`;
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
        <tbody>${data.map(d => `<tr>
          <td class="fw-600">${d.pangkalan}</td>
          <td>${Fmt.currency(d.tarif)}</td>
          <td>${Fmt.number(d.jumlah)} tbg</td>
          <td class="fw-700">${Fmt.currency(d.total)}</td>
          <td>${bhStatusBadge(d.status)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}
