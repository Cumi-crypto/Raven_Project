// =============================================
// LEXIFY — Typing Practice Logic (typing.js)
// =============================================

const WORDS_POOL = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her", "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
  "people", "into", "year", "your", "good", "some", "could", "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
  "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even", "new", "want", "because", "any", "these", "give", "day", "most", "us",
  "learn", "write", "read", "speak", "practice", "study", "student", "teacher", "school", "book", "word", "letter", "sentence", "meaning", "language", "indonesian", "english", "lexify", "dictionary", "quiz"
];

let typingState = {
  words: [],
  timeLimit: 15,
  timeLeft: 15,
  timer: null,
  started: false,
  ended: false,
  focused: false,
  soundEnabled: true,
  wordIndex: 0,
  currentInput: '',
  typedCharacters: 0,
  correctCharacters: 0
};

// ===== WEB AUDIO KEYBOARD SOUND =====
let audioCtx = null;

function playKeySound() {
  if (!typingState.soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) {}
}

function playSpaceSound() {
  if (!typingState.soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.07);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
}

// ===== WORD GENERATION =====
function generateWords() {
  const container = document.getElementById('words-list');
  if (!container) return;

  container.innerHTML = '';
  typingState.words = [];

  for (let i = 0; i < 80; i++) {
    typingState.words.push(WORDS_POOL[Math.floor(Math.random() * WORDS_POOL.length)]);
  }

  typingState.words.forEach((word, wordIdx) => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'typing-word';
    wordSpan.id = `word-${wordIdx}`;

    word.split('').forEach((char, charIdx) => {
      const charSpan = document.createElement('span');
      charSpan.className = 'typing-char';
      charSpan.id = `word-${wordIdx}-char-${charIdx}`;
      charSpan.textContent = char;
      wordSpan.appendChild(charSpan);
    });

    container.appendChild(wordSpan);
    container.appendChild(document.createTextNode(' '));
  });

  const firstWord = document.getElementById('word-0');
  if (firstWord) firstWord.classList.add('active');
}

// ===== CARET POSITION =====
function updateCaret() {
  const caret = document.getElementById('caret');
  const wrapper = document.getElementById('words-container');
  if (!caret || !wrapper) return;

  const activeWord = document.getElementById(`word-${typingState.wordIndex}`);
  if (!activeWord) return;

  const wordLen = typingState.words[typingState.wordIndex]?.length || 0;
  const inputLen = typingState.currentInput.length;

  let refEl = null;
  let useRight = false; // whether to use right edge of refEl

  if (inputLen < wordLen) {
    // caret before the next un-typed character
    refEl = document.getElementById(`word-${typingState.wordIndex}-char-${inputLen}`);
    useRight = false;
  } else {
    // caret after the last character (or after extra chars)
    const allChars = activeWord.querySelectorAll('.typing-char');
    refEl = allChars[allChars.length - 1] || null;
    useRight = true;
  }

  if (!refEl) return;

  const wrapperRect = wrapper.getBoundingClientRect();
  const refRect = refEl.getBoundingClientRect();

  // Position relative to the wrapper's content (accounting for scroll)
  const left = (useRight ? refRect.right : refRect.left) - wrapperRect.left;
  const top = refRect.top - wrapperRect.top;

  caret.style.left = `${Math.max(0, left)}px`;
  caret.style.top = `${Math.max(0, top)}px`;
  caret.style.height = `${refRect.height || 34}px`;

  // Auto-scroll: keep active word in the top half of the box
  const wordRect = activeWord.getBoundingClientRect();
  const wRect = wrapper.getBoundingClientRect();
  const wordVisualTop = wordRect.top - wRect.top;
  const wordVisualBottom = wordRect.bottom - wRect.top;

  if (wordVisualBottom > wRect.height - 10) {
    // Word going out of view at the bottom — scroll down one row
    wrapper.scrollTop += wordRect.height + 8;
  }
}

// ===== RENDER CURRENT WORD =====
function renderCurrentWord() {
  const wordIndex = typingState.wordIndex;
  const wordText = typingState.words[wordIndex];
  const typed = typingState.currentInput;
  const activeWordEl = document.getElementById(`word-${wordIndex}`);
  if (!activeWordEl || !wordText) return;

  const wordChars = wordText.split('');
  const typedChars = typed.split('');

  // Clear extra overflow spans
  activeWordEl.querySelectorAll('.typing-char.extra').forEach(el => el.remove());

  // Update each char span
  wordChars.forEach((c, idx) => {
    const charEl = document.getElementById(`word-${wordIndex}-char-${idx}`);
    if (!charEl) return;
    if (idx < typedChars.length) {
      charEl.className = typedChars[idx] === c ? 'typing-char correct' : 'typing-char incorrect';
    } else {
      charEl.className = 'typing-char';
    }
  });

  // Append extra (overflow) typed characters in red
  if (typedChars.length > wordChars.length) {
    for (let i = wordChars.length; i < typedChars.length; i++) {
      const extra = document.createElement('span');
      extra.className = 'typing-char extra incorrect';
      extra.textContent = typedChars[i];
      activeWordEl.appendChild(extra);
    }
  }
}

