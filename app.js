function $(sel, root) {
  return (root || document).querySelector(sel);
}
function $$(sel, root) {
  return Array.prototype.slice.call((root || document).querySelectorAll(sel));
}
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");
}

const SUSPECT_POS = [
  { x: 6.5, y: 4.2, rot: -2.4 },
  { x: 40.2, y: 3.1, rot: 1.6 },
  { x: 73.5, y: 4.8, rot: -1.2 }
];
const CLUE_POS = [
  { x: 5.5, y: 36.5, rot: -1.6 },
  { x: 36.5, y: 34.2, rot: 2.0 },
  { x: 67.8, y: 36.8, rot: -0.9 },
  { x: 8.5, y: 56.2, rot: 1.4 },
  { x: 39.5, y: 54.5, rot: -1.7 },
  { x: 70.8, y: 55.8, rot: 0.8 }
];

let boardFocus = null;

function toast(text, kind) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.className = "toast show " + (kind || "info");
  clearTimeout(toast._t);
  toast._t = setTimeout(function () {
    el.classList.remove("show");
  }, 4200);
}

function runAction(fn) {
  GameData.tickLives();
  const result = fn();
  if (!result.ok) {
    toast(result.message, "err");
    updateUI();
    return result;
  }
  if (!result.repeat) toast(result.message, result.crack || result.closed || result.correct || result.advanced || result.campaign ? "ok" : "info");
  updateUI();
  if (result.advanced) {
    clearTimeout(runAction._adv);
    runAction._adv = setTimeout(function () {
      window.location.href = "./index.html";
    }, 2400);
  }
  return result;
}

function isDossierPage() {
  const p = location.pathname;
  return /index\.html$/.test(p) || /\/game\/?$/.test(p) || /\/$/.test(p);
}

function flashClose() {
  try {
    return sessionStorage.getItem("tc_flash_close") === "1";
  } catch (e) {
    return false;
  }
}

function clearFlashClose() {
  try {
    sessionStorage.removeItem("tc_flash_close");
  } catch (e) {}
}

function mugHtml(p) {
  return (
    '<span class="mug look-' +
    esc(p.tone) +
    '" aria-hidden="true"><i class="mug-hair"></i><i class="mug-head"></i><i class="mug-coat"></i></span>'
  );
}

function heatClass(v) {
  if (v >= 60) return "hot";
  if (v >= 35) return "warm";
  return "cool";
}

function renderHeat(box) {
  if (!box) return;
  box.innerHTML = "";
  Game.suspects.forEach(function (p) {
    const v = GameData.state.heat[p.id] || 0;
    const row = document.createElement("div");
    row.className = "heat-row";
    row.innerHTML =
      '<span class="heat-name">' +
      esc(p.name) +
      '</span><span class="heat-track"><i class="' +
      heatClass(v) +
      '" style="width:' +
      v +
      '%"></i></span><span class="heat-val tabular">' +
      v +
      "</span>";
    box.appendChild(row);
  });
}

