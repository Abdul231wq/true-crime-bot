const AIEngine = {
  getActiveSuspectName() {
    if (GameData.state.activeSuspect === "suspect-b") return "Марина Логинова";
    if (GameData.state.activeSuspect === "suspect-c") return "Игорь Белый";
    return "Алексей Морозов";
  },

  getSoftHintCost() {
    return 5;
  },

  getHardHintCost() {
    return 15;
  },

  getLifeCountdownText() {
    const hour = 60 * 60 * 1000;
    const left = Math.max(0, hour - (Date.now() - GameData.state.lastLifeAt));
    const mm = String(Math.floor(left / 60000)).padStart(2, "0");
    const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
    return `${mm}:${ss}`;
  },

  canAct() {
    GameData.tickLives();
    return GameData.state.lives > 0;
  },

  addClue() {
    if (!this.canAct()) return { ok: false, reason: "lives" };
    GameData.state.points += 2;
    GameData.state.progress = Math.min(100, GameData.state.progress + 10);
    GameData.save();
    return { ok: true, message: "Улика найдена. +2 очка, +10% прогресса." };
  },

  successfulQuestion() {
    if (!this.canAct()) return { ok: false, reason: "lives" };
    GameData.state.points += 3;
    GameData.state.progress = Math.min(100, GameData.state.progress + 10);
    GameData.save();
    return { ok: true, message: "Допрос успешен. +3 очка, +10% прогресса." };
  },

  correctHypothesis() {
    if (!this.canAct()) return { ok: false, reason: "lives" };
    GameData.state.points += 4;
    GameData.state.progress = Math.min(100, GameData.state.progress + 15);
    GameData.save();
    return { ok: true, message: "Гипотеза подтверждена. +4 очка, +15% прогресса." };
  },

  correctVerdict() {
    if (!this.canAct()) return { ok: false, reason: "lives" };
    GameData.state.points += 10;
    GameData.state.progress = 100;
    GameData.save();
    return { ok: true, message: "Вердикт вынесен. +10 очков." };
  },

  requestSoftHint() {
    if (!this.canAct()) return { ok: false, reason: "lives" };
    if (GameData.state.points < this.getSoftHintCost()) return { ok: false, reason: "points" };
    GameData.state.points -= this.getSoftHintCost();
    const hint = "Мягкая подсказка: проверь алиби и время звонка.";
    GameData.addHint(`Мягкая: ${hint}`);
    GameData.save();
    return { ok: true, message: hint };
  },

  requestHardHint() {
    if (!this.canAct()) return { ok: false, reason: "lives" };
    if (GameData.state.points < this.getHardHintCost()) return { ok: false, reason: "points" };
    GameData.state.points -= this.getHardHintCost();
    const hint = "Жёсткая подсказка: главный подозреваемый врёт о времени.";
    GameData.addHint(`Жёсткая: ${hint}`);
    GameData.save();
    return { ok: true, message: hint };
  },

  setProgress(value) {
    const p = Math.max(0, Math.min(100, Number(value) || 0));
    GameData.state.progress = p;
    GameData.save();
    return p;
  }
};
