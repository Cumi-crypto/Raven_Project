// =============================================
// LEXIFY — Shared Application Logic (app.js)
// =============================================

const API_BASE = (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8091'
  : 'https://alright-washday-amicably.ngrok-free.dev';

// Global fetch override to bypass ngrok warning screen
const originalFetch = window.fetch;
window.fetch = async function(resource, config) {
  config = config || {};
  config.headers = config.headers || {};
  config.headers['ngrok-skip-browser-warning'] = '69420';
  return originalFetch(resource, config);
};

// ===== CENTRALIZED STORAGE KEY CONSTANTS =====
// Using constants prevents typo bugs (e.g. 'xp' vs 'XP')
const STORAGE_KEYS = {
  XP:              'xp',
  STREAK:          'streak',
  LAST_PLAY:       'lastPlay',
  USERNAME:        'lexify_username',
  TOKEN:           'lexify_token',
  USER_ID:         'lexify_user_id',
  CITY:            'lexify_city',
  PROVINCE:        'lexify_province',
  COUNTRY:         'lexify_country',
  AVATAR:          'lexify_avatar',
  EMAIL:           'lexify_user_email',
  EMAIL_VERIFIED:  'lexify_email_verified',
  FAVORITES:       'favorites',
  SEARCH_HISTORY:  'search_history',
  SEARCHED_WORDS:  'searched_words',
  RECENT_ACTIVITY: 'recent_activity',
};

// ===== SAFE LOCALSTORAGE WRAPPER =====
const SafeStorage = {
  getItem(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  },
  setItem(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  },
  removeItem(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  },
  clear() {
    try { localStorage.clear(); } catch (e) {}
  }
};



// ===== USER MANAGER =====
const UserManager = {
  get()           { return SafeStorage.getItem(STORAGE_KEYS.USERNAME) || ''; },
  set(name)       { SafeStorage.setItem(STORAGE_KEYS.USERNAME, name); },
  getToken()      { return SafeStorage.getItem(STORAGE_KEYS.TOKEN) || ''; },
  setToken(token) { SafeStorage.setItem(STORAGE_KEYS.TOKEN, token); },
  getUserId()     { return parseInt(SafeStorage.getItem(STORAGE_KEYS.USER_ID)) || 0; },
  setUserId(id)   { SafeStorage.setItem(STORAGE_KEYS.USER_ID, id); },
  getCity()       { return SafeStorage.getItem(STORAGE_KEYS.CITY) || ''; },
  setCity(c)      { SafeStorage.setItem(STORAGE_KEYS.CITY, c); },
  getProvince()   { return SafeStorage.getItem(STORAGE_KEYS.PROVINCE) || ''; },
  setProvince(p)  { SafeStorage.setItem(STORAGE_KEYS.PROVINCE, p); },
  getCountry()    { return SafeStorage.getItem(STORAGE_KEYS.COUNTRY) || 'Indonesia'; },
  setCountry(c)   { SafeStorage.setItem(STORAGE_KEYS.COUNTRY, c); },
  getAvatar()     { return SafeStorage.getItem(STORAGE_KEYS.AVATAR) || 'boy'; },
  setAvatar(a)    { SafeStorage.setItem(STORAGE_KEYS.AVATAR, a); },
  getEmail()      { return SafeStorage.getItem(STORAGE_KEYS.EMAIL) || ''; },
  setEmail(e)     { SafeStorage.setItem(STORAGE_KEYS.EMAIL, e); },
  isEmailVerified() { return SafeStorage.getItem(STORAGE_KEYS.EMAIL_VERIFIED) === 'true'; },
  setEmailVerified(v) { SafeStorage.setItem(STORAGE_KEYS.EMAIL_VERIFIED, v ? 'true' : 'false'); },

  hasUser()       { return !!this.get() && !!this.getToken(); },

  /**
   * Redirect to login if not authenticated.
   * Prevents redirect loop: login.html never triggers this check.
   */
  promptIfNeeded() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    if (!this.hasUser() && page !== 'login.html') {
      window.location.href = 'login.html';
    }
  },

  /**
   * Logout: clears only the session token (not all progress data).
   * Progress data stays in localStorage as cache for the next login.
   * This is different from resetAll() which deletes everything.
   */
  logout() {
    const token = this.getToken();
    // Notify backend to invalidate session
    if (token) {
      fetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      }).catch(() => {}); // Fire-and-forget
    }
    // Clear only session-related keys
    SafeStorage.removeItem(STORAGE_KEYS.TOKEN);
    SafeStorage.removeItem(STORAGE_KEYS.USER_ID);
    SafeStorage.removeItem(STORAGE_KEYS.USERNAME);
    SafeStorage.removeItem(STORAGE_KEYS.CITY);
    SafeStorage.removeItem(STORAGE_KEYS.PROVINCE);
    SafeStorage.removeItem(STORAGE_KEYS.COUNTRY);
    SafeStorage.removeItem(STORAGE_KEYS.EMAIL);
    SafeStorage.removeItem(STORAGE_KEYS.EMAIL_VERIFIED);
    window.location.href = 'login.html';
  }
};