function updateUI() {
  const s = GameData.state;
  GameData.tickLives();

  $$("[data-ui-chapter]").forEach(function (el) {
    el.textContent = s.chapter;
  });
  $$("[data-ui-points]").forEach(function (el) {
    el.textContent = s.points;
  });
  $$("[data-ui-lives]").forEach(function (el) {
    el.textContent = s.lives;
  });
  $$("[data-ui-progress]").forEach(function (el) {
    el.textContent = s.progress + "%";
  });
  $$("[data-progress-bar]").forEach(function (el) {
    el.style.width = s.progress + "%";
  });
  $$("[data-life-text]").forEach(function (el) {
    el.textContent = GameData.lifeText();
  });
  $$("[data-ui-case-label]").forEach(function (el) {
    el.textContent = Game.case.id + " · " + Game.case.title;
  });
  $$("[data-cost-search]").forEach(function (el) {
    el.textContent = String(COST.search);
  });
  $$("[data-cost-soft]").forEach(function (el) {
    el.textContent = String(COST.soft);
  });
  $$("[data-cost-hard]").forEach(function (el) {
    el.textContent = String(COST.hard);
  });

  const nameEl = $("#selectedSuspectText");
  if (nameEl) nameEl.textContent = AIEngine.getActiveSuspectName();

  $$("[data-suspect]").forEach(function (btn) {
    btn.classList.toggle("selected", btn.getAttribute("data-suspect") === s.activeSuspect);
  });

  const msg = $("#gameMessage");
  if (msg) msg.textContent = s.lastMessage || "Игра готова. Начните расследование.";

  const hintBox = $("#hintBox");
  if (hintBox) hintBox.textContent = s.lastHint || "Подсказка появится здесь.";

  const historyBox = $("[data-hint-history]");
  if (historyBox) {
    historyBox.innerHTML = "";
    if (!s.hintHistory.length) {
      const empty = document.createElement("div");
      empty.className = "history-item";
      empty.textContent = "История подсказок пуста.";
      historyBox.appendChild(empty);
    } else {
      s.hintHistory.forEach(function (item) {
        const div = document.createElement("div");
        div.className = "history-item";
        div.textContent = item;
        historyBox.appendChild(div);
      });
    }
  }

  renderBanner();
  renderOverlay();
  renderDossier();
  renderSuspectSwitch();
  renderHeat($("[data-heat]"));
  renderLocations();
  renderQuestions();
  renderConfronts();
  renderHypotheses();
  renderVerdicts();
  renderBoard();
  renderTimeline();
  renderNotebook();
  renderInspector();
  renderRank();
  renderArchive();

  const locked = s.caseClosed || s.campaignComplete;
  $$("[data-when-open]").forEach(function (el) {
    el.hidden = locked;
  });
  $$("[data-when-closed]").forEach(function (el) {
    el.hidden = !locked;
  });

  const progressInput = $("#progressInput");
  if (progressInput && document.activeElement !== progressInput) {
    progressInput.value = String(s.progress);
  }
}

function nextCaseButton() {
  return '<div class="btn-row" style="margin-top:10px"><button class="btn" data-next-case type="button">Следующее дело</button></div>';
}

function renderBanner() {
  const closed = $("[data-closed-banner]");
  if (!closed) return;
  if (document.body.classList.contains("is-board")) {
    closed.hidden = true;
    return;
  }
  const s = GameData.state;
  if (s.justAdvanced) {
    closed.hidden = false;
    closed.className = "banner";
    closed.innerHTML =
      "<strong>Дело закрыто</strong> · " +
      esc(s.justAdvanced.fromId) +
      " «" +
      esc(s.justAdvanced.fromTitle) +
      "» · ранг " +
      esc(s.justAdvanced.rank) +
      "<p>Виновен: " +
      esc(s.justAdvanced.accusedName) +
      ". Открыто " +
      esc(s.justAdvanced.toId) +
      " «" +
      esc(s.justAdvanced.toTitle) +
      "».</p>" +
      '<div class="btn-row" style="margin-top:10px"><button class="btn" data-dismiss-advance type="button">К составу нового дела</button></div>';
    return;
  }
  if (s.campaignComplete) {
    closed.hidden = false;
    closed.className = "banner";
    const ranks = s.archive
      .map(function (a) {
        return a.id + " " + a.rank;
      })
      .join(" · ");
    closed.innerHTML =
      "<strong>Кампания закрыта</strong> · три дела" +
      (ranks ? "<p>Ранги: " + esc(ranks) + "</p>" : "") +
      "<p>" +
      esc(Game.case.resolution) +
      "</p>";
    return;
  }
  if (s.caseClosed && s.verdictCorrect) {
    closed.hidden = false;
    closed.className = "banner";
    closed.innerHTML =
      "<strong>Дело закрыто</strong> · ранг " +
      GameData.rank() +
      " · " +
      esc(Game.getSuspect(s.accusedId).name) +
      "<p>" +
      esc(Game.case.resolution) +
      "</p>" +
      (Game.hasNext() ? nextCaseButton() : "");
    return;
  }
  closed.hidden = true;
  closed.innerHTML = "";
}

