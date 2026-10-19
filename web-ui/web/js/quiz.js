// =============================================
// LEXIFY — Quiz Logic (quiz.js)
// =============================================

// ===== WEB AUDIO SFX =====
let sfxCtx = null;

function initAudio() {
  if (!sfxCtx) {
    try {
      sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }
  // Resume context if suspended (browser auto-play policy)
  if (sfxCtx && sfxCtx.state === 'suspended') {
    sfxCtx.resume();
  }
}

function playSFX(key) {
  initAudio();
  if (!sfxCtx) return;
  const now = sfxCtx.currentTime;
  const osc = sfxCtx.createOscillator();
  const gain = sfxCtx.createGain();
  
  osc.connect(gain);
  gain.connect(sfxCtx.destination);
  
  if (key === 'correct') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (key === 'wrong') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (key === 'win') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.setValueAtTime(600, now + 0.1);
    osc.frequency.setValueAtTime(800, now + 0.2);
    osc.frequency.setValueAtTime(1200, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.6);
  } else if (key === 'lose') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.5);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.6);
  }
}

const QUIZ_API = (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8091'
  : 'https://alright-washday-amicably.ngrok-free.dev';

let quizState = {
  questions: [],
  index: 0,
  score: 0,
  hearts: 3,
  combo: 0,
  maxCombo: 0,
  total: 10,
  answered: false,
  mode: 'loading', // loading, question, end
  correctAnswers: 0,
  quizEnded: false
};

// ===== START QUIZ =====
function startQuiz() {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('quiz-area').style.display = 'block';
  document.getElementById('end-screen').style.display = 'none';
  hideFeedback();

  // Show loading
  document.getElementById('question-card').innerHTML =
    '<div style="text-align:center;padding:60px;"><div style="font-size:2.5rem;animation:pulse 1s infinite;">🐦‍⬛</div><p style="color:var(--text-secondary);margin-top:12px;font-weight:600;">Memuat kuis...</p></div>';

  // 8 seconds fetch timeout using AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  fetch(`${QUIZ_API}/quiz`, { signal: controller.signal })
    .then(res => {
      clearTimeout(timeoutId);
      return res.text();
    })
    .then(data => {
      const raw = data.split(';').filter(q => q.trim());
      if (raw.length === 0) throw new Error('No questions');

      // Build questions with mixed types
      quizState.questions = raw.map((q, i) => {
        const parts = q.split(',');
        const word = parts[0]?.trim();
        const answer = parts[1]?.trim();
        if (!word || !answer) return null;

        // Mix question types: multiple choice, text input, reverse direction
        const allAnswers = raw.map(r => r.split(',')[1]?.trim()).filter(Boolean);
        const allWords = raw.map(r => r.split(',')[0]?.trim()).filter(Boolean);
        const typeRoll = Math.random();
        let type, question, correctAnswer, options;

        if (typeRoll < 0.4) {
          // Multiple choice: English -> Indonesian
          type = 'multiple';
          question = `What is the meaning of`;
          correctAnswer = answer;
          options = generateOptions(answer, allAnswers);
        } else if (typeRoll < 0.7) {
          // Text input: English -> Indonesian
          type = 'input';
          question = `Type the Indonesian translation of`;
          correctAnswer = answer;
          options = null;
        } else {
          // Reverse: Indonesian -> English (multiple choice)
          type = 'multiple';
          question = `What is the English word for`;
          correctAnswer = word;
          options = generateOptions(word, allWords);
          // swap for display
          return { type, question, displayWord: answer, correctAnswer, options, word: answer };
        }

        return { type, question, displayWord: word, correctAnswer, options, word };
      }).filter(Boolean);

      // Limit and shuffle
      quizState.questions = shuffleArray(quizState.questions).slice(0, 10);
      quizState.total = quizState.questions.length;
      quizState.index = 0;
      quizState.score = 0;
      quizState.hearts = 3;
      quizState.combo = 0;
      quizState.maxCombo = 0;
      quizState.correctAnswers = 0;
      quizState.answered = false;
      quizState.quizEnded = false;

      updateHeartsUI();
      updateProgressUI();
      showQuestion();
    })
    .catch(err => {
      clearTimeout(timeoutId);
      console.error('Quiz load error:', err);
      let errorMsg = 'Tidak dapat memuat kuis';
      let subMsg = 'Pastikan server API berjalan di port 8091';
      if (err.name === 'AbortError') {
        errorMsg = 'Waktu Muat Kuis Habis';
        subMsg = 'Server terlalu lama merespons. Silakan coba lagi.';
      }
      document.getElementById('question-card').innerHTML = `
        <div style="text-align:center;padding:60px;">
          <div style="font-size:3rem;">⚠️</div>
          <p style="font-weight:700;margin-top:12px;">${errorMsg}</p>
          <p style="color:var(--text-secondary);margin-top:4px;">${subMsg}</p>
          <br>
          <button class="btn btn-primary btn-try-again">Coba Lagi</button>
        </div>`;
    });
}

// ===== GENERATE OPTIONS =====
function generateOptions(correct, pool) {
  let others = pool.filter(a => a.toLowerCase() !== correct.toLowerCase());
  others = [...new Set(others)]; // Remove duplicates
  
  const shuffled = shuffleArray(others);
  let picks = shuffled.slice(0, 3);
  
  // Pad with fallback words if choice pool is too small (< 4 total items)
  if (picks.length < 3) {
    const fallbacks = ['word', 'learning', 'dictionary', 'knowledge', 'student', 'teacher', 'class', 'read', 'write', 'speak'];
    for (const f of fallbacks) {
      if (picks.length >= 3) break;
      if (f.toLowerCase() !== correct.toLowerCase() && !picks.includes(f)) {
        picks.push(f);
      }
    }
  }

  const options = [...picks, correct];
  return shuffleArray(options);
}

// ===== SHOW QUESTION =====
function showQuestion() {
  const q = quizState.questions[quizState.index];
  quizState.answered = false;
  hideFeedback();
  updateProgressUI();

  const card = document.getElementById('question-card');

  if (q.type === 'multiple') {
    card.innerHTML = `
      <div class="quiz-question">
        ${q.question} <span class="highlight">${escHTML(q.displayWord)}</span> ?
      </div>
      <div class="options-grid" id="options-container">
        ${q.options.map((opt, i) =>
          `<button class="option-btn" id="opt-${i}" data-index="${i}" data-option="${escHTML(opt)}">${escHTML(opt)}</button>`
        ).join('')}
      </div>
      <div style="margin-top: 24px; display: flex; justify-content: flex-end;">
        <button class="btn btn-outline btn-sm btn-skip">Lewati ➡️</button>
      </div>`;
  } else {
    card.innerHTML = `
      <div class="quiz-question">
        ${q.question} <span class="highlight">${escHTML(q.displayWord)}</span> ?
      </div>
      <div style="max-width:400px;margin:0 auto;">
        <input type="text" class="input input-lg" id="quiz-text-input"
          placeholder="Ketik jawabanmu..." autocomplete="off">
        <div style="margin-top:12px; display:flex; gap:12px;">
          <button class="btn btn-outline btn-skip" style="flex:1;">Lewati ➡️</button>
          <button class="btn btn-primary btn-check-text" style="flex:2;">Periksa</button>
        </div>
      </div>`;
    setTimeout(() => document.getElementById('quiz-text-input')?.focus(), 100);
  }
}

// ===== SELECT OPTION (Multiple Choice) =====
function selectOption(idx, selected) {
  if (quizState.answered) return;
  quizState.answered = true;

  const q = quizState.questions[quizState.index];
  const isCorrect = selected.toLowerCase() === q.correctAnswer.toLowerCase();

  // Disable all options
  document.querySelectorAll('.option-btn').forEach(b => b.classList.add('disabled'));

  // Highlight correct/wrong
  document.querySelectorAll('.option-btn').forEach((b, i) => {
    const optText = q.options[i];
    if (optText.toLowerCase() === q.correctAnswer.toLowerCase()) {
      b.classList.add('correct');
    }
  });

  if (!isCorrect) {
    const wrongBtn = document.getElementById(`opt-${idx}`);
    if (wrongBtn) wrongBtn.classList.add('wrong');
  }

  processAnswer(isCorrect, q.correctAnswer);
}

// ===== SUBMIT TEXT ANSWER =====
function submitTextAnswer() {
  if (quizState.answered) return;

  const input = document.getElementById('quiz-text-input');
  if (!input) return;
  const userAnswer = input.value.trim();
  
  // Validate empty input (prevent blank submissions)
  if (!userAnswer) {
    input.classList.add('wrong');
    setTimeout(() => input.classList.remove('wrong'), 500);
    input.focus();
    return;
  }

  quizState.answered = true;

  const q = quizState.questions[quizState.index];
  
  // Answer tolerance check (trim, case-insensitive, punctuation-free, spaces normalized)
  const cleanAnswerText = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .trim()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
      .replace(/\s+/g, ' ');
  };

  const isCorrect = cleanAnswerText(userAnswer) === cleanAnswerText(q.correctAnswer);

  input.disabled = true;
  input.style.borderColor = isCorrect ? 'var(--accent-green)' : 'var(--accent-red)';

  processAnswer(isCorrect, q.correctAnswer);
}