// ===== XP & LEVEL MANAGER =====
const XPManager = {
  getXP()      { return parseInt(SafeStorage.getItem(STORAGE_KEYS.XP)) || 0; },
  getLevel()   { return Math.floor(this.getXP() / 100) + 1; },
  getProgress(){ return this.getXP() % 100; },
  getXPForNext(){ return 100; },

  addXP(amount, x, y) {
    let xp = this.getXP() + amount;
    const oldLevel = this.getLevel();
    SafeStorage.setItem(STORAGE_KEYS.XP, xp);
    const newLevel = Math.floor(xp / 100) + 1;

    if (x !== undefined && y !== undefined) {
      this.showFloatingXP(amount, x, y);
    }

    showToast(`+${amount} XP`, 'xp');

    if (newLevel > oldLevel) {
      setTimeout(() => {
        showToast(`🎉 Level ${newLevel}!`, 'success');
        launchConfetti();
      }, 500);
    }

    this.updateUI();
    // Log to local ledger
    LocalLedger.addBlock('xp_gain', `+${amount} XP (Total: ${xp})`);
    // Sync to backend (non-blocking)
    syncProgressToBackend();
  },

  showFloatingXP(amount, x, y) {
    const el = document.createElement('div');
    el.className = 'xp-float';
    el.textContent = `+${amount} XP`;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  },

  updateUI() {
    const xp = this.getXP();
    const level = this.getLevel();
    const progress = this.getProgress();

    document.querySelectorAll('.xp-display').forEach(el => el.textContent = xp);
    document.querySelectorAll('.level-display').forEach(el => el.textContent = level);
    document.querySelectorAll('.xp-progress-bar').forEach(el => el.style.width = progress + '%');
    document.querySelectorAll('.xp-progress-text').forEach(el => el.textContent = `${progress} / 100 XP`);
  }
};

// ===== STREAK MANAGER =====
const StreakManager = {
  getStreak() { return parseInt(SafeStorage.getItem(STORAGE_KEYS.STREAK)) || 0; },

  update() {
    const today = new Date().toDateString();
    const last = SafeStorage.getItem(STORAGE_KEYS.LAST_PLAY);
    let streak = this.getStreak();

    if (last !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (last === yesterday) {
        streak++;
      } else if (last && last !== today) {
        streak = 1;
      } else if (!last) {
        streak = 1;
      }
      SafeStorage.setItem(STORAGE_KEYS.STREAK, streak);
      SafeStorage.setItem(STORAGE_KEYS.LAST_PLAY, today);
      // Sync streak to backend
      syncProgressToBackend();
    }
    this.updateUI();
    return streak;
  },

  updateUI() {
    const streak = this.getStreak();
    document.querySelectorAll('.streak-display').forEach(el => el.textContent = streak);
  }
};

// ===== STATS MANAGER =====
const StatsManager = {
  increment(key) {
    const val = parseInt(SafeStorage.getItem('stat_' + key)) || 0;
    SafeStorage.setItem('stat_' + key, val + 1);
  },
  get(key) { return parseInt(SafeStorage.getItem('stat_' + key)) || 0; },
  set(key, val) { SafeStorage.setItem('stat_' + key, val); }
};

// ===== LOCAL LEDGER =====
// This is a LOCAL, browser-only activity log for UI/offline purposes.
// It is NOT the same as the Java Blockchain on the backend.
// The Java Blockchain (Block/Blockchain classes) runs server-side
// and can be accessed independently for OOP demonstration.
const LocalLedger = {
  getChain() {
    try { return JSON.parse(SafeStorage.getItem('chain')) || []; } catch (e) { return []; }
  },

  addBlock(type, value) {
    const chain = this.getChain();
    chain.push({
      index: chain.length,
      data: { type, value, time: new Date().toLocaleString() },
      timestamp: Date.now(),
      prevHash: chain.length > 0 ? this.simpleHash(JSON.stringify(chain[chain.length - 1])) : '0'
    });
    if (chain.length > 100) chain.shift();
    SafeStorage.setItem('chain', JSON.stringify(chain));
  },

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
};

