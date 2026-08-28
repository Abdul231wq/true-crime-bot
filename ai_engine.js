const AIEngine = {
  STORAGE_PREFIX: "true_crime_bot_",

  defaults: {
    currentChapter: 1,
    chapterProgress: 0,
    investigationPoints: 20,

    softHintBaseCost: 5,
    hardHintBaseCost: 15,

    softHintMultiplier: 1.35,
    hardHintMultiplier: 1.45,

    chapterHintMultiplier: 0.25,
    maxChapterHintMultiplier: 2,

    softHintsUsed: 0,
    hardHintsUsed: 0,

    softHintCooldownMs: 60000,
    lastSoftHintAt: 0,

    stuckLevel: 0,

    cluesFound: 0,
    successfulQuestions: 0,
    correctHypotheses: 0,
    correctVerdicts: 0,

    hintHistory: []
  },

  state: {},

  init() {
    this.state = {
      currentChapter: this.readNumber(
        "currentChapter",
        this.defaults.currentChapter
      ),

      chapterProgress: this.readNumber(
        "chapterProgress",
        this.defaults.chapterProgress
      ),

      investigationPoints: this.readNumber(
        "investigationPoints",
        this.defaults.investigationPoints
      ),

      softHintBaseCost: this.readNumber(
        "softHintBaseCost",
        this.defaults.softHintBaseCost
      ),

      hardHintBaseCost: this.readNumber(
        "hardHintBaseCost",
        this.defaults.hardHintBaseCost
      ),

      softHintMultiplier: this.readNumber(
        "softHintMultiplier",
        this.defaults.softHintMultiplier
      ),

      hardHintMultiplier: this.readNumber(
        "hardHintMultiplier",
        this.defaults.hardHintMultiplier
      ),

      chapterHintMultiplier: this.readNumber(
        "chapterHintMultiplier",
        this.defaults.chapterHintMultiplier
      ),

      maxChapterHintMultiplier: this.readNumber(
        "maxChapterHintMultiplier",
        this.defaults.maxChapterHintMultiplier
      ),

      softHintsUsed: this.readNumber(
        "softHintsUsed",
        this.defaults.softHintsUsed
      ),

      hardHintsUsed: this.readNumber(
        "hardHintsUsed",
        this.defaults.hardHintsUsed
      ),

      softHintCooldownMs: this.readNumber(
        "softHintCooldownMs",
        this.defaults.softHintCooldownMs
      ),

      lastSoftHintAt: this.readNumber(
        "lastSoftHintAt",
        this.defaults.lastSoftHintAt
      ),

      stuckLevel: this.readNumber(
        "stuckLevel",
        this.defaults.stuckLevel
      ),

      cluesFound: this.readNumber(
        "cluesFound",
        this.defaults.cluesFound
      ),

      successfulQuestions: this.readNumber(
        "successfulQuestions",
        this.defaults.successfulQuestions
      ),

      correctHypotheses: this.readNumber(
        "correctHypotheses",
        this.defaults.correctHypotheses
      ),

      correctVerdicts: this.readNumber(
        "correctVerdicts",
        this.defaults.correctVerdicts
      ),

      hintHistory: this.readJSON(
        "hintHistory",
        this.defaults.hintHistory
      )
    };

    this.normalizeState();
    this.updateStuckLevelFromProgress();
    this.save();

    return this.state;
  },

  storageKey(name) {
    return `${this.STORAGE_PREFIX}${name}`;
  },

  readNumber(name, fallback) {
    const storedValue = localStorage.getItem(
      this.storageKey(name)
    );

    if (storedValue === null) {
      return fallback;
    }

    const numberValue = Number(storedValue);

    if (!Number.isFinite(numberValue)) {
      return fallback;
    }

    return numberValue;
  },

  readJSON(name, fallback) {
    const storedValue = localStorage.getItem(
      this.storageKey(name)
    );

    if (storedValue === null) {
      return Array.isArray(fallback) ? [...fallback] : fallback;
    }

    try {
      const parsedValue = JSON.parse(storedValue);

      if (!Array.isArray(parsedValue)) {
        return Array.isArray(fallback) ? [...fallback] : fallback;
      }

      return parsedValue;
    } catch (error) {
      return Array.isArray(fallback) ? [...fallback] : fallback;
    }
  },

  save() {
    Object.entries(this.state).forEach(([key, value]) => {
      localStorage.setItem(
        this.storageKey(key),
        JSON.stringify(value)
      );
    });
  },

  normalizeState() {
    const state = this.state;

    state.currentChapter = Math.max(
      1,
      Math.floor(Number(state.currentChapter) || 1)
    );

    state.chapterProgress = this.clamp(
      Math.floor(Number(state.chapterProgress) || 0),
      0,
      100
    );

    state.investigationPoints = Math.max(
      0,
      Math.floor(Number(state.investigationPoints) || 0)
    );

    state.softHintsUsed = Math.max(
      0,
      Math.floor(Number(state.softHintsUsed) || 0)
    );

    state.hardHintsUsed = Math.max(
      0,
      Math.floor(Number(state.hardHintsUsed) || 0)
    );

    state.stuckLevel = this.clamp(
      Math.floor(Number(state.stuckLevel) || 0),
      0,
      4
    );

    state.cluesFound = Math.max(
      0,
      Math.floor(Number(state.cluesFound) || 0)
    );

    state.successfulQuestions = Math.max(
      0,
      Math.floor(Number(state.successfulQuestions) || 0)
    );

    state.correctHypotheses = Math.max(
      0,
      Math.floor(Number(state.correctHypotheses) || 0)
    );

    state.correctVerdicts = Math.max(
      0,
      Math.floor(Number(state.correctVerdicts) || 0)
    );

    if (!Array.isArray(state.hintHistory)) {
      state.hintHistory = [];
    }
  },

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  getChapterMultiplier() {
    const chapter = Math.max(
      1,
      this.state.currentChapter || 1
    );

    const multiplier =
      1 +
      (chapter - 1) *
      this.state.chapterHintMultiplier;

    return Math.min(
      this.state.maxChapterHintMultiplier,
      multiplier
    );
  },

  getSoftHintCost() {
    const baseCost = this.state.softHintBaseCost;

    const chapterMultiplier =
      this.getChapterMultiplier();

    const usageMultiplier = Math.pow(
      this.state.softHintMultiplier,
      this.state.softHintsUsed
    );

    return Math.max(
      1,
      Math.ceil(
        baseCost *
        chapterMultiplier *
        usageMultiplier
      )
    );
  },

  getHardHintCost() {
    const baseCost = this.state.hardHintBaseCost;

    const chapterMultiplier =
      this.getChapterMultiplier();

    const usageMultiplier = Math.pow(
      this.state.hardHintMultiplier,
      this.state.hardHintsUsed
    );

    return Math.max(
      1,
      Math.ceil(
        baseCost *
        chapterMultiplier *
        usageMultiplier
      )
    );
  },

  canUseSoftHint() {
    return this.getSoftHintCooldownLeft() <= 0;
  },

  getSoftHintCooldownLeft() {
    const now = Date.now();

    const elapsed =
      now -
      Number(this.state.lastSoftHintAt || 0);

    return Math.max(
      0,
      this.state.softHintCooldownMs - elapsed
    );
  },

  getHintByStuckLevel() {
    const level = this.state.stuckLevel || 0;

    if (level <= 0) {
      return {
        type: "soft",
        text:
          "Начни с проверки связей между уликами и подозреваемыми."
      };
    }

    if (level === 1) {
      return {
        type: "soft",
        text:
          "Проверь, кто имел доступ к месту преступления."
      };
    }

    if (level === 2) {
      return {
        type: "soft",
        text:
          "Сравни алиби подозреваемых с временем происшествия."
      };
    }

    if (level === 3) {
      return {
        type: "hard",
        text:
          "Одна из найденных улик противоречит словам главного подозреваемого."
      };
    }

    return {
      type: "hard",
      text:
        "Выбери подозреваемого с самым слабым алиби и проверь его через контр-улику."
    };
  },

  spendInvestigationPoints(cost) {
    const safeCost = Math.max(
      0,
      Math.floor(Number(cost) || 0)
    );

    if (
      this.state.investigationPoints <
      safeCost
    ) {
      return false;
    }

    this.state.investigationPoints -= safeCost;

    return true;
  },

  addInvestigationPoints(amount) {
    const safeAmount = Math.max(
      0,
      Math.floor(Number(amount) || 0)
    );

    this.state.investigationPoints += safeAmount;
    this.save();

    return safeAmount;
  },

  addClue() {
    this.state.cluesFound += 1;
    this.state.investigationPoints += 2;

    this.state.chapterProgress = this.clamp(
      this.state.chapterProgress + 10,
      0,
      100
    );

    this.updateStuckLevelFromProgress();
    this.save();

    return {
      ok: true,
      reward: 2,
      message:
        "Найдена новая улика. Получено 2 очка расследования."
    };
  },

  successfulQuestion() {
    this.state.successfulQuestions += 1;
    this.state.investigationPoints += 3;

    this.state.chapterProgress = this.clamp(
      this.state.chapterProgress + 10,
      0,
      100
    );

    this.updateStuckLevelFromProgress();
    this.save();

    return {
      ok: true,
      reward: 3,
      message:
        "Допрос дал результат. Получено 3 очка расследования."
    };
  },

  correctHypothesis() {
    this.state.correctHypotheses += 1;
    this.state.investigationPoints += 4;

    this.state.chapterProgress = this.clamp(
      this.state.chapterProgress + 15,
      0,
      100
    );

    this.updateStuckLevelFromProgress();
    this.save();

    return {
      ok: true,
      reward: 4,
      message:
        "Гипотеза подтверждена. Получено 4 очка расследования."
    };
  },

  correctVerdict() {
    this.state.correctVerdicts += 1;
    this.state.investigationPoints += 10;

    this.state.chapterProgress = 100;
    this.state.stuckLevel = 0;

    this.save();

    return {
      ok: true,
      reward: 10,
      message:
        "Верный вердикт. Получено 10 очков расследования."
    };
  },

  updateStuckLevelFromProgress() {
    const progress = this.state.chapterProgress;

    if (progress <= 0) {
      this.state.stuckLevel = 0;
    } else if (progress < 25) {
      this.state.stuckLevel = 1;
    } else if (progress < 50) {
      this.state.stuckLevel = 2;
    } else if (progress < 75) {
      this.state.stuckLevel = 3;
    } else {
      this.state.stuckLevel = 4;
    }
  },

  setProgress(value) {
    const progress = this.clamp(
      Math.floor(Number(value) || 0),
      0,
      100
    );

    this.state.chapterProgress = progress;
    this.updateStuckLevelFromProgress();
    this.save();

    return {
      ok: true,
      progress
    };
  },

  advanceChapter() {
    this.state.currentChapter += 1;
    this.state.chapterProgress = 0;

    this.state.softHintsUsed = 0;
    this.state.hardHintsUsed = 0;
    this.state.stuckLevel = 0;

    this.save();

    return {
      ok: true,
      chapter: this.state.currentChapter
    };
  },

  requestSoftHint() {
    if (!this.canUseSoftHint()) {
      return {
        ok: false,
        reason: "cooldown",
        remaining: Math.ceil(
          this.getSoftHintCooldownLeft() / 1000
        )
      };
    }

    const hint = this.getHintByStuckLevel();
    const cost = this.getSoftHintCost();

    if (!this.spendInvestigationPoints(cost)) {
      return {
        ok: false,
        reason: "points",
        cost
      };
    }

    this.state.lastSoftHintAt = Date.now();
    this.state.softHintsUsed += 1;

    this.state.stuckLevel = Math.min(
      4,
      this.state.stuckLevel + 1
    );

    this.state.hintHistory.unshift(
      `Мягкая (${cost} очков): ${hint.text}`
    );

    this.state.hintHistory =
      this.state.hintHistory.slice(0, 10);

    this.save();

    return {
      ok: true,
      type: "soft",
      hint,
      cost
    };
  },

  requestHardHint() {
    const hint = this.getHintByStuckLevel();
    const cost = this.getHardHintCost();

    if (!this.spendInvestigationPoints(cost)) {
      return {
        ok: false,
        reason: "points",
        cost
      };
    }

    this.state.hardHintsUsed += 1;

    this.state.stuckLevel = Math.min(
      4,
      this.state.stuckLevel + 1
    );

    this.state.hintHistory.unshift(
      `Жёсткая (${cost} очков): ${hint.text}`
    );

    this.state.hintHistory =
      this.state.hintHistory.slice(0, 10);

    this.save();

    return {
      ok: true,
      type: "hard",
      hint,
      cost
    };
  },

  reset() {
    this.state = {};

    Object.entries(this.defaults).forEach(
      ([key, value]) => {
        this.state[key] = Array.isArray(value)
          ? [...value]
          : value;
      }
    );

    this.save();

    return this.state;
  }
};

AIEngine.init();
