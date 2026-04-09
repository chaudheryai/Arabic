(function () {
  const rawLessons = (window.APP_LESSONS || []).slice().sort((a, b) => a.sequence - b.sequence);
  const storageKey = "madinah-lab-session-v2";
  const root = document.getElementById("app");
  let recognition = null;

  const CATEGORY_OPTIONS = [
    { key: "all", label: "الكل" },
    { key: "madina_book1", label: "كتاب المدينة" },
    { key: "alphabet", label: "الحروف" },
    { key: "greetings", label: "تحيات" },
    { key: "numbers", label: "أرقام" },
    { key: "food", label: "طعام" },
    { key: "travel", label: "سفر" },
    { key: "family", label: "عائلة" },
    { key: "daily_life", label: "حياة يومية" },
    { key: "grammar", label: "قواعد" }
  ];

  const LEVEL_OPTIONS = [
    { key: "all", label: "جميع المستويات" },
    { key: "beginner", label: "مبتدئ" },
    { key: "intermediate", label: "متوسط" },
    { key: "advanced", label: "متقدم" }
  ];

  const PRACTICE_MODES = [
    { key: "quiz", label: "Quiz", labelAr: "اختبار", note: "4-choice cumulative lesson quizzes", icon: "❓" },
    { key: "flashcards", label: "Flashcards", labelAr: "بطاقات", note: "Test both directions with retries", icon: "🗂" },
    { key: "matching", label: "Matching", labelAr: "مطابقة", note: "Pair Arabic with English", icon: "🎯" },
    { key: "typing", label: "Typing", labelAr: "كتابة", note: "Practice spelling and haraqat", icon: "⌨" },
    { key: "pronunciation", label: "Pronunciation", labelAr: "نطق", note: "Listen, speak, and compare", icon: "🎙" }
  ];

  const ARABIC_ALPHABET = [
    { letter: "ا", name: "Alif", transliteration: "a", sound: "Like the long a in father." },
    { letter: "ب", name: "Ba", transliteration: "b", sound: "Like b in boy." },
    { letter: "ت", name: "Ta", transliteration: "t", sound: "Like t in top." },
    { letter: "ث", name: "Tha", transliteration: "th", sound: "Like th in think." },
    { letter: "ج", name: "Jim", transliteration: "j", sound: "Like j in jam." },
    { letter: "ح", name: "Ha", transliteration: "h", sound: "A deep breathy h from the throat." },
    { letter: "خ", name: "Kha", transliteration: "kh", sound: "Like the ch in Bach." },
    { letter: "د", name: "Dal", transliteration: "d", sound: "Like d in dog." },
    { letter: "ذ", name: "Dhal", transliteration: "dh", sound: "Like th in this." },
    { letter: "ر", name: "Ra", transliteration: "r", sound: "A lightly rolled r." },
    { letter: "ز", name: "Zay", transliteration: "z", sound: "Like z in zoo." },
    { letter: "س", name: "Sin", transliteration: "s", sound: "Like s in sun." },
    { letter: "ش", name: "Shin", transliteration: "sh", sound: "Like sh in ship." },
    { letter: "ص", name: "Sad", transliteration: "s", sound: "An emphatic heavy s." },
    { letter: "ض", name: "Dad", transliteration: "d", sound: "An emphatic heavy d." },
    { letter: "ط", name: "Ta", transliteration: "t", sound: "An emphatic heavy t." },
    { letter: "ظ", name: "Dha", transliteration: "dh", sound: "An emphatic heavy dh." },
    { letter: "ع", name: "Ayn", transliteration: "'", sound: "A throat sound unique to Arabic." },
    { letter: "غ", name: "Ghayn", transliteration: "gh", sound: "A gargled gh from the throat." },
    { letter: "ف", name: "Fa", transliteration: "f", sound: "Like f in fun." },
    { letter: "ق", name: "Qaf", transliteration: "q", sound: "A deep back-of-throat k." },
    { letter: "ك", name: "Kaf", transliteration: "k", sound: "Like k in kite." },
    { letter: "ل", name: "Lam", transliteration: "l", sound: "Like l in light." },
    { letter: "م", name: "Mim", transliteration: "m", sound: "Like m in moon." },
    { letter: "ن", name: "Nun", transliteration: "n", sound: "Like n in noon." },
    { letter: "ه", name: "Ha", transliteration: "h", sound: "Like h in hat." },
    { letter: "و", name: "Waw", transliteration: "w", sound: "Like w in water." },
    { letter: "ي", name: "Ya", transliteration: "y", sound: "Like y in yes." }
  ];

  const lessons = rawLessons.map(normalizeLesson);

  const state = {
    section: "home",
    lessonId: lessons[0]?.id || "",
    practiceLessonId: lessons[0]?.id || "",
    lessonDetailOpen: false,
    lessonContentIndex: 0,
    lessonAnswers: {},
    lessonCompleted: false,
    lessonFilterCategory: "all",
    lessonFilterLevel: "all",
    lessonSearch: "",
    alphabetSelected: null,
    practiceMode: null,
    quizDirection: "en-to-ar",
    quizRound: [],
    quizIndex: 0,
    quizAnswers: {},
    quizComplete: false,
    flashDirection: "ar-to-en",
    flashShuffle: true,
    flashDeck: [],
    flashIndex: 0,
    flashRoundTotal: 0,
    flashRevealed: false,
    flashKnown: [],
    flashUnknown: [],
    flashRoundComplete: false,
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

  function normalizeLesson(raw, index) {
    const vocabulary = (raw.vocabulary || []).map((entry, entryIndex) => ({
      type: "vocab",
      arabic: entry.arabic,
      transliteration: entry.transliteration || "",
      english: entry.english,
      audio_hint: buildAudioHint(entry.arabic),
      id: `${raw.id}-vocab-${entryIndex}`
    }));

    const phrases = (raw.phrases || []).map((entry, entryIndex) => ({
      type: "phrase",
      arabic: entry.arabic,
      transliteration: entry.transliteration || "",
      english: entry.english,
      audio_hint: "Read it aloud, then listen and repeat.",
      id: `${raw.id}-phrase-${entryIndex}`
    }));

    return {
      id: raw.id,
      label: raw.label,
      title: `${raw.label} — ${raw.focus}`,
      title_ar: phrases[0]?.arabic || vocabulary[0]?.arabic || raw.label,
      category: "madina_book1",
      level: "beginner",
      order: index + 1,
      lesson_number: Number.isFinite(raw.sequence) ? Math.floor(raw.sequence) : index + 1,
      description: `${raw.focus}. Focus on the vocabulary first, then repeat the core pattern out loud.`,
      content: buildLessonContent(raw, vocabulary, phrases),
      xp_reward: Math.max(50, Math.min(120, vocabulary.length * 4)),
      estimated_minutes: Math.max(8, Math.min(18, Math.ceil((vocabulary.length + phrases.length * 2) / 3))),
      icon: pickLessonIcon(index),
      sourcePage: raw.sourcePage || "",
      focus: raw.focus,
      phrases,
      vocabulary
    };
  }

  function pickLessonIcon(index) {
    return ["📘", "🐪", "👉", "🧭", "📍", "🏠", "🫖", "👩", "🌍"][index % 9];
  }

  function buildAudioHint(arabic) {
    if (/[ًٌٍ]/.test(arabic)) return "Notice the tanwin ending when you say it aloud.";
    if (/[َُِّّّ]/.test(arabic)) return "Listen for the shaddah and keep the doubled sound clear.";
    return "Say it slowly first, then repeat it at a natural pace.";
  }

  function buildLessonContent(raw, vocabulary, phrases) {
    const grammarNote = {
      type: "grammar_note",
      arabic: phrases[0]?.arabic || vocabulary[0]?.arabic || "",
      transliteration: raw.focus,
      english: `${raw.focus}. Study the pattern, say the examples aloud, and then drill the vocabulary until it feels natural both ways.`,
      audio_hint: raw.sourcePage || "",
      id: `${raw.id}-grammar`
    };

    const quizTargets = vocabulary.slice(0, Math.min(4, vocabulary.length)).map((entry, quizIndex) => {
      const distractors = shuffle(vocabulary.filter((item) => item.id !== entry.id))
        .slice(0, 3)
        .map((item) => item.arabic);
      return {
        type: "quiz",
        arabic: "",
        transliteration: "",
        english: `Choose the Arabic for "${entry.english}".`,
        audio_hint: "Pick the correct Arabic answer.",
        options: shuffle([entry.arabic].concat(distractors)),
        correct_answer: entry.arabic,
        id: `${raw.id}-quiz-${quizIndex}`
      };
    });

    return [grammarNote].concat(phrases).concat(vocabulary).concat(quizTargets);
  }

  function uniqueStrings(items) {
    return Array.from(new Set(items.filter(Boolean)));
  }

  function buildChoiceOptions(correctAnswer, pool, count) {
    const distractors = sample(uniqueStrings(pool).filter((item) => item !== correctAnswer), Math.max(0, count - 1));
    return shuffle([correctAnswer].concat(distractors));
  }

  function buildLessonQuizItem(config) {
    return {
      type: "quiz",
      arabic: config.arabic || "",
      transliteration: config.transliteration || "",
      english: config.prompt,
      audio_hint: config.audioHint || "",
      options: config.options,
      correct_answer: config.correctAnswer,
      option_language: config.optionLanguage || "arabic",
      id: config.id
    };
  }

  function buildLessonContent(raw, vocabulary, phrases) {
    const overviewNote = {
      type: "grammar_note",
      arabic: phrases[0]?.arabic || vocabulary[0]?.arabic || "",
      transliteration: raw.focus,
      english: `${raw.focus}. This lesson includes ${phrases.length} core example${phrases.length === 1 ? "" : "s"} and ${vocabulary.length} vocabulary item${vocabulary.length === 1 ? "" : "s"} before the lesson checks.`,
      audio_hint: raw.sourcePage ? `Source: ${raw.sourcePage}` : "",
      id: `${raw.id}-overview`
    };

    const coachingNote = {
      type: "grammar_note",
      arabic: phrases[0]?.arabic || "",
      transliteration: "Lesson flow",
      english: `Start by reading the Arabic aloud, then check the English, and finally answer in both directions. Focus especially on ${vocabulary.slice(0, Math.min(4, vocabulary.length)).map((entry) => entry.english).join(", ")}.`,
      audio_hint: "Tap Listen on the Arabic cards, then move into the lesson checks.",
      id: `${raw.id}-coach`
    };

    const phraseBridgeNote = phrases.length > 1
      ? {
          type: "grammar_note",
          arabic: phrases[1]?.arabic || "",
          transliteration: "Pattern check",
          english: "Compare the examples before moving on. Notice what stays the same in the sentence pattern and what changes from one example to the next.",
          audio_hint: "Read the examples back to back out loud.",
          id: `${raw.id}-pattern`
        }
      : null;

    const drillNote = {
      type: "grammar_note",
      arabic: vocabulary[0]?.arabic || "",
      transliteration: "Vocabulary drill",
      english: "Now work through the vocabulary one item at a time. Try to recall the meaning before you check it, then repeat the Arabic again with the correct ending.",
      audio_hint: "If a word feels weak, repeat it three times before moving on.",
      id: `${raw.id}-drill`
    };

    const lessonQuizzes = vocabulary.slice(0, Math.min(4, vocabulary.length)).flatMap((entry, quizIndex) => {
      const arabicPool = vocabulary.filter((item) => item.id !== entry.id).map((item) => item.arabic);
      const englishPool = vocabulary.filter((item) => item.id !== entry.id).map((item) => item.english);

      return [
        buildLessonQuizItem({
          id: `${raw.id}-quiz-en-${quizIndex}`,
          prompt: `Choose the Arabic for "${entry.english}".`,
          audioHint: "English to Arabic",
          options: buildChoiceOptions(entry.arabic, arabicPool, 4),
          correctAnswer: entry.arabic,
          optionLanguage: "arabic"
        }),
        buildLessonQuizItem({
          id: `${raw.id}-quiz-ar-${quizIndex}`,
          prompt: "Choose the English meaning of this Arabic word.",
          arabic: entry.arabic,
          audioHint: "Arabic to English",
          options: buildChoiceOptions(entry.english, englishPool, 4),
          correctAnswer: entry.english,
          optionLanguage: "english"
        })
      ];
    });

    const phraseQuizzes = phrases.slice(0, Math.min(2, phrases.length)).map((entry, phraseIndex) =>
      buildLessonQuizItem({
        id: `${raw.id}-quiz-phrase-${phraseIndex}`,
        prompt: "Choose the English meaning of this phrase.",
        arabic: entry.arabic,
        audioHint: "Phrase meaning check",
        options: buildChoiceOptions(
          entry.english,
          phrases.filter((item) => item.id !== entry.id).map((item) => item.english).concat(vocabulary.map((item) => item.english)),
          4
        ),
        correctAnswer: entry.english,
        optionLanguage: "english"
      })
    );

    const recapNote = {
      type: "grammar_note",
      arabic: phrases[phrases.length - 1]?.arabic || vocabulary[vocabulary.length - 1]?.arabic || "",
      transliteration: "Recap",
      english: `You are ready to finish this lesson when you can recognize the key pattern for ${raw.focus.toLowerCase()} and move between Arabic and English without guessing on the core vocabulary.`,
      audio_hint: "Complete the lesson, then open flashcards or quiz mode if you want another round.",
      id: `${raw.id}-recap`
    };

    return [overviewNote, coachingNote]
      .concat(phraseBridgeNote ? [phraseBridgeNote] : [])
      .concat(phrases)
      .concat([drillNote])
      .concat(vocabulary)
      .concat(lessonQuizzes)
      .concat(phraseQuizzes)
      .concat([recapNote]);
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadSession() {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return { cards: {}, activityDates: [], sessionAnswers: 0, lessons: {} };
      const parsed = JSON.parse(raw);
      return {
        cards: parsed.cards || {},
        activityDates: parsed.activityDates || [],
        sessionAnswers: parsed.sessionAnswers || 0,
        lessons: parsed.lessons || {}
      };
    } catch {
      return { cards: {}, activityDates: [], sessionAnswers: 0, lessons: {} };
    }
  }

  function saveSession() {
    sessionStorage.setItem(storageKey, JSON.stringify(state.progress));
  }

  function getLessonById(lessonId) {
    return lessons.find((lesson) => lesson.id === lessonId) || lessons[0];
  }

  function getLesson() {
    return getLessonById(state.lessonId);
  }

  function getPracticeLesson() {
    return getLessonById(state.practiceLessonId);
  }

  function cardId(lessonId, entry) {
    return `${lessonId}::${entry.arabic}`;
  }

  function markActivity() {
    if (!state.progress.activityDates.includes(today())) state.progress.activityDates.push(today());
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

  function computeTotalXp() {
    return Object.values(state.progress.lessons).reduce((sum, item) => sum + (item.xp_earned || 0), 0);
  }

  function ensureLessonProgressStarted(lessonId) {
    const current = state.progress.lessons[lessonId] || {
      lesson_id: lessonId,
      status: "not_started",
      score: 0,
      xp_earned: 0,
      attempts: 0,
      total_xp: 0,
      current_streak: 0,
      last_practice_date: ""
    };

    if (current.status === "not_started") current.status = "in_progress";
    current.last_practice_date = today();
    current.current_streak = computeStreak(state.progress.activityDates);
    current.total_xp = computeTotalXp();
    state.progress.lessons[lessonId] = current;
  }

  function trackAnswer(lessonId, entry, result) {
    const id = cardId(lessonId, entry);
    const current = state.progress.cards[id] || { known: 0, unknown: 0, seen: 0 };
    current.seen += 1;
    if (result === "known") current.known += 1;
    if (result === "unknown") current.unknown += 1;
    state.progress.cards[id] = current;
    state.progress.sessionAnswers += 1;
    markActivity();
    ensureLessonProgressStarted(lessonId);
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
      .replace(/[^a-z0-9' -]/g, "")
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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function filteredLessons() {
    return lessons.filter((lesson) => {
      if (state.lessonFilterCategory !== "all" && lesson.category !== state.lessonFilterCategory) return false;
      if (state.lessonFilterLevel !== "all" && lesson.level !== state.lessonFilterLevel) return false;
      if (!state.lessonSearch.trim()) return true;
      const query = state.lessonSearch.trim().toLowerCase();
      return (
        lesson.title.toLowerCase().includes(query) ||
        lesson.title_ar.includes(state.lessonSearch.trim()) ||
        lesson.description.toLowerCase().includes(query) ||
        lesson.focus.toLowerCase().includes(query)
      );
    });
  }

  function computeLessonStats(lesson) {
    const totals = lesson.vocabulary.reduce(
      (accumulator, entry) => {
        const stats = state.progress.cards[cardId(lesson.id, entry)] || { known: 0, unknown: 0, seen: 0 };
        accumulator.known += stats.known;
        accumulator.unknown += stats.unknown;
        accumulator.seen += stats.seen;
        if (stats.known >= 2 && stats.known > stats.unknown) accumulator.mastered += 1;
        return accumulator;
      },
      { known: 0, unknown: 0, seen: 0, mastered: 0 }
    );

    const stored = state.progress.lessons[lesson.id];
    const totalAttempts = totals.known + totals.unknown;
    return {
      ...totals,
      status: stored?.status || (totals.seen ? "in_progress" : "not_started"),
      percent: totalAttempts ? Math.round((totals.known / totalAttempts) * 100) : 0,
      score: stored?.score || 0,
      xp: stored?.xp_earned || 0,
      attempts: stored?.attempts || 0
    };
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
    const lessonProgressItems = Object.values(state.progress.lessons);
    const completedCount = lessonProgressItems.filter((item) => item.status === "completed").length;
    const scored = lessonProgressItems.filter((item) => item.score);
    return {
      reviewedCards,
      masteredCards,
      completedCount,
      sessionAnswers: state.progress.sessionAnswers,
      streak: computeStreak(state.progress.activityDates),
      totalXp: computeTotalXp(),
      averageScore: scored.length ? Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length) : 0,
      overallProgress: lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0
    };
  }

  function resetLessonFlow(lessonId) {
    state.lessonId = lessonId;
    state.lessonDetailOpen = true;
    state.lessonContentIndex = 0;
    state.lessonAnswers = {};
    state.lessonCompleted = false;
    markActivity();
    ensureLessonProgressStarted(lessonId);
    saveSession();
  }

  function completeLesson() {
    const lesson = getLesson();
    const quizItems = lesson.content.filter((item) => item.type === "quiz");
    const correctCount = quizItems.reduce((count, item) => {
      const quizIndex = lesson.content.findIndex((candidate) => candidate.id === item.id);
      return count + (state.lessonAnswers[quizIndex] === item.correct_answer ? 1 : 0);
    }, 0);
    const score = quizItems.length ? Math.round((correctCount / quizItems.length) * 100) : 100;
    markActivity();

    const existing = state.progress.lessons[lesson.id] || {
      lesson_id: lesson.id,
      status: "in_progress",
      score: 0,
      xp_earned: 0,
      attempts: 0
    };

    state.progress.lessons[lesson.id] = {
      ...existing,
      lesson_id: lesson.id,
      status: "completed",
      score,
      xp_earned: lesson.xp_reward,
      completed_at: new Date().toISOString(),
      attempts: (existing.attempts || 0) + 1,
      last_practice_date: today(),
      current_streak: computeStreak(state.progress.activityDates),
      total_xp: computeTotalXp() + (existing.xp_earned ? 0 : lesson.xp_reward)
    };

    saveSession();
    state.lessonCompleted = true;
  }

  function speakArabic(text) {
    if (!("speechSynthesis" in window) || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ar-SA";
    utterance.rate = text.length <= 2 ? 0.6 : 0.8;
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice =
      voices.find((voice) => voice.lang && voice.lang.toLowerCase().startsWith("ar")) ||
      voices.find((voice) => /arab/i.test(`${voice.name} ${voice.lang}`));
    if (arabicVoice) utterance.voice = arabicVoice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function supportsSpeechRecognition() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
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

  function pronunciationPool() {
    const lesson = getPracticeLesson();
    return lesson.phrases.length ? lesson.phrases : lesson.vocabulary;
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
        target: target.arabic,
        message: correct ? "Good match. Keep the rhythm and haraqat clear." : "Close. Repeat the target slowly and try again."
      };
      if (correct) trackAnswer(getPracticeLesson().id, target, "known");
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
        target: pronunciationPool()[state.pronunciationIndex]?.arabic || "",
        message: event.error === "not-allowed" ? "Microphone permission was blocked." : "Speech recognition could not finish."
      };
      render();
    };
    return recognition;
  }

  function currentFlashCard() {
    if (!state.flashDeck.length && !state.flashRoundComplete) resetFlashcards();
    return state.flashDeck[state.flashIndex] || state.flashDeck[0] || null;
  }

  function flashSourceEntries() {
    return getPracticeLesson().vocabulary;
  }

  function resetFlashcards(entries) {
    const sourceEntries = (entries || flashSourceEntries()).slice();
    const deck = sourceEntries.map((entry, index) => ({
      entry,
      direction:
        state.flashDirection === "mixed"
          ? (Math.random() > 0.5 ? "en-to-ar" : "ar-to-en")
          : state.flashDirection,
      id: entry.id || `${getPracticeLesson().id}-flash-${index}`
    }));

    state.flashDeck = state.flashShuffle ? shuffle(deck) : deck;
    state.flashIndex = 0;
    state.flashRoundTotal = deck.length || 1;
    state.flashRevealed = false;
    state.flashKnown = [];
    state.flashUnknown = [];
    state.flashRoundComplete = false;
  }

  function flashSolvedCount() {
    return Math.max(0, state.flashRoundTotal - state.flashDeck.length);
  }

  function flashCardPosition() {
    if (state.flashRoundComplete) return state.flashRoundTotal;
    return state.flashDeck.length ? Math.min(state.flashRoundTotal, flashSolvedCount() + 1) : 1;
  }

  function pushUniqueCard(collection, card) {
    if (!collection.some((item) => item.id === card.id)) collection.push(card);
  }

  function advanceFlashcard(result) {
    const lesson = getPracticeLesson();
    const card = currentFlashCard();
    if (!card) return;

    trackAnswer(lesson.id, card.entry, result);
    const queue = state.flashDeck.slice();
    const currentIndex = Math.min(state.flashIndex, Math.max(queue.length - 1, 0));
    const removed = queue.splice(currentIndex, 1)[0];

    if (result === "known") pushUniqueCard(state.flashKnown, removed);
    if (result === "unknown") {
      pushUniqueCard(state.flashUnknown, removed);
      queue.push(removed);
    }

    if (!queue.length) {
      state.flashDeck = [];
      state.flashIndex = 0;
      state.flashRevealed = false;
      state.flashRoundComplete = true;
      return;
    }

    state.flashDeck = queue;
    state.flashIndex = currentIndex >= queue.length ? 0 : currentIndex;
    state.flashRevealed = false;
  }

  function resetMatchRound() {
    const lesson = getPracticeLesson();
    const picks = sample(lesson.vocabulary, lesson.vocabulary.length > 5 ? 6 : lesson.vocabulary.length);
    const leftSide = picks.map((entry, index) => ({
      id: `${index}-ar`,
      pairId: index,
      side: "arabic",
      label: entry.arabic
    }));
    const rightSide = shuffle(picks).map((entry, index) => ({
      id: `${index}-en`,
      pairId: picks.findIndex((candidate) => candidate.id === entry.id),
      side: "english",
      label: entry.english
    }));
    state.matchRound = shuffle(leftSide.concat(rightSide));
    state.matchSelection = [];
    state.matchSolved = [];
    state.matchFeedback = "";
  }

  function cumulativeQuizPool() {
    const lesson = getPracticeLesson();
    return lessons
      .filter((entry) => entry.order <= lesson.order)
      .flatMap((entry) => entry.vocabulary);
  }

  function buildQuizRound() {
    const pool = cumulativeQuizPool();
    const questionPool = sample(pool, Math.min(10, pool.length));
    return questionPool.map((entry, index) => {
      const distractors = shuffle(pool.filter((item) => item.id !== entry.id)).slice(0, 3);
      if (state.quizDirection === "en-to-ar") {
        return {
          id: `${entry.id}-quiz-${index}`,
          direction: "en-to-ar",
          prompt: entry.english,
          promptHint: "Choose the Arabic word",
          correct_answer: entry.arabic,
          options: shuffle([entry.arabic].concat(distractors.map((item) => item.arabic))),
          entry
        };
      }

      return {
        id: `${entry.id}-quiz-${index}`,
        direction: "ar-to-en",
        prompt: entry.arabic,
        promptHint: "Choose the English meaning",
        correct_answer: entry.english,
        options: shuffle([entry.english].concat(distractors.map((item) => item.english))),
        entry
      };
    });
  }

  function resetQuizRound() {
    state.quizRound = buildQuizRound();
    state.quizIndex = 0;
    state.quizAnswers = {};
    state.quizComplete = false;
  }

  function currentQuizItem() {
    return state.quizRound[state.quizIndex] || state.quizRound[0] || null;
  }

  function quizScore() {
    return state.quizRound.reduce((count, item, index) => count + (state.quizAnswers[index] === item.correct_answer ? 1 : 0), 0);
  }

  function completeQuizRound() {
    state.quizComplete = true;
    markActivity();
    saveSession();
  }

  function resetTyping() {
    state.typingIndex = 0;
    state.typingInput = "";
    state.typingFeedback = null;
  }

  function getTypingCard() {
    const lesson = getPracticeLesson();
    return lesson.vocabulary[state.typingIndex % lesson.vocabulary.length];
  }

  function nextTypingCard() {
    state.typingIndex = (state.typingIndex + 1) % getPracticeLesson().vocabulary.length;
    state.typingInput = "";
    state.typingFeedback = null;
  }

  function resetPronunciation() {
    state.pronunciationIndex = 0;
    state.pronunciationFeedback = null;
    state.pronunciationTranscript = "";
  }

  function nextPronunciationPrompt() {
    state.pronunciationIndex = (state.pronunciationIndex + 1) % pronunciationPool().length;
    state.pronunciationFeedback = null;
    state.pronunciationTranscript = "";
  }

  function setPracticeMode(mode) {
    state.practiceMode = mode;
    if (mode === "quiz") resetQuizRound();
    if (mode === "flashcards") resetFlashcards();
    if (mode === "matching") resetMatchRound();
    if (mode === "typing") resetTyping();
    if (mode === "pronunciation") resetPronunciation();
  }

  function resetPracticeSelection(lessonId) {
    state.practiceLessonId = lessonId;
    ensureLessonProgressStarted(lessonId);
    state.practiceMode = null;
    resetQuizRound();
    state.flashDeck = [];
    state.flashKnown = [];
    state.flashUnknown = [];
    state.flashRoundComplete = false;
    state.matchRound = [];
    state.matchSelection = [];
    state.matchSolved = [];
    state.matchFeedback = "";
    resetTyping();
    resetPronunciation();
    saveSession();
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير — Good morning";
    if (hour < 18) return "مساء الخير — Good afternoon";
    return "مساء الخير — Good evening";
  }

  function renderStatusPill(status) {
    const labels = {
      not_started: "Not started",
      in_progress: "In progress",
      completed: "Completed"
    };
    return `<span class="status-pill is-${status}">${labels[status] || status}</span>`;
  }

  function renderHome() {
    const overall = computeOverallStats();
    const nextLessons = lessons
      .filter((lesson) => computeLessonStats(lesson).status !== "completed")
      .slice(0, 3);

    return `
      <section class="panel home-screen">
        <div class="home-scroll">
          <div class="home-hero-card">
            <div class="home-hero-copy">
              <p class="home-greeting">${getGreeting()}</p>
              <h1>Madinah Lab</h1>
              <p>Build strong Madinah Book 1 vocabulary first, then layer in phrases, typing, and pronunciation practice.</p>
            </div>
            <div class="home-ring-card">
              <div class="home-ring-value">${overall.overallProgress}%</div>
              <div class="home-ring-label">Complete</div>
            </div>
          </div>

          <div class="home-stats-grid">
            <div class="summary-card">
              <strong>${overall.completedCount}</strong>
              <span>Lessons completed</span>
            </div>
            <div class="summary-card">
              <strong>${overall.totalXp}</strong>
              <span>Total XP</span>
            </div>
            <div class="summary-card">
              <strong>${overall.streak}</strong>
              <span>Current streak</span>
            </div>
            <div class="summary-card">
              <strong>${overall.averageScore || "—"}</strong>
              <span>Average score</span>
            </div>
          </div>

          <div class="section-block">
            <div class="section-head">
              <div>
                <h2>Continue Learning</h2>
                <p>Pick up where you left off in this session.</p>
              </div>
              <button class="mini-button" data-action="change-section" data-section="lessons">View all</button>
            </div>
            <div class="lesson-list compact">
              ${
                nextLessons.length
                  ? nextLessons
                      .map(
                        (lesson) => `
                          <button class="lesson-list-card compact" data-action="open-lesson" data-lesson-id="${lesson.id}">
                            <div class="lesson-list-icon">${lesson.icon}</div>
                            <div class="lesson-list-body">
                              <div class="lesson-badge">Beginner</div>
                              <h3>${lesson.title}</h3>
                              <div class="lesson-arabic arabic-text">${lesson.title_ar}</div>
                              <div class="lesson-meta-row">
                                <span>${lesson.estimated_minutes} min</span>
                                <span>${lesson.xp_reward} XP</span>
                              </div>
                            </div>
                          </button>
                        `
                      )
                      .join("")
                  : `<div class="empty-card">Everything in this session is marked complete. Open practice to keep drilling vocabulary.</div>`
              }
            </div>
          </div>

          <div class="section-block">
            <div class="section-head">
              <div>
                <h2>Quick Start</h2>
                <p>Jump straight into your next study block.</p>
              </div>
            </div>
            <div class="quick-action-grid">
              <button class="quick-action-card" data-action="change-section" data-section="alphabet">
                <div class="quick-action-icon">أ</div>
                <div>
                  <strong>Arabic Alphabet</strong>
                  <span>Learn the 28 letters with audio</span>
                </div>
              </button>
              <button class="quick-action-card" data-action="start-practice" data-lesson-id="${getPracticeLesson().id}" data-mode="flashcards">
                <div class="quick-action-icon">🎙</div>
                <div>
                  <strong>Practice Session</strong>
                  <span>Flashcards, typing, matching, and pronunciation</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderLessons() {
    if (state.lessonDetailOpen) return renderLessonDetail();
    const visibleLessons = filteredLessons();

    return `
      <section class="panel lessons-screen">
        <div class="screen-head">
          <button class="back-button" data-action="change-section" data-section="home">&larr;</button>
          <div class="practice-title-wrap">
            <h2>الدروس</h2>
            <p>Prioritizing Fusha and Madinah Book 1. Progress is saved only for this browser session.</p>
          </div>
        </div>
        <div class="lessons-scroll">
          <div class="search-shell">
            <input class="search-input" data-input="lesson-search" placeholder="ابحث في الدروس..." value="${escapeHtml(state.lessonSearch)}" />
          </div>

          <div class="lesson-strip category-strip">
            ${CATEGORY_OPTIONS.map(
              (option) => `
                <button class="lesson-chip ${state.lessonFilterCategory === option.key ? "is-active" : ""}" data-action="set-lesson-category" data-category="${option.key}">
                  <strong>${option.label}</strong>
                </button>
              `
            ).join("")}
          </div>

          <div class="mode-row level-strip">
            ${LEVEL_OPTIONS.map(
              (option) => `
                <button class="mode-chip ${state.lessonFilterLevel === option.key ? "is-active" : ""}" data-action="set-lesson-level" data-level="${option.key}">
                  <strong>${option.label}</strong>
                </button>
              `
            ).join("")}
          </div>

          <div class="lesson-list">
            ${
              visibleLessons.length
                ? visibleLessons
                    .map((lesson) => {
                      const stats = computeLessonStats(lesson);
                      return `
                        <button class="lesson-list-card" data-action="open-lesson" data-lesson-id="${lesson.id}">
                          <div class="lesson-list-icon">${lesson.icon}</div>
                          <div class="lesson-list-body">
                            <div class="lesson-card-top">
                              <div class="lesson-badge">${lesson.level}</div>
                              ${renderStatusPill(stats.status)}
                            </div>
                            <h3>${lesson.title}</h3>
                            <div class="lesson-arabic arabic-text">${lesson.title_ar}</div>
                            <p>${lesson.description}</p>
                            <div class="lesson-meta-row">
                              <span>${lesson.estimated_minutes} min</span>
                              <span>${lesson.xp_reward} XP</span>
                              <span>${stats.percent}%</span>
                            </div>
                          </div>
                          <div class="lesson-chevron">&rsaquo;</div>
                        </button>
                      `;
                    })
                    .join("")
                : `<div class="empty-card">No lessons matched that filter. Try another category or search.</div>`
            }
          </div>
        </div>
      </section>
    `;
  }

  function renderLessonItem(item, answer, quizAction) {
    if (item.type === "vocab" || item.type === "phrase") {
      return `
        <div class="lesson-detail-label">${item.type === "vocab" ? "Vocabulary" : "Phrase"}</div>
        <div class="lesson-word-card">
          <div class="lesson-word-arabic arabic-text">${item.arabic}</div>
          ${item.transliteration ? `<div class="lesson-word-transliteration">${item.transliteration}</div>` : ""}
          <div class="lesson-word-english">${item.english}</div>
          <button class="speaker-button" data-action="speak-text" data-text="${escapeHtml(item.arabic)}">Listen</button>
          ${item.audio_hint ? `<div class="lesson-note-bubble">${item.audio_hint}</div>` : ""}
        </div>
      `;
    }

    if (item.type === "grammar_note") {
      return `
        <div class="lesson-detail-label is-secondary">Grammar Note</div>
        <div class="lesson-note-card">
          ${item.arabic ? `<div class="lesson-note-arabic arabic-text">${item.arabic}</div>` : ""}
          <p>${item.english}</p>
          ${item.transliteration ? `<div class="lesson-word-transliteration">${item.transliteration}</div>` : ""}
          ${item.audio_hint ? `<div class="lesson-note-bubble">${item.audio_hint}</div>` : ""}
        </div>
      `;
    }

    if (item.type === "quiz") {
      return `
        <div class="lesson-detail-label">Quiz</div>
        <div class="lesson-note-card">
          <h3>${item.english}</h3>
          <div class="quiz-options">
            ${(item.options || [])
              .map((option) => {
                const isSelected = answer === option;
                const isCorrect = option === item.correct_answer;
                const quizClass = answer
                  ? isCorrect
                    ? "is-correct"
                    : isSelected
                      ? "is-wrong"
                      : ""
                  : isSelected
                    ? "is-selected"
                    : "";
                return `
                  <button class="quiz-option ${quizClass}" data-action="${quizAction}" data-option="${escapeHtml(option)}" ${answer ? "disabled" : ""}>
                    <span class="arabic-text">${option}</span>
                  </button>
                `;
              })
              .join("")}
          </div>
          ${
            answer
              ? `<div class="feedback ${answer === item.correct_answer ? "is-good" : "is-bad"}">${
                  answer === item.correct_answer ? "Correct." : `Correct answer: <span class="arabic-text">${item.correct_answer}</span>`
                }</div>`
              : `<div class="muted">Choose the right Arabic word to continue.</div>`
          }
        </div>
      `;
    }

    return "";
  }

  function renderLessonItem(item, answer, quizAction) {
    if (item.type === "vocab" || item.type === "phrase") {
      return `
        <div class="lesson-detail-label">${item.type === "vocab" ? "Vocabulary" : "Phrase"}</div>
        <div class="lesson-word-card">
          <div class="lesson-word-arabic arabic-text">${item.arabic}</div>
          ${item.transliteration ? `<div class="lesson-word-transliteration">${item.transliteration}</div>` : ""}
          <div class="lesson-word-english">${item.english}</div>
          <button class="speaker-button" data-action="speak-text" data-text="${escapeHtml(item.arabic)}">Listen</button>
          ${item.audio_hint ? `<div class="lesson-note-bubble">${item.audio_hint}</div>` : ""}
        </div>
      `;
    }

    if (item.type === "grammar_note") {
      return `
        <div class="lesson-detail-label is-secondary">Grammar Note</div>
        <div class="lesson-note-card">
          ${item.arabic ? `<div class="lesson-note-arabic arabic-text">${item.arabic}</div>` : ""}
          <p>${item.english}</p>
          ${item.transliteration ? `<div class="lesson-word-transliteration">${item.transliteration}</div>` : ""}
          ${item.audio_hint ? `<div class="lesson-note-bubble">${item.audio_hint}</div>` : ""}
        </div>
      `;
    }

    if (item.type === "quiz") {
      const optionClassName = item.option_language === "arabic" ? "arabic-text" : "";
      const feedbackLabel = item.option_language === "arabic"
        ? `Correct answer: <span class="arabic-text">${item.correct_answer}</span>`
        : `Correct answer: ${item.correct_answer}`;
      const promptHint = item.audio_hint || (item.option_language === "arabic" ? "Choose the right Arabic word to continue." : "Choose the correct English meaning to continue.");

      return `
        <div class="lesson-detail-label">Quiz</div>
        <div class="lesson-note-card">
          ${item.arabic ? `<div class="lesson-quiz-prompt-arabic arabic-text">${item.arabic}</div>` : ""}
          <h3>${item.english}</h3>
          ${item.audio_hint ? `<div class="lesson-note-bubble is-quiz">${item.audio_hint}</div>` : ""}
          <div class="quiz-options">
            ${(item.options || [])
              .map((option) => {
                const isSelected = answer === option;
                const isCorrect = option === item.correct_answer;
                const quizClass = answer
                  ? isCorrect
                    ? "is-correct"
                    : isSelected
                      ? "is-wrong"
                      : ""
                  : isSelected
                    ? "is-selected"
                    : "";
                return `
                  <button class="quiz-option ${quizClass}" data-action="${quizAction}" data-option="${escapeHtml(option)}" ${answer ? "disabled" : ""}>
                    <span class="${optionClassName}">${option}</span>
                  </button>
                `;
              })
              .join("")}
          </div>
          ${
            answer
              ? `<div class="feedback ${answer === item.correct_answer ? "is-good" : "is-bad"}">${
                  answer === item.correct_answer ? "Correct." : feedbackLabel
                }</div>`
              : `<div class="muted">${promptHint}</div>`
          }
        </div>
      `;
    }

    return "";
  }

  function renderLessonComplete(lesson) {
    const quizItems = lesson.content.filter((item) => item.type === "quiz");
    const correct = quizItems.reduce((count, item) => {
      const itemIndex = lesson.content.findIndex((candidate) => candidate.id === item.id);
      return count + (state.lessonAnswers[itemIndex] === item.correct_answer ? 1 : 0);
    }, 0);
    const score = quizItems.length ? Math.round((correct / quizItems.length) * 100) : 100;

    return `
      <section class="panel lesson-detail-screen">
        <div class="practice-screen-head">
          <button class="back-button" data-action="close-lesson-detail">&larr;</button>
          <div class="practice-title-wrap">
            <h2>${lesson.title}</h2>
            <p>Lesson complete</p>
          </div>
        </div>
        <div class="lesson-detail-body">
          <div class="lesson-complete-card">
            <div class="lesson-complete-icon">★</div>
            <h3>Lesson Complete</h3>
            <p>${lesson.title}</p>
            <div class="lesson-complete-stats">
              <div class="summary-card">
                <strong>+${lesson.xp_reward}</strong>
                <span>XP earned</span>
              </div>
              <div class="summary-card">
                <strong>${score}%</strong>
                <span>Quiz score</span>
              </div>
            </div>
            <div class="lesson-detail-actions">
              <button class="lesson-nav-button" data-action="close-lesson-detail">Back to lessons</button>
              <button class="lesson-nav-button is-primary" data-action="start-practice" data-lesson-id="${lesson.id}" data-mode="flashcards">Practice now</button>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderLessonDetail() {
    const lesson = getLesson();
    if (state.lessonCompleted) return renderLessonComplete(lesson);

    const items = lesson.content;
    const currentItem = items[state.lessonContentIndex];
    const answer = state.lessonAnswers[state.lessonContentIndex];
    const progressValue = items.length ? Math.round(((state.lessonContentIndex + 1) / items.length) * 100) : 0;

    return `
      <section class="panel lesson-detail-screen">
        <div class="practice-screen-head">
          <button class="back-button" data-action="close-lesson-detail">&larr;</button>
          <div class="practice-title-wrap">
            <h2>${lesson.title}</h2>
            <p>${state.lessonContentIndex + 1} of ${items.length}</p>
          </div>
        </div>
        <div class="practice-progress"><span style="width:${progressValue}%;"></span></div>
        <div class="lesson-detail-body">
          <article class="lesson-detail-card">
            ${renderLessonItem(currentItem, answer, "answer-lesson-quiz")}
          </article>
          <div class="lesson-detail-actions">
            <button class="lesson-nav-button ${state.lessonContentIndex === 0 ? "is-disabled" : ""}" data-action="lesson-prev" ${state.lessonContentIndex === 0 ? "disabled" : ""}>← Previous</button>
            <button class="lesson-nav-button is-primary" data-action="${state.lessonContentIndex === items.length - 1 ? "complete-lesson" : "lesson-next"}" ${currentItem.type === "quiz" && !answer ? "disabled" : ""}>
              ${state.lessonContentIndex === items.length - 1 ? "Complete" : "Next →"}
            </button>
          </div>
        </div>
      </section>
    `;
  }

  function renderAlphabet() {
    return `
      <section class="panel alphabet-screen">
        <div class="screen-head">
          <button class="back-button" data-action="change-section" data-section="home">&larr;</button>
          <div class="practice-title-wrap">
            <h2>الحروف الهجائية</h2>
            <p>Tap a letter to hear it and review its sound.</p>
          </div>
        </div>
        <div class="alphabet-scroll">
          <div class="alphabet-grid">
            ${ARABIC_ALPHABET.map(
              (item) => `
                <button class="alphabet-card" data-action="open-alphabet-letter" data-letter="${item.letter}">
                  <div class="alphabet-letter arabic-text">${item.letter}</div>
                  <div class="alphabet-name">${item.name}</div>
                  <div class="alphabet-sound">${item.transliteration}</div>
                </button>
              `
            ).join("")}
          </div>
          ${
            state.alphabetSelected
              ? `
                <div class="modal-scrim" data-action="close-alphabet-letter">
                  <div class="alphabet-modal" data-stop-click="true">
                    <button class="modal-close" data-action="close-alphabet-letter">×</button>
                    <div class="alphabet-modal-letter arabic-text">${state.alphabetSelected.letter}</div>
                    <h3>${state.alphabetSelected.name}</h3>
                    <div class="lesson-word-transliteration">/${state.alphabetSelected.transliteration}/</div>
                    <p>${state.alphabetSelected.sound}</p>
                    <button class="lesson-nav-button is-primary" data-action="speak-text" data-text="${state.alphabetSelected.letter}">Listen again</button>
                  </div>
                </div>
              `
              : ""
          }
        </div>
      </section>
    `;
  }

  function renderPracticeModeChooser() {
    return `
      <div class="practice-mode-list">
        ${PRACTICE_MODES.map(
          (mode) => `
            <button class="practice-mode-card" data-action="select-practice-mode" data-mode="${mode.key}">
              <div class="practice-mode-icon">${mode.icon}</div>
              <div class="practice-mode-copy">
                <strong>${mode.label}</strong>
                <span>${mode.labelAr}</span>
                <p>${mode.note}</p>
              </div>
              <div class="lesson-chevron">&rsaquo;</div>
            </button>
          `
        ).join("")}
      </div>
    `;
  }

  function renderFlashcardsComplete() {
    return `
      <div class="lesson-complete-card">
        <div class="lesson-complete-icon">📚</div>
        <h3>Round complete</h3>
        <p>You cleared the current flashcard queue.</p>
        <div class="lesson-complete-stats">
          <div class="summary-card">
            <strong>${state.flashKnown.length}</strong>
            <span>I know it</span>
          </div>
          <div class="summary-card">
            <strong>${state.flashUnknown.length}</strong>
            <span>Need review</span>
          </div>
        </div>
        <div class="lesson-detail-actions">
          ${state.flashUnknown.length ? `<button class="lesson-nav-button is-primary" data-action="practice-flash-missed">Review missed</button>` : ""}
          <button class="lesson-nav-button" data-action="restart-flash-round">Shuffle all again</button>
        </div>
      </div>
    `;
  }

  function renderQuizPractice() {
    const lesson = getPracticeLesson();
    const currentItem = currentQuizItem();
    const answer = state.quizAnswers[state.quizIndex];

    if (state.quizComplete) {
      const correct = quizScore();
      const score = state.quizRound.length ? Math.round((correct / state.quizRound.length) * 100) : 100;
      return `
        <div class="lesson-complete-card chapter-summary-card">
          <div class="lesson-complete-icon">❓</div>
          <h3>Quiz complete</h3>
          <p>${lesson.title}</p>
          <div class="lesson-complete-stats">
            <div class="summary-card">
              <strong>${correct}/${state.quizRound.length}</strong>
              <span>Correct answers</span>
            </div>
            <div class="summary-card">
              <strong>${score}%</strong>
              <span>Score</span>
            </div>
          </div>
          <div class="lesson-detail-actions">
            <button class="lesson-nav-button" data-action="restart-quiz-round">Restart quiz</button>
            <button class="lesson-nav-button is-primary" data-action="toggle-quiz-direction">Switch direction</button>
          </div>
        </div>
      `;
    }

    if (!currentItem) {
      return `<div class="empty-card">No quiz items are available for this lesson yet.</div>`;
    }

    return `
      <div class="toolbar">
        <div class="toolbar-row">
          <div class="segmented">
            <button class="${state.quizDirection === "en-to-ar" ? "is-active" : ""}" data-action="set-quiz-direction" data-direction="en-to-ar">English → Arabic</button>
            <button class="${state.quizDirection === "ar-to-en" ? "is-active" : ""}" data-action="set-quiz-direction" data-direction="ar-to-en">Arabic → English</button>
          </div>
          <button class="mini-button" data-action="restart-quiz-round">New quiz</button>
        </div>
      </div>
      <div class="chapter-practice-card lesson-detail-card">
        <div class="chapter-progress-meta">${state.quizIndex + 1} / ${state.quizRound.length}</div>
        <div class="lesson-detail-label">Quiz</div>
        <div class="lesson-note-card">
          <div class="muted">${currentItem.promptHint}</div>
          <div class="${currentItem.direction === "ar-to-en" ? "lesson-word-arabic arabic-text" : "quiz-prompt-text"}">${currentItem.prompt}</div>
          <div class="quiz-options">
            ${currentItem.options
              .map((option) => {
                const isSelected = answer === option;
                const isCorrect = option === currentItem.correct_answer;
                const quizClass = answer
                  ? isCorrect
                    ? "is-correct"
                    : isSelected
                      ? "is-wrong"
                      : ""
                  : isSelected
                    ? "is-selected"
                    : "";
                return `
                  <button class="quiz-option ${quizClass}" data-action="answer-practice-quiz" data-option="${escapeHtml(option)}" ${answer ? "disabled" : ""}>
                    <span class="${currentItem.direction === "en-to-ar" ? "arabic-text" : ""}">${option}</span>
                  </button>
                `;
              })
              .join("")}
          </div>
          ${
            answer
              ? `<div class="feedback ${answer === currentItem.correct_answer ? "is-good" : "is-bad"}">${
                  answer === currentItem.correct_answer ? "Correct." : `Correct answer: <span class="${currentItem.direction === "en-to-ar" ? "arabic-text" : ""}">${currentItem.correct_answer}</span>`
                }</div>`
              : `<div class="muted">Choose 1 of 4 answers.</div>`
          }
        </div>
      </div>
      <div class="lesson-detail-actions chapter-practice-actions">
        <button class="lesson-nav-button ${state.quizIndex === 0 ? "is-disabled" : ""}" data-action="quiz-prev" ${state.quizIndex === 0 ? "disabled" : ""}>← Previous</button>
        <button class="lesson-nav-button is-primary" data-action="${state.quizIndex === state.quizRound.length - 1 ? "quiz-complete" : "quiz-next"}" ${!answer ? "disabled" : ""}>
          ${state.quizIndex === state.quizRound.length - 1 ? "Finish quiz" : "Next →"}
        </button>
      </div>
    `;
  }

  function renderFlashcards() {
    if (state.flashRoundComplete) return renderFlashcardsComplete();
    const lesson = getPracticeLesson();
    const card = currentFlashCard();
    if (!card) return `<div class="empty-card">No flashcards are available for this lesson yet.</div>`;

    const promptIsArabic = card.direction === "ar-to-en";
    const prompt = promptIsArabic ? card.entry.arabic : card.entry.english;
    const answer = promptIsArabic ? card.entry.english : card.entry.arabic;

    return `
      <div class="toolbar">
        <div class="toolbar-row">
          <div class="segmented">
            ${[
              ["ar-to-en", "عربي ← إنجليزي"],
              ["en-to-ar", "إنجليزي ← عربي"],
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
          <button class="pill-button ${state.flashShuffle ? "is-on" : ""}" data-action="toggle-flash-shuffle">Shuffle</button>
          <button class="mini-button" data-action="speak-current">Hear Arabic</button>
        </div>
      </div>
      <div class="flash-score-row">
        <span class="score-pill is-good">✓ أعرف: ${state.flashKnown.length}</span>
        <span class="score-pill is-bad">✗ لا أعرف: ${state.flashUnknown.length}</span>
      </div>
      <div class="flashcard">
        <div class="flashcard-top">
          <div class="flashcard-tag">${lesson.label}</div>
          <div class="flashcard-tag">${flashCardPosition()} / ${state.flashRoundTotal}</div>
        </div>
        <div class="flashcard-main">
          <div class="subcopy">${card.direction === "en-to-ar" ? "English to Arabic" : "Arabic to English"}</div>
          <div class="prompt ${promptIsArabic ? "arabic-text" : ""}">${prompt}</div>
          <div class="answer ${!state.flashRevealed ? "is-hidden" : ""} ${!promptIsArabic ? "arabic-text" : ""}">${answer}</div>
          <div class="subcopy">${lesson.focus}</div>
        </div>
        <div class="flash-actions">
          <button class="flash-action is-red" data-action="grade-flashcard" data-result="unknown">Don't know<small>retry later</small></button>
          <button class="flash-action is-gold" data-action="toggle-flash-answer">${state.flashRevealed ? "Hide meaning" : "Check definition"}<small>peek first</small></button>
          <button class="flash-action is-green" data-action="grade-flashcard" data-result="known">I know it<small>remove card</small></button>
        </div>
      </div>
    `;
  }

  function renderMatching() {
    return `
      <div class="toolbar">
        <div class="toolbar-row">
          <button class="mini-button" data-action="reset-matching">New round</button>
          <span class="muted">${state.matchSolved.length / 2} pairs solved</span>
        </div>
      </div>
      <div class="match-grid">
        ${state.matchRound
          .map((item) => {
            const isSolved = state.matchSolved.includes(item.id);
            const isSelected = state.matchSelection.includes(item.id);
            return `
              <button class="match-card ${item.side === "arabic" ? "arabic-text" : ""} ${isSolved ? "is-matched" : ""} ${isSelected ? "is-selected" : ""}" data-action="pick-match" data-card-id="${item.id}">
                ${item.label}
              </button>
            `;
          })
          .join("")}
      </div>
      ${state.matchFeedback ? `<div class="feedback ${state.matchFeedback.startsWith("Nice") ? "is-good" : "is-bad"}">${state.matchFeedback}</div>` : ""}
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
          <div class="muted">${state.typingStrict ? "Strict mode expects the harakat too." : "Relaxed mode ignores most harakat differences."}</div>
        </div>
        <input class="typing-input" data-input="typing-input" dir="${targetLanguage === "arabic" ? "rtl" : "ltr"}" lang="${targetLanguage === "arabic" ? "ar" : "en"}" value="${escapeHtml(state.typingInput)}" placeholder="${targetLanguage === "arabic" ? "اكتب هنا" : "Type here"}" />
        ${
          targetLanguage === "arabic"
            ? `<div class="typing-pad">${["َ", "ِ", "ُ", "ْ", "ّ", "ً", "ٍ", "ٌ", "ة", "ى"]
                .map((character) => `<button data-action="insert-char" data-char="${character}">${character}</button>`)
                .join("")}</div>`
            : ""
        }
        <div class="typing-actions">
          <button class="mini-button" data-action="submit-typing">Check answer</button>
          <button class="mini-button" data-action="reveal-typing">Reveal answer</button>
          <button class="mini-button" data-action="speak-current">Hear Arabic</button>
        </div>
        ${
          state.typingFeedback
            ? `<div class="feedback ${state.typingFeedback.correct ? "is-good" : "is-bad"}">${state.typingFeedback.message}${state.typingFeedback.expected ? `<div class="feedback-inline"><strong>Expected:</strong> ${state.typingFeedback.expected}</div>` : ""}</div>`
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
            ${supported ? `<button class="pill-button ${state.pronunciationListening ? "is-on" : ""}" data-action="toggle-listening">${state.pronunciationListening ? "Listening..." : "Start mic"}</button>` : `<span class="muted">Speech recognition is not available in this browser.</span>`}
          </div>
        </div>
        <div class="pronunciation-target">
          <strong>Speak this</strong>
          <div class="arabic-text">${prompt.arabic}</div>
          <p class="muted">${prompt.english}</p>
        </div>
        <div class="summary-card transcript-card">
          <strong>Live transcript</strong>
          <span>${state.pronunciationTranscript || "Waiting for speech..."}</span>
        </div>
        <div class="meter"><span style="width:${score}%;"></span></div>
        ${state.pronunciationFeedback ? `<div class="feedback ${state.pronunciationFeedback.correct ? "is-good" : "is-bad"}">${state.pronunciationFeedback.message}</div>` : ""}
      </div>
    `;
  }

  function renderPracticeBody() {
    if (!state.practiceMode) return renderPracticeModeChooser();
    if (state.practiceMode === "quiz") return renderQuizPractice();
    if (state.practiceMode === "flashcards") return renderFlashcards();
    if (state.practiceMode === "matching") return renderMatching();
    if (state.practiceMode === "typing") return renderTyping();
    return renderPronunciation();
  }

  function renderPractice() {
    const lesson = getPracticeLesson();
    const lessonStats = computeLessonStats(lesson);
    const isChooser = !state.practiceMode;
    const progressValue =
      state.practiceMode === "quiz"
        ? state.quizComplete
          ? 100
          : Math.round((state.quizIndex / Math.max(state.quizRound.length, 1)) * 100)
        : state.practiceMode === "flashcards"
        ? state.flashRoundComplete
          ? 100
          : Math.round((flashSolvedCount() / Math.max(state.flashRoundTotal || 1, 1)) * 100)
        : lessonStats.percent;

    return `
      <section class="panel practice-screen">
        <div class="practice-screen-head">
          <button class="back-button" data-action="${state.practiceMode ? "back-practice-modes" : "change-section"}" data-section="home">&larr;</button>
          <div class="practice-title-wrap">
            <h2>${lesson.title}</h2>
            <p>${state.practiceMode ? PRACTICE_MODES.find((mode) => mode.key === state.practiceMode)?.label || "Practice" : `${lesson.vocabulary.length} vocab items`}</p>
          </div>
        </div>
        <div class="practice-progress"><span style="width:${Math.max(progressValue, state.practiceMode ? 8 : 0)}%;"></span></div>
        <div class="practice-layout ${isChooser ? "is-chooser" : "is-active-session"}">
          ${
            isChooser
              ? `
                <div class="lesson-strip">
                  ${lessons
                    .map(
                      (entry) => `
                        <button class="lesson-chip ${entry.id === lesson.id ? "is-active" : ""}" data-action="change-practice-lesson" data-lesson-id="${entry.id}">
                          <strong>${entry.label}</strong>
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
              : ""
          }
          <div class="practice-body">${renderPracticeBody()}</div>
        </div>
      </section>
    `;
  }

  function renderProgress() {
    const overall = computeOverallStats();

    return `
      <section class="panel progress-board">
        <div class="practice-screen-head">
          <button class="back-button" data-action="change-section" data-section="home">&larr;</button>
          <div class="practice-title-wrap">
            <h2>Session Progress</h2>
            <p>This GitHub Pages build saves only in session storage, so progress lasts until the session ends.</p>
          </div>
        </div>
        <div class="progress-content">
          <div class="home-stats-grid">
            <div class="summary-card">
              <strong>${overall.sessionAnswers}</strong>
              <span>Total answers</span>
            </div>
            <div class="summary-card">
              <strong>${overall.reviewedCards}</strong>
              <span>Vocabulary seen</span>
            </div>
            <div class="summary-card">
              <strong>${overall.totalXp}</strong>
              <span>XP earned</span>
            </div>
            <div class="summary-card">
              <strong>${overall.streak}</strong>
              <span>Study streak</span>
            </div>
          </div>
          <div class="section-block">
            <div class="section-head">
              <div>
                <h2>Lesson Status</h2>
                <p>Session-only progress per lesson.</p>
              </div>
            </div>
            <div class="summary-grid progress-grid">
              ${lessons
                .map((lesson) => {
                  const stats = computeLessonStats(lesson);
                  return `
                    <div class="progress-row">
                      <div class="progress-row-top">
                        <strong>${lesson.label}</strong>
                        ${renderStatusPill(stats.status)}
                      </div>
                      <div class="muted">${lesson.focus}</div>
                      <div class="progress-bar"><span style="width:${stats.percent}%;"></span></div>
                      <div class="lesson-meta-row">
                        <span>${stats.mastered}/${lesson.vocabulary.length} strong</span>
                        <span>${stats.score || 0}% score</span>
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderCurrentSection() {
    if (state.section === "home") return renderHome();
    if (state.section === "lessons") return renderLessons();
    if (state.section === "alphabet") return renderAlphabet();
    if (state.section === "practice") return renderPractice();
    return renderProgress();
  }

  function render() {
    root.innerHTML = `
      <div class="app-shell">
        <main class="main-stage">
          <div class="screen">${renderCurrentSection()}</div>
        </main>
        <nav class="bottom-nav bottom-nav-wide">
          ${[
            ["home", "⌂", "Home"],
            ["lessons", "📘", "Lessons"],
            ["alphabet", "أ", "Alphabet"],
            ["practice", "🎙", "Practice"],
            ["progress", "📈", "Progress"]
          ]
            .map(
              ([section, glyph, label]) => `
                <button class="nav-button ${state.section === section ? "is-active" : ""}" data-action="change-section" data-section="${section}">
                  <span class="nav-glyph">${glyph}</span>
                  <span class="nav-label">${label}</span>
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
      state.lessonDetailOpen = false;
      state.lessonCompleted = false;
      state.alphabetSelected = null;
    }

    if (action === "set-lesson-category") state.lessonFilterCategory = target.dataset.category;
    if (action === "set-lesson-level") state.lessonFilterLevel = target.dataset.level;

    if (action === "open-lesson") {
      resetLessonFlow(target.dataset.lessonId);
      state.section = "lessons";
      state.practiceLessonId = target.dataset.lessonId;
    }

    if (action === "close-lesson-detail") {
      state.lessonDetailOpen = false;
      state.lessonContentIndex = 0;
      state.lessonAnswers = {};
      state.lessonCompleted = false;
    }

    if (action === "lesson-prev") state.lessonContentIndex = Math.max(0, state.lessonContentIndex - 1);
    if (action === "lesson-next") state.lessonContentIndex = Math.min(getLesson().content.length - 1, state.lessonContentIndex + 1);
    if (action === "answer-lesson-quiz") state.lessonAnswers[state.lessonContentIndex] = target.dataset.option;
    if (action === "complete-lesson") completeLesson();
    if (action === "quiz-prev") state.quizIndex = Math.max(0, state.quizIndex - 1);
    if (action === "quiz-next") state.quizIndex = Math.min(state.quizRound.length - 1, state.quizIndex + 1);
    if (action === "answer-practice-quiz") {
      const item = currentQuizItem();
      if (!item || state.quizAnswers[state.quizIndex]) {
        render();
        return;
      }
      state.quizAnswers[state.quizIndex] = target.dataset.option;
      trackAnswer(getPracticeLesson().id, item.entry, target.dataset.option === item.correct_answer ? "known" : "unknown");
    }
    if (action === "quiz-complete") completeQuizRound();
    if (action === "restart-quiz-round") resetQuizRound();
    if (action === "set-quiz-direction") {
      state.quizDirection = target.dataset.direction;
      resetQuizRound();
    }
    if (action === "toggle-quiz-direction") {
      state.quizDirection = state.quizDirection === "en-to-ar" ? "ar-to-en" : "en-to-ar";
      resetQuizRound();
    }

    if (action === "open-alphabet-letter") {
      state.alphabetSelected = ARABIC_ALPHABET.find((item) => item.letter === target.dataset.letter) || null;
      if (state.alphabetSelected) speakArabic(state.alphabetSelected.letter);
    }
    if (action === "close-alphabet-letter") state.alphabetSelected = null;

    if (action === "change-practice-lesson") {
      const currentMode = state.practiceMode;
      resetPracticeSelection(target.dataset.lessonId);
      state.lessonId = target.dataset.lessonId;
      if (currentMode) setPracticeMode(currentMode);
    }

    if (action === "start-practice") {
      state.section = "practice";
      resetPracticeSelection(target.dataset.lessonId || state.practiceLessonId);
      if (target.dataset.mode) setPracticeMode(target.dataset.mode);
    }

    if (action === "back-practice-modes") state.practiceMode = null;
    if (action === "select-practice-mode") setPracticeMode(target.dataset.mode);
    if (action === "set-flash-direction") {
      state.flashDirection = target.dataset.direction;
      resetFlashcards();
    }
    if (action === "toggle-flash-shuffle") {
      state.flashShuffle = !state.flashShuffle;
      resetFlashcards();
    }
    if (action === "toggle-flash-answer") state.flashRevealed = !state.flashRevealed;
    if (action === "grade-flashcard") advanceFlashcard(target.dataset.result);
    if (action === "practice-flash-missed") resetFlashcards(state.flashUnknown.length ? state.flashUnknown.map((item) => item.entry) : flashSourceEntries());
    if (action === "restart-flash-round") resetFlashcards();

    if (action === "reset-matching") resetMatchRound();
    if (action === "pick-match") {
      const cardIdValue = target.dataset.cardId;
      if (!state.matchSolved.includes(cardIdValue)) {
        state.matchSelection = state.matchSelection.concat(cardIdValue).slice(-2);
        if (state.matchSelection.length === 2) {
          const [first, second] = state.matchSelection.map((id) => state.matchRound.find((item) => item.id === id));
          if (first && second && first.side !== second.side && first.pairId === second.pairId) {
            state.matchSolved = state.matchSolved.concat(state.matchSelection);
            state.matchFeedback = "Nice pair. Keep going.";
            trackAnswer(getPracticeLesson().id, getPracticeLesson().vocabulary[first.pairId], "known");
          } else {
            state.matchFeedback = "Not quite. Try another pair.";
          }
          setTimeout(() => {
            state.matchSelection = [];
            render();
          }, 450);
        }
      }
    }

    if (action === "set-typing-direction") {
      state.typingDirection = target.dataset.direction;
      resetTyping();
    }
    if (action === "toggle-typing-strict") state.typingStrict = !state.typingStrict;
    if (action === "insert-char") state.typingInput += target.dataset.char;
    if (action === "submit-typing") {
      const lesson = getPracticeLesson();
      const card = getTypingCard();
      const targetLanguage = state.typingDirection === "en-to-ar" ? "arabic" : "english";
      const expected = targetLanguage === "arabic" ? card.arabic : card.english;
      const correct = compareAnswer(expected, state.typingInput, state.typingStrict, targetLanguage);
      trackAnswer(lesson.id, card, correct ? "known" : "unknown");
      state.typingFeedback = { correct, expected, message: correct ? "Correct. Move on when you are ready." : "Close, but not quite." };
    }
    if (action === "reveal-typing") {
      const card = getTypingCard();
      const expected = state.typingDirection === "en-to-ar" ? card.arabic : card.english;
      state.typingFeedback = { correct: false, expected, message: "Answer revealed. Type it once before moving on." };
    }
    if (action === "next-typing") nextTypingCard();

    if (action === "toggle-listening") {
      const engine = getRecognition();
      if (!engine) {
        render();
        return;
      }
      if (state.pronunciationListening) engine.stop();
      else {
        state.pronunciationTranscript = "";
        state.pronunciationFeedback = null;
        engine.start();
      }
    }
    if (action === "next-pronunciation") nextPronunciationPrompt();

    if (action === "speak-current") {
      if (state.section === "practice") {
        if (state.practiceMode === "quiz") {
          const item = currentQuizItem();
          speakArabic(item?.entry?.arabic || "");
        }
        else if (state.practiceMode === "pronunciation") speakArabic(pronunciationPool()[state.pronunciationIndex]?.arabic || "");
        else if (state.practiceMode === "typing") speakArabic(getTypingCard()?.arabic || "");
        else speakArabic(currentFlashCard()?.entry?.arabic || getPracticeLesson().phrases[0]?.arabic || "");
      }
      if (state.section === "lessons" && state.lessonDetailOpen && !state.lessonCompleted) {
        const item = getLesson().content[state.lessonContentIndex];
        speakArabic(item?.arabic || "");
      }
    }

    if (action === "speak-text") speakArabic(target.dataset.text);
    render();
  }

  function onInput(event) {
    const target = event.target;
    if (target.dataset.input === "lesson-search") {
      state.lessonSearch = target.value;
      render();
    }
    if (target.dataset.input === "typing-input") {
      state.typingInput = target.value;
      render();
    }
  }

  root.addEventListener("click", onClick);
  root.addEventListener("input", onInput);

  resetPracticeSelection(state.practiceLessonId);
  render();
})();