// ===== ACHIEVEMENTS =====
const Achievements = {
  list: [
    { id: 'first_search',    icon: '🔍', name: 'Explorer',    desc: 'Search your first word',      check: () => StatsManager.get('searches') >= 1 },
    { id: 'ten_searches',    icon: '📚', name: 'Bookworm',    desc: 'Search 10 words',              check: () => StatsManager.get('searches') >= 10 },
    { id: 'first_quiz',      icon: '🎯', name: 'Challenger',  desc: 'Complete first quiz',          check: () => StatsManager.get('quizzes') >= 1 },
    { id: 'five_quizzes',    icon: '🏆', name: 'Champion',    desc: 'Complete 5 quizzes',           check: () => StatsManager.get('quizzes') >= 5 },
    { id: 'perfect_quiz',    icon: '💎', name: 'Perfect',     desc: 'Get a perfect quiz score',     check: () => StatsManager.get('perfect_quizzes') >= 1 },
    { id: 'streak_3',        icon: '🔥', name: 'On Fire',     desc: '3 day streak',                 check: () => StreakManager.getStreak() >= 3 },
    { id: 'streak_7',        icon: '⚡', name: 'Unstoppable', desc: '7 day streak',                 check: () => StreakManager.getStreak() >= 7 },
    { id: 'level_5',         icon: '⭐', name: 'Rising Star', desc: 'Reach level 5',               check: () => XPManager.getLevel() >= 5 },
    { id: 'level_10',        icon: '👑', name: 'Royalty',     desc: 'Reach level 10',              check: () => XPManager.getLevel() >= 10 },
    { id: 'xp_500',          icon: '💰', name: 'XP Hoarder',  desc: 'Earn 500 XP',                 check: () => XPManager.getXP() >= 500 },
    { id: 'xp_1000',         icon: '🌟', name: 'Legendary',   desc: 'Earn 1000 XP',               check: () => XPManager.getXP() >= 1000 },
    { id: 'combo_5',         icon: '🔗', name: 'Combo King',  desc: '5 correct in a row',          check: () => StatsManager.get('max_combo') >= 5 },
    { id: 'typing_practice', icon: '⌨️', name: 'Keyboardist', desc: 'Complete first typing test',  check: () => StatsManager.get('typing_tests') >= 1 },
    { id: 'typing_60wpm',    icon: '⚡', name: 'Speed Demon', desc: 'Type over 60 WPM',            check: () => StatsManager.get('max_wpm') >= 60 },
  ],

  checkAll() {
    this.list.forEach(a => {
      const wasUnlocked = SafeStorage.getItem('badge_' + a.id);
      if (!wasUnlocked && a.check()) {
        SafeStorage.setItem('badge_' + a.id, '1');
        showToast(`🏅 Pencapaian: ${a.name}!`, 'success');
        LocalLedger.addBlock('achievement', a.name);
      }
    });
  },

  isUnlocked(id) { return !!SafeStorage.getItem('badge_' + id); }
};

// ===== RETRY QUEUE =====
const RetryQueue = {
  getQueue() {
    try { return JSON.parse(SafeStorage.getItem('retry_queue')) || []; } catch (e) { return []; }
  },
  
  add(endpoint, payload) {
    const q = this.getQueue();
    q.push({ endpoint, payload, timestamp: Date.now() });
    SafeStorage.setItem('retry_queue', JSON.stringify(q));
  },
  
  async flush() {
    const q = this.getQueue();
    if (q.length === 0) return;
    
    let remaining = [];
    for (const item of q) {
      try {
        const res = await fetch(`${API_BASE}${item.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload)
        });
        if (res.status === 401) { handle401(); return; }
        if (!res.ok) throw new Error('Retry failed');
      } catch (e) {
        remaining.push(item);
      }
    }
    
    if (remaining.length < q.length) {
      console.log(`[RetryQueue] Flushed ${q.length - remaining.length} items`);
    }
    SafeStorage.setItem('retry_queue', JSON.stringify(remaining));
  }
};

// ===== BACKEND SYNC =====

/**
 * Handle a 401 Unauthorized response from the backend.
 * Shows a friendly Indonesian toast and redirects to login.
 */
function handle401() {
  showToast('Sesi berakhir, silakan login kembali', 'error');
  setTimeout(() => {
    SafeStorage.removeItem(STORAGE_KEYS.TOKEN);
    SafeStorage.removeItem(STORAGE_KEYS.USER_ID);
    window.location.href = 'login.html';
  }, 1800);
}

/**
 * Sync streak to backend (non-blocking, best-effort).
 * XP is NOT synced here — it flows only through /quiz/submit and /typing/submit (additive).
 * Sending XP via this endpoint would cause overwrite/double-count race conditions.
 */
function syncProgressToBackend() {
  const token = UserManager.getToken();
  if (!token) return; // Not logged in — skip sync

  // Only sync streak. XP is updated exclusively via /quiz/submit and /typing/submit (additive).
  // Sending XP here would cause an overwrite/double-count race condition with those endpoints.
  fetch(`${API_BASE}/progress/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      streak: StreakManager.getStreak()
    })
  }).catch(() => {}); // Fire-and-forget; don't block UI on network errors
}

