(function () {
  const rawLessons = (window.APP_LESSONS || []).slice().sort((a, b) => a.sequence - b.sequence);
  const rawQuranSurahs = (window.APP_JUZ_AMMA || []).slice().sort((a, b) => a.priority - b.priority);
  const storageKey = "madinah-lab-session-v2";
  const root = document.getElementById("app");
  let recognition = null;

  const CATEGORY_OPTIONS = [
    { key: "all", label: "الكل" },
    { key: "madina_book1", label: "كتاب المدينة" },
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
    { key: "quiz", label: "Quiz", labelAr: "اختبار", note: "Pick the right answer from 4 choices — good for quick review", icon: "❓" },
    { key: "flashcards", label: "Say & Translate", labelAr: "قُل وترجِم", note: "See the word — say it aloud — translate it to yourself — then reveal", icon: "🗂" },
    { key: "matching", label: "Matching", labelAr: "مطابقة", note: "Tap an Arabic word then its English pair to match them", icon: "🎯" },
    { key: "grammar", label: "Grammar Challenge", labelAr: "تحدي القواعد", note: "Apply the grammar rule — answer questions about this lesson's pattern", icon: "📐" },
    { key: "builder", label: "Sentence Builder", labelAr: "بناء الجملة", note: "Arrange shuffled word tiles into the correct Arabic sentence", icon: "🧩" }
  ];

  const QURAN_MODES = [
    { key: "review", label: "Ayah Cards", labelAr: "بطاقات الآيات", note: "Read, listen, and reveal the Clear Quran meaning.", icon: "📖" },
    { key: "meaning", label: "Meaning Quiz", labelAr: "اختبار المعنى", note: "Match each ayah with its meaning.", icon: "💡" },
    { key: "next-ayah", label: "Next Ayah", labelAr: "الآية التالية", note: "Choose the ayah that comes next.", icon: "➡" },
    { key: "word-map", label: "Word Map", labelAr: "كلمات الآية", note: "See each word with a best-effort English gloss.", icon: "🔎" }
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
  const juzAmmaSurahs = rawQuranSurahs.map(normalizeSurah);

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
    quranSurahId: juzAmmaSurahs[0]?.id || "",
    quranMode: null,
    quranAyahIndex: 0,
    quranRevealMeaning: false,
    quranMeaningRound: [],
    quranMeaningIndex: 0,
    quranMeaningAnswers: {},
    quranMeaningComplete: false,
    quranNextRound: [],
    quranNextIndex: 0,
    quranNextAnswers: {},
    quranNextComplete: false,
    quranWordIndex: 0,
    quranOrderDeck: [],
    quranOrderPicked: [],
    quranOrderExpected: 1,
    quranOrderComplete: false,
    quranOrderFeedback: "",
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
    grammarIndex: 0,
    grammarAnswers: {},
    grammarComplete: false,
    builderPhraseIndex: 0,
    builderPicked: [],
    builderAvailable: [],
    builderFeedback: null,
    builderComplete: false,
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
      grammarNote: raw.grammarNote || "",
      challenges: (window.APP_CHALLENGES || {})[raw.id] || [],
      phrases,
      vocabulary
    };
  }

  function normalizeSurah(raw, index) {
    return {
      id: raw.id,
      number: Number(raw.number),
      priority: Number(raw.priority || raw.number),
      name: raw.name,
      name_ar: raw.name_ar || raw.name,
      translated_name: raw.translated_name || raw.name,
      revelation_place: raw.revelation_place || "",
      verses_count: Number(raw.verses_count || (raw.ayahs || []).length),
      slug: raw.slug || "",
      focus: `Surah ${raw.name} memory`,
      summary: `${raw.name_ar} — ${raw.name}. Priority Juz Amma memorization with Quran.com Arabic and The Clear Quran meaning.`,
      ayahs: (raw.ayahs || []).map((ayah) => ({
        number: Number(ayah.number),
        arabic: String(ayah.arabic || "").trim(),
        meaning: sanitizeQuranMeaning(ayah.meaning || ""),
        words: (ayah.words || []).map((word) => ({
          arabic: String(word.arabic || "").trim(),
          transliteration: String(word.transliteration || "").trim(),
          meaning: sanitizeQuranMeaning(word.meaning || "")
        }))
      })),
      order: index + 1
    };
  }

  function sanitizeQuranMeaning(value) {
    return String(value || "")
      .replace(/\d+/g, "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .trim();
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
      english: raw.grammarNote || `${raw.focus}. This lesson includes ${phrases.length} core example${phrases.length === 1 ? "" : "s"} and ${vocabulary.length} vocabulary item${vocabulary.length === 1 ? "" : "s"} before the lesson checks.`,
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

  function getQuranSurahById(surahId) {
    return juzAmmaSurahs.find((surah) => surah.id === surahId) || juzAmmaSurahs[0];
  }

  function getQuranSurah() {
    return getQuranSurahById(state.quranSurahId);
  }

  function allQuranAyahs() {
    return juzAmmaSurahs.flatMap((surah) =>
      surah.ayahs.map((ayah) => ({
        surah,
        ayah,
        key: `${surah.id}:${ayah.number}`
      }))
    );
  }

  function resetQuranMeaningRound() {
    const surah = getQuranSurah();
    const meaningPool = allQuranAyahs().map((item) => item.ayah.meaning);
    state.quranMeaningRound = surah.ayahs.map((ayah) => ({
      ayah,
      options: buildChoiceOptions(ayah.meaning, meaningPool.filter((item) => item !== ayah.meaning), 4)
    }));
    state.quranMeaningIndex = 0;
    state.quranMeaningAnswers = {};
    state.quranMeaningComplete = false;
  }

  function resetQuranNextRound() {
    const surah = getQuranSurah();
    const arabicPool = allQuranAyahs().map((item) => item.ayah.arabic);
    state.quranNextRound = surah.ayahs.slice(0, -1).map((ayah, index) => ({
      current: ayah,
      next: surah.ayahs[index + 1],
      options: buildChoiceOptions(
        surah.ayahs[index + 1].arabic,
        arabicPool.filter((item) => item !== surah.ayahs[index + 1].arabic && item !== ayah.arabic),
        4
      )
    }));
    state.quranNextIndex = 0;
    state.quranNextAnswers = {};
    state.quranNextComplete = false;
  }

  function resetQuranOrderRound() {
    const surah = getQuranSurah();
    state.quranOrderDeck = shuffle(surah.ayahs.map((ayah) => ({ ...ayah })));
    state.quranOrderPicked = [];
    state.quranOrderExpected = 1;
    state.quranOrderComplete = false;
    state.quranOrderFeedback = "";
  }

  function resetQuranSection(keepMode) {
    state.quranAyahIndex = 0;
    state.quranRevealMeaning = false;
    state.quranMeaningRound = [];
    state.quranMeaningIndex = 0;
    state.quranMeaningAnswers = {};
    state.quranMeaningComplete = false;
    state.quranNextRound = [];
    state.quranNextIndex = 0;
    state.quranNextAnswers = {};
    state.quranNextComplete = false;
    state.quranWordIndex = 0;
    state.quranOrderDeck = [];
    state.quranOrderPicked = [];
    state.quranOrderExpected = 1;
    state.quranOrderComplete = false;
    state.quranOrderFeedback = "";
    if (!keepMode) state.quranMode = null;
  }

  function setQuranMode(mode) {
    state.quranMode = mode;
    state.quranAyahIndex = 0;
    state.quranRevealMeaning = false;
    if (mode === "meaning") resetQuranMeaningRound();
    if (mode === "next-ayah") resetQuranNextRound();
    if (mode === "word-map") state.quranWordIndex = 0;
    if (mode === "order") resetQuranOrderRound();
  }

  function quranReviewCard() {
    const surah = getQuranSurah();
    return surah?.ayahs[state.quranAyahIndex] || surah?.ayahs[0] || null;
  }

  function quranMeaningItem() {
    return state.quranMeaningRound[state.quranMeaningIndex] || state.quranMeaningRound[0] || null;
  }

  function quranNextItem() {
    return state.quranNextRound[state.quranNextIndex] || state.quranNextRound[0] || null;
  }

  function activeQuranAyah() {
    const surah = getQuranSurah();
    if (!surah) return null;
    if (state.quranMode === "meaning") return quranMeaningItem()?.ayah || surah.ayahs[0] || null;
    if (state.quranMode === "next-ayah") return quranNextItem()?.current || surah.ayahs[0] || null;
    if (state.quranMode === "word-map") return surah.ayahs[state.quranWordIndex] || surah.ayahs[0] || null;
    if (state.quranMode === "order") return surah.ayahs[state.quranOrderExpected - 1] || surah.ayahs[surah.ayahs.length - 1] || null;
    return quranReviewCard();
  }

  function quranWordItems(ayah) {
    if (!ayah) return [];
    if (ayah.words && ayah.words.length) return ayah.words;
    const arabicWords = String(ayah.arabic || "").trim().split(/\s+/).filter(Boolean);
    const englishWords = sanitizeQuranMeaning(ayah.meaning || "").split(/\s+/).filter(Boolean);
    return arabicWords.map((word, index) => ({
      arabic: word,
      transliteration: "",
      meaning: englishWords[index] || "—"
    }));
  }

  function computeQuranStats() {
    const totalSurahs = juzAmmaSurahs.length;
    const totalAyahs = juzAmmaSurahs.reduce((sum, surah) => sum + surah.ayahs.length, 0);
    const reviewedAyahs = allQuranAyahs().filter(({ surah, ayah }) => {
      const stats = state.progress.cards[cardId(surah.id, ayah)] || { seen: 0 };
      return stats.seen > 0;
    }).length;
    const strongAyahs = allQuranAyahs().filter(({ surah, ayah }) => {
      const stats = state.progress.cards[cardId(surah.id, ayah)] || { known: 0, unknown: 0 };
      return stats.known >= 2 && stats.known > stats.unknown;
    }).length;
    return { totalSurahs, totalAyahs, reviewedAyahs, strongAyahs };
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

  function trackQuranAnswer(surahId, ayah, result) {
    const id = cardId(surahId, ayah);
    const current = state.progress.cards[id] || { known: 0, unknown: 0, seen: 0 };
    current.seen += 1;
    if (result === "known") current.known += 1;
    if (result === "unknown") current.unknown += 1;
    state.progress.cards[id] = current;
    state.progress.sessionAnswers += 1;
    markActivity();
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

  function computeQuranSurahStats(surah) {
    const totals = surah.ayahs.reduce(
      (accumulator, ayah) => {
        const stats = state.progress.cards[cardId(surah.id, ayah)] || { known: 0, unknown: 0, seen: 0 };
        accumulator.known += stats.known;
        accumulator.unknown += stats.unknown;
        accumulator.seen += stats.seen;
        if (stats.known >= 2 && stats.known > stats.unknown) accumulator.mastered += 1;
        return accumulator;
      },
      { known: 0, unknown: 0, seen: 0, mastered: 0 }
    );

    const totalAttempts = totals.known + totals.unknown;
    return {
      ...totals,
      percent: totalAttempts ? Math.round((totals.known / totalAttempts) * 100) : 0
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
    const picks = sample(lesson.vocabulary, Math.min(4, lesson.vocabulary.length));
    const leftSide = picks.map((entry, index) => ({
      id: `${index}-ar`,
      pairId: index,
      side: "arabic",
      label: entry.arabic
    }));
    const rightSide = shuffle(picks.slice()).map((entry) => ({
      id: `${picks.indexOf(entry)}-en`,
      pairId: picks.indexOf(entry),
      side: "english",
      label: entry.english
    }));
    state.matchRound = leftSide.concat(rightSide);
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

  function resetGrammarChallenge() {
    state.grammarIndex = 0;
    state.grammarAnswers = {};
    state.grammarComplete = false;
  }

  function resetSentenceBuilder() {
    const lesson = getPracticeLesson();
    state.builderPhraseIndex = 0;
    state.builderComplete = false;
    state.builderFeedback = null;
    loadBuilderPhrase(lesson);
  }

  function loadBuilderPhrase(lesson) {
    const phrase = (lesson.phrases || [])[state.builderPhraseIndex];
    if (!phrase) { state.builderComplete = true; return; }
    const tokens = phrase.arabic.split(/\s+/).filter(Boolean);
    state.builderAvailable = shuffle(tokens.map((text, i) => ({ id: `${i}-${text}`, text })));
    state.builderPicked = [];
    state.builderFeedback = null;
  }

  function setPracticeMode(mode) {
    state.practiceMode = mode;
    if (mode === "quiz") resetQuizRound();
    if (mode === "flashcards") resetFlashcards();
    if (mode === "matching") resetMatchRound();
    if (mode === "typing") resetTyping();
    if (mode === "pronunciation") resetPronunciation();
    if (mode === "grammar") resetGrammarChallenge();
    if (mode === "builder") resetSentenceBuilder();
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
              <p>Build strong Madinah Book 1 vocabulary first, then layer in Juz Amma memorization with Quran.com ayat and The Clear Quran meaning.</p>
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
              <button class="quick-action-card" data-action="change-section" data-section="quran">
                <div class="quick-action-icon">۞</div>
                <div>
                  <strong>Juz Amma Memory</strong>
                  <span>Priority surahs 78 to 114 with ayah meaning drills</span>
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

  function renderQuranModeChooser() {
    const surah = getQuranSurah();
    return `
      <div class="quran-overview">
        <div class="quran-intro-card">
          <strong>Priority Surahs 78-114</strong>
          <p>Scroll through the surahs, tap one, then choose how you want to memorize it.</p>
        </div>

        <div class="quran-chapter-list">
          ${juzAmmaSurahs.map((entry) => {
            const isActive = entry.id === surah.id;
            const stats = computeQuranSurahStats(entry);
            return `
              <article class="quran-chapter-card ${isActive ? "is-active" : ""}">
                <button class="quran-chapter-select" data-action="change-quran-surah" data-surah-id="${entry.id}">
                  <div class="lesson-card-top">
                    <div class="lesson-badge">Surah ${entry.number}</div>
                    <div class="status-pill is-in_progress">${entry.verses_count} ayahs</div>
                  </div>
                  <div class="quran-chapter-head">
                    <div>
                      <h3>${entry.number}. ${entry.name}</h3>
                      <div class="lesson-arabic arabic-text">${entry.name_ar}</div>
                    </div>
                    <div class="quran-chapter-progress">
                      <strong>${stats.percent}%</strong>
                      <span>recall</span>
                    </div>
                  </div>
                  <p>${entry.translated_name} • ${entry.revelation_place} • ${stats.mastered}/${entry.verses_count} strong</p>
                </button>
                ${
                  isActive
                    ? `
                      <div class="quran-chapter-modes">
                        ${QURAN_MODES.map(
                          (mode) => `
                            <button class="quran-mode-button" data-action="select-quran-mode" data-mode="${mode.key}">
                              <span class="quran-mode-icon">${mode.icon}</span>
                              <span>
                                <strong>${mode.label}</strong>
                                <small>${mode.labelAr}</small>
                              </span>
                            </button>
                          `
                        ).join("")}
                      </div>
                    `
                    : ""
                }
              </article>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderQuranReview() {
    const surah = getQuranSurah();
    const ayah = quranReviewCard();
    if (!surah || !ayah) return `<div class="empty-card">No surah data is loaded yet.</div>`;

    return `
      <div class="quran-session-wrap">
        <div class="quran-session-card lesson-detail-card">
          <div class="chapter-progress-meta">${ayah.number} / ${surah.verses_count}</div>
          <div class="lesson-detail-label">Ayah Review</div>
          <div class="quran-ayah-reference">Surah ${surah.number}, Ayah ${ayah.number} of ${surah.verses_count}</div>
          <div class="lesson-note-card">
            <div class="quran-surah-kicker">${surah.number}. ${surah.name} • ${surah.name_ar}</div>
            <div class="lesson-word-arabic arabic-text quran-ayah-text">${ayah.arabic}</div>
            ${
              state.quranRevealMeaning
                ? `<div class="quran-meaning">${ayah.meaning}</div>`
                : `<div class="muted quran-memory-prompt">Recall the meaning first, then reveal it.</div>`
            }
            <button class="speaker-button" data-action="speak-quran-ayah">Listen</button>
          </div>
        </div>
        <div class="lesson-detail-actions quran-review-actions">
          <button class="lesson-nav-button ${state.quranAyahIndex === 0 ? "is-disabled" : ""}" data-action="quran-prev-ayah" ${state.quranAyahIndex === 0 ? "disabled" : ""}>← Previous</button>
          <button class="lesson-nav-button" data-action="toggle-quran-meaning">${state.quranRevealMeaning ? "Hide meaning" : "Reveal meaning"}</button>
          <button class="lesson-nav-button is-primary" data-action="quran-next-ayah">${state.quranAyahIndex === surah.ayahs.length - 1 ? "Start again" : "Next →"}</button>
        </div>
      </div>
    `;
  }

  function renderQuranMeaningQuiz() {
    const surah = getQuranSurah();
    const item = quranMeaningItem();
    const answer = state.quranMeaningAnswers[state.quranMeaningIndex];

    if (state.quranMeaningComplete) {
      const correct = state.quranMeaningRound.reduce((count, roundItem, index) => count + (state.quranMeaningAnswers[index] === roundItem.ayah.meaning ? 1 : 0), 0);
      const score = state.quranMeaningRound.length ? Math.round((correct / state.quranMeaningRound.length) * 100) : 0;
      return `
        <div class="lesson-complete-card chapter-summary-card">
          <div class="lesson-complete-icon">💡</div>
          <h3>Meaning quiz complete</h3>
          <p>${surah.name} • ${surah.name_ar}</p>
          <div class="lesson-complete-stats">
            <div class="summary-card">
              <strong>${correct}/${state.quranMeaningRound.length}</strong>
              <span>Correct meanings</span>
            </div>
            <div class="summary-card">
              <strong>${score}%</strong>
              <span>Score</span>
            </div>
          </div>
          <div class="lesson-detail-actions">
            <button class="lesson-nav-button" data-action="restart-quran-meaning">Restart</button>
            <button class="lesson-nav-button is-primary" data-action="back-quran-modes">Pick another method</button>
          </div>
        </div>
      `;
    }

    if (!item) return `<div class="empty-card">No meaning quiz items are available for this surah yet.</div>`;

    return `
      <div class="quran-session-wrap">
        <div class="chapter-practice-card lesson-detail-card">
          <div class="chapter-progress-meta">${state.quranMeaningIndex + 1} / ${state.quranMeaningRound.length}</div>
          <div class="lesson-detail-label">Meaning Quiz</div>
          <div class="lesson-note-card">
            <div class="muted">Choose the Clear Quran meaning for this ayah.</div>
            <div class="lesson-word-arabic arabic-text quran-ayah-text">${item.ayah.arabic}</div>
            <div class="quiz-options">
              ${item.options.map((option) => {
                const isSelected = answer === option;
                const isCorrect = option === item.ayah.meaning;
                const quizClass = answer
                  ? isCorrect
                    ? "is-correct"
                    : isSelected
                      ? "is-wrong"
                      : ""
                  : "";
                return `
                  <button class="quiz-option ${quizClass}" data-action="answer-quran-meaning" data-option="${escapeHtml(option)}" ${answer ? "disabled" : ""}>
                    <span>${option}</span>
                  </button>
                `;
              }).join("")}
            </div>
            ${
              answer
                ? `<div class="feedback ${answer === item.ayah.meaning ? "is-good" : "is-bad"}">${
                    answer === item.ayah.meaning ? "Correct." : `Correct meaning: ${item.ayah.meaning}`
                  }</div>`
                : `<div class="muted">Choose 1 of 4 meanings.</div>`
            }
          </div>
        </div>
        <div class="lesson-detail-actions chapter-practice-actions">
          <button class="lesson-nav-button ${state.quranMeaningIndex === 0 ? "is-disabled" : ""}" data-action="quran-meaning-prev" ${state.quranMeaningIndex === 0 ? "disabled" : ""}>← Previous</button>
          <button class="lesson-nav-button is-primary" data-action="${state.quranMeaningIndex === state.quranMeaningRound.length - 1 ? "complete-quran-meaning" : "quran-meaning-next"}" ${!answer ? "disabled" : ""}>
            ${state.quranMeaningIndex === state.quranMeaningRound.length - 1 ? "Finish quiz" : "Next →"}
          </button>
        </div>
      </div>
    `;
  }

  function renderQuranNextAyah() {
    const surah = getQuranSurah();
    const item = quranNextItem();
    const answer = state.quranNextAnswers[state.quranNextIndex];

    if (state.quranNextComplete) {
      const correct = state.quranNextRound.reduce((count, roundItem, index) => count + (state.quranNextAnswers[index] === roundItem.next.arabic ? 1 : 0), 0);
      const score = state.quranNextRound.length ? Math.round((correct / state.quranNextRound.length) * 100) : 0;
      return `
        <div class="lesson-complete-card chapter-summary-card">
          <div class="lesson-complete-icon">➡</div>
          <h3>Next ayah round complete</h3>
          <p>${surah.name} • ${surah.name_ar}</p>
          <div class="lesson-complete-stats">
            <div class="summary-card">
              <strong>${correct}/${state.quranNextRound.length}</strong>
              <span>Sequence correct</span>
            </div>
            <div class="summary-card">
              <strong>${score}%</strong>
              <span>Score</span>
            </div>
          </div>
          <div class="lesson-detail-actions">
            <button class="lesson-nav-button" data-action="restart-quran-next">Restart</button>
            <button class="lesson-nav-button is-primary" data-action="back-quran-modes">Pick another method</button>
          </div>
        </div>
      `;
    }

    if (!item) return `<div class="empty-card">This surah needs at least two ayahs for next-ayah practice.</div>`;

    return `
      <div class="quran-session-wrap">
        <div class="chapter-practice-card lesson-detail-card">
          <div class="chapter-progress-meta">${state.quranNextIndex + 1} / ${state.quranNextRound.length}</div>
          <div class="lesson-detail-label">Next Ayah</div>
          <div class="lesson-note-card">
            <div class="muted">Which ayah comes next in ${surah.name}?</div>
            <div class="lesson-word-arabic arabic-text quran-ayah-text">${item.current.arabic}</div>
            <div class="quiz-options">
              ${item.options.map((option) => {
                const isSelected = answer === option;
                const isCorrect = option === item.next.arabic;
                const quizClass = answer
                  ? isCorrect
                    ? "is-correct"
                    : isSelected
                      ? "is-wrong"
                      : ""
                  : "";
                return `
                  <button class="quiz-option ${quizClass}" data-action="answer-quran-next" data-option="${escapeHtml(option)}" ${answer ? "disabled" : ""}>
                    <span class="arabic-text">${option}</span>
                  </button>
                `;
              }).join("")}
            </div>
            ${
              answer
                ? `<div class="feedback ${answer === item.next.arabic ? "is-good" : "is-bad"}">${
                    answer === item.next.arabic ? "Correct." : `Correct ayah: <span class="arabic-text">${item.next.arabic}</span>`
                  }</div>`
                : `<div class="muted">Choose the next ayah from the four options.</div>`
            }
          </div>
        </div>
        <div class="lesson-detail-actions chapter-practice-actions">
          <button class="lesson-nav-button ${state.quranNextIndex === 0 ? "is-disabled" : ""}" data-action="quran-next-prev" ${state.quranNextIndex === 0 ? "disabled" : ""}>← Previous</button>
          <button class="lesson-nav-button is-primary" data-action="${state.quranNextIndex === state.quranNextRound.length - 1 ? "complete-quran-next" : "quran-next-next"}" ${!answer ? "disabled" : ""}>
            ${state.quranNextIndex === state.quranNextRound.length - 1 ? "Finish round" : "Next →"}
          </button>
        </div>
      </div>
    `;
  }

  function renderQuranWordMap() {
    const surah = getQuranSurah();
    const ayah = surah?.ayahs[state.quranWordIndex] || surah?.ayahs[0] || null;
    const words = quranWordItems(ayah);
    if (!surah || !ayah) return `<div class="empty-card">No ayah data is loaded yet.</div>`;

    return `
      <div class="quran-session-wrap">
        <div class="chapter-practice-card lesson-detail-card">
          <div class="chapter-progress-meta">${state.quranWordIndex + 1} / ${surah.ayahs.length}</div>
          <div class="lesson-detail-label">Word Map</div>
          <div class="lesson-note-card">
            <div class="quran-surah-kicker">${surah.number}. ${surah.name} â€¢ ${surah.name_ar}</div>
            <div class="quran-ayah-reference">Surah ${surah.number}, Ayah ${ayah.number} of ${surah.verses_count}</div>
            <div class="muted">Best-effort word-by-word glosses from Quran.com.</div>
            <div class="quran-word-grid">
              ${words.map((word) => `
                <div class="quran-word-card">
                  <div class="quran-word-arabic arabic-text">${word.arabic}</div>
                  <div class="quran-word-meaning">${word.meaning || "—"}</div>
                </div>
              `).join("")}
            </div>
            <div class="quran-word-ayah-meaning">${ayah.meaning}</div>
          </div>
        </div>
        <div class="lesson-detail-actions chapter-practice-actions">
          <button class="lesson-nav-button ${state.quranWordIndex === 0 ? "is-disabled" : ""}" data-action="quran-word-prev" ${state.quranWordIndex === 0 ? "disabled" : ""}>â† Previous</button>
          <button class="lesson-nav-button" data-action="speak-quran-ayah">Hear ayah</button>
          <button class="lesson-nav-button is-primary" data-action="quran-word-next">${state.quranWordIndex === surah.ayahs.length - 1 ? "Start again" : "Next â†’"}</button>
        </div>
      </div>
    `;

    if (state.quranOrderComplete) {
      return `
        <div class="lesson-complete-card chapter-summary-card">
          <div class="lesson-complete-icon">🧩</div>
          <h3>Order complete</h3>
          <p>${surah.name} • ${surah.name_ar}</p>
          <div class="lesson-complete-stats">
            <div class="summary-card">
              <strong>${surah.ayahs.length}</strong>
              <span>Ayahs ordered</span>
            </div>
            <div class="summary-card">
              <strong>${computeQuranSurahStats(surah).mastered}</strong>
              <span>Ayahs strong</span>
            </div>
          </div>
          <div class="lesson-detail-actions">
            <button class="lesson-nav-button" data-action="reset-quran-order">Restart order</button>
            <button class="lesson-nav-button is-primary" data-action="back-quran-modes">Pick another method</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="quran-session-wrap">
        <div class="chapter-practice-card lesson-detail-card">
          <div class="chapter-progress-meta">${state.quranOrderPicked.length} / ${surah.ayahs.length}</div>
          <div class="lesson-detail-label">Ayah Order</div>
          <div class="lesson-note-card">
            <div class="muted">Tap the ayahs in the correct order from beginning to end.</div>
            <div class="quran-picked-list">
              ${state.quranOrderPicked.length
                ? state.quranOrderPicked.map((ayah) => `<div class="quran-picked-pill"><strong>${ayah.number}</strong><span class="arabic-text">${ayah.arabic}</span></div>`).join("")
                : `<div class="muted">No ayahs placed yet.</div>`}
            </div>
            <div class="quran-order-grid">
              ${state.quranOrderDeck.map((ayah) => {
                const picked = state.quranOrderPicked.some((item) => item.number === ayah.number);
                return `
                  <button class="order-ayah-card ${picked ? "is-picked" : ""}" data-action="pick-quran-order" data-ayah-number="${ayah.number}" ${picked ? "disabled" : ""}>
                    <strong>${ayah.number}</strong>
                    <span class="arabic-text">${ayah.arabic}</span>
                  </button>
                `;
              }).join("")}
            </div>
            ${state.quranOrderFeedback ? `<div class="feedback ${state.quranOrderFeedback.startsWith("Correct") ? "is-good" : "is-bad"}">${state.quranOrderFeedback}</div>` : ""}
          </div>
        </div>
        <div class="lesson-detail-actions chapter-practice-actions">
          <button class="lesson-nav-button" data-action="reset-quran-order">Restart</button>
          <button class="lesson-nav-button is-primary" data-action="speak-quran-ayah">Hear current ayah</button>
        </div>
      </div>
    `;
  }

  function renderQuranBody() {
    if (!state.quranMode) return renderQuranModeChooser();
    if (state.quranMode === "review") return renderQuranReview();
    if (state.quranMode === "meaning") return renderQuranMeaningQuiz();
    if (state.quranMode === "next-ayah") return renderQuranNextAyah();
    return renderQuranWordMap();
  }

  function renderQuran() {
    const surah = getQuranSurah();
    const stats = computeQuranSurahStats(surah);
    const progressValue =
      state.quranMode === "review"
        ? Math.round(((state.quranAyahIndex + 1) / Math.max(surah.ayahs.length, 1)) * 100)
        : state.quranMode === "meaning"
        ? state.quranMeaningComplete
          ? 100
          : Math.round((state.quranMeaningIndex / Math.max(state.quranMeaningRound.length, 1)) * 100)
        : state.quranMode === "next-ayah"
        ? state.quranNextComplete
          ? 100
          : Math.round((state.quranNextIndex / Math.max(state.quranNextRound.length, 1)) * 100)
        : state.quranMode === "word-map"
        ? surah.ayahs.length
          ? Math.round(((state.quranWordIndex + 1) / surah.ayahs.length) * 100)
          : 0
        : state.quranMode === "order"
        ? surah.ayahs.length
          ? Math.round((state.quranOrderPicked.length / surah.ayahs.length) * 100)
          : 0
        : stats.percent;

    return `
      <section class="panel quran-screen">
        <div class="practice-screen-head">
          <button class="back-button" data-action="${state.quranMode ? "back-quran-modes" : "change-section"}" data-section="home">&larr;</button>
          <div class="practice-title-wrap">
            <h2>Juz Amma Memory</h2>
            <p>${state.quranMode ? (QURAN_MODES.find((mode) => mode.key === state.quranMode)?.label || "Memorization") : "Priority track: Surahs 78-114"}</p>
          </div>
        </div>
        <div class="practice-progress"><span style="width:${Math.max(progressValue, state.quranMode ? 8 : 0)}%;"></span></div>
        <div class="quran-layout ${state.quranMode ? "is-active-session" : "is-chooser"}">
          <div class="quran-body">${renderQuranBody()}</div>
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
    const speakCue = promptIsArabic
      ? "Say it aloud in Arabic, then translate it to yourself in English"
      : "Translate this to Arabic in your head, then say the Arabic word aloud";

    return `
      <div class="toolbar">
        <div class="toolbar-row">
          <div class="segmented">
            ${[
              ["ar-to-en", "Arabic → English"],
              ["en-to-ar", "English → Arabic"],
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
          <button class="mini-button" data-action="speak-current">Hear it</button>
        </div>
      </div>
      <div class="flash-score-row">
        <span class="score-pill is-good">✓ Got it: ${state.flashKnown.length}</span>
        <span class="score-pill is-bad">✗ Review: ${state.flashUnknown.length}</span>
      </div>
      <div class="flashcard">
        <div class="flashcard-top">
          <div class="flashcard-tag">${lesson.label}</div>
          <div class="flashcard-tag">${flashCardPosition()} / ${state.flashRoundTotal}</div>
        </div>
        <div class="flashcard-main">
          <div class="subcopy flash-cue">${speakCue}</div>
          <div class="prompt ${promptIsArabic ? "arabic-text" : ""}">${prompt}</div>
          ${state.flashRevealed
            ? `<div class="answer ${!promptIsArabic ? "arabic-text" : ""}">${answer}</div>`
            : `<div class="answer-placeholder">— say it, then reveal —</div>`
          }
        </div>
        ${lesson.grammarNote ? `<div class="flash-grammar-hint">${lesson.grammarNote}</div>` : ""}
        <div class="flash-actions">
          <button class="flash-action is-red" data-action="grade-flashcard" data-result="unknown">Missed it<small>keep in deck</small></button>
          <button class="flash-action is-gold" data-action="toggle-flash-answer">${state.flashRevealed ? "Hide" : "Reveal"}<small>${state.flashRevealed ? "hide answer" : "check yourself"}</small></button>
          <button class="flash-action is-green" data-action="grade-flashcard" data-result="known">Got it<small>remove card</small></button>
        </div>
      </div>
    `;
  }

  function renderMatching() {
    const pairCount = state.matchRound.length / 2;
    const solvedPairs = state.matchSolved.length / 2;
    const allSolved = solvedPairs === pairCount && pairCount > 0;

    const leftCards = state.matchRound.filter((item) => item.side === "arabic");
    const rightCards = state.matchRound.filter((item) => item.side === "english");

    function cardHtml(item) {
      const isSolved = state.matchSolved.includes(item.id);
      const isSelected = state.matchSelection.includes(item.id);
      return `
        <button
          class="match-card ${item.side === "arabic" ? "arabic-text" : ""} ${isSolved ? "is-matched" : ""} ${isSelected ? "is-selected" : ""}"
          data-action="pick-match"
          data-card-id="${item.id}"
          ${isSolved ? "disabled" : ""}
        >${item.label}</button>
      `;
    }

    return `
      <div class="toolbar">
        <div class="toolbar-row">
          <button class="mini-button" data-action="reset-matching">New round</button>
          <span class="muted">${solvedPairs} / ${pairCount} matched</span>
        </div>
      </div>
      ${allSolved ? `<div class="feedback is-good">All matched! Tap New round for more.</div>` : ""}
      <div class="match-columns">
        <div class="match-col">
          <div class="match-col-label">Arabic</div>
          ${leftCards.map(cardHtml).join("")}
        </div>
        <div class="match-col">
          <div class="match-col-label">English</div>
          ${rightCards.map(cardHtml).join("")}
        </div>
      </div>
      ${state.matchFeedback ? `<div class="feedback ${state.matchFeedback.startsWith("Nice") ? "is-good" : "is-bad"}">${state.matchFeedback}</div>` : ""}
    `;
  }

  function renderTyping() {
    const lesson = getPracticeLesson();
    const card = getTypingCard();
    const targetLanguage = state.typingDirection === "en-to-ar" ? "arabic" : "english";
    const prompt = targetLanguage === "arabic" ? card.english : card.arabic;
    const answer = targetLanguage === "arabic" ? card.arabic : card.english;
    const revealed = !!state.typingFeedback;

    const dirCue = targetLanguage === "arabic"
      ? "You see English — say the Arabic aloud to yourself, then reveal"
      : "You see Arabic — say the meaning in English to yourself, then reveal";

    return `
      <div class="toolbar">
        <div class="toolbar-row">
          <div class="segmented">
            ${[
              ["en-to-ar", "English → say Arabic"],
              ["ar-to-en", "Arabic → say English"]
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
          <button class="mini-button" data-action="next-typing">Next</button>
          <button class="mini-button" data-action="speak-current">Hear it</button>
        </div>
      </div>
      <div class="typing-card">
        <div class="typing-prompt">
          <div class="subcopy flash-cue">${dirCue}</div>
          <div class="${targetLanguage === "english" ? "arabic-text" : ""} recall-prompt">${prompt}</div>
        </div>
        ${revealed
          ? `<div class="recall-answer ${targetLanguage === "arabic" ? "arabic-text" : ""}">${answer}</div>`
          : `<div class="answer-placeholder">— say it aloud, then reveal —</div>`
        }
        ${lesson.grammarNote ? `<div class="flash-grammar-hint">${lesson.grammarNote}</div>` : ""}
        <div class="typing-actions recall-actions">
          ${!revealed
            ? `<button class="flash-action is-gold" data-action="reveal-typing">Reveal<small>check yourself</small></button>`
            : `
              <button class="flash-action is-red" data-action="next-typing">Missed it<small>keep going</small></button>
              <button class="flash-action is-green" data-action="next-typing">Got it<small>keep going</small></button>
            `
          }
        </div>
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

  function renderGrammarChallenge() {
    const lesson = getPracticeLesson();
    const challenges = lesson.challenges || [];

    if (!challenges.length) {
      return `<div class="empty-card">No grammar challenges yet for this lesson.</div>`;
    }

    if (state.grammarComplete) {
      const total = challenges.length;
      const correct = Object.values(state.grammarAnswers).filter((a) => a.correct).length;
      return `
        <div class="lesson-complete-card">
          <div class="lesson-complete-icon">📐</div>
          <h3>Challenge complete</h3>
          <p>${correct} out of ${total} correct</p>
          <div class="lesson-complete-stats">
            <div class="summary-card"><strong>${correct}</strong><span>Correct</span></div>
            <div class="summary-card"><strong>${total - correct}</strong><span>Missed</span></div>
          </div>
          <div class="lesson-detail-actions">
            <button class="lesson-nav-button is-primary" data-action="restart-grammar">Try again</button>
          </div>
        </div>
      `;
    }

    const challenge = challenges[state.grammarIndex];
    const answered = state.grammarAnswers[state.grammarIndex];

    return `
      <div class="grammar-challenge-card">
        <div class="grammar-progress-row">
          <span class="muted">${state.grammarIndex + 1} / ${challenges.length}</span>
          <div class="grammar-pip-row">
            ${challenges.map((_, i) => {
              const a = state.grammarAnswers[i];
              return `<span class="grammar-pip ${a ? (a.correct ? "is-correct" : "is-wrong") : (i === state.grammarIndex ? "is-current" : "")}"></span>`;
            }).join("")}
          </div>
        </div>
        ${lesson.grammarNote ? `<div class="flash-grammar-hint">${lesson.grammarNote}</div>` : ""}
        <div class="grammar-question">${challenge.q}</div>
        <div class="grammar-options">
          ${challenge.options.map((opt) => {
            let cls = "grammar-option";
            if (answered) {
              if (opt === challenge.answer) cls += " is-correct";
              else if (opt === answered.picked) cls += " is-wrong";
            }
            return `
              <button class="${cls}" data-action="pick-grammar-answer" data-option="${escapeHtml(opt)}" ${answered ? "disabled" : ""}>
                ${opt}
              </button>
            `;
          }).join("")}
        </div>
        ${answered ? `
          <div class="grammar-explanation ${answered.correct ? "is-good" : "is-bad"}">
            ${answered.correct ? "Correct." : `The answer is: <strong>${challenge.answer}</strong>.`}
            ${challenge.exp ? `<p>${challenge.exp}</p>` : ""}
          </div>
          <div class="grammar-next-row">
            <button class="lesson-nav-button is-primary" data-action="next-grammar">
              ${state.grammarIndex + 1 < challenges.length ? "Next question →" : "See results"}
            </button>
          </div>
        ` : ""}
      </div>
    `;
  }

  function renderSentenceBuilder() {
    const lesson = getPracticeLesson();
    const phrases = lesson.phrases || [];

    if (!phrases.length) {
      return `<div class="empty-card">No phrases available for this lesson.</div>`;
    }

    if (state.builderComplete) {
      return `
        <div class="lesson-complete-card">
          <div class="lesson-complete-icon">🧩</div>
          <h3>All sentences built!</h3>
          <p>You completed all ${phrases.length} phrase${phrases.length === 1 ? "" : "s"} for ${lesson.label}.</p>
          <div class="lesson-detail-actions">
            <button class="lesson-nav-button is-primary" data-action="restart-builder">Go again</button>
          </div>
        </div>
      `;
    }

    const phrase = phrases[state.builderPhraseIndex];
    const answered = !!state.builderFeedback;

    return `
      <div class="builder-card">
        <div class="grammar-progress-row">
          <span class="muted">Phrase ${state.builderPhraseIndex + 1} / ${phrases.length}</span>
        </div>
        <div class="builder-target">
          <div class="builder-label">Build this in Arabic:</div>
          <div class="builder-english">${phrase.english}</div>
        </div>
        <div class="builder-zone ${state.builderFeedback ? (state.builderFeedback.correct ? "is-correct" : "is-wrong") : ""}">
          ${state.builderPicked.length
            ? state.builderPicked.map((tok) => `
                <button class="builder-tile is-picked arabic-text" data-action="unpick-builder-token" data-token-id="${tok.id}" ${answered ? "disabled" : ""}>
                  ${tok.text}
                </button>
              `).join("")
            : `<span class="builder-placeholder">Tap words below to build the sentence</span>`
          }
        </div>
        ${state.builderFeedback && !state.builderFeedback.correct ? `
          <div class="builder-correct-answer arabic-text">${phrase.arabic}</div>
        ` : ""}
        <div class="builder-tiles">
          ${state.builderAvailable.map((tok) => `
            <button class="builder-tile arabic-text" data-action="pick-builder-token" data-token-id="${tok.id}" ${answered ? "disabled" : ""}>
              ${tok.text}
            </button>
          `).join("")}
        </div>
        ${!answered ? `
          <div class="builder-actions">
            <button class="mini-button" data-action="clear-builder">Clear</button>
            <button class="lesson-nav-button is-primary" data-action="check-builder" ${state.builderPicked.length === 0 ? "disabled" : ""}>Check</button>
          </div>
        ` : `
          <div class="builder-actions">
            <button class="lesson-nav-button is-primary" data-action="next-builder-phrase">
              ${state.builderPhraseIndex + 1 < phrases.length ? "Next phrase →" : "Finish"}
            </button>
          </div>
        `}
      </div>
    `;
  }

  function renderPracticeBody() {
    if (!state.practiceMode) return renderPracticeModeChooser();
    if (state.practiceMode === "quiz") return renderQuizPractice();
    if (state.practiceMode === "flashcards") return renderFlashcards();
    if (state.practiceMode === "matching") return renderMatching();
    if (state.practiceMode === "grammar") return renderGrammarChallenge();
    if (state.practiceMode === "builder") return renderSentenceBuilder();
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
    const quran = computeQuranStats();

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
          <div class="section-block">
            <div class="section-head">
              <div>
                <h2>Juz Amma Memory</h2>
                <p>Quran.com Arabic ayat with The Clear Quran meaning.</p>
              </div>
            </div>
            <div class="home-stats-grid">
              <div class="summary-card">
                <strong>${quran.totalSurahs}</strong>
                <span>Priority surahs</span>
              </div>
              <div class="summary-card">
                <strong>${quran.totalAyahs}</strong>
                <span>Total ayahs</span>
              </div>
              <div class="summary-card">
                <strong>${quran.reviewedAyahs}</strong>
                <span>Ayahs reviewed</span>
              </div>
              <div class="summary-card">
                <strong>${quran.strongAyahs}</strong>
                <span>Ayahs strong</span>
              </div>
            </div>
            <div class="summary-grid progress-grid">
              ${juzAmmaSurahs
                .map((surah) => {
                  const stats = computeQuranSurahStats(surah);
                  return `
                    <div class="progress-row">
                      <div class="progress-row-top">
                        <strong>${surah.number}. ${surah.name}</strong>
                        <div class="status-pill is-in_progress">${surah.revelation_place}</div>
                      </div>
                      <div class="muted">${surah.name_ar} • ${surah.translated_name}</div>
                      <div class="progress-bar"><span style="width:${stats.percent}%;"></span></div>
                      <div class="lesson-meta-row">
                        <span>${stats.mastered}/${surah.ayahs.length} strong</span>
                        <span>${stats.seen} reviews</span>
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
    if (state.section === "quran") return renderQuran();
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
            ["quran", "۞", "Quran"],
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

    if (action === "change-quran-surah") {
      state.quranSurahId = target.dataset.surahId || state.quranSurahId;
      resetQuranSection(false);
    }

    if (action === "select-quran-mode") setQuranMode(target.dataset.mode);
    if (action === "back-quran-modes") resetQuranSection(false);

    if (action === "quran-prev-ayah") {
      state.quranAyahIndex = Math.max(0, state.quranAyahIndex - 1);
      state.quranRevealMeaning = false;
    }

    if (action === "quran-next-ayah") {
      const surah = getQuranSurah();
      const ayah = quranReviewCard();
      if (surah && ayah) trackQuranAnswer(surah.id, ayah, "seen");
      state.quranAyahIndex = surah && state.quranAyahIndex === surah.ayahs.length - 1 ? 0 : state.quranAyahIndex + 1;
      state.quranRevealMeaning = false;
    }

    if (action === "toggle-quran-meaning") {
      const surah = getQuranSurah();
      const ayah = quranReviewCard();
      if (!state.quranRevealMeaning && surah && ayah) trackQuranAnswer(surah.id, ayah, "seen");
      state.quranRevealMeaning = !state.quranRevealMeaning;
    }

    if (action === "answer-quran-meaning") {
      const surah = getQuranSurah();
      const item = quranMeaningItem();
      if (surah && item && !state.quranMeaningAnswers[state.quranMeaningIndex]) {
        state.quranMeaningAnswers[state.quranMeaningIndex] = target.dataset.option;
        trackQuranAnswer(surah.id, item.ayah, target.dataset.option === item.ayah.meaning ? "known" : "unknown");
      }
    }

    if (action === "quran-meaning-prev") state.quranMeaningIndex = Math.max(0, state.quranMeaningIndex - 1);
    if (action === "quran-meaning-next") state.quranMeaningIndex = Math.min(state.quranMeaningRound.length - 1, state.quranMeaningIndex + 1);
    if (action === "complete-quran-meaning") state.quranMeaningComplete = true;
    if (action === "restart-quran-meaning") resetQuranMeaningRound();

    if (action === "answer-quran-next") {
      const surah = getQuranSurah();
      const item = quranNextItem();
      if (surah && item && !state.quranNextAnswers[state.quranNextIndex]) {
        state.quranNextAnswers[state.quranNextIndex] = target.dataset.option;
        trackQuranAnswer(surah.id, item.next, target.dataset.option === item.next.arabic ? "known" : "unknown");
      }
    }

    if (action === "quran-next-prev") state.quranNextIndex = Math.max(0, state.quranNextIndex - 1);
    if (action === "quran-next-next") state.quranNextIndex = Math.min(state.quranNextRound.length - 1, state.quranNextIndex + 1);
    if (action === "complete-quran-next") state.quranNextComplete = true;
    if (action === "restart-quran-next") resetQuranNextRound();

    if (action === "quran-word-prev") state.quranWordIndex = Math.max(0, state.quranWordIndex - 1);
    if (action === "quran-word-next") {
      const surah = getQuranSurah();
      const ayah = surah?.ayahs[state.quranWordIndex];
      if (surah && ayah) trackQuranAnswer(surah.id, ayah, "seen");
      state.quranWordIndex = surah && state.quranWordIndex === surah.ayahs.length - 1 ? 0 : state.quranWordIndex + 1;
    }

    if (action === "pick-quran-order") {
      const surah = getQuranSurah();
      const ayahNumber = Number(target.dataset.ayahNumber);
      const choice = state.quranOrderDeck.find((ayah) => ayah.number === ayahNumber);
      const expectedAyah = surah?.ayahs[state.quranOrderExpected - 1];
      const alreadyPicked = state.quranOrderPicked.some((ayah) => ayah.number === ayahNumber);

      if (surah && choice && expectedAyah && !alreadyPicked && !state.quranOrderComplete) {
        if (choice.number === expectedAyah.number) {
          state.quranOrderPicked = state.quranOrderPicked.concat(choice);
          state.quranOrderExpected += 1;
          state.quranOrderFeedback = `Correct: ayah ${choice.number} is next.`;
          trackQuranAnswer(surah.id, choice, "known");
          if (state.quranOrderPicked.length === surah.ayahs.length) state.quranOrderComplete = true;
        } else {
          state.quranOrderFeedback = `Try again. Ayah ${expectedAyah.number} comes next.`;
          trackQuranAnswer(surah.id, expectedAyah, "unknown");
        }
      }
    }

    if (action === "reset-quran-order") resetQuranOrderRound();

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

    if (action === "pick-grammar-answer") {
      const lesson = getPracticeLesson();
      const challenge = lesson.challenges[state.grammarIndex];
      const picked = target.dataset.option;
      const correct = picked === challenge.answer;
      state.grammarAnswers[state.grammarIndex] = { picked, correct };
      trackAnswer(lesson.id, { id: `grammar-${state.grammarIndex}`, english: challenge.q, arabic: challenge.answer }, correct ? "known" : "unknown");
    }
    if (action === "next-grammar") {
      const lesson = getPracticeLesson();
      if (state.grammarIndex + 1 < lesson.challenges.length) {
        state.grammarIndex++;
      } else {
        state.grammarComplete = true;
      }
    }
    if (action === "restart-grammar") resetGrammarChallenge();

    if (action === "pick-builder-token") {
      const id = target.dataset.tokenId;
      const tok = state.builderAvailable.find((t) => t.id === id);
      if (tok) {
        state.builderAvailable = state.builderAvailable.filter((t) => t.id !== id);
        state.builderPicked = state.builderPicked.concat(tok);
      }
    }
    if (action === "unpick-builder-token") {
      const id = target.dataset.tokenId;
      const tok = state.builderPicked.find((t) => t.id === id);
      if (tok) {
        state.builderPicked = state.builderPicked.filter((t) => t.id !== id);
        state.builderAvailable = state.builderAvailable.concat(tok);
      }
    }
    if (action === "clear-builder") {
      state.builderAvailable = state.builderAvailable.concat(state.builderPicked);
      state.builderPicked = [];
    }
    if (action === "check-builder") {
      const lesson = getPracticeLesson();
      const phrase = lesson.phrases[state.builderPhraseIndex];
      const attempt = state.builderPicked.map((t) => t.text).join(" ");
      const correct = attempt.trim() === phrase.arabic.trim();
      state.builderFeedback = { correct };
      trackAnswer(lesson.id, { id: `builder-${state.builderPhraseIndex}`, english: phrase.english, arabic: phrase.arabic }, correct ? "known" : "unknown");
    }
    if (action === "next-builder-phrase") {
      const lesson = getPracticeLesson();
      state.builderPhraseIndex++;
      loadBuilderPhrase(lesson);
    }
    if (action === "restart-builder") resetSentenceBuilder();
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
      state.typingFeedback = { correct: false, expected, message: "Answer revealed. Say it aloud once, then mark yourself." };
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

    if (action === "speak-quran-ayah") speakArabic(activeQuranAyah()?.arabic || "");

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
