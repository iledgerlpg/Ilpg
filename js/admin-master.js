/* =============================================
   admin-master.js
   Manajemen Pangkalan & SPBE
   ============================================= */

/* ── PANGKALAN ── */
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

    <div id="pk-list">${skeletons(1, '200px')}</div>

    <!-- Modal Pangkalan -->
    <div class="modal-overlay" id="modal-pangkalan" style="display:none">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h5 class="modal-title" id="modal-pk-title">Tambah Pangkalan</h5>
          <button class="modal-close" onclick="Modal.close('modal-pangkalan')">x</button>
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
  } catch (e) { apiErr(e, 'pk-list'); return; }
  filterPangkalan();
}

function filterPangkalan() {
  const s  = document.getElementById('search-pk')?.value?.toLowerCase() || '';
  const st = document.getElementById('filter-pk-status')?.value || '';
  let f = allPangkalan;
  if (s)  f = f.filter(d => d.nama.toLowerCase().includes(s) || d.pemilik.toLowerCase().includes(s));
  if (st) f = f.filter(d => d.status === st);
  renderPangkalanList(f);
}

function renderPangkalanList(data) {
  const el = document.getElementById('pk-list');
  if (!data?.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🏪</div><div class="empty-title">Tidak ada pangkalan</div></div>`;
    return;
  }
  el.innerHTML = `
    <div class="table-wrapper card">
      <table>
        <thead><tr><th>Nama</th><th>Pemilik</th><th>Telepon</th><th>Alamat</th><th>Tarif BH</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${data.map(d => `
          <tr>
            <td class="fw-700">${d.nama}</td>
            <td>${d.pemilik}</td>
            <td style="font-family:var(--font-mono);font-size:12px">${d.telepon || '-'}</td>
            <td class="text-sm text-secondary truncate" style="max-width:160px">${d.alamat || '-'}</td>
            <td class="fw-600">${Fmt.currency(d.tarif_bagi_hasil)}/tbg</td>
            <td>${Fmt.statusBadge(d.status)}</td>
            <td>
              <div class="d-flex gap-1">
                <button class="btn btn-sm btn-ghost" onclick="openEditPangkalan('${d.id}')" title="Edit">✏️</button>
                <button class="btn btn-sm btn-ghost" onclick="togglePangkalan('${d.id}','${d.status}')" title="Toggle">
                  ${d.status === 'aktif' ? '⏸️' : '▶️'}
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
  const item = allPangkalan.find(d => String(d.id) === String(id));
  if (!item) return;
  document.getElementById('modal-pk-title').textContent = 'Edit Pangkalan';
  Form.setValues('pk-form', item);
  Modal.open('modal-pangkalan');
}

async function savePangkalan() {
  const data = Form.getData('pk-form');
  if (!data.nama || !data.pemilik) { Toast.warning('Form Tidak Lengkap'); return; }
  Loading.show();
  try {
    const res = data.id
      ? await API.updatePangkalan(data.id, data)
      : await API.createPangkalan(data);
    if (res?.status === 'ok') {
      Toast.success('Tersimpan', 'Data pangkalan berhasil disimpan.');
      Modal.close('modal-pangkalan');
      loadPangkalanList();
    }
  } catch { Toast.error('Gagal'); }
  finally { Loading.hide(); }
}

async function togglePangkalan(id, currentStatus) {
  const newStatus = currentStatus === 'aktif' ? 'nonaktif' : 'aktif';
  const ok = await Alert.confirm(
    `${newStatus === 'nonaktif' ? 'Nonaktifkan' : 'Aktifkan'} Pangkalan?`,
    'Status akan diubah.'
  );
  if (!ok) return;
  Loading.show();
  try {
    await API.updatePangkalan(id, { status: newStatus });
    Toast.success('Berhasil', `Pangkalan di${newStatus === 'nonaktif' ? 'nonaktifkan' : 'aktifkan'}.`);
    loadPangkalanList();
  } catch { Toast.error('Gagal'); }
  finally { Loading.hide(); }
}

async function deletePangkalan(id) {
  const ok = await Alert.confirm('Hapus Pangkalan?', 'Data tidak dapat dikembalikan.', 'danger');
  if (!ok) return;
  Loading.show();
  try {
    await API.deletePangkalan(id);
    Toast.success('Dihapus');
    loadPangkalanList();
  } catch { Toast.error('Gagal'); }
  finally { Loading.hide(); }
}

/* ── SPBE ── */
let allSPBE = [];

async function renderSPBE() {
  const c = document.getElementById('page-content');
  c.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-h">Manajemen SPBE</div>
        <div class="page-sub">Data Stasiun Pengisian Bahan Bakar Elpiji</div>
      </div>
      <div class="page-header-right">
        <button class="btn btn-primary" onclick="openTambahSPBE()">+ Tambah SPBE</button>
      </div>
    </div>

    <div class="card mb-4">
      <div class="filter-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="search-spbe" placeholder="Cari nama SPBE..." oninput="filterSPBE()" />
        </div>
        <div class="select-wrapper">
          <select class="form-control" id="filter-spbe-status" onchange="filterSPBE()" style="width:160px">
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
        </div>
      </div>
    </div>

    <div id="spbe-list">${skeletons(1, '200px')}</div>

    <!-- Modal SPBE -->
    <div class="modal-overlay" id="modal-spbe" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h5 class="modal-title" id="modal-spbe-title">Tambah SPBE</h5>
          <button class="modal-close" onclick="Modal.close('modal-spbe')">x</button>
        </div>
        <div class="modal-body">
          <form id="spbe-form">
            <input type="hidden" name="id" id="spbe-id" />
            <div class="form-group">
              <label class="form-label">Nama SPBE <span class="required">*</span></label>
              <input type="text" class="form-control" name="nama" placeholder="Contoh: SPBE Cibiru Bandung" required />
            </div>
            <div class="form-group">
              <label class="form-label">Alamat</label>
              <textarea class="form-control" name="alamat" rows="2" placeholder="Alamat lengkap SPBE"></textarea>
            </div>
            <div class="grid-2 gap-3">
              <div class="form-group">
                <label class="form-label">Nomor Telepon</label>
                <input type="tel" class="form-control" name="telepon" placeholder="022-xxxxxxx" />
              </div>
              <div class="form-group">
                <label class="form-label">Kapasitas (tabung/hari)</label>
                <input type="number" class="form-control" name="kapasitas" placeholder="0" min="0" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Nama PIC / Penanggung Jawab</label>
              <input type="text" class="form-control" name="pic" placeholder="Nama penanggung jawab" />
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <div class="select-wrapper">
                <select class="form-control" name="status">
                  <option value="aktif">✅ Aktif</option>
                  <option value="nonaktif">⚫ Nonaktif</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Catatan</label>
              <textarea class="form-control" name="catatan" rows="2" placeholder="Keterangan tambahan..."></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="Modal.close('modal-spbe')">Batal</button>
          <button class="btn btn-primary" onclick="saveSPBE()">💾 Simpan</button>
        </div>
      </div>
    </div>`;

  loadSPBEList();
}

async function loadSPBEList() {
  try {
    const res = await API.getSPBE();
    allSPBE = res?.data || [];
    filterSPBE();
  } catch (e) { apiErr(e, 'spbe-list'); }
}

function filterSPBE() {
  const s  = document.getElementById('search-spbe')?.value?.toLowerCase() || '';
  const st = document.getElementById('filter-spbe-status')?.value || '';
  let f = allSPBE;
  if (s)  f = f.filter(d => d.nama?.toLowerCase().includes(s) || d.alamat?.toLowerCase().includes(s));
  if (st) f = f.filter(d => d.status === st);
  renderSPBEList(f);
}

function renderSPBEList(data) {
  const el = document.getElementById('spbe-list');
  if (!data?.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏭</div>
        <div class="empty-title">Belum ada data SPBE</div>
        <div class="empty-sub">Tambahkan SPBE yang mensuplai tabung LPG ke perusahaan Anda.</div>
        <button class="btn btn-primary mt-4" onclick="openTambahSPBE()">+ Tambah SPBE Pertama</button>
      </div>`;
    return;
  }
  el.innerHTML = `
    <div class="table-wrapper card">
      <table>
        <thead><tr>
          <th>Nama SPBE</th><th>Alamat</th><th>Telepon</th>
          <th>PIC</th><th>Kapasitas</th><th>Status</th><th>Aksi</th>
        </tr></thead>
        <tbody>${data.map(d => `
          <tr>
            <td class="fw-700">${d.nama || '-'}</td>
            <td class="text-sm text-secondary" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.alamat || '-'}</td>
            <td style="font-family:var(--font-mono);font-size:12px">${d.telepon || '-'}</td>
            <td>${d.pic || '-'}</td>
            <td>${d.kapasitas ? Fmt.number(d.kapasitas) + ' tbg/hr' : '-'}</td>
            <td>${Fmt.statusBadge(d.status || 'aktif')}</td>
            <td>
              <div class="d-flex gap-1">
                <button class="btn btn-sm btn-ghost" onclick="openEditSPBE('${d.id}')" title="Edit">✏️</button>
                <button class="btn btn-sm btn-ghost" onclick="toggleSPBE('${d.id}','${d.status || 'aktif'}')"
                  title="${d.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}">
                  ${d.status === 'aktif' ? '⏸️' : '▶️'}
                </button>
                <button class="btn btn-sm btn-ghost" onclick="deleteSPBE('${d.id}')" title="Hapus">🗑️</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="mt-3 text-sm text-secondary" style="padding:0 4px">
      Total: <strong>${data.length}</strong> SPBE &nbsp;·&nbsp;
      Aktif: <strong>${data.filter(d => d.status !== 'nonaktif').length}</strong>
    </div>`;
}

function openTambahSPBE() {
  document.getElementById('modal-spbe-title').textContent = 'Tambah SPBE Baru';
  Form.reset('spbe-form');
  document.getElementById('spbe-id').value = '';
  Modal.open('modal-spbe');
}

function openEditSPBE(id) {
  const item = allSPBE.find(d => String(d.id) === String(id));
  if (!item) return;
  document.getElementById('modal-spbe-title').textContent = 'Edit SPBE';
  Form.setValues('spbe-form', item);
  Modal.open('modal-spbe');
}

async function saveSPBE() {
  const data = Form.getData('spbe-form');
  if (!data.nama?.trim()) { Toast.warning('Nama SPBE wajib diisi'); return; }
  Loading.show('Menyimpan data SPBE...');
  try {
    const res = data.id
      ? await API.call('update_spbe', { id: data.id, ...data })
      : await API.call('create_spbe', data);
    if (res?.status === 'ok') {
      Toast.success('Tersimpan', `SPBE "${data.nama}" berhasil disimpan.`);
      Modal.close('modal-spbe');
      loadSPBEList();
    } else { Toast.error('Gagal', res?.message || 'Terjadi kesalahan.'); }
  } catch (e) { Toast.error('Gagal', e?.message || 'Koneksi bermasalah.'); }
  finally { Loading.hide(); }
}

async function toggleSPBE(id, currentStatus) {
  const newStatus = currentStatus === 'aktif' ? 'nonaktif' : 'aktif';
  const ok = await Alert.confirm(
    `${newStatus === 'nonaktif' ? 'Nonaktifkan' : 'Aktifkan'} SPBE?`,
    'Status SPBE akan diubah.'
  );
  if (!ok) return;
  Loading.show();
  try {
    const res = await API.call('update_spbe', { id, status: newStatus });
    if (res?.status === 'ok') {
      Toast.success('Berhasil', `SPBE di${newStatus === 'nonaktif' ? 'nonaktifkan' : 'aktifkan'}.`);
      loadSPBEList();
    }
  } catch (e) { Toast.error('Gagal', e?.message); }
  finally { Loading.hide(); }
}

async function deleteSPBE(id) {
  const item = allSPBE.find(d => String(d.id) === String(id));
  const ok = await Alert.confirm(
    'Hapus SPBE?',
    `"${item?.nama || id}" akan dihapus permanen. Jadwal yang sudah ada tidak terpengaruh.`,
    { type: 'danger', confirmText: 'Ya, Hapus' }
  );
  if (!ok) return;
  Loading.show();
  try {
    const res = await API.call('delete_spbe', { id });
    if (res?.status === 'ok') {
      Toast.success('Dihapus', 'Data SPBE berhasil dihapus.');
      loadSPBEList();
    }
  } catch (e) { Toast.error('Gagal', e?.message); }
  finally { Loading.hide(); }
}
