function selectedSuspectName(id) {
  if (id === "suspect-b") return "Марина Логинова";
  if (id === "suspect-c") return "Игорь Белый";
  return "Алексей Морозов";
}

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
    const hour = 60 * 60 * 1000;
    const left = Math.max(0, hour - (Date.now() - GameData.state.lastLifeAt));
    const mm = String(Math.floor(left / 60000)).padStart(2, "0");
    const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
    lifeText.textContent = s.lives > 0
      ? `Жизней: ${s.lives}`
      : `Жизнь появится через ${mm}:${ss}`;
  }

  const historyBox = document.querySelector("[data-hint-history]");
  if (historyBox) {
    historyBox.innerHTML = "";
    if (s.hintHistory.length === 0) {
      const div = document.createElement("div");
      div.className = "history-item";
      div.textContent = "История подсказок пуста.";
      historyBox.appendChild(div);
    } else {
      s.hintHistory.forEach(item => {
        const div = document.createElement("div");
        div.className = "history-item";
        div.textContent = item;
        historyBox.appendChild(div);
      });
    }
  }

  const susText = document.querySelector("#selectedSuspectText");
  if (susText) susText.textContent = selectedSuspectName(s.activeSuspect);

  document.querySelectorAll("[data-suspect]").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.suspect === s.activeSuspect);
  });
}

function requireLife(action) {
  GameData.tickLives();
  if (GameData.state.lives <= 0) {
    alert("Нет жизней. Жди следующую жизнь.");
    updateUI();
    return;
  }
  const ok = GameData.spendLife();
  if (!ok) {
    alert("Нет жизней. Жди следующую жизнь.");
    updateUI();
    return;
  }
  action();
  updateUI();
}

document.addEventListener("DOMContentLoaded", () => {
  updateUI();

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
  if (clueBtn) clueBtn.addEventListener("click", () => requireLife(() => {
    GameData.state.points += 2;
    GameData.state.progress = Math.min(100, GameData.state.progress + 10);
    GameData.save();
    alert("Улика найдена.");
  }));

  const questionBtn = document.querySelector("[data-action='question']");
  if (questionBtn) questionBtn.addEventListener("click", () => requireLife(() => {
    GameData.state.points += 3;
    GameData.state.progress = Math.min(100, GameData.state.progress + 10);
    GameData.save();
    alert("Допрос успешен.");
  }));

  const hypothesisBtn = document.querySelector("[data-action='hypothesis']");
  if (hypothesisBtn) hypothesisBtn.addEventListener("click", () => requireLife(() => {
    GameData.state.points += 4;
    GameData.state.progress = Math.min(100, GameData.state.progress + 15);
    GameData.save();
    alert("Гипотеза подтверждена.");
  }));

  const verdictBtn = document.querySelector("[data-action='verdict']");
  if (verdictBtn) verdictBtn.addEventListener("click", () => requireLife(() => {
    GameData.state.points += 10;
    GameData.state.progress = 100;
    GameData.save();
    alert("Вердикт вынесен.");
  }));

  const softHintBtn = document.querySelector("[data-action='softHint']");
  if (softHintBtn) softHintBtn.addEventListener("click", () => requireLife(() => {
    GameData.state.points -= 5;
    GameData.addHint("Мягкая подсказка: проверь алиби и время звонка.");
    alert("Подсказка добавлена.");
  }));

  const hardHintBtn = document.querySelector("[data-action='hardHint']");
  if (hardHintBtn) hardHintBtn.addEventListener("click", () => requireLife(() => {
    GameData.state.points -= 15;
    GameData.addHint("Жёсткая подсказка: главный подозреваемый врёт о времени.");
    alert("Подсказка добавлена.");
  }));

  const saveProgressBtn = document.querySelector("[data-action='saveProgress']");
  if (saveProgressBtn) saveProgressBtn.addEventListener("click", () => {
    const input = document.querySelector("#progressInput");
    const value = Math.max(0, Math.min(100, Number(input.value) || 0));
    GameData.state.progress = value;
    GameData.save();
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
});
