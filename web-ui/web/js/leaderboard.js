// =============================================
// LEXIFY — Leaderboard Logic (leaderboard.js)
// =============================================

const LEADERBOARD_API = (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8091'
  : 'https://alright-washday-amicably.ngrok-free.dev';
let currentScope = 'country'; // default scope

function fetchLeaderboard(scope) {
  currentScope = scope;
  
  // Update UI tabs
  document.querySelectorAll('.scope-tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById(`tab-${scope}`)?.classList.add('active');
  
  // Update title
  const titleEl = document.getElementById('leaderboard-title');
  if (titleEl) {
    if (scope === 'city') titleEl.textContent = 'Terbaik di Kotamu';
    else if (scope === 'province') titleEl.textContent = 'Terbaik di Provinsimu';
    else titleEl.textContent = 'Terbaik di Negaramu';
  }

  const listEl = document.getElementById('leaderboard-list');
  if (!listEl) return;
  
  listEl.innerHTML = `
    <div style="text-align:center; padding:40px;">
      <div style="font-size:2rem; animation:pulse 1s infinite;">⌛</div>
      <p style="color:var(--text-secondary); margin-top:12px;">Memuat peringkat...</p>
    </div>
  `;

  // Determine user's location to query
  let location = 'Indonesia';
  if (scope === 'city') location = UserManager.getCity() || '';
  if (scope === 'province') location = UserManager.getProvince() || '';
  if (scope === 'country') location = UserManager.getCountry() || 'Indonesia';

  if (scope !== 'country' && !location) {
    listEl.innerHTML = `
      <div style="text-align:center; padding:40px;">
        <div style="font-size:3rem;">📍</div>
        <p style="font-weight:700; margin-top:12px;">Lokasi Belum Diatur</p>
        <p style="color:var(--text-secondary); margin-top:4px;">Perbarui ${scope === 'city' ? 'kota' : 'provinsi'}mu di profil untuk melihat papan peringkat ini.</p>
      </div>
    `;
    return;
  }

  fetch(`${LEADERBOARD_API}/leaderboard?scope=${scope}&location=${encodeURIComponent(location)}`)
    .then(res => res.json())
    .then(data => renderLeaderboard(data.rankings, data.location))
    .catch(err => {
      console.error('Leaderboard error:', err);
      listEl.innerHTML = `
        <div style="text-align:center; padding:40px;">
          <div style="font-size:3rem;">⚠️</div>
          <p style="font-weight:700; margin-top:12px;">Kesalahan Koneksi</p>
          <p style="color:var(--text-secondary); margin-top:4px;">Tidak dapat memuat data papan peringkat.</p>
        </div>
      `;
    });
}

function renderLeaderboard(rankings, locationName) {
  const listEl = document.getElementById('leaderboard-list');
  if (!listEl) return;
  
  if (!rankings || rankings.length === 0) {
    listEl.innerHTML = `
      <div style="text-align:center; padding:40px;">
        <div style="font-size:3rem;">🏆</div>
        <p style="font-weight:700; margin-top:12px;">Belum Ada Data</p>
        <p style="color:var(--text-secondary); margin-top:4px;">Jadilah yang pertama kumpulkan XP di ${escapeHTML(locationName)}!</p>
      </div>
    `;
    return;
  }

  const currentUsername = UserManager.get();
  
  const html = rankings.map(r => {
    const isCurrentUser = r.username === currentUsername;
    
    // Choose avatar based on rank or username
    let avatar = '👤';
    if (r.rank === 1) avatar = '👑';
    else if (r.rank === 2) avatar = '🥈';
    else if (r.rank === 3) avatar = '🥉';
    else {
      // simple deterministic emoji based on username length
      const emojis = ['🐯','🦊','🐼','🐨','🐸','🐙','🦉','🦇','🐺','🐗'];
      avatar = emojis[r.username.length % emojis.length];
    }
    
    let locationText = '';
    if (currentScope === 'country') locationText = `${r.city ? r.city + ', ' : ''}${r.province}`;
    else if (currentScope === 'province') locationText = r.city;
    else locationText = r.country;
    
    return `
      <div class="rank-row ${isCurrentUser ? 'current-user' : ''}" data-rank="${r.rank}">
        <div class="rank-number">${r.rank}</div>
        <div class="rank-avatar">${avatar}</div>
        <div class="rank-details">
          <div class="rank-name">${escapeHTML(r.username)} ${isCurrentUser ? '<span style="font-size:0.8rem; color:var(--accent-orange);">(You)</span>' : ''}</div>
          <div class="rank-location">${escapeHTML(locationText || '-')}</div>
        </div>
        <div class="rank-stats">
          <div class="rank-xp">${r.xp} <span style="font-size:0.8rem; font-weight:400; color:var(--text-secondary);">XP</span></div>
          <div class="rank-level">Level ${r.level} • 🔥 ${r.streak}</div>
        </div>
      </div>
    `;
  }).join('');
  
  listEl.innerHTML = html;
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Require login to view leaderboard
  if (!UserManager.hasUser()) {
    window.location.href = 'login.html';
    return;
  }
  
  // Initial fetch
  fetchLeaderboard('country');
  
  // Tab listeners
  document.querySelectorAll('.scope-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const scope = e.target.getAttribute('data-scope');
      if (scope) fetchLeaderboard(scope);
    });
  });
});