function renderOverlay() {
  let el = $("#caseOverlay");
  if (!el) {
    el = document.createElement("div");
    el.id = "caseOverlay";
    el.className = "overlay";
    el.hidden = true;
    document.body.appendChild(el);
  }
  const s = GameData.state;
  if (s.justAdvanced && flashClose() && !isDossierPage()) {
    el.hidden = false;
    el.innerHTML =
      '<div class="overlay-card">' +
      '<span class="stamp">ДЕЛО ЗАКРЫТО</span>' +
      "<p class='kicker' style='margin-top:12px'>" +
      esc(s.justAdvanced.fromId) +
      "</p>" +
      "<h2>" +
      esc(s.justAdvanced.fromTitle) +
      "</h2>" +
      "<p>Виновен: <strong>" +
      esc(s.justAdvanced.accusedName) +
      "</strong> · ранг " +
      esc(s.justAdvanced.rank) +
      "</p>" +
      "<p class='muted'>Следующее: " +
      esc(s.justAdvanced.toId) +
      " — " +
      esc(s.justAdvanced.toTitle) +
      "</p>" +
      '<div class="btn-row" style="margin-top:16px"><button class="btn" data-dismiss-advance type="button">К новому делу</button></div>' +
      "</div>";
    return;
  }
  if (s.campaignComplete) {
    const ranks = s.archive
      .map(function (a) {
        return "<li>" + esc(a.id) + " «" + esc(a.title) + "» — " + esc(a.accusedName) + " · " + esc(a.rank) + "</li>";
      })
      .join("");
    el.hidden = false;
    el.innerHTML =
      '<div class="overlay-card">' +
      '<span class="stamp">КАМПАНИЯ</span>' +
      "<h2>Три дела закрыты</h2>" +
      "<ul class='overlay-list'>" +
      ranks +
      "</ul>" +
      "<p>" +
      esc(Game.case.resolution) +
      "</p>" +
      '<div class="btn-row" style="margin-top:16px">' +
      '<button class="btn" data-overlay-dismiss type="button">Оставить архив</button>' +
      '<button class="btn btn-danger" data-reset type="button">Начать заново</button>' +
      "</div></div>";
    return;
  }
  if (s.caseClosed && s.verdictCorrect) {
    const name = s.accusedId ? Game.getSuspect(s.accusedId).name : "—";
    const next = Game.nextPack();
    el.hidden = false;
    el.innerHTML =
      '<div class="overlay-card">' +
      '<span class="stamp">ДЕЛО ЗАКРЫТО</span>' +
      "<p class='kicker' style='margin-top:12px'>" +
      esc(Game.case.id) +
      "</p>" +
      "<h2>" +
      esc(Game.case.title) +
      "</h2>" +
      "<p>Виновен: <strong>" +
      esc(name) +
      "</strong> · ранг " +
      GameData.rank() +
      "</p>" +
      "<p>" +
      esc(Game.case.resolution) +
      "</p>" +
      (next
        ? "<p class='muted'>Следующее дело откроется автоматически.</p>" +
          '<div class="btn-row" style="margin-top:16px"><button class="btn" data-next-case type="button">Следующее дело</button></div>'
        : "") +
      "</div>";
    return;
  }
  el.hidden = true;
  el.innerHTML = "";
}

function renderDossier() {
  const brief = $("#caseBrief");
  if (brief) {
    brief.innerHTML =
      '<span class="kicker">Жертва</span><h3>' +
      esc(Game.case.victim) +
      ", " +
      esc(Game.case.age) +
      "</h3><p>" +
      esc(Game.case.role) +
      " · время смерти " +
      esc(Game.case.death) +
      "</p><p>" +
      esc(Game.case.summary) +
      "</p><p>" +
      esc(Game.case.briefing) +
      "</p>";
  }
  const grid = $("#suspectGrid");
  if (!grid) return;
  grid.innerHTML = "";
  Game.suspects.forEach(function (p) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "suspect" + (p.id === GameData.state.activeSuspect ? " selected" : "");
    btn.setAttribute("data-suspect", p.id);
    btn.innerHTML =
      mugHtml(p) +
      '<span class="kicker">' +
      esc(p.role) +
      "</span><h3>" +
      esc(p.name) +
      "</h3><p>" +
      esc(p.blurb) +
      "</p>";
    grid.appendChild(btn);
  });
}