/**
 * Load progress from backend on login.
 * Backend values take precedence over stale localStorage data.
 */
async function loadProgressFromBackend() {
  const token = UserManager.getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/progress?token=${encodeURIComponent(token)}`);
    if (res.status === 401) { handle401(); return; }
    if (!res.ok) return;
    const data = await res.json();

    // Update localStorage with backend values (backend is source of truth)
    if (data.xp !== undefined)       SafeStorage.setItem(STORAGE_KEYS.XP,     data.xp);
    if (data.streak !== undefined)   SafeStorage.setItem(STORAGE_KEYS.STREAK, data.streak);
    if (data.username)               SafeStorage.setItem(STORAGE_KEYS.USERNAME, data.username);
    if (data.city)                   SafeStorage.setItem(STORAGE_KEYS.CITY,   data.city);
    if (data.province)               SafeStorage.setItem(STORAGE_KEYS.PROVINCE, data.province);
    if (data.country)                SafeStorage.setItem(STORAGE_KEYS.COUNTRY, data.country);
    if (data.avatar)                 SafeStorage.setItem(STORAGE_KEYS.AVATAR, data.avatar);

    XPManager.updateUI();
    StreakManager.updateUI();
    
    // Attempt to flush retry queue if backend is reachable
    RetryQueue.flush();
  } catch (e) {
    // Backend offline — keep using localStorage values gracefully
    console.warn('[Lexify] Backend unavailable, using cached progress.');
  }
}

// ===== SHARED FAVORITES FUNCTIONS =====
// Centralized here to avoid duplication between dictionary.js and profile.js

function renderFavorites(containerId = 'favorites-list') {
  const container = document.getElementById(containerId);
  if (!container) return;

  let favs = [];
  try { favs = JSON.parse(SafeStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]'); } catch (e) {}

  if (favs.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;width:100%;">No saved words yet</p>';
    return;
  }

  container.innerHTML = favs.map(w =>
    `<button class="btn btn-sm btn-outline favorite-tag" data-word="${escapeHTML(w)}" style="text-transform:capitalize;">${escapeHTML(w)} <span class="delete-fav" style="color:var(--accent-red);margin-left:6px;font-weight:bold;">×</span></button>`
  ).join('');
}

function removeFromFavorites(word) {
  let favs = [];
  try { favs = JSON.parse(SafeStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]'); } catch (e) {}
  favs = favs.filter(w => w.toLowerCase() !== word.toLowerCase());
  SafeStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favs));
  showToast(`Dihapus "${word}" dari favorit`, 'xp');
  renderFavorites();
}

// ===== SHARED HELPER FUNCTIONS =====

/** Escape HTML special characters to prevent XSS */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
// Alias for backward compatibility (was escHTML in old code)
const escHTML = escapeHTML;

function addActivity(event) {
  let activity = [];
  try { activity = JSON.parse(SafeStorage.getItem(STORAGE_KEYS.RECENT_ACTIVITY)) || []; } catch (e) { activity = []; }
  const dateStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const timeStr = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  activity.push({ event, time: `${dateStr}, ${timeStr}` });
  if (activity.length > 20) activity.shift();
  SafeStorage.setItem(STORAGE_KEYS.RECENT_ACTIVITY, JSON.stringify(activity));
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'xp') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ===== CONFETTI =====
function launchConfetti() {
  const colors = ['#FF6B35', '#7C3AED', '#10B981', '#F59E0B', '#3B82F6', '#EF4444'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.top = -10 + 'px';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    piece.style.width = (Math.random() * 8 + 5) + 'px';
    piece.style.height = (Math.random() * 8 + 5) + 'px';
    piece.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
    piece.style.animationDelay = Math.random() * 0.8 + 's';
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 4000);
  }
}

// ===== PARTICLES =====
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.3 + 0.1
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 107, 53, ${p.alpha})`;
      ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    });
    requestAnimationFrame(draw);
  }
  draw();

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// ===== NAVIGATION & DYNAMIC COMPONENTS =====
function initFavicon() {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = 'assets/raven.png';
}

