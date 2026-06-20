/**
 * Ilpg/i-lpg Charts & Analytics Module
 * Advanced visualizations for all dashboards
 */

'use strict';

const Charts = {

  /* ── Color Palette ── */
  colors: {
    primary:   '#E85D04',
    accent:    '#F48C06',
    success:   '#2DC653',
    warning:   '#FFB703',
    danger:    '#E63946',
    info:      '#4361EE',
    muted:     '#9999AA',
    gradient:  ['#E85D04','#F48C06','#FFB703','#2DC653','#4361EE','#E63946'],
  },

  /* ── Get theme-aware color ── */
  bg(alpha = 0.1) {
    return `rgba(232, 93, 4, ${alpha})`;
  },

  isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  },

  textColor() {
    return this.isDark() ? '#F0F0F5' : '#0D0D0D';
  },

  gridColor() {
    return this.isDark() ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  },

  /* ── Default Chart Options ── */
  defaultOptions(extra = {}) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeInOutQuart' },
      plugins: {
        legend: {
          labels: { color: this.textColor(), font: { family: 'Inter', size: 12 } }
        },
        tooltip: {
          backgroundColor: this.isDark() ? '#1A1A24' : '#FFFFFF',
          titleColor: this.textColor(),
          bodyColor: this.isDark() ? '#9090A8' : '#6B6B80',
          borderColor: this.isDark() ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          titleFont: { family: 'Inter', weight: '700' },
          bodyFont: { family: 'Inter' },
        },
      },
      scales: {
        x: {
          grid: { color: this.gridColor() },
          ticks: { color: this.textColor(), font: { family: 'Inter', size: 11 } },
        },
        y: {
          grid: { color: this.gridColor() },
          ticks: { color: this.textColor(), font: { family: 'Inter', size: 11 } },
          beginAtZero: true,
        },
      },
      ...extra,
    };
  },

  /* ── Destroy existing chart on canvas ── */
  destroy(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();
  },

  /* ══════════════════════════════════════
     LINE CHART — Distribusi Harian
  ══════════════════════════════════════ */
  renderDistribusiLine(canvasId, labels, data) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    return new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Tabung Terkirim',
          data,
          borderColor: this.colors.primary,
          backgroundColor: this.bg(0.12),
          fill: true,
          tension: 0.45,
          pointBackgroundColor: this.colors.primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        }]
      },
      options: this.defaultOptions({
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${Fmt.number(ctx.raw)} tabung`,
            }
          }
        }
      })
    });
  },

  /* ══════════════════════════════════════
     BAR CHART — Perbandingan Driver
  ══════════════════════════════════════ */
  renderDriverBar(canvasId, labels, datasets) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({
          ...ds,
          backgroundColor: this.colors.gradient[i % this.colors.gradient.length] + 'CC',
          borderRadius: 6,
          borderSkipped: false,
        }))
      },
      options: this.defaultOptions({
        plugins: { legend: { position: 'top' } },
        scales: {
          x: { grid: { display: false }, ticks: { color: this.textColor() } },
          y: { beginAtZero: true, ticks: { color: this.textColor() } },
        }
      })
    });
  },

  /* ══════════════════════════════════════
     DOUGHNUT — Status Pangkalan
  ══════════════════════════════════════ */
  renderDoughnut(canvasId, labels, data, colors) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const bg = colors || [this.colors.success, this.colors.danger, this.colors.warning];

    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: bg,
          borderWidth: 0,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        animation: { duration: 600 },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: this.textColor(),
              font: { family: 'Inter', size: 12 },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 10,
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.raw}`,
            }
          }
        }
      }
    });
  },

  /* ══════════════════════════════════════
     STACKED BAR — Absensi per Hari
  ══════════════════════════════════════ */
  renderAbsensiStack(canvasId, labels, hadir, absen, izin) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Hadir',
            data: hadir,
            backgroundColor: this.colors.success + 'CC',
            borderRadius: { topLeft: 4, topRight: 4 },
            borderSkipped: false,
          },
          {
            label: 'Izin',
            data: izin,
            backgroundColor: this.colors.info + 'CC',
            borderSkipped: false,
          },
          {
            label: 'Absen',
            data: absen,
            backgroundColor: this.colors.danger + 'CC',
            borderRadius: { topLeft: 4, topRight: 4 },
            borderSkipped: false,
          },
        ]
      },
      options: this.defaultOptions({
        plugins: { legend: { position: 'top' } },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: this.textColor() } },
          y: { stacked: true, beginAtZero: true, ticks: { color: this.textColor() } },
        }
      })
    });
  },

  /* ══════════════════════════════════════
     HORIZONTAL BAR — Top Pangkalan
  ══════════════════════════════════════ */
  renderHorizontalBar(canvasId, labels, data, label = 'Tabung') {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label,
          data,
          backgroundColor: labels.map((_, i) =>
            `hsla(${20 + i * 15}, 85%, 55%, 0.75)`),
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        ...this.defaultOptions(),
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => ` ${Fmt.number(ctx.raw)} tabung` }
          }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: this.gridColor() }, ticks: { color: this.textColor() } },
          y: { grid: { display: false }, ticks: { color: this.textColor() } },
        }
      }
    });
  },

  /* ══════════════════════════════════════
     AREA CHART — Revenue / Tagihan
  ══════════════════════════════════════ */
  renderRevenueArea(canvasId, labels, data) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    return new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Total Tagihan',
          data,
          borderColor: this.colors.success,
          backgroundColor: `rgba(45,198,83,0.12)`,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: this.colors.success,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
        }]
      },
      options: this.defaultOptions({
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${Fmt.currency(ctx.raw)}`,
            }
          }
        }
      })
    });
  },

  /* ══════════════════════════════════════
     MINI SPARKLINE (no axes, no legend)
  ══════════════════════════════════════ */
  renderSparkline(canvasId, data, color = '#E85D04') {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    return new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i),
        datasets: [{
          data,
          borderColor: color,
          backgroundColor: `${color}20`,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
      }
    });
  },

  /* ══════════════════════════════════════
     GAUGE CHART — Produktivitas
  ══════════════════════════════════════ */
  renderGauge(canvasId, value, max = 100, label = '') {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const pct    = Math.min(value / max, 1);
    const color  = pct >= 0.8 ? this.colors.success
                 : pct >= 0.6 ? this.colors.warning
                 : this.colors.danger;

    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [value, max - value],
          backgroundColor: [color, this.isDark() ? '#2A2A3A' : '#F0F0F3'],
          borderWidth: 0,
          circumference: 180,
          rotation: 270,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
      },
      plugins: [{
        id: 'gauge-text',
        afterDraw(chart) {
          const { ctx, chartArea: { top, bottom, left, right } } = chart;
          const cx = (left + right) / 2;
          const cy = bottom - (bottom - top) * 0.08;
          ctx.save();
          ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#F0F0F5' : '#0D0D0D';
          ctx.font = 'bold 20px Inter';
          ctx.textAlign = 'center';
          ctx.fillText(`${value}%`, cx, cy);
          if (label) {
            ctx.font = '11px Inter';
            ctx.fillStyle = '#9999AA';
            ctx.fillText(label, cx, cy + 18);
          }
          ctx.restore();
        }
      }]
    });
  },
};

/* ══════════════════════════════════════
   REPORT GENERATOR
══════════════════════════════════════ */
const Report = {

  /* ── Print-friendly HTML Report ── */
  printDeliveries(data, title = 'Laporan Pengiriman LPG') {
    const rows = data.map(d => `
      <tr>
        <td>${Fmt.deliveryNo(d.id)}</td>
        <td>${d.driver_name}</td>
        <td>${d.spbe}</td>
        <td>${Fmt.number(d.jumlah)} tbg</td>
        <td>${d.pangkalan}</td>
        <td>${Fmt.date(d.tanggal)}</td>
        <td>${d.status}</td>
      </tr>`).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8"/>
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
          .header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; border-bottom: 2px solid #E85D04; padding-bottom: 16px; }
          .logo { width: 48px; height: 48px; background: #E85D04; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 14px; }
          .brand h1 { font-size: 20px; color: #E85D04; }
          .brand p { font-size: 11px; color: #888; }
          .report-title { font-size: 15px; font-weight: 700; margin: 16px 0 8px; }
          .meta { font-size: 11px; color: #666; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #E85D04; color: white; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 7px 10px; border-bottom: 1px solid #eee; }
          tr:nth-child(even) td { background: #f9f9f9; }
          .footer { margin-top: 24px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
          .summary { display: flex; gap: 16px; margin-bottom: 16px; }
          .summary-card { background: #f5f5f5; border-radius: 6px; padding: 10px 14px; flex: 1; }
          .summary-card .val { font-size: 20px; font-weight: 900; color: #E85D04; }
          .summary-card .lbl { font-size: 10px; color: #888; text-transform: uppercase; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">⛽</div>
          <div class="brand">
            <h1>Ilpg/i-lpg</h1>
            <p>Sistem Manajemen Distribusi LPG Enterprise</p>
          </div>
        </div>

        <div class="report-title">${title}</div>
        <div class="meta">Dicetak: ${Fmt.datetime(new Date().toISOString())} &nbsp;|&nbsp; Total: ${data.length} data</div>

        <div class="summary">
          <div class="summary-card">
            <div class="val">${data.length}</div>
            <div class="lbl">Total Pengiriman</div>
          </div>
          <div class="summary-card">
            <div class="val">${data.filter(d=>d.status==='selesai').length}</div>
            <div class="lbl">Selesai</div>
          </div>
          <div class="summary-card">
            <div class="val">${Fmt.number(data.reduce((s,d)=>s+(Number(d.jumlah_kirim)||Number(d.jumlah)||0),0))}</div>
            <div class="lbl">Total Tabung</div>
          </div>
          <div class="summary-card">
            <div class="val">${data.filter(d=>d.status==='pending').length}</div>
            <div class="lbl">Pending</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>No. Kirim</th><th>Driver</th><th>SPBE</th>
              <th>Jumlah</th><th>Pangkalan</th><th>Tanggal</th><th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="footer">
          Ilpg/i-lpg v1.0 &nbsp;|&nbsp; Dicetak otomatis oleh sistem &nbsp;|&nbsp; © ${new Date().getFullYear()}
        </div>
      </body>
      </html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  },

  printAbsensi(data, title = 'Laporan Absensi') {
    const rows = data.map(d => `
      <tr>
        <td>${d.name}</td>
        <td>${d.role}</td>
        <td>${d.date}</td>
        <td>${d.checkin_time ? Fmt.time(d.checkin_time) : '-'}</td>
        <td>${d.checkout_time ? Fmt.time(d.checkout_time) : '-'}</td>
        <td>${d.checkin_lat ? `${d.checkin_lat}, ${d.checkin_lng}` : '-'}</td>
        <td>${d.status}</td>
      </tr>`).join('');

    const html = `
      <!DOCTYPE html><html lang="id"><head>
      <meta charset="UTF-8"/><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
        .header { border-bottom: 2px solid #E85D04; padding-bottom: 12px; margin-bottom: 16px; }
        h1 { color: #E85D04; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #E85D04; color: white; padding: 8px; text-align: left; font-size: 11px; }
        td { padding: 7px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
        tr:nth-child(even) td { background: #f9f9f9; }
      </style></head>
      <body>
        <div class="header"><h1>⛽ Ilpg/i-lpg — ${title}</h1>
        <p style="color:#888;font-size:11px">Dicetak: ${Fmt.datetime(new Date().toISOString())}</p></div>
        <table>
          <thead><tr><th>Nama</th><th>Role</th><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Koordinat</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body></html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  },

  printBagiHasil(data, month, title = 'Laporan Bagi Hasil') {
    const total = data.reduce((s, d) => s + d.total, 0);
    const rows = data.map(d => `
      <tr>
        <td>${d.pangkalan}</td>
        <td style="text-align:right">${Fmt.currency(d.tarif)}</td>
        <td style="text-align:right">${Fmt.number(d.jumlah)}</td>
        <td style="text-align:right;font-weight:700">${Fmt.currency(d.total)}</td>
        <td>${d.status}</td>
      </tr>`).join('');

    const html = `
      <!DOCTYPE html><html lang="id"><head>
      <meta charset="UTF-8"/><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
        .header { border-bottom: 2px solid #E85D04; padding-bottom: 12px; margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center; }
        h1 { color: #E85D04; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #E85D04; color: white; padding: 8px; font-size: 11px; }
        td { padding: 7px 8px; border-bottom: 1px solid #eee; }
        tfoot td { font-weight: 700; background: #FFF3E0; border-top: 2px solid #E85D04; }
        tr:nth-child(even) td { background: #f9f9f9; }
      </style></head>
      <body>
        <div class="header">
          <div><h1>⛽ Ilpg/i-lpg — ${title}</h1>
          <p style="color:#888;font-size:11px">Periode: ${month} &nbsp;|&nbsp; Dicetak: ${Fmt.datetime(new Date().toISOString())}</p></div>
          <div style="text-align:right"><div style="font-size:22px;font-weight:900;color:#E85D04">${Fmt.currency(total)}</div>
          <div style="font-size:11px;color:#888">Total Bagi Hasil</div></div>
        </div>
        <table>
          <thead><tr><th>Pangkalan</th><th>Tarif/Tbg</th><th>Jumlah Tbg</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan="3">TOTAL</td><td style="text-align:right">${Fmt.currency(total)}</td><td></td></tr></tfoot>
        </table>
      </body></html>`;

    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  },
};

/* ══════════════════════════════════════
   REALTIME POLLING MANAGER
══════════════════════════════════════ */
const Polling = {
  timers: {},

  start(key, fn, intervalMs = 30000) {
    this.stop(key);
    fn(); // Run immediately
    this.timers[key] = setInterval(fn, intervalMs);
  },

  stop(key) {
    if (this.timers[key]) {
      clearInterval(this.timers[key]);
      delete this.timers[key];
    }
  },

  stopAll() {
    Object.keys(this.timers).forEach(k => this.stop(k));
  },
};

/* ══════════════════════════════════════
   SEARCH & FILTER UTILITIES
══════════════════════════════════════ */
const Search = {
  /* Debounce utility */
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /* Fuzzy match */
  match(str, query) {
    if (!query) return true;
    return str.toLowerCase().includes(query.toLowerCase());
  },

  /* Multi-field search */
  filter(data, query, fields) {
    if (!query) return data;
    return data.filter(row =>
      fields.some(f => this.match(String(row[f] || ''), query))
    );
  },

  /* Setup live search on input */
  attach(inputId, callback, delay = 300) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.addEventListener('input', this.debounce(() => callback(el.value), delay));
  },
};

/* ══════════════════════════════════════
   VALIDATION HELPERS
══════════════════════════════════════ */
const Validate = {
  required(val)     { return val !== null && val !== undefined && String(val).trim() !== ''; },
  minLength(val, n) { return String(val).trim().length >= n; },
  maxLength(val, n) { return String(val).trim().length <= n; },
  isNumber(val)     { return !isNaN(parseFloat(val)) && isFinite(val); },
  isPositive(val)   { return Number(val) > 0; },
  isPhone(val)      { return /^[\d\s\+\-\(\)]{8,15}$/.test(val); },
  isEmail(val)      { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val); },
  isDate(val)       { return /^\d{4}-\d{2}-\d{2}$/.test(val) && !isNaN(new Date(val)); },

  /* Validate a form schema */
  form(data, rules) {
    const errors = {};
    Object.entries(rules).forEach(([field, rule]) => {
      const val = data[field];
      if (rule.required && !this.required(val)) {
        errors[field] = rule.label ? `${rule.label} wajib diisi` : 'Wajib diisi';
      } else if (val && rule.min && Number(val) < rule.min) {
        errors[field] = `Minimal ${rule.min}`;
      } else if (val && rule.max && Number(val) > rule.max) {
        errors[field] = `Maksimal ${rule.max}`;
      } else if (val && rule.minLen && !this.minLength(val, rule.minLen)) {
        errors[field] = `Minimal ${rule.minLen} karakter`;
      } else if (val && rule.type === 'email' && !this.isEmail(val)) {
        errors[field] = 'Format email tidak valid';
      } else if (val && rule.type === 'phone' && !this.isPhone(val)) {
        errors[field] = 'Format nomor telepon tidak valid';
      }
    });
    return { valid: Object.keys(errors).length === 0, errors };
  },

  /* Show/hide form errors */
  showErrors(formId, errors) {
    const form = document.getElementById(formId);
    if (!form) return;
    // Clear all errors first
    form.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    form.querySelectorAll('.form-control').forEach(el => el.style.borderColor = '');
    // Show new errors
    Object.entries(errors).forEach(([field, msg]) => {
      const input  = form.querySelector(`[name="${field}"]`);
      const errEl  = form.querySelector(`.error-${field}`);
      if (input)  input.style.borderColor  = 'var(--danger)';
      if (errEl)  errEl.textContent = msg;
    });
  },

  clearErrors(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    form.querySelectorAll('.form-control').forEach(el => el.style.borderColor = '');
  },
};

/* ══════════════════════════════════════
   LOCAL STORAGE CACHE
══════════════════════════════════════ */
const Cache = {
  TTL: 5 * 60 * 1000, // 5 minutes

  set(key, data) {
    try {
      localStorage.setItem(`ilpg_cache_${key}`, JSON.stringify({
        data, ts: Date.now()
      }));
    } catch {}
  },

  get(key) {
    try {
      const raw = localStorage.getItem(`ilpg_cache_${key}`);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > this.TTL) { this.del(key); return null; }
      return data;
    } catch { return null; }
  },

  del(key) {
    localStorage.removeItem(`ilpg_cache_${key}`);
  },

  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith('ilpg_cache_'))
      .forEach(k => localStorage.removeItem(k));
  },
};