function renderSuspectSwitch() {
  const box = $("#suspectSwitch");
  if (!box) return;
  box.innerHTML = "";
  Game.suspects.forEach(function (p) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-outline" + (p.id === GameData.state.activeSuspect ? " selected" : "");
    btn.setAttribute("data-suspect", p.id);
    btn.textContent = p.mono;
    box.appendChild(btn);
  });
}

function renderLocations() {
  const box = $("#locationList");
  if (!box) return;
  const s = GameData.state;
  box.innerHTML = "";
  Game.locations.forEach(function (loc) {
    const found = s.foundClueIds.indexOf(loc.id) !== -1;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile" + (found ? " done" : "");
    btn.disabled = s.caseClosed || s.campaignComplete;
    btn.innerHTML =
      '<span class="kicker">' +
      (found ? "В деле" : "Точка · " + COST.search + " очк.") +
      "</span><strong>" +
      esc(loc.place) +
      "</strong>" +
      (found ? '<span class="muted">' + esc(loc.title) + "</span>" : "");
    btn.addEventListener("click", function () {
      runAction(function () {
        return AIEngine.searchLocation(loc.id);
      });
    });
    box.appendChild(btn);
  });
}

function renderQuestions() {
  const box = $("#questionList");
  if (!box) return;
  const s = GameData.state;
  box.innerHTML = "";
  Game.questions
    .filter(function (q) {
      return q.suspectId === s.activeSuspect;
    })
    .forEach(function (q) {
      const asked = s.askedQuestionIds.indexOf(q.id) !== -1;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tile wide";
      btn.disabled = s.caseClosed || s.campaignComplete;
      btn.innerHTML =
        "<strong>" +
        esc(q.prompt) +
        "</strong>" +
        (asked
          ? '<span class="muted">' +
            esc(q.answer) +
            "</span>" +
            (q.lie ? '<span class="tag warn">Возможная ложь</span>' : '<span class="tag ok">Сходится</span>')
          : '<span class="muted">Новый вопрос · ' + COST.question + " очк.</span>");
      btn.addEventListener("click", function () {
        runAction(function () {
          return AIEngine.askQuestion(q.id);
        });
      });
      box.appendChild(btn);
    });
}

function renderConfronts() {
  const box = $("#confrontList");
  if (!box) return;
  const s = GameData.state;
  box.innerHTML = "";
  const found = Game.locations.filter(function (l) {
    return s.foundClueIds.indexOf(l.id) !== -1;
  });
  if (!found.length) {
    box.innerHTML = '<p class="muted">Сначала найдите улику на обыске — потом предъявите её.</p>';
    return;
  }
  found.forEach(function (loc) {
    const key = s.activeSuspect + ":" + loc.id;
    const done = s.confrontedIds.indexOf(key) !== -1;
    const spec = Game.getConfront(s.activeSuspect, loc.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile" + (done ? " done" : "");
    btn.disabled = s.caseClosed || s.campaignComplete;
    btn.innerHTML =
      '<span class="kicker">' +
      (done ? "Предъявлено" : "Очная ставка · " + COST.confront + " очк.") +
      "</span><strong>" +
      esc(loc.title) +
      "</strong>" +
      (done && spec ? '<span class="muted">' + esc(spec.reply) + "</span>" : '<span class="muted">' + esc(loc.place) + "</span>");
    btn.addEventListener("click", function () {
      runAction(function () {
        return AIEngine.confront(loc.id);
      });
    });
    box.appendChild(btn);
  });
}

function renderHypotheses() {
  const box = $("#hypothesisList");
  if (!box) return;
  const s = GameData.state;
  box.innerHTML = "";
  Game.hypotheses.forEach(function (h) {
    const tested = s.testedHypothesisIds.indexOf(h.id) !== -1;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile wide";
    btn.disabled = s.caseClosed || s.campaignComplete;
    btn.innerHTML =
      "<strong>" +
      esc(h.title) +
      "</strong><span class='muted'>" +
      esc(h.detail) +
      "</span>" +
      (tested ? "<span class='muted'>" + esc(h.reply) + "</span>" : '<span class="muted">' + COST.hypothesis + " очк.</span>");
    btn.addEventListener("click", function () {
      runAction(function () {
        return AIEngine.testHypothesis(h.id);
      });
    });
    box.appendChild(btn);
  });
}

function renderVerdicts() {
  const box = $("#verdictList");
  if (!box) return;
  const s = GameData.state;
  box.innerHTML = "";
  Game.suspects.forEach(function (p) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-outline";
    btn.disabled = s.caseClosed || s.campaignComplete;
    btn.textContent = "Обвинить: " + p.name;
    btn.addEventListener("click", function () {
      runAction(function () {
        return AIEngine.deliverVerdict(p.id);
      });
    });
    box.appendChild(btn);
  });
}

