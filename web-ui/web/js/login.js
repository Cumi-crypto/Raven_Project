// =============================================
// LEXIFY — Authentication Logic (login.js)
// =============================================

const AUTH_API = (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8091'
  : 'https://alright-washday-amicably.ngrok-free.dev';

// State for forgot password flow
let resetEmail = '';
let resetOtp = '';

// ===== NAVIGATION BETWEEN TABS =====
function showStep(stepId) {
  document.querySelectorAll('.auth-step').forEach(step => {
    step.classList.remove('active');
  });
  const targetStep = document.getElementById(stepId);
  if (targetStep) targetStep.classList.add('active');

  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  if (stepId === 'step-login') {
    document.getElementById('tab-login').classList.add('active');
  } else {
    document.getElementById('tab-register').classList.add('active');
  }
}

// ===== HANDLE LOGIN =====
function handleLogin() {
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    if (!username) usernameInput.classList.add('wrong');
    if (!password) passwordInput.classList.add('wrong');
    setTimeout(() => {
      usernameInput.classList.remove('wrong');
      passwordInput.classList.remove('wrong');
    }, 500);
    showToast('Masukkan username dan kata sandi', 'error');
    return;
  }

  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.textContent = 'Masuk... ⌛';

  fetch(`${AUTH_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      throw new Error(data.error);
    }
    
    // Save to SafeStorage via UserManager
    UserManager.setToken(data.token);
    UserManager.setUserId(data.userId);
    UserManager.set(data.username);
    
    // Update local cache of progress
    SafeStorage.setItem(STORAGE_KEYS.XP, data.xp || 0);
    SafeStorage.setItem(STORAGE_KEYS.STREAK, data.streak || 0);
    if (data.city) SafeStorage.setItem(STORAGE_KEYS.CITY, data.city);
    if (data.province) SafeStorage.setItem(STORAGE_KEYS.PROVINCE, data.province);
    if (data.country) SafeStorage.setItem(STORAGE_KEYS.COUNTRY, data.country);
    if (data.avatar) SafeStorage.setItem(STORAGE_KEYS.AVATAR, data.avatar);
    if (data.email) UserManager.setEmail(data.email);
    UserManager.setEmailVerified(data.email_verified || false);
    
    showToast(`Selamat datang kembali, ${data.username}! 👋`, 'success');
    LocalLedger.addBlock('login', `Masuk sebagai ${data.username}`);
    
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1200);
  })
  .catch(err => {
    const errorMsg = err.message || 'Failed to connect to server';
    showToast(errorMsg, 'error');
    
    if (errorMsg === 'User not found') {
      const usernameInput = document.getElementById('login-username');
      usernameInput.classList.add('wrong');
      setTimeout(() => usernameInput.classList.remove('wrong'), 500);
      
      // Move to register page after short delay
      setTimeout(() => {
        showStep('step-register');
        const regUser = document.getElementById('reg-username');
        if (regUser) {
            regUser.value = username;
            regUser.focus();
        }
      }, 800);
    } else if (errorMsg === 'Invalid password') {
      const passwordInput = document.getElementById('login-password');
      passwordInput.classList.add('wrong');
      setTimeout(() => passwordInput.classList.remove('wrong'), 500);
    }

    btn.disabled = false;
    btn.textContent = 'Masuk 🚀';
  });
}

// ===== HANDLE REGISTER =====
function handleRegister() {
  const usernameInput = document.getElementById('reg-username');
  const emailInput = document.getElementById('reg-email');
  const passwordInput = document.getElementById('reg-password');
  const cityInput = document.getElementById('reg-city');
  const provinceInput = document.getElementById('reg-province');
  const countryInput = document.getElementById('reg-country');
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  const email = emailInput.value.trim();
  const city = cityInput.value.trim();
  const province = provinceInput.value.trim();
  const country = countryInput.value.trim() || 'Indonesia';

  if (!username || username.length < 3) {
    usernameInput.classList.add('wrong');
    setTimeout(() => usernameInput.classList.remove('wrong'), 500);
    showToast('Username minimal 3 karakter', 'error');
    return;
  }
  if (!email || !email.includes('@')) {
    emailInput.classList.add('wrong');
    setTimeout(() => emailInput.classList.remove('wrong'), 500);
    showToast('Email wajib diisi dan valid', 'error');
    return;
  }
  if (!password || password.length < 4) {
    passwordInput.classList.add('wrong');
    setTimeout(() => passwordInput.classList.remove('wrong'), 500);
    showToast('Kata sandi minimal 4 karakter', 'error');
    return;
  }
  if (!city || !province) {
    if (!city) cityInput.classList.add('wrong');
    if (!province) provinceInput.classList.add('wrong');
    setTimeout(() => {
        cityInput.classList.remove('wrong');
        provinceInput.classList.remove('wrong');
    }, 500);
    showToast('Provinsi dan Kota wajib dipilih', 'error');
    return;
  }

  const btn = document.getElementById('btn-register');
  btn.disabled = true;
  btn.textContent = 'Mendaftar... ⌛';

  fetch(`${AUTH_API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email, city, province, country })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      throw new Error(data.error);
    }
    
    // Save to SafeStorage via UserManager
    UserManager.setToken(data.token);
    UserManager.setUserId(data.userId);
    UserManager.set(data.username);
    
    // Initialize stats for a new user
    SafeStorage.setItem(STORAGE_KEYS.XP, 0);
    SafeStorage.setItem(STORAGE_KEYS.STREAK, 0);
    if (city) SafeStorage.setItem(STORAGE_KEYS.CITY, city);
    if (province) SafeStorage.setItem(STORAGE_KEYS.PROVINCE, province);
    if (country) SafeStorage.setItem(STORAGE_KEYS.COUNTRY, country);
    UserManager.setEmail(data.email || email);
    UserManager.setEmailVerified(false);

    showToast('Pendaftaran berhasil! 🚀', 'success');
    LocalLedger.addBlock('registration', `Mendaftar sebagai ${username}`);

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1200);
  })
  .catch(err => {
    showToast(err.message || 'Gagal terhubung ke server', 'error');
    btn.disabled = false;
    btn.textContent = 'Daftar 🎉';
  });
}