/* ══════════════════════════════════════
   FILE UPLOAD UTILITIES
══════════════════════════════════════ */
const FileUtil = {
  /* Convert file to base64 */
  toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /* Validate image file */
  isValidImage(file, maxSizeMB = 5) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      Toast.error('Format Tidak Valid', 'Hanya JPG, PNG, dan WebP yang diizinkan.');
      return false;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      Toast.error('File Terlalu Besar', `Maksimal ${maxSizeMB}MB.`);
      return false;
    }
    return true;
  },

  /* Compress image via canvas */
  async compress(file, maxWidth = 1280, quality = 0.8) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale  = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width  = img.width  * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = URL.createObjectURL(file);
    });
  },
};

/* ══════════════════════════════════════
   KEYBOARD SHORTCUT MANAGER
══════════════════════════════════════ */
const Shortcuts = {
  bindings: {},

  register(combo, fn, description = '') {
    this.bindings[combo] = { fn, description };
  },

  init() {
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const key = [
        e.ctrlKey  ? 'Ctrl'  : '',
        e.altKey   ? 'Alt'   : '',
        e.shiftKey ? 'Shift' : '',
        e.key,
      ].filter(Boolean).join('+');

      const binding = this.bindings[key];
      if (binding) {
        e.preventDefault();
        binding.fn();
      }
    });
  },
};