function fitCork() {
  const stage = $("#corkStage");
  const cork = $("#cork");
  const sizer = $("#corkSizer");
  if (!stage || !cork || !sizer) return;
  const pad = 8;
  const sw = Math.max(1, stage.clientWidth - pad);
  const sh = Math.max(1, stage.clientHeight - pad);
  const scale = Math.min(sw / 1080, sh / 740, 1);
  sizer.style.width = Math.round(1080 * scale) + "px";
  sizer.style.height = Math.round(740 * scale) + "px";
  cork.style.transform = "scale(" + scale + ")";
  requestAnimationFrame(drawYarn);
}

function setBoardFocus(kind, id) {
  boardFocus = { kind: kind, id: id };
  if (kind === "suspect") AIEngine.setSuspect(id);
  renderBoard();
  renderInspector();
  requestAnimationFrame(drawYarn);
}

function renderBoard() {
  const pins = $("#boardClues");
  const people = $("#boardSuspects");
  if (!pins && !people) return;
  const s = GameData.state;
  const stamp = $("[data-cork-stamp]");
  if (stamp) {
    stamp.innerHTML =
      "<span>" +
      esc(Game.case.id) +
      "</span><strong>" +
      esc(Game.case.title) +
      "</strong>" +
      (s.caseClosed ? '<em class="stamp-closed">ЗАКРЫТО</em>' : "");
  }

  if (people) {
    people.innerHTML = "";
    Game.suspects.forEach(function (p, i) {
      const pos = SUSPECT_POS[i] || SUSPECT_POS[0];
      const v = s.heat[p.id] || 0;
      const el = document.createElement("article");
      el.className =
        "polaroid" +
        (p.id === s.activeSuspect ? " selected" : "") +
        (boardFocus && boardFocus.kind === "suspect" && boardFocus.id === p.id ? " focus" : "");
      el.setAttribute("data-pol", p.id);
      el.style.setProperty("--x", pos.x + "%");
      el.style.setProperty("--y", pos.y + "%");
      el.style.setProperty("--rot", pos.rot + "deg");
      el.innerHTML =
        '<i class="pushpin" aria-hidden="true"></i>' +
        '<div class="shot tone-' +
        esc(p.tone) +
        '">' +
        mugHtml(p) +
        "</div>" +
        '<div class="caption">' +
        esc(p.name) +
        "</div>" +
        '<div class="sub">' +
        esc(p.role) +
        "</div>" +
        '<span class="heat-track"><i class="' +
        heatClass(v) +
        '" style="width:' +
        v +
        '%"></i></span>';
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        setBoardFocus("suspect", p.id);
      });
      people.appendChild(el);
    });
  }

  if (!pins) return;
  pins.innerHTML = "";
  Game.locations.forEach(function (clue, i) {
    const pos = CLUE_POS[i] || CLUE_POS[0];
    const found = s.foundClueIds.indexOf(clue.id) !== -1;
    const art = document.createElement("article");
    art.className =
      "pin" +
      (found ? "" : " ghost") +
      (boardFocus && boardFocus.kind === "clue" && boardFocus.id === clue.id ? " focus" : "");
    art.setAttribute("data-clue", clue.id);
    art.style.setProperty("--x", pos.x + "%");
    art.style.setProperty("--y", pos.y + "%");
    art.style.setProperty("--rot", found ? pos.rot + "deg" : "0deg");
    if (found) {
      art.innerHTML =
        '<i class="pushpin" aria-hidden="true"></i>' +
        '<span class="kicker">' +
        esc(clue.tag) +
        "</span><h4>" +
        esc(clue.title) +
        "</h4>" +
        '<p class="pin-place">' +
        esc(clue.place) +
        "</p>";
    } else {
      art.innerHTML =
        '<i class="pushpin dim" aria-hidden="true"></i>' +
        '<span class="kicker">Пусто</span><h4>Ещё не найдено</h4>' +
        '<p class="pin-place">' +
        esc(clue.place) +
        "</p>";
    }
    art.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!found) {
        toast("Сначала обыщите точку на странице процесса.", "info");
        return;
      }
      setBoardFocus("clue", clue.id);
    });
  pins.appendChild(art);
  });
  fitCork();
  requestAnimationFrame(drawYarn);
}

