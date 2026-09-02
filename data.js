const SAVE_KEY = "tc_save";
const SAVE_BAK = "tc_save_bak";
const SAVE_VERSION = 5;
const LIFE_MS = 90 * 1000;
const CASE_STIPEND = 40;
const CLOSE_BONUS = 15;

const COST = {
  search: 2,
  question: 2,
  confront: 3,
  hypothesis: 3,
  soft: 5,
  hard: 12
};

const GameData = {
  state: null,

  defaults() {
    return {
      version: SAVE_VERSION,
      chapter: 1,
      points: 50,
      lives: 5,
      maxLives: 5,
      progress: 0,
      activeSuspect: "suspect-a",
      hintHistory: [],
      lastHint: null,
      lastMessage: "Игра готова. Начните с состава дела.",
      lastLifeAt: Date.now(),
      foundClueIds: [],
      askedQuestionIds: [],
      testedHypothesisIds: [],
      confrontedIds: [],
      factIds: [],
      heat: { "suspect-a": 22, "suspect-b": 28, "suspect-c": 8 },
      caseClosed: false,
      campaignComplete: false,
      accusedId: null,
      verdictCorrect: null,
      wrongVerdicts: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      closedAt: null,
      archive: [],
      justAdvanced: null,
      pendingAdvance: false
    };
  },

  load() {
    const raw = this.readRaw();
    this.state = this.migrate(raw || this.defaults());
    this.tickLives();
    this.save();
  },

  readRaw() {
    try {
      const a = localStorage.getItem(SAVE_KEY);
      if (a) return JSON.parse(a);
    } catch (e) {}
    try {
      const b = localStorage.getItem(SAVE_BAK);
      if (b) return JSON.parse(b);
    } catch (e) {}
    return null;
  },

  migrate(raw) {
    const d = this.defaults();
    if (!raw || typeof raw !== "object") return d;
    const num = (v, f) => (typeof v === "number" && Number.isFinite(v) ? v : f);
    const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
    const sid = (v, f) => (v === "suspect-a" || v === "suspect-b" || v === "suspect-c" ? v : f);
    const heat = raw.heat && typeof raw.heat === "object" ? raw.heat : {};
    const archive = Array.isArray(raw.archive) ? raw.archive.filter((x) => x && typeof x === "object") : [];
    const ver = num(raw.version, 0);
    const state = {
      ...d,
      chapter: Math.max(1, num(raw.chapter, d.chapter)),
      points: Math.max(0, num(raw.points, d.points)),
      lives: Math.max(0, num(raw.lives, d.lives)),
      maxLives: Math.max(1, num(raw.maxLives, d.maxLives)),
      progress: Math.max(0, Math.min(100, num(raw.progress, d.progress))),
      activeSuspect: sid(raw.activeSuspect, d.activeSuspect),
      hintHistory: arr(raw.hintHistory).slice(0, 12),
      lastHint: typeof raw.lastHint === "string" ? raw.lastHint : null,
      lastMessage: typeof raw.lastMessage === "string" ? raw.lastMessage : d.lastMessage,
      lastLifeAt: num(raw.lastLifeAt, Date.now()),
      foundClueIds: arr(raw.foundClueIds),
      askedQuestionIds: arr(raw.askedQuestionIds),
      testedHypothesisIds: arr(raw.testedHypothesisIds),
      confrontedIds: arr(raw.confrontedIds),
      factIds: arr(raw.factIds),
      heat: {
        "suspect-a": Math.max(0, Math.min(100, num(heat["suspect-a"], d.heat["suspect-a"]))),
        "suspect-b": Math.max(0, Math.min(100, num(heat["suspect-b"], d.heat["suspect-b"]))),
        "suspect-c": Math.max(0, Math.min(100, num(heat["suspect-c"], d.heat["suspect-c"])))
      },
      caseClosed: raw.caseClosed === true,
      campaignComplete: raw.campaignComplete === true,
      accusedId: sid(raw.accusedId, null),
      verdictCorrect: raw.verdictCorrect === true ? true : raw.verdictCorrect === false ? false : null,
      wrongVerdicts: Math.max(0, num(raw.wrongVerdicts, 0)),
      hintsUsed: Math.max(0, num(raw.hintsUsed, 0)),
      startedAt: num(raw.startedAt, Date.now()),
      closedAt: num(raw.closedAt, 0) || null,
      archive: archive,
      justAdvanced: raw.justAdvanced && typeof raw.justAdvanced === "object" ? raw.justAdvanced : null,
      pendingAdvance: false,
      version: SAVE_VERSION
    };
    if (ver < 5 && state.points < 50) state.points = 50;
    if (ver < 5 && state.caseClosed && state.verdictCorrect && !state.campaignComplete) {
      state.pendingAdvance = true;
    }
    if (state.lives > state.maxLives) state.lives = state.maxLives;
    return state;
  },

  syncHeat() {
    if (!this.state.foundClueIds.length && !this.state.askedQuestionIds.length && typeof Game !== "undefined" && Game.pack) {
      this.state.heat = Object.assign({ "suspect-a": 10, "suspect-b": 10, "suspect-c": 10 }, Game.pack.heat || {});
    }
  },

  save() {
    try {
      const blob = JSON.stringify(this.state);
      localStorage.setItem(SAVE_KEY, blob);
      localStorage.setItem(SAVE_BAK, blob);
    } catch (e) {}
  },

  tickLives() {
    const s = this.state;
    const now = Date.now();
    if (!s.lastLifeAt) s.lastLifeAt = now;
    while (now - s.lastLifeAt >= LIFE_MS) {
      if (s.lives < s.maxLives) s.lives += 1;
      s.lastLifeAt += LIFE_MS;
    }
    if (s.lives > s.maxLives) s.lives = s.maxLives;
  },

  spendLife() {
    this.tickLives();
    if (this.state.lives <= 0) return false;
    if (this.state.lives >= this.state.maxLives) this.state.lastLifeAt = Date.now();
    this.state.lives -= 1;
    this.save();
    return true;
  },

  canSpend(n) {
    return this.state.points >= n;
  },

  spendPoints(n) {
    if (this.state.points < n) return false;
    this.state.points -= n;
    return true;
  },

  addHeat(id, delta) {
    const cur = this.state.heat[id] || 0;
    this.state.heat[id] = Math.max(0, Math.min(100, cur + delta));
  },

  addFact(id) {
    if (!this.state.factIds.includes(id)) this.state.factIds.push(id);
  },

  bump(delta) {
    this.state.progress = Math.max(0, Math.min(100, this.state.progress + delta));
  },

  countdown() {
    const left = Math.max(0, LIFE_MS - (Date.now() - this.state.lastLifeAt));
    const mm = String(Math.floor(left / 60000)).padStart(2, "0");
    const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
    return mm + ":" + ss;
  },

  lifeText() {
    const s = this.state;
    if (s.lives > 0) return "Жизней: " + s.lives + " / " + s.maxLives + " · только за ошибку вердикта";
    return "Жизнь для вердикта через " + this.countdown();
  },

  rank() {
    const hints = this.state.hintsUsed;
    const wrong = this.state.wrongVerdicts;
    if (hints === 0 && wrong === 0) return "S";
    if (hints <= 1 && wrong <= 1) return "A";
    if (hints <= 3 && wrong <= 2) return "B";
    return "C";
  },

  beginChapter(chapter, opts) {
    const pack = Game.all[chapter - 1];
    if (!pack) return false;
    Game.loadChapter(chapter);
    this.state.chapter = chapter;
    this.state.progress = 0;
    this.state.activeSuspect = pack.suspects[0].id;
    this.state.hintHistory = [];
    this.state.lastHint = null;
    this.state.foundClueIds = [];
    this.state.askedQuestionIds = [];
    this.state.testedHypothesisIds = [];
    this.state.confrontedIds = [];
    this.state.factIds = [];
    this.state.heat = Object.assign({ "suspect-a": 10, "suspect-b": 10, "suspect-c": 10 }, pack.heat);
    this.state.caseClosed = false;
    this.state.campaignComplete = false;
    this.state.accusedId = null;
    this.state.verdictCorrect = null;
    this.state.wrongVerdicts = 0;
    this.state.hintsUsed = 0;
    this.state.startedAt = Date.now();
    this.state.closedAt = null;
    this.state.pendingAdvance = false;
    if (opts && opts.stipend) this.state.points += opts.stipend;
    this.save();
    return true;
  },

  reset() {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(SAVE_BAK);
      ["tc_chapter", "tc_points", "tc_lives", "tc_maxLives", "tc_progress", "tc_activeSuspect", "tc_hintHistory", "tc_lastLifeAt"].forEach((k) => {
        localStorage.removeItem(k);
      });
    } catch (e) {}
    this.state = this.defaults();
    if (typeof Game !== "undefined") {
      Game.loadChapter(1);
      if (Game.pack) this.state.heat = Object.assign({}, Game.pack.heat);
    }
    this.save();
  }
};

GameData.load();
