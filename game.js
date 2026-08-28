const Game = {
  init() {
    this.bindUI();
    this.syncAll();
    setInterval(() => {
      this.updateHintButtons();
      this.updateCooldownText();
    }, 1000);
  },

  bindUI() {
    document.getElementById("progressInput").value = AIEngine.state.chapterProgress;

    document.getElementById("applyProgressBtn").addEventListener("click", () => {
      const value = document.getElementById("progressInput").value;
      AIEngine.setProgress(value);
      this.syncAll();
    });

    document.getElementById("nextChapterBtn").addEventListener("click", () => {
      AIEngine.advanceChapter();
      document.getElementById("progressInput").value = 0;
      this.syncAll();
    });

    document.getElementById("softHintBtn").addEventListener("click", () => {
      const result = AIEngine.requestSoftHint();
      this.handleHintResult(result);
    });

    document.getElementById("hardHintBtn").addEventListener("click", () => {
      const result = AIEngine.requestHardHint();
      this.handleHintResult(result);
    });
  },

  handleHintResult(result) {
    if (!result.ok) {
      if (result.reason === "cooldown") {
        alert(`Мягкая подсказка будет доступна через ${result.remaining} сек.`);
      } else if (result.reason === "points") {
        alert(`Нужно ${result.cost} очков расследования.`);
      }
      this.syncAll();
      return;
    }

    this.syncAll();
    this.highlightHintTargets();
  },

  syncAll() {
    this.updateHeader();
    this.renderHintPanel();
    this.updateHintButtons();
    this.updateCooldownText();
    this.highlightHintTargets();
  },

  updateHeader() {
    document.getElementById("uiChapter").textContent = AIEngine.state.currentChapter;
    document.getElementById("uiProgress").textContent = AIEngine.state.chapterProgress + "%";
    document.getElementById("uiPoints").textContent = AIEngine.state.investigationPoints;
    document.getElementById("uiStuck").textContent = AIEngine.state.stuckLevel;
  },

  renderHintPanel() {
    const hint = AIEngine.getHintByStuckLevel();

    document.getElementById("softCostText").textContent = AIEngine.getSoftHintCost();
    document.getElementById("hardCostText").textContent = AIEngine.getHardHintCost();

    const hintBox = document.getElementById("hintBox");
    if (hint) {
      hintBox.className = hint.type === "soft" ? "hint-soft" : "hint-hard";
      hintBox.textContent = hint.text;
    } else {
      hintBox.className = "muted";
      hintBox.textContent = "Пока подсказка не нужна.";
    }

    const historyBox = document.getElementById("hintHistory");
    historyBox.innerHTML = AIEngine.state.hintHistory.length
      ? AIEngine.state.hintHistory.map(h => `<div>${this.escapeHTML(h)}</div>`).join("")
      : "";
  },

  updateHintButtons() {
    const softBtn = document.getElementById("softHintBtn");
    const hardBtn = document.getElementById("hardHintBtn");
    const softCost = AIEngine.getSoftHintCost();
    const hardCost = AIEngine.getHardHintCost();

    softBtn.disabled = !AIEngine.canUseSoftHint() || AIEngine.state.investigationPoints < softCost;
    hardBtn.disabled = AIEngine.state.investigationPoints < hardCost;

    softBtn.textContent = `Мягкая подсказка (${softCost})`;
    hardBtn.textContent = `Жёсткая подсказка (${hardCost})`;
  },

  updateCooldownText() {
    const el = document.getElementById("cooldownText");
    el.textContent = AIEngine.canUseSoftHint()
      ? "Мягкая подсказка доступна сейчас."
      : `Мягкая подсказка доступна через ${Math.ceil(AIEngine.getSoftHintCooldownLeft() / 1000)} сек.`;
  },

  highlightHintTargets() {
    document.querySelectorAll(".board-clue, .board-suspect").forEach(el => el.classList.remove("hint-glow"));
    if ((AIEngine.state.stuckLevel || 0) >= 3) {
      document.querySelectorAll(".board-clue, .board-suspect").forEach(el => el.classList.add("hint-glow"));
    }
  },

  escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
};

window.addEventListener("DOMContentLoaded", () => Game.init());
