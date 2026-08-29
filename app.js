function updateUI() {
  const s = GameData.state;

  document.querySelectorAll("[data-ui-chapter]").forEach(el => el.textContent = s.chapter);
  document.querySelectorAll("[data-ui-points]").forEach(el => el.textContent = s.points);
  document.querySelectorAll("[data-ui-lives]").forEach(el => el.textContent = s.lives);
  document.querySelectorAll("[data-ui-progress]").forEach(el => el.textContent = `${s.progress}%`);

  document.querySelectorAll("[data-progress-bar]").forEach(el => {
    el.style.width = `${s.progress}%`;
  });

  const lifeText = document.querySelector("[data-life-text]");
  if (lifeText) {
    lifeText.textContent = s.lives > 0
      ? `Жизней сейчас: ${s.lives} / ${s.maxLives}`
      : `Жизнь появится через ${AIEngine.getLifeCountdownText()}`;
  }

  const selectedSuspectText = document.querySelector("#selectedSuspectText");
  if (selectedSuspectText) selectedSuspectText.textContent = AIEngine.getActiveSuspectName();

  document.querySelectorAll("[data-suspect]").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.suspect === s.activeSuspect);
  });

  const historyBox = document.querySelector("[data-hint-history]");
  if (historyBox) {
    historyBox.innerHTML = "";
    if (!s.hintHistory.length) {
      const empty = document.createElement("div");
      empty.className = "history-item";
      empty.textContent = "История подсказок пуста.";
      historyBox.appendChild(empty);
    } else {
      s.hintHistory.forEach(item => {
        const div = document.createElement("div");
        div.className = "history-item";
        div.textContent = item;
        historyBox.appendChild(div);
      });
    }
  }

  const hintBox = document.querySelector("#hintBox");
  if (hintBox && !hintBox.dataset.locked) {
    hintBox.textContent = "Подсказка появится здесь.";
  }
}

function runAction(handler) {
  GameData.tickLives();
  if (GameData.state.lives <= 0) {
    alert(`Нет жизней. Следующая через ${AIEngine.getLifeCountdownText()}.`);
    updateUI();
    return;
  }

  const result = handler();
  if (!result.ok) {
    if (result.reason === "points") alert("Недостаточно очков.");
    if (result.reason === "lives") alert(`Нет жизней. Следующая через ${AIEngine.getLifeCountdownText()}.`);
    updateUI();
    return;
  }

  const message = document.querySelector("#gameMessage");
  if (message) message.textContent = result.message;
  updateUI();
}

function bindCommon() {
  document.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => {
      window.location.href = btn.dataset.nav;
    });
  });

  document.querySelectorAll("[data-suspect]").forEach(btn => {
    btn.addEventListener("click", () => {
      GameData.state.activeSuspect = btn.dataset.suspect;
      GameData.save();
      updateUI();
    });
  });

  const clueBtn = document.querySelector("[data-action='clue']");
  if (clueBtn) clueBtn.addEventListener("click", () => runAction(() => AIEngine.addClue()));

  const questionBtn = document.querySelector("[data-action='question']");
  if (questionBtn) questionBtn.addEventListener("click", () => runAction(() => AIEngine.successfulQuestion()));

  const hypothesisBtn = document.querySelector("[data-action='hypothesis']");
  if (hypothesisBtn) hypothesisBtn.addEventListener("click", () => runAction(() => AIEngine.correctHypothesis()));

  const verdictBtn = document.querySelector("[data-action='verdict']");
  if (verdictBtn) verdictBtn.addEventListener("click", () => runAction(() => AIEngine.correctVerdict()));

  const softHintBtn = document.querySelector("[data-action='softHint']");
  if (softHintBtn) softHintBtn.addEventListener("click", () => runAction(() => {
    const r = AIEngine.requestSoftHint();
    if (r.ok) {
      const box = document.querySelector("#hintBox");
      if (box) box.textContent = r.message;
      return r;
    }
    return r;
  }));

  const hardHintBtn = document.querySelector("[data-action='hardHint']");
  if (hardHintBtn) hardHintBtn.addEventListener("click", () => runAction(() => {
    const r = AIEngine.requestHardHint();
    if (r.ok) {
      const box = document.querySelector("#hintBox");
      if (box) box.textContent = r.message;
      return r;
    }
    return r;
  }));

  const saveProgressBtn = document.querySelector("[data-action='saveProgress']");
  if (saveProgressBtn) saveProgressBtn.addEventListener("click", () => {
    const input = document.querySelector("#progressInput");
    if (!input) return;
    const value = AIEngine.setProgress(input.value);
    const message = document.querySelector("#gameMessage");
    if (message) message.textContent = `Прогресс установлен: ${value}%`;
    updateUI();
  });

  const resetBtn = document.querySelector("[data-reset]");
  if (resetBtn) resetBtn.addEventListener("click", () => {
    if (!confirm("Сбросить сохранение?")) return;
    GameData.reset();
    updateUI();
    location.reload();
  });

  setInterval(() => {
    GameData.tickLives();
    updateUI();
  }, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  bindCommon();
  updateUI();
});
