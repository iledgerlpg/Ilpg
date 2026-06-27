/* =============================================
   admin-operasional.js
   Monitoring Refill, LPG 3KG, Pembelian Tabung,
   Absensi Admin
   ============================================= */

/* ── MONITORING REFILL ── */
async function renderMonitoringRefill() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Monitoring Refill LPG</div>
        <div class="page-sub">Status refill tabung per pangkalan</div>
      </div>
    </div>
    <div class="grid-2 mb-6" id="refill-stats">${skeletons(2, '80px')}</div>
    <div id="refill-list">${skeletons(1, '200px')}</div>`;

  try {
    const res  = await API.getRefill({});
    const data = res?.data || [];
    const sudah = data.filter(d => d.sudah_refill).length;
    const belum = data.filter(d => !d.sudah_refill).length;
    document.getElementById('refill-stats').innerHTML = `
      ${statCard('✅', sudah, 'Sudah Refill', 'green')}
      ${statCard('🔄', belum, 'Belum Refill', 'yellow')}`;
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
        <tbody>${data.map(d => `<tr>
          <td class="fw-600">${d.pangkalan_name || d.pangkalan_id}</td>
          <td>${d.sudah_refill
            ? '<span class="badge badge-success">✅ Sudah</span>'
            : '<span class="badge badge-warning">🔄 Belum</span>'}</td>
          <td>${d.tanggal_refill ? Fmt.date(d.tanggal_refill) : '-'}</td>
          <td>${d.jumlah ? Fmt.number(d.jumlah) + ' tbg' : '-'}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

/* ── MONITORING LPG 3KG ── */
async function renderMonitoringLPG() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Monitoring LPG 3KG</div>
        <div class="page-sub">Status pembayaran LPG 3KG per pangkalan</div>
      </div>
    </div>
    <div class="grid-2 mb-6" id="lpg-stats">${skeletons(2, '80px')}</div>
    <div id="lpg-list">${skeletons(1, '200px')}</div>`;

  try {
    const res  = await API.getPayments({ type: 'lpg3kg' });
    const data = res?.data || [];
    const sudah = data.filter(d => d.status === 'lunas').length;
    const belum = data.filter(d => d.status !== 'lunas').length;
    document.getElementById('lpg-stats').innerHTML = `
      ${statCard('✅', sudah, 'Sudah Bayar', 'green')}
      ${statCard('🔴', belum, 'Belum Bayar', 'red')}`;
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
        <tbody>${data.map(d => `<tr>
          <td class="fw-600">${d.pangkalan}</td>
          <td>${Fmt.number(d.jumlah)} tbg</td>
          <td class="fw-700">${Fmt.currency(d.nominal)}</td>
          <td>${Fmt.statusBadge(d.status)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

/* ── PEMBELIAN TABUNG ── */
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
          <div id="beli-list">${skeletons(1, '150px')}</div>
        </div>
      </div>
    </div>`;

  loadSPBEDropdown('beli-sel-spbe');
  loadBeliRiwayat();

  document.getElementById('beli-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    Loading.show();
    try {
      await API.createPurchase(Form.getData('beli-form'));
      Toast.success('Tersimpan', 'Pembelian berhasil dicatat.');
      Form.reset('beli-form');
      document.querySelector('#beli-form [name=tanggal]').value = DateUtil.today();
      loadBeliRiwayat();
    } catch { Toast.error('Gagal'); }
    finally { Loading.hide(); }
  });
}

async function loadBeliRiwayat() {
  try {
    const res  = await API.getPurchases({});
    const data = res?.data || [];
    document.getElementById('beli-list').innerHTML = `
      <table>
        <thead><tr><th>SPBE</th><th>Jumlah</th><th>Harga</th><th>Tanggal</th></tr></thead>
        <tbody>${data.map(d => `<tr>
          <td class="fw-600 text-sm">${d.spbe}</td>
          <td>${Fmt.number(d.jumlah)}</td>
          <td class="fw-700 text-sm">${Fmt.currency(d.harga)}</td>
          <td class="text-sm text-muted">${Fmt.date(d.tanggal)}</td>
        </tr>`).join('')}</tbody>
      </table>`;
  } catch (e) { apiErr(e, 'beli-list'); }
}

/* ── ABSENSI ADMIN ── */
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
      <div class="alert-body">Fitur absensi admin identik dengan driver — GPS realtime, foto selfie, dan watermark otomatis.</div>
    </div>

    <div class="card">
      <div class="card-body text-center" style="padding:40px">
        <div style="font-size:64px;margin-bottom:16px">📍</div>
        <div class="fw-700 text-xl mb-2">Absensi Admin</div>
        <div class="text-secondary mb-4">Gunakan halaman absensi yang sama seperti driver</div>
        <a href="/pages/driver.html" class="btn btn-primary">Buka Halaman Absensi</a>
      </div>
    </div>`;
}
