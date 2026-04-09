(function () {
  const lessons = (window.APP_LESSONS || []).slice().sort((a, b) => a.sequence - b.sequence);
  const storageKey = "madinah-lab-session-v1";
  const root = document.getElementById("app");
  let recognition = null;

  const state = {
    section: "dashboard",
    mode: "flashcards",
    lessonId: lessons[0]?.id || "",
    flashDirection: "mixed",
    flashShuffle: true,
    flashDeck: [],
    flashIndex: 0,
    flashRevealed: false,
    matchRound: [],
    matchSelection: [],
    matchSolved: [],
    matchFeedback: "",
    typingDirection: "en-to-ar",
    typingStrict: true,
    typingIndex: 0,
    typingInput: "",
    typingFeedback: null,
    pronunciationIndex: 0,
    pronunciationFeedback: null,
    pronunciationTranscript: "",
    pronunciationListening: false,
    progress: loadSession()
  };

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadSession() {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return { cards: {}, activityDates: [], sessionAnswers: 0 };
      const parsed = JSON.parse(raw);
      return {
        cards: parsed.cards || {},
        activityDates: parsed.activityDates || [],
        sessionAnswers: parsed.sessionAnswers || 0
      };
    } catch {
      return { cards: {}, activityDates: [], sessionAnswers: 0 };
    }
  }

  function saveSession() {
    sessionStorage.setItem(storageKey, JSON.stringify(state.progress));
  }

  function getLesson() {
    return lessons.find((lesson) => lesson.id === state.lessonId) || lessons[0];
  }

  function cardId(lessonId, entry) {
    return `${lessonId}::${entry.arabic}`;
  }

  function trackAnswer(lessonId, entry, result) {
    const id = cardId(lessonId, entry);
    const current = state.progress.cards[id] || { known: 0, unknown: 0, seen: 0 };
    current.seen += 1;
    if (result === "known") current.known += 1;
    if (result === "unknown") current.unknown += 1;
    state.progress.cards[id] = current;
    state.progress.sessionAnswers += 1;
    if (!state.progress.activityDates.includes(today())) {
      state.progress.activityDates.push(today());
    }
    saveSession();
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function sample(items, count) {
    return shuffle(items).slice(0, Math.min(count, items.length));
  }

  function normalizeArabicLoose(value) {
    return String(value)
      .normalize("NFKC")
      .replace(/[ًٌٍَُِّْـ]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[ؤئ]/g, "ء")
      .replace(/[؟،.:;!]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeArabicStrict(value) {
    return String(value)
      .normalize("NFKC")
      .replace(/[؟،.:;!]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeEnglish(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9'\- ]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compareAnswer(expected, input, strict, targetLanguage) {
    if (targetLanguage === "arabic") {
      return strict
        ? normalizeArabicStrict(expected) === normalizeArabicStrict(input)
        : normalizeArabicLoose(expected) === normalizeArabicLoose(input);
    }
    return normalizeEnglish(expected) === normalizeEnglish(input);
  }

  function computeStreak(dates) {
    if (!dates.length) return 0;
    const set = new Set(dates);
    let cursor = new Date();
    let streak = 0;
    while (set.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function computeLessonStats(lesson) {
    const totals = lesson.vocabulary.reduce(
      (accumulator, entry) => {
        const stats = state.progress.cards[cardId(lesson.id, entry)] || { known: 0, unknown: 0, seen: 0 };
        accumulator.known += stats.known;
        accumulator.unknown += stats.unknown;
        accumulator.seen += stats.seen;
        if (stats.known >= 2 && stats.known > stats.unknown) {
          accumulator.mastered += 1;
        }
        return accumulator;
      },
      { known: 0, unknown: 0, seen: 0, mastered: 0 }
    );

    const totalAttempts = totals.known + totals.unknown;
    return { ...totals, percent: totalAttempts ? Math.round((totals.known / totalAttempts) * 100) : 0 };
  }

  function computeOverallStats() {
    const allVocabulary = lessons.flatMap((lesson) => lesson.vocabulary.map((entry) => ({ lesson, entry })));
    const reviewedCards = allVocabulary.filter(({ lesson, entry }) => {
      const stats = state.progress.cards[cardId(lesson.id, entry)] || { seen: 0 };
      return stats.seen > 0;
    }).length;
    const masteredCards = allVocabulary.filter(({ lesson, entry }) => {
      const stats = state.progress.cards[cardId(lesson.id, entry)] || { known: 0, unknown: 0 };
      return stats.known >= 2 && stats.known > stats.unknown;
    }).length;
    return {
      reviewedCards,
      masteredCards,
      streak: computeStreak(state.progress.activityDates),
      sessionAnswers: state.progress.sessionAnswers
    };
  }

  function currentFlashCard() {
    if (!state.flashDeck.length) resetFlashcards();
    return state.flashDeck[state.flashIndex] || state.flashDeck[0];
  }

  function resetFlashcards() {
    const lesson = getLesson();
    const deck = lesson.vocabulary.map((entry, index) => ({
      entry,
      direction:
        state.flashDirection === "mixed"
          ? (Math.random() > 0.5 ? "en-to-ar" : "ar-to-en")
          : state.flashDirection,
      id: `${lesson.id}-${index}`
    }));
    state.flashDeck = state.flashShuffle ? shuffle(deck) : deck;
    state.flashIndex = 0;
    state.flashRevealed = false;
  }

  function advanceFlashcard(result) {
    const lesson = getLesson();
    const card = currentFlashCard();
    if (result) trackAnswer(lesson.id, card.entry, result);
    const nextIndex = state.flashIndex + 1;
    if (nextIndex >= state.flashDeck.length) {
      resetFlashcards();
    } else {
      state.flashIndex = nextIndex;
      state.flashRevealed = false;
    }
  }

  function resetMatchRound() {
    const lesson = getLesson();
    const picks = sample(lesson.vocabulary, lesson.vocabulary.length > 5 ? 6 : lesson.vocabulary.length);
    const leftSide = picks.map((entry, index) => ({ id: `${index}-ar`, pairId: index, side: "arabic", label: entry.arabic }));
    const rightSide = shuffle(picks).map((entry, index) => ({
      id: `${index}-en`,
      pairId: picks.findIndex((candidate) => candidate.arabic === entry.arabic),
      side: "english",
      label: entry.english
    }));
    state.matchRound = shuffle([...leftSide, ...rightSide]);
    state.matchSelection = [];
    state.matchSolved = [];
    state.matchFeedback = "";
  }

  function resetTyping() {
    state.typingIndex = 0;
    state.typingInput = "";
    state.typingFeedback = null;
  }

  function nextTypingCard() {
    state.typingIndex = (state.typingIndex + 1) % getLesson().vocabulary.length;
    state.typingInput = "";
    state.typingFeedback = null;
  }

  function pronunciationPool() {
    const lesson = getLesson();
    const phrasePool = lesson.phrases.map((phrase) => ({ arabic: phrase.arabic, english: phrase.english }));
    return phrasePool.length ? phrasePool : lesson.vocabulary;
  }

  function nextPronunciationPrompt() {
    state.pronunciationIndex = (state.pronunciationIndex + 1) % pronunciationPool().length;
    state.pronunciationFeedback = null;
    state.pronunciationTranscript = "";
  }

  function resetPronunciation() {
    state.pronunciationIndex = 0;
    state.pronunciationFeedback = null;
    state.pronunciationTranscript = "";
  }

  function similarity(a, b) {
    if (!a && !b) return 100;
    if (!a || !b) return 0;
    const maxLength = Math.max(a.length, b.length);
    let matches = 0;
    for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
      if (a[index] === b[index]) matches += 1;
    }
    return Math.max(0, Math.round((matches / maxLength) * 100));
  }

  function supportsSpeechRecognition() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function getRecognition() {
    if (!supportsSpeechRecognition()) return null;
    if (recognition) return recognition;
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new Constructor();
    recognition.lang = "ar-SA";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ")
        .trim();
      state.pronunciationTranscript = transcript;
      const target = pronunciationPool()[state.pronunciationIndex];
      const correct = normalizeArabicLoose(target.arabic) === normalizeArabicLoose(transcript);
      state.pronunciationFeedback = {
        correct,
        score: similarity(normalizeArabicLoose(target.arabic), normalizeArabicLoose(transcript)),
        target: target.arabic
      };
      if (correct) trackAnswer(getLesson().id, target, "known");
      render();
    };
    recognition.onstart = () => {
      state.pronunciationListening = true;
      render();
    };
    recognition.onend = () => {
      state.pronunciationListening = false;
      render();
    };
    recognition.onerror = (event) => {
      state.pronunciationListening = false;
      state.pronunciationFeedback = {
        correct: false,
        score: 0,
        target: pronunciationPool()[state.pronunciationIndex].arabic,
        message: event.error === "not-allowed" ? "Microphone permission was blocked." : "Speech recognition could not finish."
      };
      render();
    };
    return recognition;
  }

  function speakArabic(text) {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ar-SA";
    utterance.rate = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function getTypingCard() {
    return getLesson().vocabulary[state.typingIndex % getLesson().vocabulary.length];
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderDashboard() {
    const lesson = getLesson();
    const overall = computeOverallStats();
    return `
      <section class="panel dashboard-stack">
        <div>
          <div class="panel-head">
            <div>
              <h2>Study Dashboard</h2>
              <p>Built around Madinah Book 1 first, with session-only stats so it stays simple to host on GitHub Pages.</p>
            </div>
          </div>
          <div class="lesson-strip">
            ${lessons
              .map(
                (entry) => `
                  <button class="lesson-chip ${entry.id === lesson.id ? "is-active" : ""}" data-action="pick-lesson" data-lesson-id="${entry.id}">
                    <strong>${entry.label}</strong>
                    <span>${entry.focus}</span>
                  </button>
                `
              )
              .join("")}
          </div>
          <div class="dashboard-focus">
            <div class="focus-card">
              <div class="eyebrow">Current Focus</div>
              <h3>${lesson.label}</h3>
              <p>${lesson.focus}</p>
              <p class="muted" style="margin-top:10px;">Source: ${lesson.sourcePage}. Session storage keeps progress alive until the tab or browser session is cleared.</p>
              <div class="focus-actions">
                ${[
                  ["flashcards", "Flashcards", "Start fast recall with red / check / green controls."],
                  ["matching", "Matching Game", "Connect Arabic and English pairs from the current lesson."],
                  ["typing", "Typing Drill", "Practice Arabic spelling with optional strict haraqat."],
                  ["pronunciation", "Pronunciation", "Use browser speech recognition for live feedback."]
                ]
                  .map(
                    ([mode, label, note]) => `
                      <button class="action-link" data-action="start-mode" data-mode="${mode}">
                        <span>
                          <strong>${label}</strong>
                          <small>${note}</small>
                        </span>
                        <span>Open</span>
                      </button>
                    `
                  )
                  .join("")}
              </div>
            </div>
          </div>
        </div>
        <div>
          <div class="summary-grid" style="padding:0 22px 22px;">
            <div class="summary-card">
              <strong>${overall.reviewedCards}</strong>
              <span>Cards touched this session</span>
            </div>
            <div class="summary-card">
              <strong>${overall.masteredCards}</strong>
              <span>Cards looking strong</span>
            </div>
            <div class="summary-card">
              <strong>${overall.streak}</strong>
              <span>Consecutive study days in this session log</span>
            </div>
          </div>
          <div class="up-next">
            <div class="locked-card">
              <strong>Later module: Qur'anic high-frequency words</strong>
              <p class="muted" style="margin-top:8px;">The structure is ready for it, but the current build keeps the priority on Fusha plus Madinah Book 1 lesson vocabulary.</p>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderFlashcards() {
    const lesson = getLesson();
    const card = currentFlashCard();
    const promptIsArabic = card.direction === "ar-to-en";
    const prompt = promptIsArabic ? card.entry.arabic : card.entry.english;
    const answer = promptIsArabic ? card.entry.english : card.entry.arabic;
    return `
      <div class="toolbar">
        <div class="toolbar-row">
          <div class="segmented">
            ${[
              ["en-to-ar", "EN → AR"],
              ["ar-to-en", "AR → EN"],
              ["mixed", "Mixed"]
            ]
              .map(
                ([direction, label]) => `
                  <button class="${state.flashDirection === direction ? "is-active" : ""}" data-action="set-flash-direction" data-direction="${direction}">
                    ${label}
                  </button>
                `
              )
              .join("")}
          </div>
          <button class="pill-button ${state.flashShuffle ? "is-on" : ""}" data-action="toggle-flash-shuffle">Shuffle deck</button>
          <button class="mini-button" data-action="speak-current">Hear Arabic</button>
        </div>
      </div>
      <div class="flashcard">
        <div class="flashcard-top">
          <div class="flashcard-tag">${lesson.label}</div>
          <div class="flashcard-tag">${state.flashIndex + 1} / ${state.flashDeck.length}</div>
        </div>
        <div class="flashcard-main">
          <div class="subcopy">${card.direction === "en-to-ar" ? "English to Arabic" : "Arabic to English"}</div>
          <div class="prompt ${promptIsArabic ? "arabic-text" : ""}">${prompt}</div>
          <div class="answer ${!state.flashRevealed ? "is-hidden" : ""} ${!promptIsArabic ? "arabic-text" : ""}">
            ${answer}
          </div>
          <div class="subcopy">Focus: ${lesson.focus}</div>
        </div>
        <div class="flash-actions">
          <button class="flash-action is-red" data-action="grade-flashcard" data-result="unknown">
            Don't know
            <small>mark weak</small>
          </button>
          <button class="flash-action is-gold" data-action="toggle-flash-answer">
            ${state.flashRevealed ? "Hide meaning" : "Check definition"}
            <small>peek first</small>
          </button>
          <button class="flash-action is-green" data-action="grade-flashcard" data-result="known">
            I know it
            <small>mark strong</small>
          </button>
        </div>
      </div>
      <div class="phrase-stack" style="margin-top:18px;">
        ${lesson.phrases
          .slice(0, 2)
          .map(
            (phrase) => `
              <div class="phrase-line">
                <strong class="arabic-text">${phrase.arabic}</strong>
                <span class="muted">${phrase.english}</span>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderMatching() {
    const solvedCount = state.matchSolved.length;
    return `
      <div class="toolbar">
        <div class="toolbar-row">
          <button class="mini-button" data-action="reset-matching">New round</button>
          <span class="muted">${solvedCount / 2} pairs solved</span>
        </div>
      </div>
      <div class="match-grid">
        ${state.matchRound
          .map((item) => {
            const isSolved = state.matchSolved.includes(item.id);
            const isSelected = state.matchSelection.includes(item.id);
            return `
              <button
                class="match-card ${item.side === "arabic" ? "arabic-text" : ""} ${isSolved ? "is-matched" : ""} ${isSelected ? "is-selected" : ""}"
                data-action="pick-match"
                data-card-id="${item.id}"
              >
                ${item.label}
              </button>
            `;
          })
          .join("")}
      </div>
      ${state.matchFeedback ? `<div class="feedback ${state.matchFeedback.includes("Nice") ? "is-good" : "is-bad"}">${state.matchFeedback}</div>` : ""}
    `;
  }

  function renderTyping() {
    const card = getTypingCard();
    const targetLanguage = state.typingDirection === "en-to-ar" ? "arabic" : "english";
    const prompt = targetLanguage === "arabic" ? card.english : card.arabic;
    return `
      <div class="toolbar">
        <div class="toolbar-row">
          <div class="segmented">
            ${[
              ["en-to-ar", "Type Arabic"],
              ["ar-to-en", "Type English"]
            ]
              .map(
                ([direction, label]) => `
                  <button class="${state.typingDirection === direction ? "is-active" : ""}" data-action="set-typing-direction" data-direction="${direction}">
                    ${label}
                  </button>
                `
              )
              .join("")}
          </div>
          <button class="pill-button ${state.typingStrict ? "is-on" : ""}" data-action="toggle-typing-strict">Strict haraqat</button>
          <button class="mini-button" data-action="next-typing">Next prompt</button>
        </div>
      </div>
      <div class="typing-card">
        <div class="typing-prompt">
          <strong>${targetLanguage === "arabic" ? "Type the Arabic word" : "Type the English meaning"}</strong>
          <div class="${targetLanguage === "english" ? "arabic-text" : ""}">${prompt}</div>
          <div class="muted" style="margin-top:8px;">${state.typingStrict ? "Strict mode expects the harakat too." : "Relaxed mode ignores most harakat differences."}</div>
        </div>
        <input
          class="typing-input"
          data-action="typing-input"
          dir="${targetLanguage === "arabic" ? "rtl" : "ltr"}"
          lang="${targetLanguage === "arabic" ? "ar" : "en"}"
          value="${escapeHtml(state.typingInput)}"
          placeholder="${targetLanguage === "arabic" ? "اكتب هنا" : "Type here"}"
        />
        ${
          targetLanguage === "arabic"
            ? `
              <div class="typing-pad">
                ${["َ", "ِ", "ُ", "ْ", "ّ", "ً", "ٍ", "ٌ", "ة", "ى"]
                  .map((character) => `<button data-action="insert-char" data-char="${character}">${character}</button>`)
                  .join("")}
              </div>
            `
            : ""
        }
        <div class="typing-actions">
          <button class="mini-button" data-action="submit-typing">Check answer</button>
          <button class="mini-button" data-action="reveal-typing">Reveal answer</button>
          <button class="mini-button" data-action="speak-current">Hear Arabic</button>
        </div>
        ${
          state.typingFeedback
            ? `
              <div class="feedback ${state.typingFeedback.correct ? "is-good" : "is-bad"}">
                ${state.typingFeedback.message}
                ${state.typingFeedback.expected ? `<div style="margin-top:6px;"><strong>Expected:</strong> ${state.typingFeedback.expected}</div>` : ""}
              </div>
            `
            : ""
        }
      </div>
    `;
  }

  function renderPronunciation() {
    const supported = supportsSpeechRecognition();
    const prompt = pronunciationPool()[state.pronunciationIndex];
    const score = state.pronunciationFeedback ? state.pronunciationFeedback.score : 0;
    return `
      <div class="pronunciation-card">
        <div class="toolbar">
          <div class="toolbar-row">
            <button class="mini-button" data-action="next-pronunciation">Next phrase</button>
            <button class="mini-button" data-action="speak-current">Hear Arabic</button>
            ${
              supported
                ? `<button class="pill-button ${state.pronunciationListening ? "is-on" : ""}" data-action="toggle-listening">${state.pronunciationListening ? "Listening..." : "Start mic"}</button>`
                : `<span class="muted">Speech recognition is not available in this browser.</span>`
            }
          </div>
        </div>
        <div class="pronunciation-target">
          <strong>Speak this:</strong>
          <div class="arabic-text">${prompt.arabic}</div>
          <p class="muted" style="margin-top:8px;">${prompt.english}</p>
        </div>
        <div class="summary-list" style="margin-top:18px;">
          <div class="summary-card">
            <strong>Live transcript</strong>
            <span>${state.pronunciationTranscript || "Waiting for speech..."}</span>
          </div>
        </div>
        <div class="meter"><span style="width:${score}%;"></span></div>
        ${
          state.pronunciationFeedback
            ? `
              <div class="feedback ${state.pronunciationFeedback.correct ? "is-good" : "is-bad"}">
                ${
                  state.pronunciationFeedback.message ||
                  (state.pronunciationFeedback.correct
                    ? "Strong match. The recognized Arabic was very close to the target."
                    : "Keep going. This browser check compares recognized text, so treat it as a coach rather than a final pronunciation grade.")
                }
              </div>
            `
            : ""
        }
      </div>
    `;
  }

  function renderModeBody() {
    if (state.mode === "flashcards") return renderFlashcards();
    if (state.mode === "matching") return renderMatching();
    if (state.mode === "typing") return renderTyping();
    return renderPronunciation();
  }

  function renderPractice() {
    const lesson = getLesson();
    const lessonStats = computeLessonStats(lesson);
    return `
      <section class="panel workspace">
        <div class="panel-head">
          <div>
            <h2>Practice Studio</h2>
            <p>One lesson at a time, mobile first, with multiple ways to lock the vocabulary in.</p>
          </div>
          <div class="eyebrow">Mastery ${lessonStats.percent}%</div>
        </div>
        <div class="practice-layout">
          <div class="lesson-strip" style="padding:0 0 16px;">
            ${lessons
              .map(
                (entry) => `
                  <button class="lesson-chip ${entry.id === lesson.id ? "is-active" : ""}" data-action="pick-lesson" data-lesson-id="${entry.id}">
                    <strong>${entry.label}</strong>
                    <span>${entry.vocabulary.length} vocab items</span>
                  </button>
                `
              )
              .join("")}
          </div>
          <div class="lesson-meta">
            <h3>${lesson.label}</h3>
            <p>${lesson.focus}</p>
            <p class="practice-note">Starter vocabulary was transcribed from your provided Madinah Book 1 English key pages. The structure is ready for more lesson imports next.</p>
          </div>
          <div class="mode-row">
            ${[
              ["flashcards", "Flashcards", "Rapid recall"],
              ["matching", "Matching", "Apply and pair"],
              ["typing", "Typing", "Spell with haraqat"],
              ["pronunciation", "Pronunciation", "Speak and compare"]
            ]
              .map(
                ([mode, label, note]) => `
                  <button class="mode-chip ${state.mode === mode ? "is-active" : ""}" data-action="change-mode" data-mode="${mode}">
                    <strong>${label}</strong>
                    <span>${note}</span>
                  </button>
                `
              )
              .join("")}
          </div>
          <div class="practice-body">${renderModeBody()}</div>
        </div>
      </section>
    `;
  }

  function renderProgress() {
    const overall = computeOverallStats();
    return `
      <section class="panel progress-board">
        <div class="panel-head">
          <div>
            <h2>Session Progress</h2>
            <p>Because you’re hosting on GitHub Pages, this build stores progress only for the current browser session.</p>
          </div>
        </div>
        <div class="summary-grid" style="padding:0 22px 22px;">
          <div class="summary-card">
            <strong>${overall.sessionAnswers}</strong>
            <span>Total answers this session</span>
          </div>
          <div class="summary-card">
            <strong>${overall.reviewedCards}</strong>
            <span>Vocabulary items seen</span>
          </div>
          <div class="summary-card">
            <strong>${overall.masteredCards}</strong>
            <span>Items currently trending strong</span>
          </div>
        </div>
        <div class="summary-grid" style="padding:0 22px 22px;">
          ${lessons
            .map((lesson) => {
              const stats = computeLessonStats(lesson);
              return `
                <div class="progress-row">
                  <strong>${lesson.label}</strong>
                  <span class="muted">${lesson.focus}</span>
                  <div class="progress-bar" style="margin-top:12px;"><span style="width:${stats.percent}%;"></span></div>
                  <div class="muted" style="margin-top:10px;">${stats.mastered} / ${lesson.vocabulary.length} cards feeling solid this session</div>
                </div>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function render() {
    const overall = computeOverallStats();
    root.innerHTML = `
      <div class="app-shell">
        <section class="hero">
          <div class="hero-grid">
            <div>
              <div class="eyebrow">Madinah Book 1 First</div>
              <h1>Madinah Lab</h1>
              <p>A mobile-first Arabic web app for Fusha practice, early Madinah Book 1 vocabulary, flashcard review, matching games, Arabic typing, and live pronunciation checks.</p>
              <div class="stat-grid">
                <div class="stat-card">
                  <strong>${lessons.length}</strong>
                  <span>starter lessons seeded</span>
                </div>
                <div class="stat-card">
                  <strong>${lessons.reduce((total, lesson) => total + lesson.vocabulary.length, 0)}</strong>
                  <span>starter vocab items</span>
                </div>
                <div class="stat-card">
                  <strong>${overall.reviewedCards}</strong>
                  <span>cards touched this session</span>
                </div>
                <div class="stat-card">
                  <strong>${overall.streak}</strong>
                  <span>session streak days</span>
                </div>
              </div>
            </div>
            <div class="hero-callout">
              <strong>Designed for phone-first study</strong>
              <p>Large Arabic type, thumb-friendly controls, haraqat support in typing mode, and no backend requirement so it can ship cleanly on GitHub Pages.</p>
            </div>
          </div>
        </section>
        <div class="${state.section === "dashboard" ? "" : "hide"}">${renderDashboard()}</div>
        <div class="${state.section === "practice" ? "" : "hide"}">${renderPractice()}</div>
        <div class="${state.section === "progress" ? "" : "hide"}">${renderProgress()}</div>
        <nav class="bottom-nav">
          ${[
            ["dashboard", "Dashboard"],
            ["practice", "Practice"],
            ["progress", "Progress"]
          ]
            .map(
              ([section, label]) => `
                <button class="nav-button ${state.section === section ? "is-active" : ""}" data-action="change-section" data-section="${section}">
                  ${label}
                </button>
              `
            )
            .join("")}
        </nav>
      </div>
    `;
  }

  function onClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;

    if (action === "change-section") {
      state.section = target.dataset.section;
    }

    if (action === "pick-lesson") {
      state.lessonId = target.dataset.lessonId;
      resetFlashcards();
      resetMatchRound();
      resetTyping();
      resetPronunciation();
    }

    if (action === "start-mode") {
      state.section = "practice";
      state.mode = target.dataset.mode;
      if (state.mode === "matching") resetMatchRound();
    }

    if (action === "change-mode") {
      state.mode = target.dataset.mode;
      if (state.mode === "matching") resetMatchRound();
    }

    if (action === "set-flash-direction") {
      state.flashDirection = target.dataset.direction;
      resetFlashcards();
    }

    if (action === "toggle-flash-shuffle") {
      state.flashShuffle = !state.flashShuffle;
      resetFlashcards();
    }

    if (action === "toggle-flash-answer") {
      state.flashRevealed = !state.flashRevealed;
    }

    if (action === "grade-flashcard") {
      advanceFlashcard(target.dataset.result);
    }

    if (action === "reset-matching") {
      resetMatchRound();
    }

    if (action === "pick-match") {
      const id = target.dataset.cardId;
      if (state.matchSolved.includes(id)) {
        render();
        return;
      }
      if (state.matchSelection.includes(id)) {
        state.matchSelection = state.matchSelection.filter((entry) => entry !== id);
      } else {
        state.matchSelection = [...state.matchSelection, id].slice(-2);
      }
      if (state.matchSelection.length === 2) {
        const [first, second] = state.matchSelection.map((selectionId) =>
          state.matchRound.find((item) => item.id === selectionId)
        );
        if (first && second && first.pairId === second.pairId && first.side !== second.side) {
          state.matchSolved.push(first.id, second.id);
          state.matchFeedback = "Nice match. Pair locked in.";
          trackAnswer(getLesson().id, { arabic: first.side === "arabic" ? first.label : second.label }, "known");
        } else {
          state.matchFeedback = "Not quite. Try another pair.";
        }
        setTimeout(() => {
          state.matchSelection = [];
          render();
        }, 420);
      }
    }

    if (action === "set-typing-direction") {
      state.typingDirection = target.dataset.direction;
      resetTyping();
    }

    if (action === "toggle-typing-strict") {
      state.typingStrict = !state.typingStrict;
    }

    if (action === "insert-char") {
      state.typingInput += target.dataset.char;
    }

    if (action === "submit-typing") {
      const lesson = getLesson();
      const card = getTypingCard();
      const targetLanguage = state.typingDirection === "en-to-ar" ? "arabic" : "english";
      const expected = targetLanguage === "arabic" ? card.arabic : card.english;
      const correct = compareAnswer(expected, state.typingInput, state.typingStrict, targetLanguage);
      trackAnswer(lesson.id, card, correct ? "known" : "unknown");
      state.typingFeedback = {
        correct,
        expected,
        message: correct ? "Correct. Move on to the next prompt when you’re ready." : "Close, but not quite."
      };
    }

    if (action === "reveal-typing") {
      const card = getTypingCard();
      const expected = state.typingDirection === "en-to-ar" ? card.arabic : card.english;
      state.typingFeedback = {
        correct: false,
        expected,
        message: "Answer revealed. Try typing it once before moving on."
      };
    }

    if (action === "next-typing") {
      nextTypingCard();
    }

    if (action === "toggle-listening") {
      const engine = getRecognition();
      if (!engine) {
        render();
        return;
      }
      if (state.pronunciationListening) {
        engine.stop();
      } else {
        state.pronunciationFeedback = null;
        state.pronunciationTranscript = "";
        engine.start();
      }
    }

    if (action === "next-pronunciation") {
      nextPronunciationPrompt();
    }

    if (action === "speak-current") {
      if (state.mode === "typing") {
        speakArabic(getTypingCard().arabic);
      } else if (state.mode === "pronunciation") {
        speakArabic(pronunciationPool()[state.pronunciationIndex].arabic);
      } else {
        speakArabic(currentFlashCard().entry.arabic);
      }
    }

    render();
  }

  function onInput(event) {
    const target = event.target;
    if (target.dataset.action === "typing-input") {
      state.typingInput = target.value;
    }
  }

  root.addEventListener("click", onClick);
  root.addEventListener("input", onInput);

  resetFlashcards();
  resetMatchRound();
  render();
})();