// ===== KEYDOWN HANDLER =====
function handleKey(e) {
  if (!typingState.focused) return;
  if (typingState.ended) return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  const key = e.key;

  // Only a printable character (not space) starts the test
  if (!typingState.started) {
    if (key.length === 1 && key !== ' ') {
      startTest();
      // fall through to process the character below
    } else {
      return; // ignore Backspace, Space, etc. before test starts
    }
  }

  if (key === ' ') {
    e.preventDefault();
    handleSpace();
    return;
  }

  if (key === 'Backspace') {
    e.preventDefault();
    handleBackspace();
    return;
  }

  // Ignore non-printable (arrow keys, F1-F12, etc.)
  if (key.length !== 1) return;

  // Normal printable character
  playKeySound();
  typingState.currentInput += key;
  renderCurrentWord();
  updateCaret();
  calculateLiveStats();
}

// ===== SPACE: advance to next word =====
function handleSpace() {
  const typed = typingState.currentInput;
  if (typed.length === 0) return; // no leading spaces

  playSpaceSound();

  const wordText = typingState.words[typingState.wordIndex];
  const wordChars = wordText.split('');
  const typedChars = typed.split('');

  let correctCount = 0;
  wordChars.forEach((c, idx) => {
    if (idx < typedChars.length && typedChars[idx] === c) correctCount++;
  });

  typingState.correctCharacters += correctCount;
  typingState.typedCharacters += Math.max(typed.length, wordText.length) + 1;

  // Mark current word done
  const activeWordEl = document.getElementById(`word-${typingState.wordIndex}`);
  if (activeWordEl) {
    // Lock correct/incorrect colours on completed word chars
    activeWordEl.classList.remove('active');
    activeWordEl.classList.add('completed');
  }

  typingState.wordIndex++;
  typingState.currentInput = '';

  const nextWord = document.getElementById(`word-${typingState.wordIndex}`);
  if (nextWord) {
    nextWord.classList.add('active');
  } else {
    endTest();
    return;
  }

  updateCaret();
  calculateLiveStats();
}

// ===== BACKSPACE =====
function handleBackspace() {
  if (typingState.currentInput.length > 0) {
    typingState.currentInput = typingState.currentInput.slice(0, -1);
    renderCurrentWord();
    updateCaret();
  }
}

// ===== LIVE STATS =====
function calculateLiveStats() {
  const timeElapsed = typingState.timeLimit - typingState.timeLeft;
  if (timeElapsed <= 0) return;

  const typed = typingState.currentInput.split('');
  const word = (typingState.words[typingState.wordIndex] || '').split('');
  const currentCorrect = typed.filter((c, i) => c === word[i]).length;

  const totalCorrect = typingState.correctCharacters + currentCorrect;
  const totalTyped = typingState.typedCharacters + typingState.currentInput.length;

  const wpm = Math.round((totalCorrect / 5) / (timeElapsed / 60)) || 0;
  const acc = totalTyped > 0 ? Math.round((totalCorrect / totalTyped) * 100) : 100;

  const wpmEl = document.getElementById('wpm-live');
  const accEl = document.getElementById('acc-live');
  if (wpmEl) wpmEl.textContent = wpm;
  if (accEl) accEl.textContent = acc;
}

// ===== START TEST =====
function startTest() {
  typingState.started = true;
  // Hide the focus prompt overlay once typing starts
  const prompt = document.getElementById('focus-prompt');
  if (prompt) prompt.style.display = 'none';

  typingState.timer = setInterval(() => {
    typingState.timeLeft--;
    const el = document.getElementById('time-left');
    if (el) el.textContent = typingState.timeLeft;
    calculateLiveStats();
    if (typingState.timeLeft <= 0) endTest();
  }, 1000);
}