function drawYarn() {
  const svg = $("#boardYarn");
  const cork = $("#cork");
  if (!svg || !cork) return;
  const cr = cork.getBoundingClientRect();
  const w = Math.max(1, cr.width);
  const h = Math.max(1, cr.height);
  svg.setAttribute("viewBox", "0 0 " + w + " " + h);
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const s = GameData.state;
  const people = $$("[data-pol]", cork);
  const pins = $$("[data-clue]:not(.ghost)", cork);
  people.forEach(function (pol) {
    const sid = pol.getAttribute("data-pol");
    const pr = pol.getBoundingClientRect();
    const x1 = pr.left - cr.left + pr.width / 2;
    const y1 = pr.bottom - cr.top - 6;
    pins.forEach(function (pin) {
      const loc = Game.getLocation(pin.getAttribute("data-clue"));
      if (!loc || !loc.heat) return;
      const hv = loc.heat[sid] || 0;
      if (hv < 8) return;
      const focused =
        boardFocus &&
        ((boardFocus.kind === "suspect" && boardFocus.id === sid) ||
          (boardFocus.kind === "clue" && boardFocus.id === loc.id));
      const rr = pin.getBoundingClientRect();
      const x2 = rr.left - cr.left + rr.width / 2;
      const y2 = rr.top - cr.top + 8;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const midY = (y1 + y2) / 2;
      path.setAttribute("d", "M " + x1 + " " + y1 + " C " + x1 + " " + midY + ", " + x2 + " " + midY + ", " + x2 + " " + y2);
      path.setAttribute("class", "yarn" + (hv >= 14 ? " hot" : "") + (focused ? " on" : ""));
      svg.appendChild(path);
    });
  });
}

function renderTimeline() {
  const box = $("#timeline");
  if (!box) return;
  const s = GameData.state;
  box.innerHTML = "";
  Game.timeline.forEach(function (ev) {
    const open =
      !ev.need.length ||
      ev.need.every(function (id) {
        return s.foundClueIds.indexOf(id) !== -1 || s.askedQuestionIds.indexOf(id) !== -1;
      });
    const li = document.createElement("button");
    li.type = "button";
    li.className = "time-item" + (open ? " open" : "") + (boardFocus && boardFocus.kind === "time" && boardFocus.id === ev.id ? " focus" : "");
    li.innerHTML = open
      ? '<span class="time tabular">' + esc(ev.time) + "</span><span>" + esc(ev.text) + "</span>"
      : '<span class="time tabular">' + esc(ev.time) + '</span><span class="muted">Нет данных</span>';
    li.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!open) {
        toast("Событие откроется, когда хватит улик.", "info");
        return;
      }
      setBoardFocus("time", ev.id);
    });
    box.appendChild(li);
  });
}

