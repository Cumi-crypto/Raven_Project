// =============================================
// LEXIFY — Profile Logic (profile.js)
// =============================================

const PROFILE_API = (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8091'
  : 'https://alright-washday-amicably.ngrok-free.dev';

document.addEventListener('DOMContentLoaded', () => {
  // Init Profile
  updateProfileUI();
  renderBadges();
  renderFavorites();
  renderRecentActivity();

  // Event Delegation/Listeners
  
  // Edit username button click (delegated since the element is recreated)
  document.getElementById('username-container')?.addEventListener('click', (e) => {
    if (e.target.closest('#edit-username-btn')) {
      enableUsernameEdit();
    } else if (e.target.closest('#save-username-btn')) {
      saveUsername();
    } else if (e.target.closest('#cancel-username-btn')) {
      disableUsernameEdit();
    }
  });

  // Handle Enter key inside inline username edit field
  document.getElementById('username-container')?.addEventListener('keydown', (e) => {
    if (e.target.id === 'edit-username-input' && e.key === 'Enter') {
      saveUsername();
    }
  });

  // Clear favorites button click
  document.getElementById('clear-favorites-btn')?.addEventListener('click', () => {
    let favs = [];
    try {
      favs = JSON.parse(SafeStorage.getItem('favorites') || '[]');
    } catch (e) {
      favs = [];
    }
    if (favs.length === 0) return;
    if (confirm('Hapus semua kata favorit yang tersimpan?')) {
      SafeStorage.setItem('favorites', '[]');
      showToast('Semua favorit dihapus', 'xp');
      renderFavorites();
    }
  });

  // Favorite tags click (to delete from favorites)
  document.getElementById('favorites-list')?.addEventListener('click', (e) => {
    const tag = e.target.closest('.favorite-tag');
    if (tag) {
      const word = tag.getAttribute('data-word');
      const isDelete = e.target.classList.contains('delete-fav') || e.target.closest('.delete-fav');
      if (isDelete) {
        e.stopPropagation();
        removeFromFavorites(word);
      }
    }
  });

  // Toggle chain button click
  document.getElementById('toggle-chain-btn')?.addEventListener('click', toggleChainLog);

  // Reset all progress button click
  document.getElementById('reset-all-btn')?.addEventListener('click', resetAll);
  
  // Logout button click (if added to profile.html)
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    UserManager.logout();
  });

  // Modal close buttons
  document.getElementById('close-verify-modal')?.addEventListener('click', () => {
    document.getElementById('email-verify-modal').style.display = 'none';
  });

  document.getElementById('btn-submit-verify')?.addEventListener('click', handleVerifyOTP);

  // Cursor selector initialization and listener
  const cursorSelect = document.getElementById('cursor-select');
  if (cursorSelect) {
    const currentCursor = SafeStorage.getItem('lexify_cursor') || '';
    cursorSelect.value = currentCursor;
    cursorSelect.addEventListener('change', (e) => {
      const newCursor = e.target.value;
      SafeStorage.setItem('lexify_cursor', newCursor);
      // Remove old cursor classes
      document.body.classList.remove('cursor-sword', 'cursor-wand');
      // Apply new one
      if (newCursor) {
        document.body.classList.add(newCursor);
      }
      showToast('Kursor berhasil diubah', 'success');
      addActivity(`Mengubah kursor menjadi ${newCursor || 'default'}`);
    });
  }

  // Profile Edit Event Listeners
  document.getElementById('profile-province')?.addEventListener('change', updateCitiesProfile);
  document.querySelectorAll('input[name="profile-avatar-radio"]').forEach(radio => {
    radio.addEventListener('change', updateAvatarPreview);
  });
});

function updateProfileUI() {
  const name = UserManager.get() || 'Learner';
  const nameEl = document.getElementById('profile-name');
  if (nameEl) nameEl.textContent = name;

  const emailEl = document.getElementById('profile-email');
  const emailBadge = document.getElementById('email-status-badge');
  const userEmail = UserManager.getEmail();
  const isVerified = UserManager.isEmailVerified();

  if (emailEl && userEmail) {
    emailEl.textContent = userEmail;
    if (emailBadge) {
      if (isVerified) {
        emailBadge.textContent = '✅ Verified';
        emailBadge.style.color = '#10b981';
        emailBadge.style.borderColor = '#10b981';
        emailBadge.style.cursor = 'default';
        emailBadge.onclick = null;
      } else {
        emailBadge.textContent = 'Verify Now';
        emailBadge.style.color = '#ff4444';
        emailBadge.style.borderColor = '#ff4444';
        emailBadge.style.cursor = 'pointer';
        emailBadge.onclick = handleSendVerification;
      }
    }
  } else if (emailEl) {
    emailEl.textContent = 'No email registered';
    if (emailBadge) emailBadge.style.display = 'none';
  }

  // Stats
  document.getElementById('quizzes-done').textContent = StatsManager.get('quizzes');
  document.getElementById('words-searched').textContent = StatsManager.get('searches');

  // Pre-fill profile edit form
  const currentAvatar = UserManager.getAvatar();
  const radio = document.querySelector(`input[name="profile-avatar-radio"][value="${currentAvatar}"]`);
  if (radio) radio.checked = true;
  updateAvatarPreview();

  const province = UserManager.getProvince();
  const provinceSelect = document.getElementById('profile-province');
  if (provinceSelect && province) {
    provinceSelect.value = province;
    updateCitiesProfile();
    const city = UserManager.getCity();
    const citySelect = document.getElementById('profile-city');
    if (citySelect && city) {
      citySelect.value = city;
    }
  }
}

