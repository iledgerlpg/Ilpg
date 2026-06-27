/* =============================================
   admin-router.js
   Router halaman admin + inisialisasi
   ============================================= */

(function () {
  const t = localStorage.getItem('ilpg_theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
})();

Auth.requireAuth();
Auth.requireRole('admin');

const user = Auth.getUser();
document.getElementById('user-name').textContent   = user?.name || 'Admin';
document.getElementById('user-avatar').textContent = (user?.name || 'A')[0].toUpperCase();

/* ── Page Router ── */
const Page = {
  go(name, params = {}) {
    document.querySelectorAll('.nav-item').forEach(el =>
      el.classList.toggle('active', el.dataset.page === name)
    );

    const titles = {
      dashboard:           'Dashboard',
      absensi:             'Absensi Saya',
      'upload-jadwal':     'Upload Jadwal',
      'riwayat-jadwal':    'Riwayat Jadwal',
      'monitoring-kirim':  'Monitoring Pengiriman',
      'laporan-driver':    'Laporan Driver',
      pembayaran:          'Pembayaran Pangkalan',
      'bagi-hasil':        'Bagi Hasil',
      tagihan:             'Monitoring Tagihan',
      pangkalan:           'Manajemen Pangkalan',
      spbe:                'Manajemen SPBE',
      'monitoring-refill': 'Monitoring Refill',
      'monitoring-lpg':    'Monitoring LPG 3KG',
      'pembelian-tabung':  'Pembelian Tabung',
    };
    document.getElementById('page-title').textContent = titles[name] || name;

    const fns = {
      dashboard:           renderDashboard,
      absensi:             renderAbsensi,
      'upload-jadwal':     renderUploadJadwal,
      'riwayat-jadwal':    renderRiwayatJadwal,
      'monitoring-kirim':  renderMonitoringKirim,
      'laporan-driver':    renderLaporanDriver,
      pembayaran:          renderPembayaran,
      'bagi-hasil':        renderBagiHasil,
      tagihan:             renderTagihan,
      pangkalan:           renderPangkalan,
      spbe:                renderSPBE,
      'monitoring-refill': renderMonitoringRefill,
      'monitoring-lpg':    renderMonitoringLPG,
      'pembelian-tabung':  renderPembelianTabung,
    };

    const fn = fns[name];
    if (fn) fn(params);
    Sidebar.closeMobile();
  },
};

/* ── Init ── */
Sidebar.init();
Notif.init();
Page.go('dashboard');