function renderNotebook() {
  const box = $("#notebook");
  if (!box) return;
  const s = GameData.state;
  box.innerHTML = "";
  if (!s.factIds.length) {
    box.innerHTML = '<p class="muted">Заметки появятся после обыска и допроса.</p>';
    return;
  }
  s.factIds.forEach(function (id) {
    const loc = Game.getLocation(id);
    const q = Game.getQuestion(id);
    const text = (loc && loc.fact) || (q && q.fact);
    if (!text) return;
    const p = document.createElement("div");
    p.className = "note";
    p.textContent = text;
    box.appendChild(p);
  });
}

function renderInspector() {
  const box = $("#inspector");
  if (!box) return;
  const s = GameData.state;
  if (!boardFocus) {
    box.innerHTML =
      '<span class="kicker">Карточка</span><h3>Снимок или улика</h3><p class="muted">Нажмите полярoid или записку. Текст открывается здесь — доска не растёт вниз.</p>';
    return;
  }
  if (boardFocus.kind === "suspect") {
    const p = Game.getSuspect(boardFocus.id);
    const v = s.heat[p.id] || 0;
    const cracks = Game.confronts.filter(function (c) {
      return c.suspectId === p.id && c.crack && s.confrontedIds.indexOf(p.id + ":" + c.clueId) !== -1;
    }).length;
    box.innerHTML =
      '<span class="kicker">' +
      esc(p.role) +
      "</span><h3>" +
      esc(p.name) +
      "</h3><p>" +
      esc(p.note) +
      "</p><p class='muted'>Подозрение " +
      v +
      "% · трещин алиби: " +
      cracks +
      "</p>";
    return;
  }
  if (boardFocus.kind === "clue") {
    const loc = Game.getLocation(boardFocus.id);
    if (!loc) return;
    const links = Game.suspects
      .filter(function (p) {
        return (loc.heat[p.id] || 0) >= 8;
      })
      .map(function (p) {
        return p.mono;
      })
      .join(" · ");
    box.innerHTML =
      '<span class="kicker">' +
      esc(loc.place) +
      "</span><h3>" +
      esc(loc.title) +
      "</h3><p>" +
      esc(loc.detail) +
      "</p>" +
      (loc.fact ? "<p class='muted'>" + esc(loc.fact) + "</p>" : "") +
      (links ? "<p class='muted'>Нить к: " + esc(links) + "</p>" : "");
    return;
  }
  if (boardFocus.kind === "time") {
    const ev = Game.timeline.find(function (t) {
      return t.id === boardFocus.id;
    });
    if (!ev) return;
    box.innerHTML =
      '<span class="kicker">Таймлайн</span><h3>' +
      esc(ev.time) +
      "</h3><p>" +
      esc(ev.text) +
      "</p>";
  }
}

function renderRank() {
  const box = $("#rankCard");
  if (!box) return;
  const s = GameData.state;
  if (!s.caseClosed && !s.campaignComplete && !s.archive.length) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  if (s.campaignComplete) {
    box.innerHTML =
      '<span class="kicker">Кампания</span><h3>Три дела закрыты</h3><p>Очки: ' +
      s.points +
      " · Подсказок за последнее дело: " +
      s.hintsUsed +
      "</p>";
    return;
  }
  if (!s.caseClosed) {
    box.hidden = true;
    return;
  }
  const rank = GameData.rank();
  box.innerHTML =
    '<span class="kicker">Итог</span><h3>Ранг ' +
    rank +
    "</h3><p>Подсказок: " +
    s.hintsUsed +
    " · Ошибок вердикта: " +
    s.wrongVerdicts +
    " · Улик: " +
    s.foundClueIds.length +
    "/" +
    Game.locations.length +
    "</p>";
}

function renderArchive() {
  const box = $("#archiveList");
  if (!box) return;
  const s = GameData.state;
  box.innerHTML = "";
  if (!s.archive.length) {
    box.innerHTML = '<p class="muted">Закрытые дела появятся здесь.</p>';
    return;
  }
  s.archive.forEach(function (a) {
    const div = document.createElement("div");
    div.className = "archive-item";
    div.innerHTML =
      '<span class="kicker">Ранг ' +
      esc(a.rank) +
      "</span><strong>" +
      esc(a.id) +
      " · " +
      esc(a.title) +
      '</strong><span class="muted">Виновен: ' +
      esc(a.accusedName) +
      " · подсказок " +
      a.hintsUsed +
      " · ошибок " +
      a.wrongVerdicts +
      "</span>";
    box.appendChild(div);
  });
}

