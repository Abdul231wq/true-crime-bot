const AIEngine = {
  state: {
    currentChapter: Number(localStorage.getItem("det_current_chapter")) || 1,
    chapterProgress: Number(localStorage.getItem("det_chapter_progress")) || 0,
    investigationPoints: Number(localStorage.getItem("det_investigation_points")) || 20,

    softHintBaseCost: Number(localStorage.getItem("det_soft_hint_base_cost")) || 5,
    hardHintBaseCost: Number(localStorage.getItem("det_hard_hint_base_cost")) || 15,
    softHintMultiplier: Number(localStorage.getItem("det_soft_hint_multiplier")) || 1.35,
    hardHintMultiplier: Number(localStorage.getItem("det_hard_hint_multiplier")) || 1.45,

    chapterHintMultiplier: Number(localStorage.getItem("det_chapter_hint_multiplier")) || 0.25,
    maxChapterHintMultiplier: Number(localStorage.getItem("det_max_chapter_hint_multiplier")) || 2.0,

    softHintsUsed: Number(localStorage.getItem("det_soft_hints_used")) || 0,
    hardHintsUsed: Number(localStorage.getItem("det_hard_hints_used")) || 0,

    softHintCooldownMs: Number(localStorage.getItem("det_soft_hint_cooldown_ms")) || 60000,
    lastSoftHintAt: Number(localStorage.getItem("det_last_soft_hint_at")) || 0,

    stuckLevel: Number(localStorage.getItem("det_stuck_level")) || 0,
    hintHistory: (() => {
      try {
        return JSON.parse(localStorage.getItem("det_hint_history")) || [];
      } catch (e) {
        return [];
      }
    })()
  },

  save() {
    const s = this.state;
    localStorage.setItem("det_current_chapter", String(s.currentChapter));
    localStorage.setItem("det_chapter_progress", String(s.chapterProgress));
    localStorage.setItem("det_investigation_points", String(s.investigationPoints));

    localStorage.setItem("det_soft_hint_base_cost", String(s.softHintBaseCost));
    localStorage.setItem("det_hard_hint_base_cost", String(s.hardHintBaseCost));
    localStorage.setItem("det_soft_hint_multiplier", String(s.softHintMultiplier));
    localStorage.setItem("det_hard_hint_multiplier", String(s.hardHintMultiplier));

    localStorage.setItem("det_chapter_hint_multiplier", String(s.chapterHintMultiplier));
    localStorage.setItem("det_max_chapter_hint_multiplier", String(s.maxChapterHintMultiplier));

    localStorage.setItem("det_soft_hints_used", String(s.softHintsUsed));
    localStorage.setItem("det_hard_hints_used", String(s.hardHintsUsed));

    localStorage.setItem("det_soft_hint_cooldown_ms", String(s.softHintCooldownMs));
    localStorage.setItem("det_last_soft_hint_at", String(s.lastSoftHintAt));

    localStorage.setItem("det_stuck_level", String(s.stuckLevel));
    localStorage.setItem("det_hint_history", JSON.stringify(s.hintHistory));
  },

  getChapterMultiplier() {
    const c = this.state.currentChapter || 1;
    return Math.min(this.state.maxChapterHintMultiplier, 1 + (c - 1) * this.state.chapterHintMultiplier);
  },

  getSoftHintCost() {
    return Math.ceil(
      this.state.softHintBaseCost *
      this.getChapterMultiplier() *
      Math.pow(this.state.softHintMultiplier, this.state.softHintsUsed)
    );
  },

  getHardHintCost() {
    return Math.ceil(
      this.state.hardHintBaseCost *
      this.getChapterMultiplier() *
      Math.pow(this.state.hardHintMultiplier, this.state.hardHintsUsed)
    );
  },

  canUseSoftHint() {
    return Date.now() - (this.state.lastSoftHintAt || 0) >= this.state.softHintCooldownMs;
  },

  getSoftHintCooldownLeft() {
    const elapsed = Date.now() - (this.state.lastSoftHintAt || 0);
    return Math.max(0, this.state.softHintCooldownMs - elapsed);
  },

  getHintByStuckLevel() {
    const level = this.state.stuckLevel || 0;

    if (level === 1) return { type: "soft", text: "Проверь, кто имел доступ к месту преступления." };
    if (level === 2) return { type: "soft", text: "Сравни алиби подозреваемых с временем происшествия." };
    if (level === 3) return { type: "hard", text: "Одна из найденных улик противоречит словам главного подозреваемого." };
    if (level >= 4) return { type: "hard", text: "Выбери подозреваемого с самым слабым алиби и проверь его через контр-улику." };
    return null;
  },

  spendInvestigationPoints(cost) {
    if ((this.state.investigationPoints || 0) < cost) return false;
    this.state.investigationPoints -= cost;
    return true;
  },

  setProgress(value) {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    this.state.chapterProgress = v;

    if (v < 25) this.state.stuckLevel = 1;
    else if (v < 50) this.state.stuckLevel = 2;
    else if (v < 75) this.state.stuckLevel = 3;
    else this.state.stuckLevel = 4;

    this.save();
  },

  advanceChapter() {
    this.state.currentChapter += 1;
    this.state.softHintsUsed = 0;
    this.state.hardHintsUsed = 0;
    this.state.chapterProgress = 0;
    this.state.stuckLevel = 0;
    this.save();
  },

  requestSoftHint() {
    if (!this.canUseSoftHint()) {
      return { ok: false, reason: "cooldown", remaining: Math.ceil(this.getSoftHintCooldownLeft() / 1000) };
    }

    const cost = this.getSoftHintCost();
    if (!this.spendInvestigationPoints(cost)) {
      return { ok: false, reason: "points", cost };
    }

    const hint = this.getHintByStuckLevel();
    if (!hint) return { ok: false, reason: "nohint" };

    this.state.lastSoftHintAt = Date.now();
    this.state.softHintsUsed += 1;
    this.state.stuckLevel = Math.min(4, (this.state.stuckLevel || 0) + 1);

    this.state.hintHistory.unshift(`Мягкая (${cost}): ${hint.text}`);
    this.state.hintHistory = this.state.hintHistory.slice(0, 10);

    this.save();
    return { ok: true, hint, cost };
  },

  requestHardHint() {
    const cost = this.getHardHintCost();
    if (!this.spendInvestigationPoints(cost)) {
      return { ok: false, reason: "points", cost };
    }

    const hint = this.getHintByStuckLevel();
    if (!hint) return { ok: false, reason: "nohint" };

    this.state.hardHintsUsed += 1;
    this.state.stuckLevel = Math.min(4, (this.state.stuckLevel || 0) + 1);

    this.state.hintHistory.unshift(`Жёсткая (${cost}): ${hint.text}`);
    this.state.hintHistory = this.state.hintHistory.slice(0, 10);

    this.save();
    return { ok: true, hint, cost };
  }
};
