// =============================================
// LEXIFY — Dictionary Logic (dictionary.js)
// =============================================

const API = (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8091'
  : 'https://alright-washday-amicably.ngrok-free.dev';

let searchHistory = [];
try {
  searchHistory = JSON.parse(SafeStorage.getItem('search_history') || '[]');
} catch (e) {
  searchHistory = [];
}
let suggestTimeout = null;
let isSearching = false;
let searchLang = 'en'; // 'en' = English->Indonesian, 'id' = Indonesian->English

// ===== TEXT-TO-SPEECH PRONUNCIATION =====
function speakWord(word) {
  if (!window.speechSynthesis) {
    showToast('Browser tidak mendukung fitur ucapan', 'error');
    return;
  }
  window.speechSynthesis.cancel(); // Stop any currently playing speech
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

// ===== SEARCH =====
function searchWord() {
  if (isSearching) return;
  
  const kata = document.getElementById('search-input').value.trim();
  if (!kata) return;

  isSearching = true;
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) {
    searchBtn.disabled = true;
    searchBtn.innerHTML = 'Mencari... ⌛';
  }

  // Hide suggestions
  document.querySelector('.suggestions-dropdown')?.classList.remove('show');

  // Show loading
  const resultArea = document.getElementById('result-area');
  resultArea.innerHTML = '<div class="card result-card" style="text-align:center;padding:40px;"><div style="font-size:2rem;animation:pulse 1s infinite;">🔍</div><p style="color:var(--text-secondary);margin-top:8px;">Mencari...</p></div>';

  fetch(`${API}/cari?kata=${encodeURIComponent(kata)}&lang=${searchLang}`)
    .then(res => {
      // It might return plain text (old behavior) or JSON (new behavior)
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return res.json();
      } else {
        return res.text().then(text => ({ source: 'local', result: text }));
      }
    })
    .then(data => {
      let finalResult = '';
      let isAi = false;
      let aiError = false;

      if (data && data.source === 'ai') {
        isAi = true;
        // Parse OpenAI format from data.raw
        try {
          if (data.raw.error) {
            aiError = true;
            console.error("AI Error:", data.raw.error);
            finalResult = ""; // Force fallback to contribute form
          } else if (data.raw.choices && data.raw.choices.length > 0) {
            finalResult = data.raw.choices[0].message.content;
          } else {
            finalResult = ""; // Force fallback
          }
        } catch (e) {
          finalResult = "";
        }
      } else if (data) {
        finalResult = data.result || '';
      }

      if (!finalResult || finalResult.includes('tidak ditemukan') || finalResult.trim() === '') {
        resultArea.innerHTML = `
          <div class="card result-card" style="text-align:center;padding:40px;">
            <div style="font-size:3rem;">😕</div>
            <p style="font-size:1.2rem;font-weight:700;margin-top:12px;">Kata tidak ditemukan</p>
            <p style="color:var(--text-secondary);margin-top:4px;">Coba cari kata lain</p>
          </div>`;
        return;
      }

      displayResult(kata, finalResult, isAi);

      // Track stats
      StatsManager.increment('searches');
      addToHistory(kata);

      // Prevent XP farming (award XP only for first-time searches)
      let searchedWords = [];
      try {
        searchedWords = JSON.parse(SafeStorage.getItem('searched_words') || '[]');
      } catch (e) {
        searchedWords = [];
      }
      
      if (!searchedWords.includes(kata.toLowerCase())) {
        searchedWords.push(kata.toLowerCase());
        SafeStorage.setItem('searched_words', JSON.stringify(searchedWords));
        
        // Award XP
        XPManager.addXP(5, window.innerWidth / 2, 300);
        addActivity(`Mencari & mempelajari "${kata}"`);
      } else {
        addActivity(`Mencari "${kata}"`);
      }
      
      Achievements.checkAll();
    })
    .catch(err => {
      console.error('Search error:', err);
      resultArea.innerHTML = `
        <div class="card result-card" style="text-align:center;padding:40px;">
          <div style="font-size:3rem;">⚠️</div>
          <p style="font-size:1.2rem;font-weight:700;margin-top:12px;">Kesalahan Koneksi</p>
          <p style="color:var(--text-secondary);margin-top:4px;">Pastikan server API berjalan di port 8091</p>
        </div>`;
    })
    .finally(() => {
      isSearching = false;
      if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.innerHTML = 'Cari';
      }
    });
}