function bindCommon() {
  document.addEventListener("click", function (e) {
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      window.location.href = nav.getAttribute("data-nav");
      return;
    }
    const sus = e.target.closest("[data-suspect]");
    if (sus) {
      AIEngine.setSuspect(sus.getAttribute("data-suspect"));
      boardFocus = { kind: "suspect", id: sus.getAttribute("data-suspect") };
      updateUI();
      return;
    }
    const next = e.target.closest("[data-next-case]");
    if (next) {
      runAction(function () {
        return AIEngine.nextCase();
      });
      return;
    }
    const dismiss = e.target.closest("[data-dismiss-advance]");
    if (dismiss) {
      AIEngine.dismissAdvance();
      window.location.href = "./index.html";
      return;
    }
    const overlayDismiss = e.target.closest("[data-overlay-dismiss]");
    if (overlayDismiss) {
      const ov = $("#caseOverlay");
      if (ov) ov.hidden = true;
    }
  });

  const soft = $("[data-action='softHint']");
  if (soft)
    soft.addEventListener("click", function () {
      runAction(function () {
        return AIEngine.requestSoftHint();
      });
    });
  const hard = $("[data-action='hardHint']");
  if (hard)
    hard.addEventListener("click", function () {
      runAction(function () {
        return AIEngine.requestHardHint();
      });
    });

  const saveProgress = $("[data-action='saveProgress']");
  if (saveProgress)
    saveProgress.addEventListener("click", function () {
      const input = $("#progressInput");
      if (!input) return;
      runAction(function () {
        return AIEngine.setProgress(input.value);
      });
    });

  const resetBtn = $("[data-reset]");
  if (resetBtn)
    resetBtn.addEventListener("click", function () {
      if (!window.confirm("Сбросить сохранение? Прогресс, улики и вердикт будут удалены.")) return;
      GameData.reset();
      updateUI();
      window.location.reload();
    });

  document.addEventListener("click", function (e) {
    const reset = e.target.closest("[data-reset]");
    if (!reset || resetBtn === reset) return;
    if (!window.confirm("Сбросить сохранение? Прогресс, улики и вердикт будут удалены.")) return;
    GameData.reset();
    updateUI();
    window.location.reload();
  });

  const exportBtn = $("[data-export]");
  if (exportBtn)
    exportBtn.addEventListener("click", function () {
      const text = AIEngine.protocolText();
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "protocol-" + Game.case.id + ".txt";
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Протокол выгружен.", "ok");
    });

  window.addEventListener("resize", function () {
    fitCork();
    drawYarn();
  });

  const stage = $("#corkStage");
  if (stage) {
    let pan = null;
    stage.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".polaroid, .pin, .time-item, button, a")) return;
      pan = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop, id: e.pointerId };
      stage.classList.add("is-panning");
      try {
        stage.setPointerCapture(e.pointerId);
      } catch (err) {}
    });
    stage.addEventListener("pointermove", function (e) {
      if (!pan) return;
      stage.scrollLeft = pan.sl - (e.clientX - pan.x);
      stage.scrollTop = pan.st - (e.clientY - pan.y);
    });
    function endPan() {
      pan = null;
      stage.classList.remove("is-panning");
    }
    stage.addEventListener("pointerup", endPan);
    stage.addEventListener("pointercancel", endPan);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") GameData.save();
  });

  setInterval(function () {
    GameData.tickLives();
    $$("[data-ui-lives]").forEach(function (el) {
      el.textContent = GameData.state.lives;
    });
    $$("[data-life-text]").forEach(function (el) {
      el.textContent = GameData.lifeText();
    });
  }, 1000);
}

document.addEventListener("DOMContentLoaded", function () {
  AIEngine.honorPendingAdvance();
  if (isDossierPage()) clearFlashClose();
  bindCommon();
  updateUI();
  fitCork();
});