// ===== END TEST =====
function endTest() {
  clearInterval(typingState.timer);
  typingState.ended = true;
  typingState.focused = false;

  const wordsContainer = document.getElementById('words-container');
  wordsContainer?.classList.remove('is-focused');

  const caret = document.getElementById('caret');
  if (caret) caret.style.display = 'none';

  const timeElapsed = typingState.timeLimit;
  const totalCorrect = typingState.correctCharacters;
  const totalTyped = typingState.typedCharacters;
  const wpm = Math.round((totalCorrect / 5) / (timeElapsed / 60)) || 0;
  const acc = totalTyped > 0 ? Math.round((totalCorrect / totalTyped) * 100) : 100;
  const incorrectCount = totalTyped > totalCorrect ? (totalTyped - totalCorrect) : 0;
  const xpReward = Math.min(50, Math.round(wpm * (acc / 100) * 0.5));

  if (xpReward > 0 && typeof XPManager !== 'undefined') XPManager.addXP(xpReward, window.innerWidth / 2, 300);
  if (typeof StatsManager !== 'undefined') StatsManager.increment('typing_tests');
  if (typeof SafeStorage !== 'undefined') {
    const maxWPM = parseInt(SafeStorage.getItem('stat_max_wpm') || '0');
    if (wpm > maxWPM) SafeStorage.setItem('stat_max_wpm', wpm.toString());
  }
  if (typeof Achievements !== 'undefined') Achievements.checkAll();

  // Submit result to backend
  const token = UserManager.getToken();
  if (token) {
    fetch(`${API_BASE}/typing/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, wpm, accuracy: acc, xp_earned: xpReward })
    }).catch(e => {
      console.error('Gagal mengirim hasil mengetik:', e);
      if (typeof showToast !== 'undefined') showToast('Hasil mengetik disimpan secara lokal, akan disinkronkan nanti', 'xp');
      if (typeof RetryQueue !== 'undefined') {
        RetryQueue.add('/typing/submit', { token, wpm, accuracy: acc, xp_earned: xpReward });
      }
    });
  }

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('result-wpm', wpm);
  set('result-acc', `${acc}%`);
  set('result-xp', `+${xpReward} XP`);
  set('result-correct', totalCorrect);
  set('result-errors', incorrectCount);

  const resultCard = document.getElementById('result-card');
  const restartBtn = document.getElementById('restart-btn');
  if (wordsContainer) wordsContainer.style.display = 'none';
  if (resultCard) resultCard.style.display = 'block';
  if (restartBtn) restartBtn.style.display = 'none';

  if (typeof addActivity !== 'undefined') addActivity(`Latihan Mengetik Selesai — ${wpm} KPM, akurasi ${acc}% (+${xpReward} XP)`);
  if (typeof LocalLedger !== 'undefined') LocalLedger.addBlock('typing_practice', `WPM: ${wpm}, Acc: ${acc}%`);
  if (wpm >= 60 && acc >= 90 && typeof launchConfetti !== 'undefined') launchConfetti();
}

// ===== RESET TEST =====
function resetTest() {
  clearInterval(typingState.timer);

  typingState.started = false;
  typingState.ended = false;
  typingState.focused = false;
  typingState.timeLeft = typingState.timeLimit;
  typingState.wordIndex = 0;
  typingState.currentInput = '';
  typingState.correctCharacters = 0;
  typingState.typedCharacters = 0;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('time-left', typingState.timeLimit);
  set('wpm-live', '0');
  set('acc-live', '100');

  const resultCard = document.getElementById('result-card');
  const wordsContainer = document.getElementById('words-container');
  const restartBtn = document.getElementById('restart-btn');
  const focusPrompt = document.getElementById('focus-prompt');
  const caret = document.getElementById('caret');

  if (resultCard) resultCard.style.display = 'none';
  if (wordsContainer) {
    wordsContainer.style.display = 'block';
    wordsContainer.scrollTop = 0;
    wordsContainer.classList.remove('is-focused');
  }
  if (restartBtn) restartBtn.style.display = 'inline-block';
  if (focusPrompt) focusPrompt.style.display = 'flex';
  if (caret) { caret.style.display = 'block'; caret.style.left = '0px'; caret.style.top = '0px'; }

  generateWords();
  setTimeout(updateCaret, 80);
}

// ===== INIT & EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
  const wordsContainer = document.getElementById('words-container');
  const focusPrompt = document.getElementById('focus-prompt');

  // Click the words box → activate focus
  wordsContainer?.addEventListener('click', (e) => {
    if (typingState.ended) return;
    e.stopPropagation(); // prevent immediate blur from document click handler
    typingState.focused = true;
    wordsContainer.classList.add('is-focused');
    if (focusPrompt && !typingState.started) focusPrompt.style.display = 'none';
    updateCaret();
  });

  // Click anywhere else → deactivate focus
  document.addEventListener('click', () => {
    if (typingState.focused) {
      typingState.focused = false;
      wordsContainer?.classList.remove('is-focused');
      // Show the prompt again only if test hasn't started
      if (!typingState.started && focusPrompt) focusPrompt.style.display = 'flex';
    }
  });

  // All typing captured via keydown on document
  document.addEventListener('keydown', handleKey);

  // Buttons
  document.getElementById('restart-btn')?.addEventListener('click', () => { resetTest(); });
  document.getElementById('btn-try-again')?.addEventListener('click', () => { resetTest(); });

  // Time setting buttons
  document.querySelectorAll('.typing-setting-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typingState.started && !typingState.ended) return;
      document.querySelectorAll('.typing-setting-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      typingState.timeLimit = parseInt(btn.getAttribute('data-time'));
      resetTest();
    });
  });

  // Sound toggle
  document.getElementById('sound-toggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    typingState.soundEnabled = !typingState.soundEnabled;
    e.currentTarget.textContent = typingState.soundEnabled ? '🔊' : '🔇';
    if (typeof showToast !== 'undefined') showToast(typingState.soundEnabled ? 'Suara Aktif 🔊' : 'Suara Dimatikan 🔇', 'xp');
  });

  resetTest();
});