// ===== EDIT PROFILE LOGIC =====
const locations = {
  "DKI Jakarta": ["Jakarta Pusat", "Jakarta Utara", "Jakarta Barat", "Jakarta Selatan", "Jakarta Timur"],
  "Jawa Barat": ["Bandung", "Bekasi", "Bogor", "Depok", "Cimahi", "Cirebon"],
  "Jawa Tengah": ["Semarang", "Surakarta", "Magelang", "Pekalongan", "Tegal", "Salatiga"],
  "Jawa Timur": ["Surabaya", "Malang", "Kediri", "Madiun", "Mojokerto", "Pasuruan"],
  "Banten": ["Tangerang", "Tangerang Selatan", "Serang", "Cilegon"],
  "Bali": ["Denpasar", "Singaraja", "Gianyar", "Tabanan"]
};

function updateCitiesProfile() {
  const provinceSelect = document.getElementById('profile-province');
  const citySelect = document.getElementById('profile-city');
  if (!provinceSelect || !citySelect) return;
  const province = provinceSelect.value;
  
  citySelect.innerHTML = '<option value="">Select City</option>';
  
  if (province && locations[province]) {
    locations[province].forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      citySelect.appendChild(option);
    });
    citySelect.disabled = false;
  } else {
    citySelect.disabled = true;
  }
}

function updateAvatarPreview() {
  const selected = document.querySelector('input[name="profile-avatar-radio"]:checked')?.value || 'boy';
  document.getElementById('avatar-boy-img').style.borderColor = selected === 'boy' ? 'var(--accent-orange)' : 'transparent';
  document.getElementById('avatar-girl-img').style.borderColor = selected === 'girl' ? 'var(--accent-orange)' : 'transparent';
  
  const headerAvatar = document.getElementById('profile-avatar');
  if (headerAvatar) {
    headerAvatar.src = `assets/avatars/avatar-${selected}.png`;
  }
}

document.getElementById('btn-save-profile')?.addEventListener('click', () => {
  const province = document.getElementById('profile-province').value;
  const city = document.getElementById('profile-city').value;
  const avatar = document.querySelector('input[name="profile-avatar-radio"]:checked')?.value || 'boy';

  const btn = document.getElementById('btn-save-profile');
  btn.disabled = true;
  btn.textContent = 'Menyimpan... ⌛';

  fetch(`${PROFILE_API}/profile/update`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: UserManager.getToken(), city, province, avatar })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) throw new Error(data.error);
    UserManager.setCity(city);
    UserManager.setProvince(province);
    UserManager.setAvatar(avatar);
    showToast('Profil berhasil disimpan', 'success');
  })
  .catch(err => {
    showToast(err.message || 'Gagal menyimpan profil', 'error');
  })
  .finally(() => {
    btn.disabled = false;
    btn.textContent = 'Simpan Profil';
  });
});

function renderBadges() {
  const grid = document.getElementById('badges-grid');
  if (!grid) return;
  
  grid.innerHTML = Achievements.list.map(a => {
    const unlocked = Achievements.isUnlocked(a.id);
    return `
      <div class="badge-item ${unlocked ? '' : 'locked'}" title="${escapeHTML(a.desc)}">
        <div class="badge-icon">${escapeHTML(a.icon)}</div>
        <div class="badge-name">${escapeHTML(a.name)}</div>
      </div>`;
  }).join('');
}

// ===== INLINE USERNAME EDIT =====
function enableUsernameEdit() {
  const container = document.getElementById('username-container');
  if (!container) return;

  const currentName = UserManager.get() || 'Learner';
  container.innerHTML = `
    <input type="text" class="input" id="edit-username-input" value="${escapeHTML(currentName)}" maxlength="20" style="max-width: 220px; padding: 6px 12px; font-size: 1.1rem; display: inline-block;">
    <button class="btn btn-sm btn-green" id="save-username-btn" style="padding: 6px 12px; font-size: 0.85rem; margin-left: 4px;">Save</button>
    <button class="btn btn-sm btn-outline" id="cancel-username-btn" style="padding: 6px 12px; font-size: 0.85rem; margin-left: 4px;">Cancel</button>
  `;

  const input = container.querySelector('#edit-username-input');
  if (input) {
    input.focus();
    input.select();
  }
}

