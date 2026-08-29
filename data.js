const GameData = {
  state: {
    chapter: 1,
    points: 20,
    lives: 0,
    maxLives: 5,
    progress: 0,
    activeSuspect: "suspect-a",
    hintHistory: [],
    lastLifeAt: Number(localStorage.getItem("tc_lastLifeAt")) || Date.now()
  },

  load() {
    const chapter = Number(localStorage.getItem("tc_chapter"));
    const points = Number(localStorage.getItem("tc_points"));
    const lives = Number(localStorage.getItem("tc_lives"));
    const maxLives = Number(localStorage.getItem("tc_maxLives"));
    const progress = Number(localStorage.getItem("tc_progress"));
    const activeSuspect = localStorage.getItem("tc_activeSuspect");
    const history = localStorage.getItem("tc_hintHistory");

    if (Number.isFinite(chapter)) this.state.chapter = chapter;
    if (Number.isFinite(points)) this.state.points = points;
    if (Number.isFinite(lives)) this.state.lives = lives;
    if (Number.isFinite(maxLives)) this.state.maxLives = maxLives;
    if (Number.isFinite(progress)) this.state.progress = progress;
    if (activeSuspect) this.state.activeSuspect = activeSuspect;

    if (history) {
      try {
        const parsed = JSON.parse(history);
        if (Array.isArray(parsed)) this.state.hintHistory = parsed;
      } catch {}
    }
  },

  save() {
    localStorage.setItem("tc_chapter", String(this.state.chapter));
    localStorage.setItem("tc_points", String(this.state.points));
    localStorage.setItem("tc_lives", String(this.state.lives));
    localStorage.setItem("tc_maxLives", String(this.state.maxLives));
    localStorage.setItem("tc_progress", String(this.state.progress));
    localStorage.setItem("tc_activeSuspect", this.state.activeSuspect);
    localStorage.setItem("tc_hintHistory", JSON.stringify(this.state.hintHistory));
    localStorage.setItem("tc_lastLifeAt", String(this.state.lastLifeAt));
  },

  tickLives() {
    const hour = 60 * 60 * 1000;
    const now = Date.now();

    if (!this.state.lastLifeAt) this.state.lastLifeAt = now;

    while (now - this.state.lastLifeAt >= hour) {
      if (this.state.lives < this.state.maxLives) {
        this.state.lives += 1;
      }
      this.state.lastLifeAt += hour;
    }

    if (this.state.lives > this.state.maxLives) {
      this.state.lives = this.state.maxLives;
    }

    this.save();
  },

  spendLife() {
    this.tickLives();
    if (this.state.lives <= 0) return false;
    this.state.lives -= 1;
    this.save();
    return true;
  },

  addHint(text) {
    this.state.hintHistory.unshift(text);
    this.state.hintHistory = this.state.hintHistory.slice(0, 10);
    this.save();
  },

  reset() {
    this.state = {
      chapter: 1,
      points: 20,
      lives: 0,
      maxLives: 5,
      progress: 0,
      activeSuspect: "suspect-a",
      hintHistory: [],
      lastLifeAt: Date.now()
    };
    this.save();
  }
};

GameData.load();
GameData.tickLives();