// ===== HANDLE FORGOT PASSWORD FLOW =====
function handleForgotSendOTP() {
  const emailInput = document.getElementById('forgot-email');
  const email = emailInput.value.trim();
  if (!email) {
    showToast('Email wajib diisi', 'error');
    return;
  }
  
  const btn = document.getElementById('btn-forgot-send');
  btn.disabled = true;
  btn.textContent = 'Mengirim... ⌛';

  fetch(`${AUTH_API}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) throw new Error(data.error);
    resetEmail = email;
    showToast('OTP telah dikirim ke email', 'success');
    showStep('step-verify-otp');
  })
  .catch(err => showToast(err.message || 'Gagal terhubung ke server', 'error'))
  .finally(() => {
    btn.disabled = false;
    btn.textContent = 'Kirim OTP 📧';
  });
}

function handleVerifyOTP() {
  const otpInput = document.getElementById('verify-otp');
  const otp = otpInput.value.trim();
  if (!otp) {
    showToast('Kode OTP wajib diisi', 'error');
    return;
  }
  
  const btn = document.getElementById('btn-verify-otp');
  btn.disabled = true;
  btn.textContent = 'Verifikasi... ⌛';

  fetch(`${AUTH_API}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: resetEmail, otp })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) throw new Error(data.error);
    resetOtp = otp;
    showToast('OTP valid!', 'success');
    showStep('step-reset-password');
  })
  .catch(err => showToast(err.message || 'Gagal terhubung ke server', 'error'))
  .finally(() => {
    btn.disabled = false;
    btn.textContent = 'Verifikasi OTP ✅';
  });
}

function handleResetPassword() {
  const passwordInput = document.getElementById('reset-password');
  const newPassword = passwordInput.value.trim();
  if (!newPassword || newPassword.length < 4) {
    showToast('Password minimal 4 karakter', 'error');
    return;
  }
  
  const btn = document.getElementById('btn-reset-password');
  btn.disabled = true;
  btn.textContent = 'Menyimpan... ⌛';

  fetch(`${AUTH_API}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: resetEmail, otp: resetOtp, newPassword })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) throw new Error(data.error);
    showToast('Password berhasil diubah, silakan masuk', 'success');
    resetEmail = '';
    resetOtp = '';
    showStep('step-login');
  })
  .catch(err => showToast(err.message || 'Gagal terhubung ke server', 'error'))
  .finally(() => {
    btn.disabled = false;
    btn.textContent = 'Simpan Password 🔒';
  });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to home
  if (UserManager.hasUser()) {
    window.location.href = 'index.html';
    return;
  }

  // Tabs
  document.getElementById('tab-login')?.addEventListener('click', () => showStep('step-login'));
  document.getElementById('tab-register')?.addEventListener('click', () => showStep('step-register'));

  // Buttons
  document.getElementById('btn-login')?.addEventListener('click', handleLogin);
  document.getElementById('btn-register')?.addEventListener('click', handleRegister);
  document.getElementById('btn-forgot-send')?.addEventListener('click', handleForgotSendOTP);
  document.getElementById('btn-verify-otp')?.addEventListener('click', handleVerifyOTP);
  document.getElementById('btn-reset-password')?.addEventListener('click', handleResetPassword);

  // Enter triggers on inputs
  document.getElementById('login-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('reg-country')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleRegister();
  });

});