// ===== DISPLAY RESULT =====
function displayResult(word, data, isAi = false) {
  const resultArea = document.getElementById('result-area');
  const lines = data.split('\n').filter(l => l.trim());

  // Spelling breakdown: "A - P - P - L - E"
  const spelling = word.toUpperCase().split('').join(' - ');

  const aiLabel = isAi ? 
    `<div style="margin-top:12px; display:inline-block; padding:4px 8px; background:rgba(255,215,0,0.15); color:var(--warning); border:1px solid rgba(255,215,0,0.3); border-radius:12px; font-size:0.8rem; font-weight:bold;">
      🤖 Diterjemahkan oleh AI
    </div>` : '';

  resultArea.innerHTML = `
    <div class="card result-card">
      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        <div class="result-word">${escapeHTML(word)}</div>
        <button class="btn btn-sm btn-outline" id="btn-speak" title="Dengarkan pengucapan" style="padding:6px 12px; font-size:1rem;">
          🔊 Ucapkan
        </button>
      </div>
      <div style="margin-top:8px; padding:6px 10px; background:rgba(255,255,255,0.04); border-radius:var(--radius-sm); font-family:monospace; font-size:0.85rem; color:var(--text-secondary); letter-spacing:0.08em;">
        ${escapeHTML(spelling)}
      </div>
      ${aiLabel}
      <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border-glass);">
        ${lines.map(line => `<p style="margin-bottom:8px;font-size:1.1rem;line-height:1.6;">${escapeHTML(line)}</p>`).join('')}
      </div>
      <div style="margin-top:16px; display:flex; gap:8px;">
        <button class="btn btn-sm btn-outline btn-save-favorite" data-word="${escapeHTML(word)}">❤️ Simpan</button>
        <button class="btn btn-sm btn-outline btn-new-search">🔍 Cari Baru</button>
      </div>
    </div>`;

  // Wire up speak button
  document.getElementById('btn-speak')?.addEventListener('click', () => speakWord(word));
}

// ===== CONTRIBUTE WORD =====
function showContributeForm(word) {
  const resultArea = document.getElementById('result-area');
  resultArea.innerHTML = `
    <div class="card result-card">
      <h3 style="margin-top:0; color:var(--primary);">Bantu Tambahkan Kata</h3>
      <p style="color:var(--text-secondary); margin-bottom:16px;">Kami dan AI belum mengenali kata <strong>"${escapeHTML(word)}"</strong>. Jika kamu tahu artinya, bagikan dengan komunitas!</p>
      
      <div class="input-group" style="margin-bottom:12px;">
        <label style="display:block; margin-bottom:4px; font-size:0.9rem;">Kata (Inggris)</label>
        <input type="text" id="contrib-english" class="input" value="${searchLang === 'en' ? escapeHTML(word) : ''}" style="width:100%;">
      </div>
      
      <div class="input-group" style="margin-bottom:12px;">
        <label style="display:block; margin-bottom:4px; font-size:0.9rem;">Arti (Indonesia)</label>
        <input type="text" id="contrib-indo" class="input" value="${searchLang === 'id' ? escapeHTML(word) : ''}" style="width:100%;">
      </div>
      
      <div class="input-group" style="margin-bottom:16px;">
        <label style="display:block; margin-bottom:4px; font-size:0.9rem;">Contoh Kalimat (Opsional)</label>
        <textarea id="contrib-example" class="input" style="width:100%; height:60px; resize:none;"></textarea>
      </div>
      
      <div style="display:flex; gap:8px;">
        <button class="btn" id="btn-submit-contrib">Kirim Kontribusi</button>
        <button class="btn btn-outline btn-new-search">Batal</button>
      </div>
    </div>
  `;

  document.getElementById('btn-submit-contrib')?.addEventListener('click', submitContribution);
}

