
  // ── Theme init before render to prevent flash
  (function() {
    const t = localStorage.getItem('ilpg_theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
  })();

  // ── Redirect if already logged in
  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    redirectByRole(user.role);
  }

  function redirectByRole(role) {
    const map = {
      driver: 'pages/driver.html',
      admin:  'pages/admin.html',
      hrd:    'pages/hrd.html',
    };
    window.location.href = '' + (map[role] || 'pages/driver.html');
  }

  // ── Load company list from API (no demo fallback — shows real companies only)
  async function loadCompanies() {
    const sel     = document.getElementById('company-code');
    const loadOpt = document.createElement('option');
    loadOpt.value = '';
    loadOpt.textContent = '⏳ Memuat daftar perusahaan...';
    sel.appendChild(loadOpt);

    try {
      const res  = await API.call('get_companies', {});
      // Remove loading option
      sel.removeChild(loadOpt);

      if (res?.status === 'ok' && res.data?.length) {
        res.data.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.code;
          opt.textContent = c.name;
          opt.dataset.name = c.name;
          sel.appendChild(opt);
        });
      } else {
        const errOpt = document.createElement('option');
        errOpt.value = '';
        errOpt.textContent = '— Belum ada perusahaan terdaftar —';
        sel.appendChild(errOpt);
      }
    } catch (e) {
      sel.removeChild(loadOpt);
      const errOpt = document.createElement('option');
      errOpt.value = '';
      errOpt.textContent = '⚠️ Gagal memuat — cek koneksi';
      sel.appendChild(errOpt);
      console.error('loadCompanies error:', e);
    }
  }

  // Company selection display
  document.getElementById('company-code').addEventListener('change', function() {
    const opt = this.options[this.selectedIndex];
    const info = document.getElementById('company-info');
    if (this.value && opt.dataset.name) {
      document.getElementById('company-display-name').textContent = opt.dataset.name;
      document.getElementById('company-display-code').textContent = `Kode: ${this.value}`;
      info.style.display = 'flex';
    } else {
      info.style.display = 'none';
    }
  });

  // Password toggle
  document.getElementById('toggle-password').addEventListener('click', function() {
    const input = document.getElementById('password');
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    this.textContent = isText ? '👁️' : '🙈';
  });

  // ── Login form submit
  document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';

    const btnText    = document.getElementById('login-btn-text');
    const btnSpinner = document.getElementById('login-btn-spinner');
    btnText.style.display    = 'none';
    btnSpinner.style.display = 'inline';
    document.getElementById('login-btn').disabled = true;

    const username    = document.getElementById('username').value.trim();
    const password    = document.getElementById('password').value;
    const companyCode = document.getElementById('company-code').value;

    if (!companyCode) {
      showError('Pilih perusahaan terlebih dahulu.');
      resetBtn(); return;
    }

    try {
      const res = await API.login(username, password, companyCode);

      if (res?.status === 'ok') {
        Auth.setSession(res.token, res.user);

        // Remember me
        if (document.getElementById('remember-me').checked) {
          localStorage.setItem('ilpg_last_user', username);
          localStorage.setItem('ilpg_last_company', companyCode);
        }

        Toast.success('Login berhasil!', `Selamat datang, ${res.user.name}`);
        setTimeout(() => redirectByRole(res.user.role), 800);
      } else {
        showError(res?.message || 'Username atau password salah.');
        resetBtn();
      }
    } catch (err) {
      showError('Koneksi gagal. Periksa jaringan Anda.');
      resetBtn();
    }
  });

  function showError(msg) {
    const el = document.getElementById('login-error');
    el.textContent = '⚠️ ' + msg;
    el.style.display = 'block';
  }

  function resetBtn() {
    document.getElementById('login-btn-text').style.display = 'inline';
    document.getElementById('login-btn-spinner').style.display = 'none';
    document.getElementById('login-btn').disabled = false;
  }

  async function showForgotPassword() {
    const { value: username } = await Swal.fire({
      title: 'Reset Password',
      text: 'Masukkan username Anda. HRD akan mereset password Anda.',
      input: 'text',
      inputPlaceholder: 'Username',
      showCancelButton: true,
      confirmButtonText: 'Kirim Request',
      cancelButtonText: 'Batal',
      confirmButtonColor: 'var(--primary)',
    });
    if (username) {
      Toast.info('Request dikirim', 'HRD akan menghubungi Anda untuk reset password.');
    }
  }

  // Restore last user
  const lastUser = localStorage.getItem('ilpg_last_user');
  const lastCo   = localStorage.getItem('ilpg_last_company');
  if (lastUser) document.getElementById('username').value = lastUser;
  if (lastCo) {
    const sel = document.getElementById('company-code');
    sel.value = lastCo;
    sel.dispatchEvent(new Event('change'));
  }

  loadCompanies();

  // PWA install prompt
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
  });


<!-- PWA Service Worker -->

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(() => console.log('SW registered'))
        .catch(e => console.warn('SW error:', e));
    });
  }