// ===== SKIP QUESTION =====
function skipQuestion() {
  if (quizState.answered) return;
  quizState.answered = true;

  const q = quizState.questions[quizState.index];

  // Disabling elements
  if (q.type === 'multiple') {
    document.querySelectorAll('.option-btn').forEach(b => b.classList.add('disabled'));
    document.querySelectorAll('.option-btn').forEach((b, i) => {
      if (q.options[i].toLowerCase() === q.correctAnswer.toLowerCase()) {
        b.classList.add('correct');
      }
    });
  } else {
    const input = document.getElementById('quiz-text-input');
    if (input) {
      input.disabled = true;
      input.style.borderColor = 'var(--accent-red)';
    }
  }

  // Treat skip as wrong answer
  quizState.combo = 0;
  quizState.hearts--;
  updateHeartsUI();

  showFeedback(false, 'Dilewati', `Jawaban benar: ${q.correctAnswer}`);
}

// ===== PROCESS ANSWER =====
function processAnswer(isCorrect, correctAnswer) {
  if (isCorrect) {
    quizState.correctAnswers++;
    quizState.combo++;
    if (quizState.combo > quizState.maxCombo) quizState.maxCombo = quizState.combo;

    let xpGain = 10;
    if (quizState.combo >= 3) xpGain = 15;
    if (quizState.combo >= 5) xpGain = 20;

    quizState.score += xpGain;
    playSFX('correct');
    showFeedback(true, `Benar! +${xpGain} XP`, quizState.combo >= 3 ? `🔥 ${quizState.combo}x Kombo!` : '');
  } else {
    quizState.combo = 0;
    quizState.hearts--;
    updateHeartsUI();
    playSFX('wrong');
    showFeedback(false, 'Salah', `Jawaban benar: ${correctAnswer}`);
  }
}