function submitContribution() {
  if (!UserManager.isLoggedIn()) {
    showToast('Silakan login untuk berkontribusi', 'error');
    return;
  }

  const english = document.getElementById('contrib-english').value.trim();
  const indo = document.getElementById('contrib-indo').value.trim();
  const example = document.getElementById('contrib-example').value.trim();

  if (!english || !indo) {
    showToast('Kata dan arti harus diisi', 'error');
    return;
  }

  const btn = document.getElementById('btn-submit-contrib');
  btn.disabled = true;
  btn.textContent = 'Mengirim...';

  fetch(`${API}/dictionary/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: UserManager.getToken(),
      english: english,
      indonesian: indo,
      example_sentence: example
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) throw new Error(data.error);
    showToast('Kontribusi berhasil dikirim! +10 XP', 'success');
    
    // Clear form and show success
    const resultArea = document.getElementById('result-area');
    resultArea.innerHTML = `
      <div class="card result-card" style="text-align:center;padding:40px;">
        <div style="font-size:3rem;">🎉</div>
        <h3 style="margin-top:16px;">Terima Kasih!</h3>
        <p style="color:var(--text-secondary);margin-top:8px;">
          Kontribusimu sedang ditinjau oleh AI. Jika disetujui, kata ini akan ditambahkan ke kamus publik!
        </p>
        <div style="margin-top:20px;">
          <button class="btn btn-outline btn-new-search">🔍 Cari Kata Lain</button>
        </div>
      </div>
    `;
    
    // Update local XP manually for instant feedback (server already did it)
    let user = JSON.parse(SafeStorage.getItem('user_session') || '{}');
    if (user.xp !== undefined) {
      user.xp += 10;
      SafeStorage.setItem('user_session', JSON.stringify(user));
      updateUI(); // Assuming this exists or works
    }
  })
  .catch(err => {
    showToast(err.message || 'Gagal mengirim kontribusi', 'error');
    btn.disabled = false;
    btn.textContent = 'Kirim Kontribusi';
  });
}

// ===== SUGGESTIONS =====
function handleSuggest() {
  clearTimeout(suggestTimeout);
  const kata = document.getElementById('search-input').value.trim();
  const dropdown = document.querySelector('.suggestions-dropdown');

  if (kata.length < 1) {
    dropdown.classList.remove('show');
    return;
  }

  suggestTimeout = setTimeout(() => {
    fetch(`${API}/suggest?kata=${encodeURIComponent(kata)}&lang=${searchLang}`)
      .then(res => res.text())
      .then(data => {
        if (!data.trim()) {
          dropdown.classList.remove('show');
          return;
        }
        const suggestions = data.split('\n').filter(s => s.trim());
        if (suggestions.length === 0) {
          dropdown.classList.remove('show');
          return;
        }
        dropdown.innerHTML = suggestions.map(s =>
          `<div class="suggestion-item" data-word="${escapeHTML(s.trim())}">${escapeHTML(s.trim())}</div>`
        ).join('');
        dropdown.classList.add('show');
      })
      .catch(() => dropdown.classList.remove('show'));
  }, 200);
}

function selectSuggestion(word) {
  document.getElementById('search-input').value = word;
  document.querySelector('.suggestions-dropdown').classList.remove('show');
  searchWord();
}

// ===== SEARCH HISTORY =====
function addToHistory(word) {
  searchHistory = searchHistory.filter(w => w.toLowerCase() !== word.toLowerCase());
  searchHistory.unshift(word);
  if (searchHistory.length > 15) searchHistory.pop();
  SafeStorage.setItem('search_history', JSON.stringify(searchHistory));
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;
  if (searchHistory.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No searches yet</p>';
    return;
  }
  container.innerHTML = searchHistory.slice(0, 8).map(w =>
    `<div class="suggestion-item history-item" data-word="${escapeHTML(w)}" style="border-bottom:1px solid var(--border-glass);padding:10px 0;cursor:pointer;">${escapeHTML(w)}</div>`
  ).join('');
}

function clearHistory() {
  searchHistory = [];
  SafeStorage.setItem('search_history', '[]');
  renderHistory();
}

// ===== FAVORITES =====
function addToFavorites(word) {
  let favs = [];
  try {
    favs = JSON.parse(SafeStorage.getItem('favorites') || '[]');
  } catch (e) {
    favs = [];
  }
  if (!favs.includes(word)) {
    favs.push(word);
    SafeStorage.setItem('favorites', JSON.stringify(favs));
    showToast(`❤️ Disimpan "${word}"`, 'success');
    renderFavorites();
  } else {
    showToast(`Sudah tersimpan!`, 'xp');
  }
}



function clearFavorites() {
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
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderHistory();
  renderFavorites();

  // Input suggestions listener
  document.getElementById('search-input')?.addEventListener('input', handleSuggest);

  // Language toggle button
  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    searchLang = searchLang === 'en' ? 'id' : 'en';
    const btn = document.getElementById('lang-toggle');
    if (btn) {
      btn.textContent = searchLang === 'en' ? '🇬🇧 Inggris' : '🇮🇩 Indonesia';
      btn.title = searchLang === 'en' ? 'Cari Bahasa Inggris → Indonesia' : 'Cari Bahasa Indonesia → Inggris';
    }
    const input = document.getElementById('search-input');
    if (input) {
      input.placeholder = searchLang === 'en' ? 'Ketik kata Bahasa Inggris...' : 'Ketik kata Bahasa Indonesia...';
      input.value = '';
      input.focus();
    }
    document.getElementById('result-area').innerHTML = '';
  });

  // Enter key to search
  document.getElementById('search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchWord();
  });

  // Search button click
  document.getElementById('search-btn')?.addEventListener('click', searchWord);

  // Clear history button click
  document.getElementById('clear-history-btn')?.addEventListener('click', clearHistory);

  // Clear favorites button click
  document.getElementById('clear-favorites-btn')?.addEventListener('click', clearFavorites);

  // Close suggestions on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
      document.querySelector('.suggestions-dropdown')?.classList.remove('show');
    }
  });

  // Suggestions dropdown selection event delegation
  document.querySelector('.suggestions-dropdown')?.addEventListener('click', (e) => {
    const item = e.target.closest('.suggestion-item');
    if (item) {
      const word = item.getAttribute('data-word');
      selectSuggestion(word);
    }
  });

  // History selection event delegation
  document.getElementById('history-list')?.addEventListener('click', (e) => {
    const item = e.target.closest('.history-item');
    if (item) {
      const word = item.getAttribute('data-word');
      selectSuggestion(word);
    }
  });

  // Result Area event delegation for ❤️ Save and 🔍 New Search
  document.getElementById('result-area')?.addEventListener('click', (e) => {
    const saveBtn = e.target.closest('.btn-save-favorite');
    if (saveBtn) {
      const word = saveBtn.getAttribute('data-word');
      addToFavorites(word);
      return;
    }
    const newSearchBtn = e.target.closest('.btn-new-search');
    if (newSearchBtn) {
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      return;
    }
  });

  // Favorites list event delegation
  document.getElementById('favorites-list')?.addEventListener('click', (e) => {
    const tag = e.target.closest('.favorite-tag');
    if (tag) {
      const word = tag.getAttribute('data-word');
      const isDelete = e.target.classList.contains('delete-fav') || e.target.closest('.delete-fav');
      if (isDelete) {
        e.stopPropagation();
        removeFromFavorites(word);
      } else {
        selectSuggestion(word);
      }
    }
  });
});