function renderNavbar() {
  const oldNavbar = document.querySelector('.navbar');
  if (!oldNavbar) return;

  const streak = parseInt(SafeStorage.getItem(STORAGE_KEYS.STREAK)) || 0;
  const xp = parseInt(SafeStorage.getItem(STORAGE_KEYS.XP)) || 0;
  const username = UserManager.get() || 'Learner';

  const newNavbar = document.createElement('nav');
  newNavbar.className = 'navbar';
  newNavbar.innerHTML = `
    <a href="index.html" class="nav-brand">
      <img src="assets/raven.png" alt="Lexify Raven"> Lexify
    </a>
    <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation">☰</button>
    <ul class="nav-links" id="nav-links">
      <li><a href="index.html">🏠 Beranda</a></li>
      <li><a href="dictionary.html">📖 Kamus</a></li>
      <li><a href="quiz.html">🎯 Kuis</a></li>
      <li><a href="typing.html">⌨️ Mengetik</a></li>
      <li><a href="leaderboard.html">🏆 Peringkat</a></li>
      <li><a href="profile.html">👤 Profil</a></li>
    </ul>
    <div class="nav-stats">
      <div class="nav-stat">🔥 <span class="streak-display">${streak}</span></div>
      <div class="nav-stat">⭐ <span class="xp-display">${xp}</span></div>
      <div class="nav-stat nav-user" title="Logged in as ${escapeHTML(username)}">👤 ${escapeHTML(username.split(' ')[0])}</div>
    </div>
  `;

  oldNavbar.parentNode.replaceChild(newNavbar, oldNavbar);

  const toggleBtn = newNavbar.querySelector('#nav-toggle');
  const links = newNavbar.querySelector('#nav-links');
  toggleBtn?.addEventListener('click', () => {
    links?.classList.toggle('show');
    toggleBtn.textContent = links?.classList.contains('show') ? '✕' : '☰';
  });
}

function renderFooter() {
  if (document.querySelector('footer.footer')) return;

  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="footer-content">
      <div class="footer-brand">
        <img src="assets/raven.png" alt="Lexify Raven">
        <span>Lexify</span>
      </div>
      <p class="footer-tagline">Kuasai Bahasa Inggris & Indonesia lewat belajar kamus yang menyenangkan.</p>
      <div class="footer-links">
        <a href="index.html">Beranda</a>
        <a href="dictionary.html">Kamus</a>
        <a href="quiz.html">Kuis</a>
        <a href="typing.html">Mengetik</a>
        <a href="leaderboard.html">🏆 Peringkat</a>
        <a href="profile.html">Profil</a>
      </div>
      <div class="footer-copyright">
        &copy; ${new Date().getFullYear()} Lexify. Built with ❤️ for language learners.
      </div>
    </div>
  `;

  document.body.appendChild(footer);
}

function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('href') === page) a.classList.add('active');
  });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  // Apply Custom Cursor
  const cursorPreference = SafeStorage.getItem('lexify_cursor');
  if (cursorPreference) {
    document.body.classList.add(cursorPreference);
  }
  
  // Custom Smooth Cursor DOM Element
  const customCursor = document.createElement('div');
  customCursor.id = 'custom-cursor';
  document.body.appendChild(customCursor);

  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function smoothCursorLoop() {
    // Lerp (linear interpolation) for smoothness
    cursorX += (mouseX - cursorX) * 0.3;
    cursorY += (mouseY - cursorY) * 0.3;
    
    // Using hardware accelerated translate3d
    customCursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-20%, -20%)`;
    
    requestAnimationFrame(smoothCursorLoop);
  }
  requestAnimationFrame(smoothCursorLoop);

  UserManager.promptIfNeeded();
  initFavicon();
  initParticles();

  const page = window.location.pathname.split('/').pop() || 'index.html';

  if (page !== 'login.html' && UserManager.hasUser()) {
    renderNavbar();
    renderFooter();
    setActiveNav();

    // Load fresh progress from backend, then update UI
    await loadProgressFromBackend();

    XPManager.updateUI();
    StreakManager.update();
    Achievements.checkAll();
  }
});
