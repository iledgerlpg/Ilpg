/**
 * Ilpg/i-lpg Profile & Settings Module
 * Shared across Driver, Admin, HRD — opened as modal
 */

'use strict';

const Profile = {

  open() {
    const user = Auth.getUser();
    if (!user) return;

    Modal.create({
      id: 'modal-profile',
      title: '👤 Profil & Pengaturan',
      size: 'modal-lg',
      body: `
        <div class="tabs mb-4" id="profile-tabs">
          <button class="tab active" onclick="Profile.switchTab('info', this)">Info Akun</button>
          <button class="tab" onclick="Profile.switchTab('password', this)">Ubah Password</button>
          <button class="tab" onclick="Profile.switchTab('preferensi', this)">Preferensi</button>
        </div>

        <!-- Info Tab -->
        <div class="tab-content active" id="tab-info">
          <div class="d-flex gap-4 mb-4" style="align-items:center">
            <div class="user-avatar" style="width:64px;height:64px;font-size:24px">${(user.name||'?')[0].toUpperCase()}</div>
            <div>
              <div class="fw-800 text-xl">${user.name}</div>
              <div class="text-secondary">${roleLabel(user.role)}</div>
            </div>
          </div>
          <div class="grid-2 gap-3">
            <div class="card" style="padding:14px">
              <div class="text-sm text-secondary">Username</div>
              <div class="fw-600">${user.username || user.id || '-'}</div>
            </div>
            <div class="card" style="padding:14px">
              <div class="text-sm text-secondary">Email</div>
              <div class="fw-600">${user.email || '-'}</div>
            </div>
            <div class="card" style="padding:14px">
              <div class="text-sm text-secondary">Perusahaan</div>
              <div class="fw-600">${user.company || '-'}</div>
            </div>
            <div class="card" style="padding:14px">
              <div class="text-sm text-secondary">Role</div>
              <div class="fw-600">${roleLabel(user.role)}</div>
            </div>
          </div>
          <div class="alert alert-info mt-4">
            <span class="alert-icon">ℹ️</span>
            <div class="alert-body">Untuk mengubah data akun (nama, email, telepon), hubungi HRD perusahaan Anda.</div>
          </div>
        </div>

        <!-- Password Tab -->
        <div class="tab-content" id="tab-password">
          <form id="change-pass-form">
            <div class="form-group">
              <label class="form-label">Password Saat Ini <span class="required">*</span></label>
              <input type="password" class="form-control" name="old_password" required placeholder="Masukkan password saat ini" />
            </div>
            <div class="form-group">
              <label class="form-label">Password Baru <span class="required">*</span></label>
              <input type="password" class="form-control" name="new_password" required minlength="6" placeholder="Minimal 6 karakter" />
            </div>
            <div class="form-group">
              <label class="form-label">Konfirmasi Password Baru <span class="required">*</span></label>
              <input type="password" class="form-control" name="confirm_password" required placeholder="Ulangi password baru" />
              <div class="form-error error-confirm_password"></div>
            </div>
            <button type="submit" class="btn btn-primary w-full">🔐 Ubah Password</button>
          </form>
        </div>

        <!-- Preferensi Tab -->
        <div class="tab-content" id="tab-preferensi">
          <div class="form-group">
            <label class="form-label">Tema Tampilan</label>
            <div class="d-flex gap-3">
              <button class="btn btn-outline flex-1" onclick="Theme.apply('light'); Toast.success('Tema Diubah','Mode terang aktif.')">☀️ Terang</button>
              <button class="btn btn-outline flex-1" onclick="Theme.apply('dark'); Toast.success('Tema Diubah','Mode gelap aktif.')">🌙 Gelap</button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Notifikasi</label>
            <label class="form-check mb-2">
              <input type="checkbox" id="pref-notif-jadwal" checked />
              <span class="text-sm">Notifikasi jadwal baru</span>
            </label>
            <label class="form-check mb-2">
              <input type="checkbox" id="pref-notif-laporan" checked />
              <span class="text-sm">Notifikasi laporan masuk</span>
            </label>
            <label class="form-check">
              <input type="checkbox" id="pref-notif-approval" checked />
              <span class="text-sm">Notifikasi approval</span>
            </label>
          </div>
          <button class="btn btn-primary" onclick="Profile.savePreferences()">💾 Simpan Preferensi</button>
        </div>
      `,
      footer: `<button class="btn btn-ghost" onclick="Modal.close('modal-profile')">Tutup</button>`
    });

    Modal.open('modal-profile');
    this.loadPreferences();

    document.getElementById('change-pass-form')?.addEventListener('submit', this.handleChangePassword);
  },

  switchTab(name, btn) {
    document.querySelectorAll('#profile-tabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${name}`)?.classList.add('active');
  },

  async handleChangePassword(e) {
    e.preventDefault();
    const data = Form.getData('change-pass-form');

    if (data.new_password !== data.confirm_password) {
      const errEl = document.querySelector('.error-confirm_password');
      if (errEl) errEl.textContent = 'Konfirmasi password tidak cocok';
      return;
    }
    if (data.new_password.length < 6) {
      Toast.warning('Password Terlalu Pendek', 'Minimal 6 karakter.');
      return;
    }

    Loading.show('Mengubah password...');
    try {
      const res = await API.call('change_password', {
        old_password: data.old_password,
        new_password: data.new_password,
      });
      if (res?.status === 'ok') {
        Toast.success('Berhasil!', 'Password Anda telah diubah.');
        Modal.close('modal-profile');
      } else {
        Toast.error('Gagal', res?.message || 'Password lama salah.');
      }
    } catch {
      Toast.error('Koneksi Error', 'Tidak dapat menghubungi server.');
    } finally {
      Loading.hide();
    }
  },

  loadPreferences() {
    try {
      const prefs = JSON.parse(localStorage.getItem('ilpg_prefs') || '{}');
      if (document.getElementById('pref-notif-jadwal'))
        document.getElementById('pref-notif-jadwal').checked = prefs.notif_jadwal !== false;
      if (document.getElementById('pref-notif-laporan'))
        document.getElementById('pref-notif-laporan').checked = prefs.notif_laporan !== false;
      if (document.getElementById('pref-notif-approval'))
        document.getElementById('pref-notif-approval').checked = prefs.notif_approval !== false;
    } catch {}
  },

  savePreferences() {
    const prefs = {
      notif_jadwal:   document.getElementById('pref-notif-jadwal')?.checked,
      notif_laporan:  document.getElementById('pref-notif-laporan')?.checked,
      notif_approval: document.getElementById('pref-notif-approval')?.checked,
    };
    localStorage.setItem('ilpg_prefs', JSON.stringify(prefs));
    Toast.success('Tersimpan', 'Preferensi notifikasi diperbarui.');
  },
};

function roleLabel(role) {
  const map = { driver: '🚚 Driver', admin: '🛡️ Admin', hrd: '👔 HRD' };
  return map[role] || role;
}
