/* =============================================
   admin-dashboard.js
   ============================================= */

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

    <div class="grid-4 mb-6" id="stat-cards">${skeletons(4, '90px')}</div>

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
        <div class="card-body" id="pending-list">${skeletons(1, '80px')}</div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">🧾</span> Tagihan Berjalan</div>
          <button class="btn btn-sm btn-outline" onclick="Page.go('tagihan')">Lihat Semua</button>
        </div>
        <div class="card-body" id="tagihan-list">${skeletons(1, '80px')}</div>
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
    ${statCard('📦', d.total_today || 0, 'Pengiriman Hari Ini', 'orange')}
    ${statCard('✅', d.selesai || 0, 'Selesai', 'green')}
    ${statCard('⏳', d.pending || 0, 'Pending', 'yellow')}
    ${statCard('🏪', d.total_pangkalan || 0, 'Total Pangkalan', 'blue')}`;
}

function renderPendingMini(items) {
  const el = document.getElementById('pending-list');
  if (!items.length) {
    el.innerHTML = `<div class="empty-state" style="padding:16px"><div class="empty-icon">✅</div><div class="empty-title">Semua terkirim</div></div>`;
    return;
  }
  el.innerHTML = items.slice(0, 4).map(d => `
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
  if (!items.length) {
    el.innerHTML = `<div class="empty-state" style="padding:16px"><div class="empty-icon">✅</div><div class="empty-title">Semua lunas</div></div>`;
    return;
  }
  el.innerHTML = items.slice(0, 4).map(t => `
    <div class="d-flex gap-3 mb-3" style="align-items:center">
      <div class="flex-1">
        <div class="fw-600">${t.pangkalan}</div>
        <div class="text-sm text-secondary">${Fmt.currency(t.nominal)}</div>
      </div>
      ${Fmt.statusBadge(t.status)}
    </div>`).join('');
}

function renderCharts(d) {
  const labels = d.chart_labels || ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const vals   = d.chart_data  || [45, 60, 55, 80, 70, 95, 88];
  Charts.renderDistribusiLine('chart-distribusi', labels, vals);

  const pkData = d.pangkalan_status || [14, 6, 4];
  Charts.renderDoughnut('chart-pangkalan', ['Sudah Bayar', 'Belum Bayar', 'Cicilan'], pkData);
}
