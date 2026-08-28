const Game = {
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
    this.uiChapter = document.getElementById("uiChapter");
    this.uiProgress = document.getElementById("uiProgress");
    this.uiPoints = document.getElementById("uiPoints");
    this.uiStuck = document.getElementById("uiStuck");

    this.progressInput = document.getElementById("progressInput");
    this.chapterProgressBar = document.getElementById("chapterProgressBar");

    this.softCostText = document.getElementById("softCostText");
    this.hardCostText = document.getElementById("hardCostText");
    this.cooldownText = document.getElementById("cooldownText");

    this.softHintBtn = document.getElementById("softHintBtn");
    this.hardHintBtn = document.getElementById("hardHintBtn");

    this.hintBox = document.getElementById("hintBox");
    this.hintHistory = document.getElementById("hintHistory");
    this.gameMessage = document.getElementById("gameMessage");
  },

  bindEvents() {
    document
      .getElementById("applyProgressBtn")
      .addEventListener("click", () => {
        const result = AIEngine.setProgress(this.progressInput.value);

        this.showMessage(
          `Прогресс главы установлен: ${result.progress}%.`
        );

        this.syncAll();
      });

    document
      .getElementById("nextChapterBtn")
      .addEventListener("click", () => {
        const result = AIEngine.advanceChapter();

        this.progressInput.value = 0;

        this.showMessage(
          `Начата глава ${result.chapter}. Счётчики стоимости подсказок сброшены.`
        );

        this.syncAll();
      });

    this.softHintBtn.addEventListener("click", () => {
      const result = AIEngine.requestSoftHint();
      this.handleHintResult(result);
    });

    this.hardHintBtn.addEventListener("click", () => {
      const result = AIEngine.requestHardHint();
      this.handleHintResult(result);
    });

    document
      .getElementById("findClueBtn")
      .addEventListener("click", () => {
        const result = AIEngine.addClue();

        this.showMessage(result.message);
        this.syncAll();
      });

    document
      .getElementById("successfulQuestionBtn")
      .addEventListener("click", () => {
        const result = AIEngine.successfulQuestion();

        this.showMessage(result.message);
        this.syncAll();
      });

    document
      .getElementById("correctHypothesisBtn")
      .addEventListener("click", () => {
        const result = AIEngine.correctHypothesis();

        this.showMessage(result.message);
        this.syncAll();
      });

    document
      .getElementById("correctVerdictBtn")
      .addEventListener("click", () => {
        const result = AIEngine.correctVerdict();

        this.showMessage(result.message);
        this.syncAll();
      });

    document
      .getElementById("resetBtn")
      .addEventListener("click", () => {
        const confirmed = window.confirm(
          "Удалить весь прогресс и вернуть начальные значения?"
        );

        if (!confirmed) return;

        AIEngine.reset();
        this.progressInput.value = AIEngine.state.chapterProgress;

        this.showMessage("Сохранение сброшено.");
        this.syncAll();
      });
  },

  handleHintResult(result) {
    if (!result.ok) {
      if (result.reason === "cooldown") {
        this.showMessage(
          `Мягкая подсказка будет доступна через ${result.remaining} сек.`
        );
      }

      if (result.reason === "points") {
        this.showMessage(
          `Недостаточно очков. Нужно ${result.cost}.`
        );
      }

      if (result.reason === "nohint") {
        this.showMessage("Сейчас подходящей подсказки нет.");
      }

      this.syncAll();
      return;
    }

    this.showMessage(
      `${result.type === "soft" ? "Мягкая" : "Жёсткая"} подсказка использована за ${result.cost} очков.`
    );

    this.syncAll();
    this.highlightHintTargets();
  },

  syncAll() {
    this.updateHeader();
    this.updateProgressBar();
    this.updateCosts();
    this.renderHint();
    this.renderHintHistory();
    this.updateHintButtons();
    this.updateCooldownText();
    this.highlightHintTargets();
  },

  updateHeader() {
    const state = AIEngine.state;

    this.uiChapter.textContent = state.currentChapter;
    this.uiProgress.textContent = `${state.chapterProgress}%`;
    this.uiPoints.textContent = state.investigationPoints;
    this.uiStuck.textContent = state.stuckLevel;
  },

  updateProgressBar() {
    this.chapterProgressBar.style.width =
      `${AIEngine.state.chapterProgress}%`;

    this.progressInput.value =
      AIEngine.state.chapterProgress;
  },

  updateCosts() {
    this.softCostText.textContent =
      AIEngine.getSoftHintCost();

    this.hardCostText.textContent =
      AIEngine.getHardHintCost();
  },

  renderHint() {
    const hint = AIEngine.getHintByStuckLevel();

    if (!hint) {
      this.hintBox.className = "hint-box muted";
      this.hintBox.textContent = "Пока подсказка не запрошена.";
      return;
    }

    this.hintBox.className =
      hint.type === "soft"
        ? "hint-box hint-soft"
        : "hint-box hint-hard";

    this.hintBox.textContent = hint.text;
  },

  renderHintHistory() {
    const history = AIEngine.state.hintHistory;

    this.hintHistory.replaceChildren();

    history.forEach((item) => {
      const row = document.createElement("div");
      row.textContent = item;
      this.hintHistory.appendChild(row);
    });
  },

  updateHintButtons() {
    const softCost = AIEngine.getSoftHintCost();
    const hardCost = AIEngine.getHardHintCost();

    const hasSoftPoints =
      AIEngine.state.investigationPoints >= softCost;

    const hasHardPoints =
      AIEngine.state.investigationPoints >= hardCost;

    this.softHintBtn.disabled =
      !AIEngine.canUseSoftHint() || !hasSoftPoints;

    this.hardHintBtn.disabled =
      !hasHardPoints;

    this.softHintBtn.textContent =
      `Мягкая подсказка (${softCost})`;

    this.hardHintBtn.textContent =
      `Жёсткая подсказка (${hardCost})`;
  },

  updateCooldownText() {
    if (AIEngine.canUseSoftHint()) {
      this.cooldownText.textContent =
        "Мягкая подсказка доступна сейчас.";
      return;
    }

    const seconds = Math.ceil(
      AIEngine.getSoftHintCooldownLeft() / 1000
    );

    this.cooldownText.textContent =
      `Мягкая подсказка доступна через ${seconds} сек.`;
  },

  highlightHintTargets() {
    const cards = document.querySelectorAll(
      ".board-clue, .board-suspect"
    );

    cards.forEach((card) => {
      card.classList.remove("hint-glow");
    });

    if (AIEngine.state.stuckLevel < 3) return;

    cards.forEach((card) => {
      card.classList.add("hint-glow");
    });
  },

  showMessage(message) {
    this.gameMessage.textContent = message;
  }
};

window.addEventListener("DOMContentLoaded", () => {
  Game.init();
});
