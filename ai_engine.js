const AIEngine = {
  fail(reason, message) {
    return { ok: false, reason: reason, message: message };
  },
  ok(message, extra) {
    const r = { ok: true, message: message };
    if (extra) Object.assign(r, extra);
    return r;
  },

  gate(cost) {
    GameData.tickLives();
    if (GameData.state.campaignComplete) {
      return this.fail("closed", "Все дела закрыты. Сбросьте сохранение, чтобы начать заново.");
    }
    if (GameData.state.caseClosed) {
      return this.fail("closed", "Дело закрыто. Перейдите к следующему.");
    }
    if (cost && !GameData.canSpend(cost)) {
      return this.fail("points", "Нужно " + cost + " очк. Сейчас: " + GameData.state.points + ".");
    }
    return this.ok("");
  },

  pay(cost) {
    const g = this.gate(cost);
    if (!g.ok) return g;
    if (cost && !GameData.spendPoints(cost)) {
      return this.fail("points", "Нужно " + cost + " очк.");
    }
    return this.ok("");
  },

  getActiveSuspectName() {
    return Game.getSuspect(GameData.state.activeSuspect).name;
  },

  setSuspect(id) {
    GameData.state.activeSuspect = id;
    GameData.save();
    return this.ok("Фокус: " + Game.getSuspect(id).name);
  },

  searchLocation(id) {
    const loc = Game.getLocation(id);
    if (!loc) return this.fail("repeat", "Такой точки нет.");
    if (GameData.state.foundClueIds.includes(id)) {
      GameData.state.lastMessage = loc.detail;
      GameData.save();
      return this.ok("Уже в деле. " + loc.detail, { repeat: true });
    }
    const g = this.pay(COST.search);
    if (!g.ok) return g;
    GameData.state.foundClueIds.push(id);
    GameData.bump(8);
    Object.keys(loc.heat).forEach((sid) => GameData.addHeat(sid, loc.heat[sid]));
    GameData.addFact(id);
    GameData.state.lastMessage = loc.place + ". " + loc.detail;
    GameData.save();
    return this.ok(loc.detail + " −" + COST.search + " очк.");
  },

  askQuestion(id) {
    const q = Game.getQuestion(id);
    if (!q) return this.fail("repeat", "Вопроса нет в протоколе.");
    if (GameData.state.askedQuestionIds.includes(id)) {
      GameData.state.lastMessage = q.answer;
      GameData.save();
      return this.ok(q.answer, { repeat: true });
    }
    const g = this.pay(COST.question);
    if (!g.ok) return g;
    GameData.state.askedQuestionIds.push(id);
    GameData.bump(6);
    GameData.addHeat(q.suspectId, q.heat);
    if (q.fact) GameData.addFact(id);
    GameData.state.lastMessage = q.answer;
    GameData.save();
    return this.ok(q.answer + " −" + COST.question + " очк.", { lie: q.lie });
  },

  confront(clueId) {
    const sid = GameData.state.activeSuspect;
    const loc = Game.getLocation(clueId);
    if (!loc) return this.fail("repeat", "Нет такой улики.");
    if (!GameData.state.foundClueIds.includes(clueId)) {
      return this.fail("repeat", "Сначала найдите улику, потом предъявляйте.");
    }
    const key = sid + ":" + clueId;
    const spec = Game.getConfront(sid, clueId);
    if (GameData.state.confrontedIds.includes(key)) {
      const msg = spec ? spec.reply : "Это уже предъявляли. Новых слов нет.";
      GameData.state.lastMessage = msg;
      GameData.save();
      return this.ok(msg, { repeat: true });
    }
    const g = this.pay(COST.confront);
    if (!g.ok) return g;
    GameData.state.confrontedIds.push(key);
    const reply = spec ? spec.reply : "Подозреваемый пожимает плечами. Улика не цепляет эту версию.";
    const heat = spec ? spec.heat : 0;
    const crack = !!(spec && spec.crack);
    GameData.addHeat(sid, heat);
    if (crack) GameData.state.points += 2;
    GameData.bump(crack ? 7 : 2);
    GameData.state.lastMessage = reply;
    GameData.save();
    return this.ok(reply + (crack ? " Алиби дало трещину. −" + COST.confront + " / +" + 2 + " за трещину." : " −" + COST.confront + " очк."), { crack: crack });
  },

  testHypothesis(id) {
    const h = Game.getHypothesis(id);
    if (!h) return this.fail("repeat", "Гипотезы нет.");
    if (GameData.state.testedHypothesisIds.includes(id)) {
      GameData.state.lastMessage = h.reply;
      GameData.save();
      return this.ok(h.reply, { repeat: true });
    }
    const g = this.pay(COST.hypothesis);
    if (!g.ok) return g;
    GameData.state.testedHypothesisIds.push(id);
    if (h.correct) {
      GameData.state.points += 5;
      GameData.bump(15);
      GameData.addHeat(Game.case.killerId, 10);
    } else {
      GameData.bump(2);
    }
    GameData.state.lastMessage = h.reply;
    GameData.save();
    return this.ok(h.correct ? h.reply + " Гипотеза сходится. +5 очк." : h.reply, { correct: h.correct });
  },

  deliverVerdict(id) {
    const g = this.gate(0);
    if (!g.ok) return g;
    const name = Game.getSuspect(id).name;
    const correct = id === Game.case.killerId;
    GameData.state.accusedId = id;
    if (correct) return this.closeCase(id, name);
    GameData.tickLives();
    if (GameData.state.lives <= 0) {
      return this.fail("lives", "Нет жизней для ошибки вердикта. Следующая через " + GameData.countdown() + ". Соберите ещё улик.");
    }
    if (!GameData.spendLife()) {
      return this.fail("lives", "Нет жизней для ошибки вердикта.");
    }
    GameData.state.verdictCorrect = false;
    GameData.state.wrongVerdicts += 1;
    GameData.addHeat(id, -8);
    GameData.state.lastMessage = "Не сходится. " + name + " не убийца. −1 жизнь. Обыск и допрос по-прежнему тратят только очки.";
    GameData.save();
    return this.ok(GameData.state.lastMessage);
  },

  closeCase(id, name) {
    const s = GameData.state;
    const rank = GameData.rank();
    const fromTitle = Game.case.title;
    const fromId = Game.case.id;
    if (!s.archive.some((a) => a.id === fromId)) {
      s.archive.push({
        chapter: s.chapter,
        id: fromId,
        title: fromTitle,
        accusedId: id,
        accusedName: name,
        rank: rank,
        hintsUsed: s.hintsUsed,
        wrongVerdicts: s.wrongVerdicts,
        closedAt: Date.now()
      });
    }
    s.points += CLOSE_BONUS;
    s.progress = 100;
    s.verdictCorrect = true;
    s.closedAt = Date.now();
    s.pendingAdvance = false;

    if (Game.hasNext()) {
      const next = Game.nextPack();
      s.justAdvanced = {
        fromTitle: fromTitle,
        fromId: fromId,
        rank: rank,
        accusedName: name,
        toChapter: s.chapter + 1,
        toTitle: next.meta.title,
        toId: next.meta.id
      };
      GameData.beginChapter(s.chapter + 1, { stipend: CASE_STIPEND });
      try {
        sessionStorage.setItem("tc_flash_close", "1");
      } catch (e) {}
      s.lastMessage =
        "Вердикт подтверждён. " +
        name +
        " виновен. Ранг " +
        rank +
        ". +" +
        CLOSE_BONUS +
        " очк. Открыто дело " +
        Game.case.id +
        " — " +
        Game.case.title +
        ".";
      GameData.save();
      return this.ok(s.lastMessage, { closed: true, advanced: true, rank: rank });
    }

    s.caseClosed = true;
    s.campaignComplete = true;
    s.justAdvanced = null;
    try {
      sessionStorage.setItem("tc_flash_close", "1");
    } catch (e) {}
    s.lastMessage = "Вердикт подтверждён. " + name + " виновен. Ранг " + rank + ". Все три дела закрыты. +" + CLOSE_BONUS + " очк.";
    GameData.save();
    return this.ok(s.lastMessage, { closed: true, campaign: true, rank: rank });
  },

  nextCase() {
    const s = GameData.state;
    if (s.campaignComplete) return this.fail("closed", "Кампания уже закрыта.");
    if (!(s.caseClosed && s.verdictCorrect) && !s.pendingAdvance) {
      return this.fail("closed", "Сначала закройте текущее дело верным вердиктом.");
    }
    if (!Game.hasNext()) {
      s.campaignComplete = true;
      s.caseClosed = true;
      GameData.save();
      return this.fail("closed", "Следующего дела нет.");
    }
    const rank = GameData.rank();
    const fromTitle = Game.case.title;
    const fromId = Game.case.id;
    const name = s.accusedId ? Game.getSuspect(s.accusedId).name : "—";
    if (!s.archive.some((a) => a.id === fromId)) {
      s.archive.push({
        chapter: s.chapter,
        id: fromId,
        title: fromTitle,
        accusedId: s.accusedId,
        accusedName: name,
        rank: rank,
        hintsUsed: s.hintsUsed,
        wrongVerdicts: s.wrongVerdicts,
        closedAt: Date.now()
      });
    }
    const next = Game.nextPack();
    s.justAdvanced = {
      fromTitle: fromTitle,
      fromId: fromId,
      rank: rank,
      accusedName: name,
      toChapter: s.chapter + 1,
      toTitle: next.meta.title,
      toId: next.meta.id
    };
    GameData.beginChapter(s.chapter + 1, { stipend: CASE_STIPEND });
    s.lastMessage = "Открыто дело " + Game.case.id + " — " + Game.case.title + ".";
    GameData.save();
    return this.ok(s.lastMessage, { advanced: true });
  },

  honorPendingAdvance() {
    const s = GameData.state;
    if (!s.pendingAdvance) return;
    s.pendingAdvance = false;
    if (s.campaignComplete) {
      GameData.save();
      return;
    }
    if (s.caseClosed && s.verdictCorrect && Game.hasNext()) {
      this.nextCase();
    } else {
      GameData.save();
    }
  },

  requestSoftHint() {
    const g = this.pay(COST.soft);
    if (!g.ok) return g;
    GameData.state.hintsUsed += 1;
    GameData.state.lastHint = Game.softHint;
    GameData.state.hintHistory.unshift("Мягкая: " + Game.softHint);
    GameData.state.hintHistory = GameData.state.hintHistory.slice(0, 12);
    GameData.state.lastMessage = Game.softHint;
    GameData.save();
    return this.ok(Game.softHint);
  },

  requestHardHint() {
    const g = this.pay(COST.hard);
    if (!g.ok) return g;
    GameData.state.hintsUsed += 1;
    GameData.state.lastHint = Game.hardHint;
    GameData.state.hintHistory.unshift("Жёсткая: " + Game.hardHint);
    GameData.state.hintHistory = GameData.state.hintHistory.slice(0, 12);
    GameData.state.lastMessage = Game.hardHint;
    GameData.save();
    return this.ok(Game.hardHint);
  },

  setProgress(value) {
    const p = Math.max(0, Math.min(100, Number(value) || 0));
    GameData.state.progress = p;
    GameData.state.lastMessage = "Прогресс установлен: " + p + "%";
    GameData.save();
    return this.ok(GameData.state.lastMessage);
  },

  dismissAdvance() {
    GameData.state.justAdvanced = null;
    GameData.save();
    return this.ok("К новому делу.");
  },

  protocolText() {
    const s = GameData.state;
    const lines = [];
    lines.push("TRUE CRIME BOT — ПРОТОКОЛ");
    if (s.archive.length) {
      lines.push("АРХИВ");
      s.archive.forEach((a) => {
        lines.push("• " + a.id + " " + a.title + " — " + a.accusedName + " · ранг " + a.rank);
      });
      lines.push("");
    }
    lines.push(Game.case.id + " · " + Game.case.title);
    lines.push("Статус: " + (s.campaignComplete ? "КАМПАНИЯ ЗАКРЫТА" : s.caseClosed ? "ЗАКРЫТО" : "В РАБОТЕ"));
    if (s.caseClosed && s.accusedId) {
      lines.push("Ранг: " + GameData.rank() + " · Вердикт: " + Game.getSuspect(s.accusedId).name);
    }
    lines.push("Очки: " + s.points + " · Прогресс: " + s.progress + "% · Подсказок: " + s.hintsUsed + " · Ошибок вердикта: " + s.wrongVerdicts);
    lines.push("");
    lines.push("УЛИКИ");
    Game.locations.forEach((loc) => {
      if (s.foundClueIds.includes(loc.id)) lines.push("• " + loc.title + " — " + loc.detail);
    });
    lines.push("");
    lines.push("ФАКТЫ");
    s.factIds.forEach((id) => {
      const loc = Game.getLocation(id);
      const q = Game.getQuestion(id);
      if (loc) lines.push("• " + loc.fact);
      else if (q) lines.push("• " + q.fact);
    });
    lines.push("");
    lines.push("ПОДОЗРЕНИЕ");
    Game.suspects.forEach((p) => lines.push("• " + p.name + ": " + s.heat[p.id] + "%"));
    if (s.campaignComplete || s.caseClosed) {
      lines.push("");
      lines.push("РЕКОНСТРУКЦИЯ");
      lines.push(Game.case.resolution);
    }
    return lines.join("\n");
  }
};
