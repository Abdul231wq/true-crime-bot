const Game = {
  elements: {},

  init() {
    this.cacheElements();
    this.bindEvents();
    this.syncAll();

    window.setInterval(() => {
      this.updateHintButtons();
      this.updateCooldownText();
    }, 1000);
  },

  cacheElements() {
    this.elements.uiChapter = document.getElementById("uiChapter");
    this.elements.uiProgress = document.getElementById("uiProgress");
    this.elements.uiPoints = document.getElementById("uiPoints");
    this.elements.uiStuck = document.getElementById("uiStuck");
    this.elements.uiCase = document.getElementById("uiCase");
    this.elements.chapterBadge = document.getElementById("chapterBadge");
    this.elements.activeSuspectText = document.getElementById("activeSuspectText");
    this.elements.progressInput = document.getElementById("progressInput");
    this.elements.chapterProgressBar = document.getElementById("chapterProgressBar");
    this.elements.softCostText = document.getElementById("softCostText");
    this.elements.hardCostText = document.getElementById("hardCostText");
    this.elements.cooldownText = document.getElementById("cooldownText");
    this.elements.softHintBtn = document.getElementById("softHintBtn");
    this.elements.hardHintBtn = document.getElementById("hardHintBtn");
    this.elements.hintBox = document.getElementById("hintBox");
    this.elements.hintHistory = document.getElementById("hintHistory");
    this.elements.gameMessage = document.getElementById("gameMessage");
    this.elements.suspectCards = document.querySelectorAll(".suspect-card");
  },

  bindEvents() {
    document.getElementById("applyProgressBtn").addEventListener("click", () => {
      const result = AIEngine.setProgress(this.elements.progressInput.value);
      this.showMessage(`Прогресс установлен: ${result.progress}%.`, "success");
      this.syncAll();
    });

    document.getElementById("nextChapterBtn").addEventListener("click", () => {
      const result = AIEngine.advanceChapter();
      this.showMessage(`Начата глава ${result.chapter}.`, "success");
      this.syncAll();
    });

    this.elements.softHintBtn.addEventListener("click", () => {
      const result = AIEngine.requestSoftHint();
      this.handleHintResult(result);
    });

    this.elements.hardHintBtn.addEventListener("click", () => {
      const result = AIEngine.requestHardHint();
      this.handleHintResult(result);
    });

    document.getElementById("findClueBtn").addEventListener("click", () => {
      const result = AIEngine.addClue();
      this.showMessage(result.message, "success");
      this.syncAll();
    });

    document.getElementById("successfulQuestionBtn").addEventListener("click", () => {
      const result = AIEngine.successfulQuestion();
      this.showMessage(result.message, "success");
      this.syncAll();
    });

    document.getElementById("correctHypothesisBtn").addEventListener("click", () => {
      const result = AIEngine.correctHypothesis();
      this.showMessage(result.message, "success");
      this.syncAll();
    });

    document.getElementById("correctVerdictBtn").addEventListener("click", () => {
      const result = AIEngine.correctVerdict();
      this.showMessage(result.message, "success");
      this.syncAll();
    });

    document.getElementById("resetBtn").addEventListener("click", () => {
      const confirmed = window.confirm("Сбросить весь прогресс игры?");
      if (!confirmed) return;
      AIEngine.reset();
      this.showMessage("Сохранение сброшено.", "warning");
      this.syncAll();
    });

    this.elements.suspectCards.forEach((card) => {
      card.addEventListener("click", () => {
        this.elements.suspectCards.forEach((el) => el.classList.remove("selected"));
        card.classList.add("selected");
        const suspectId = card.dataset.suspect;
        AIEngine.setActiveSuspect(suspectId);
        this.syncAll();
        this.showMessage(`Выбран подозреваемый: ${AIEngine.getActiveSuspectName()}.`, "success");
      });
    });
  },

  handleHintResult(result) {
    if (!result.ok) {
      if (result.reason === "cooldown") {
        this.showMessage(`Мягкая подсказка будет доступна через ${result.remaining} сек.`, "warning");
      } else if (result.reason === "points") {
        this.showMessage(`Недостаточно очков. Нужно ${result.cost}.`, "danger");
      }
      this.syncAll();
      return;
    }

    this.showMessage(
      `${result.type === "soft" ? "Мягкая" : "Жёсткая"} подсказка использована за ${result.cost} очков.`,
      "success"
    );
    this.syncAll();
  },

  syncAll() {
    this.updateHeader();
    this.updateProgress();
    this.updateCosts();
    this.renderHint();
    this.renderHintHistory();
    this.updateHintButtons();
    this.updateCooldownText();
    this.highlightHintTargets();
    this.updateSuspectSelection();
  },

  updateHeader() {
    const s = AIEngine.state;
    this.elements.uiChapter.textContent = s.currentChapter;
    this.elements.chapterBadge.textContent = s.currentChapter;
    this.elements.uiProgress.textContent = `${s.chapterProgress}%`;
    this.elements.uiPoints.textContent = s.investigationPoints;
    this.elements.uiStuck.textContent = s.stuckLevel;
    this.elements.uiCase.textContent = "001";
    this.elements.activeSuspectText.textContent = AIEngine.getActiveSuspectName();
  },

  updateProgress() {
    const progress = AIEngine.state.chapterProgress;
    this.elements.progressInput.value = progress;
    this.elements.chapterProgressBar.style.width = `${progress}%`;
  },

  updateCosts() {
    this.elements.softCostText.textContent = AIEngine.getSoftHintCost();
    this.elements.hardCostText.textContent = AIEngine.getHardHintCost();
  },

  renderHint() {
    const hint = AIEngine.getHintByStuckLevel();
    if (!hint) {
      this.elements.hintBox.className = "hint-box empty-hint";
      this.elements.hintBox.textContent = "Пока подсказка не запрошена.";
      return;
    }
    this.elements.hintBox.className = hint.type === "soft" ? "hint-box hint-soft" : "hint-box hint-hard";
    this.elements.hintBox.textContent = hint.text;
  },

  renderHintHistory() {
    const history = AIEngine.state.hintHistory;
    this.elements.hintHistory.replaceChildren();

    if (!history.length) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = "История подсказок пуста.";
      this.elements.hintHistory.appendChild(empty);
      return;
    }

    history.forEach((item) => {
      const row = document.createElement("div");
      row.className = "history-item";
      row.textContent = item;
      this.elements.hintHistory.appendChild(row);
    });
  },

  updateHintButtons() {
    const state = AIEngine.state;
    const softCost = AIEngine.getSoftHintCost();
    const hardCost = AIEngine.getHardHintCost();

    this.elements.softHintBtn.disabled = !AIEngine.canUseSoftHint() || state.investigationPoints < softCost;
    this.elements.hardHintBtn.disabled = state.investigationPoints < hardCost;

    this.elements.softHintBtn.textContent = `Мягкая подсказка · ${softCost}`;
    this.elements.hardHintBtn.textContent = `Жёсткая подсказка · ${hardCost}`;
  },

  updateCooldownText() {
    if (AIEngine.canUseSoftHint()) {
      this.elements.cooldownText.textContent = "Мягкая подсказка доступна сейчас.";
      return;
    }
    const seconds = Math.ceil(AIEngine.getSoftHintCooldownLeft() / 1000);
    this.elements.cooldownText.textContent = `Мягкая подсказка доступна через ${seconds} сек.`;
  },

  updateSuspectSelection() {
    this.elements.suspectCards.forEach((card) => {
      card.classList.toggle("selected", card.dataset.suspect === AIEngine.state.activeSuspect);
    });
  },

  highlightHintTargets() {
    const cards = document.querySelectorAll(".board-clue, .board-suspect");
    cards.forEach((card) => card.classList.remove("hint-glow"));
    if (AIEngine.state.stuckLevel < 3) return;
    cards.forEach((card) => card.classList.add("hint-glow"));
  },

  showMessage(message, type) {
    this.elements.gameMessage.textContent = message;
    this.elements.gameMessage.className = "game-message";
    if (type) this.elements.gameMessage.classList.add(`is-${type}`);
  }
};

window.addEventListener("DOMContentLoaded", () => {
  Game.init();
});