function saveUsername() {
  const container = document.getElementById('username-container');
  const input = document.getElementById('edit-username-input');
  if (!container || !input) return;

  const newName = input.value.trim();
  if (newName) {
    UserManager.set(newName);
    showToast('Username diperbarui!', 'success');
    addActivity(`Mengubah username menjadi "${newName}"`);
  }
  disableUsernameEdit();
}

function disableUsernameEdit() {
  const container = document.getElementById('username-container');
  if (!container) return;
  const name = UserManager.get() || 'Learner';
  container.innerHTML = `
    <h1 id="profile-name" style="font-size:1.8rem; margin:0;">${escapeHTML(name)}</h1>
    <button class="btn btn-sm btn-outline" id="edit-username-btn" style="padding:4px 8px; font-size:0.8rem; border:none; background:transparent;">✏️</button>
  `;
}



// ===== RECENT ACTIVITY =====
function renderRecentActivity() {
  const container = document.getElementById('recent-activity');
  if (!container) return;

  let activity = [];
  try {
    activity = JSON.parse(SafeStorage.getItem('recent_activity') || '[]');
  } catch (e) {
    activity = [];
  }

  if (activity.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No activity yet. Start learning!</p>';
    return;
  }

  // Show last 10 activity items, newest first
  container.innerHTML = '<div class="timeline">' +
    activity.slice(-10).reverse().map(a =>
      `<div class="timeline-item">
        <div class="time">${escapeHTML(a.time)}</div>
        <div class="event">${escapeHTML(a.event)}</div>
      </div>`
    ).join('') + '</div>';
}

// ===== BLOCKCHAIN TIMELINE =====
function toggleChainLog() {
  const container = document.getElementById('chain-log');
  const timeline = document.getElementById('chain-timeline');
  if (!container || !timeline) return;

  if (container.style.display === 'none') {
    container.style.display = 'block';
    const chain = LocalLedger.getChain();
    if (chain.length === 0) {
      timeline.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Belum ada log aktivitas.</p>';
    } else {
      timeline.innerHTML = chain.slice().reverse().slice(0, 20).map(b => `
        <div class="timeline-item">
          <div class="time">${escapeHTML(b.data.time)} • Block #${b.index}</div>
          <div class="event">${escapeHTML(b.data.type)}: ${escapeHTML(b.data.value)}</div>
          <div style="font-size:0.7rem;color:var(--text-muted);font-family:monospace;margin-top:2px;">Hash: ${escapeHTML(b.prevHash)}</div>
        </div>
      `).join('');
    }
  } else {
    container.style.display = 'none';
  }
}

// ===== RESET ALL =====


function resetAll() {
  const confirmation = prompt('Yakin? Ini akan menghapus SEMUA kemajuan, XP, streak, dan pencapaianmu.\nKetik "HAPUS" untuk konfirmasi:');
  if (confirmation === 'HAPUS') {
    SafeStorage.clear();
    location.reload();
  } else if (confirmation !== null) {
    alert('Reset dibatalkan. Kamu harus mengetik "HAPUS" dengan tepat.');
  }
}

// ===== EMAIL VERIFICATION LOGIC =====

function handleSendVerification() {
  const badge = document.getElementById('email-status-badge');
  if (badge) {
    badge.textContent = 'Sending...';
    badge.style.pointerEvents = 'none';
  }

  fetch(`${PROFILE_API}/send-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: UserManager.getToken() })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) throw new Error(data.error);
    showToast('OTP telah dikirim ke email Anda', 'success');
    document.getElementById('email-verify-modal').style.display = 'flex';
  })
  .catch(err => {
    showToast(err.message || 'Gagal mengirim OTP', 'error');
  })
  .finally(() => {
    if (badge && !UserManager.isEmailVerified()) {
      badge.textContent = 'Verify Now';
      badge.style.pointerEvents = 'auto';
    }
  });
}

function handleVerifyOTP() {
  const otpInput = document.getElementById('verify-otp-input');
  const otp = otpInput.value.trim();
  
  if (!otp) {
    showToast('Silakan masukkan OTP', 'error');
    return;
  }
  
  const btn = document.getElementById('btn-submit-verify');
  const oldText = btn.textContent;
  btn.textContent = 'Memverifikasi...';
  btn.disabled = true;

  fetch(`${PROFILE_API}/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: UserManager.getToken(), otp })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) throw new Error(data.error);
    showToast('Email berhasil diverifikasi! 🎉', 'success');
    UserManager.setEmailVerified(true);
    document.getElementById('email-verify-modal').style.display = 'none';
    updateProfileUI(); // Update badge
  })
  .catch(err => {
    showToast(err.message || 'OTP salah atau kadaluarsa', 'error');
  })
  .finally(() => {
    btn.textContent = oldText;
    btn.disabled = false;
  });
}