/* ══════════════════════════════════════
   OFFLINE INDICATOR
══════════════════════════════════════ */
const OfflineIndicator = {
  el: null,

  init() {
    this.el = document.createElement('div');
    this.el.id = 'offline-banner';
    this.el.innerHTML = '⚠️ Tidak ada koneksi internet — Mode Offline';
    Object.assign(this.el.style, {
      position: 'fixed', top: '0', left: '0', right: '0',
      background: '#E63946', color: 'white', textAlign: 'center',
      padding: '8px', fontSize: '13px', fontWeight: '600',
      zIndex: '99999', display: 'none', fontFamily: 'Inter, sans-serif',
    });
    document.body.appendChild(this.el);

    window.addEventListener('offline', () => this.show());
    window.addEventListener('online',  () => this.hide());
    if (!navigator.onLine) this.show();
  },

  show() {
    this.el.style.display = 'block';
    Toast.warning('Offline', 'Koneksi internet terputus. Beberapa fitur mungkin tidak tersedia.');
  },

  hide() {
    this.el.style.display = 'none';
    Toast.success('Online', 'Koneksi internet pulih.');
  },
};

/* ══════════════════════════════════════
   PWA INSTALL BANNER
══════════════════════════════════════ */
const PWAInstall = {
  prompt: null,

  init() {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this.prompt = e;
      this.showBanner();
    });
  },

  showBanner() {
    // Only show once per session
    if (sessionStorage.getItem('ilpg_pwa_dismissed')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-banner';
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;
        background:var(--bg-card);border-top:1px solid var(--border);
        position:fixed;bottom:0;left:0;right:0;z-index:9000;box-shadow:0 -4px 20px rgba(0,0,0,0.15)">
        <span style="font-size:28px">📲</span>
        <div style="flex:1">
          <div style="font-weight:700;font-size:14px;color:var(--text-primary)">Install Ilpg/i-lpg</div>
          <div style="font-size:12px;color:var(--text-secondary)">Tambahkan ke layar utama untuk akses lebih cepat</div>
        </div>
        <button onclick="PWAInstall.install()" style="background:var(--primary);color:white;border:none;
          padding:8px 16px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;font-family:Inter,sans-serif">
          Install
        </button>
        <button onclick="PWAInstall.dismiss()" style="background:var(--bg-input);border:none;
          width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:18px;color:var(--text-muted)">
          ×
        </button>
      </div>`;
    document.body.appendChild(banner);
  },

  async install() {
    if (!this.prompt) return;
    this.prompt.prompt();
    const { outcome } = await this.prompt.userChoice;
    if (outcome === 'accepted') Toast.success('Terinstall!', 'Ilpg/i-lpg berhasil ditambahkan ke layar utama.');
    this.dismiss();
  },

  dismiss() {
    document.getElementById('pwa-banner')?.remove();
    sessionStorage.setItem('ilpg_pwa_dismissed', '1');
  },
};

/* ══════════════════════════════════════
   NUMBER INPUT FORMATTER
══════════════════════════════════════ */
function formatRupiah(input) {
  input.addEventListener('input', function() {
    let val = this.value.replace(/\D/g, '');
    this.value = val ? Number(val).toLocaleString('id-ID') : '';
  });
  input.addEventListener('blur', function() {
    // Store raw number in data attr for form submission
    this.dataset.raw = this.value.replace(/\./g, '').replace(/,/g, '');
  });
}

/* ══════════════════════════════════════
   INIT ALL MODULES
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  OfflineIndicator.init();
  PWAInstall.init();
  Shortcuts.init();

  // Register common shortcuts
  Shortcuts.register('Ctrl+/', () => {
    document.querySelector('.search-box input')?.focus();
  }, 'Focus search');
});