// ===== ADVANCE QUIZ =====
function advanceQuiz() {
  hideFeedback();
  
  if (quizState.hearts <= 0) {
    endQuiz();
    return;
  }

  quizState.index++;
  if (quizState.index < quizState.total) {
    showQuestion();
  } else {
    endQuiz();
  }
}

// ===== QUIT QUIZ =====
function quitQuiz() {
  if (confirm('Yakin ingin keluar dari kuis? Kemajuanmu saat ini akan hilang.')) {
    location.reload();
  }
}

// ===== FEEDBACK BAR =====
function showFeedback(isCorrect, text, sub) {
  const bar = document.getElementById('feedback-bar');
  bar.className = 'feedback-bar show ' + (isCorrect ? 'correct-bar' : 'wrong-bar');
  bar.innerHTML = `
    <div>
      <div class="feedback-text">${isCorrect ? '✅' : '❌'} ${text}</div>
      ${sub ? `<div class="feedback-sub">${sub}</div>` : ''}
    </div>
        <button class="btn btn-primary" id="feedback-continue-btn" style="background:white; color:var(--bg-primary); border:none; box-shadow:none;">Lanjut ➡️</button>`;
}

function hideFeedback() {
  const bar = document.getElementById('feedback-bar');
  if (bar) bar.className = 'feedback-bar';
}

// ===== HEARTS UI =====
function updateHeartsUI() {
  const container = document.getElementById('hearts-display');
  container.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const span = document.createElement('span');
    span.className = 'heart' + (i >= quizState.hearts ? ' lost' : '');
    // Lost hearts show broken heart icon 💔 for clarity
    span.textContent = i >= quizState.hearts ? '💔' : '❤️';
    container.appendChild(span);
  }
}

// ===== PROGRESS UI =====
function updateProgressUI() {
  const pct = ((quizState.index) / quizState.total) * 100;
  document.getElementById('quiz-progress-fill').style.width = pct + '%';
  document.getElementById('quiz-counter').textContent = `${quizState.index + 1} / ${quizState.total}`;
}

// ===== END QUIZ =====
function endQuiz() {
  if (quizState.quizEnded) return;
  quizState.quizEnded = true;

  document.getElementById('quiz-area').style.display = 'none';
  document.getElementById('end-screen').style.display = 'block';
  hideFeedback();

  // Play animation
  const canvas = document.getElementById('quiz-complete-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const video = document.createElement('video');
    video.src = 'assets/quiz_complete.mp4';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.crossOrigin = 'anonymous';

    video.style.display = 'none';
    document.body.appendChild(video);

    video.addEventListener('loadedmetadata', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.play().catch(e => console.log('Auto-play prevented:', e));
      renderVideo();
    });

    function renderVideo() {
      if (!quizState.quizEnded) return; // stop if user restarts
      if (video.readyState >= 2 && !video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = frame.data;
        
        // Green screen removal (Chroma key)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          
          // Detect strong green color
          // Green channel is significantly higher than red and blue
          if (g > 100 && g > r * 1.4 && g > b * 1.4) {
            data[i+3] = 0; // Transparent
          } else if (g > 80 && g > r * 1.2 && g > b * 1.2) {
            // Edge smoothing
            data[i+3] = Math.max(0, 255 - (g - r) * 2);
            // Color suppression (reduce green spill)
            data[i+1] = Math.min(g, (r + b) / 2);
          }
        }
        ctx.putImageData(frame, 0, 0);
      }
      requestAnimationFrame(renderVideo);
    }
  }

  // Play win/lose sound based on hearts remaining
  if (quizState.hearts > 0 && quizState.correctAnswers > 0) {
    playSFX('win');
  } else {
    playSFX('lose');
  }

  // Correct star calculation (correct answers / total questions)
  const pct = quizState.correctAnswers / quizState.total;
  const stars = pct >= 1 ? 3 : pct >= 0.7 ? 2 : pct > 0 ? 1 : 0;

  // Stars
  const starsEl = document.getElementById('end-stars');
  starsEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const star = document.createElement('span');
    star.className = 'star' + (i < stars ? ' earned' : '');
    star.textContent = '⭐';
    star.style.animationDelay = (i * 0.2) + 's';
    starsEl.appendChild(star);
  }

  document.getElementById('end-score-value').textContent = quizState.score;
  document.getElementById('end-combo').textContent = quizState.maxCombo > 1 ? `Kombo terbaik: ${quizState.maxCombo}x 🔥` : '';

  // Award XP
  if (quizState.score > 0) {
    XPManager.addXP(quizState.score, window.innerWidth / 2, 300);
  }

  // Track stats
  StatsManager.increment('quizzes');
  if (quizState.maxCombo > StatsManager.get('max_combo')) {
    StatsManager.set('max_combo', quizState.maxCombo);
  }
  
  // Perfect quiz check: checks if hearts === 3 (meaning no mistakes)
  if (quizState.hearts === 3) {
    StatsManager.increment('perfect_quizzes');
    launchConfetti();
  }

  // Submit result to backend
  const token = UserManager.getToken();
  if (token) {
    fetch(`${API_BASE}/quiz/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        score: quizState.score,
        correct_answers: quizState.correctAnswers,
        total_questions: quizState.total,
        stars: stars
      })
    })
    .then(res => {
      if (res.status === 401) { handle401(); }
    })
    .catch(e => {
      console.error('Failed to submit quiz result:', e);
      // Notify user in Indonesian that result is saved locally
      showToast('Hasil kuis disimpan secara lokal, akan disinkronkan nanti', 'xp');
      // Save to retry queue
      if (typeof RetryQueue !== 'undefined') {
        RetryQueue.add('/quiz/submit', {
          token,
          score: quizState.score,
          correct_answers: quizState.correctAnswers,
          total_questions: quizState.total,
          stars: stars
        });
      }
    });
  }

  // Log activity globally
  addActivity(`Quiz completed — ${quizState.score} XP, ${'⭐'.repeat(stars)}`);

  // Blockchain/Ledger
  if (typeof LocalLedger !== 'undefined') {
    LocalLedger.addBlock('quiz_complete', `Score: ${quizState.score}, Stars: ${stars}`);
  }
  Achievements.checkAll();
}

// ===== HELPERS =====
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Try Again delegation on error cards inside question-card
  document.getElementById('question-card')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-try-again')) {
      startQuiz();
    }
  });

  // Skip button delegation
  document.getElementById('question-card')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-skip')) {
      skipQuestion();
    }
  });

  // Multiple choice option button delegation
  document.getElementById('question-card')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.option-btn');
    if (btn && !btn.classList.contains('disabled')) {
      const idx = parseInt(btn.getAttribute('data-index'));
      const opt = btn.getAttribute('data-option');
      selectOption(idx, opt);
    }
  });

  // Text answer check button delegation
  document.getElementById('question-card')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-check-text')) {
      submitTextAnswer();
    }
  });

  // Quit button click listener
  document.getElementById('quiz-quit-btn')?.addEventListener('click', quitQuiz);

  // Continue button click listener in feedback bar
  document.getElementById('feedback-bar')?.addEventListener('click', (e) => {
    if (e.target.closest('#feedback-continue-btn')) {
      advanceQuiz();
    }
  });

  // Keyboard shortcuts (Enter to Continue/Submit, 1-4 for MC choice)
  document.addEventListener('keydown', (e) => {
    const quizArea = document.getElementById('quiz-area');
    if (quizArea && quizArea.style.display === 'block') {
      const feedbackBar = document.getElementById('feedback-bar');
      if (feedbackBar && feedbackBar.classList.contains('show')) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          advanceQuiz();
        }
        return;
      }

      if (quizState.answered) return;

      const q = quizState.questions[quizState.index];
      if (q) {
        if (q.type === 'multiple') {
          if (e.key >= '1' && e.key <= '4') {
            e.preventDefault();
            const idx = parseInt(e.key) - 1;
            const optBtn = document.getElementById(`opt-${idx}`);
            if (optBtn) optBtn.click();
          }
        } else if (q.type === 'input') {
          if (e.key === 'Enter') {
            e.preventDefault();
            submitTextAnswer();
          }
        }
      }
    }
  });
});
