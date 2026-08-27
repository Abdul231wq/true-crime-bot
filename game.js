const Game = {
    tg: window.Telegram?.WebApp || null,

    state: {
        playerName: localStorage.getItem("det_name") || "",
        level: Number(localStorage.getItem("det_level")) || 1,
        lives: Number(localStorage.getItem("det_lives")) || 5,
        hints: Number(localStorage.getItem("det_hints")),
        hintsInitialized: localStorage.getItem("det_hints_initialized") === "true",
        currentCase: null,
        currentSuspect: null,
        currentSuspectIndex: null,
        questionsLeft: 8,
        soundEnabled: localStorage.getItem("det_sound") !== "off",
        lastLifeRegen: Number(localStorage.getItem("det_last_life_regen")) || Date.now(),
        lifeRegenTimer: null
    },

    audio: { context: null },
    cases: [],

    init: function() {
        this.cases = this.createCases();

        if (!this.state.hintsInitialized || !Number.isFinite(this.state.hints)) {
            this.state.hints = 5;
            this.state.hintsInitialized = true;
            this.save();
        }

        this.applyLifeRegen();

        if (this.state.lifeRegenTimer) {
            clearInterval(this.state.lifeRegenTimer);
        }

        this.state.lifeRegenTimer = setInterval(() => {
            const before = this.state.lives;
            this.applyLifeRegen();
            if (this.state.lives !== before) {
                this.updateHeader();
            }
        }, 30000);

        if (this.tg) {
            try {
                this.tg.ready();
                this.tg.expand();
                if (this.tg.BackButton) {
                    this.tg.BackButton.hide();
                }
            } catch (error) {}
        }

        const nameInput = document.getElementById("player-name-input");
        if (nameInput && this.state.playerName) {
            nameInput.value = this.state.playerName;
        }

        this.updateHeader();
        this.updateSoundButton();
        this.openScreen("screen-start");

        document.addEventListener("keydown", (event) => {
            if (event.key === "Enter" && document.activeElement?.id === "user-question") {
                this.askQuestion();
            }
        });
    },

    getMaxLives: function() {
        return 5;
    },

    getRegenMs: function() {
        return 60 * 60 * 1000;
    },

    applyLifeRegen: function() {
        const now = Date.now();

        if (!this.state.lastLifeRegen) {
            this.state.lastLifeRegen = now;
        }

        if (this.state.lives >= this.getMaxLives()) {
            this.state.lastLifeRegen = now;
            this.save();
            return;
        }

        const elapsed = now - this.state.lastLifeRegen;
        if (elapsed < this.getRegenMs()) {
            return;
        }

        const gained = Math.floor(elapsed / this.getRegenMs());
        const newLives = Math.min(this.getMaxLives(), this.state.lives + gained);
        const added = newLives - this.state.lives;

        this.state.lives = newLives;
        this.state.lastLifeRegen += added * this.getRegenMs();

        this.save();
        this.updateHeader();
    },

    canPlay: function() {
        this.applyLifeRegen();
        return this.state.lives > 0;
    },

    createCases: function() {
        const cases = [];

        const locations = [
            "закрытом особняке","старом отеле","частной клинике","загородной вилле","городском музее",
            "ночном поезде","портовом складе","старом театре","исследовательской лаборатории","заброшенной станции",
            "ювелирной мастерской","частном самолёте","реставрационной мастерской","подземном архиве","дорогом ресторане",
            "судебном архиве","закрытом казино","старой обсерватории","телевизионной студии","загородной обсерватории"
        ];

        const victims = [
            "владелец галереи","известный журналист","директор компании","политический консультант","археолог",
            "финансовый аналитик","музыкант","инженер","коллекционер","бывший следователь","судебный эксперт",
            "директор музея","владелец казино","врач-кардиолог","изобретатель","кинопродюсер","адвокат",
            "архивариус","владелец отеля","профессор криминалистики"
        ];

        const methods = [
            "отравлен редким составом","найден с огнестрельным ранением","погиб от удара тяжёлым предметом",
            "исчез при странных обстоятельствах","стал жертвой подстроенного несчастного случая",
            "был найден без сознания в запертой комнате","погиб после подделки медицинских документов",
            "исчез во время отключения электричества","был найден в служебном помещении","погиб во время закрытого мероприятия"
        ];

        const firstNames = [
            "Алексей","Марина","Виктор","Елена","Артур","София","Даниил","Ирина","Максим","Наталья",
            "Роман","Ольга","Михаил","Валерия","Кирилл","Анна","Павел","Лидия","Степан","Ксения"
        ];
            const roles = [
            "Бизнес-партнёр","Ассистент","Охранник","Проводник","Коллега","Родственник","Журналист","Врач","Сосед","Юрист",
            "Водитель","Куратор","Техник","Финансовый директор","Бывший супруг","Секретарь","Эксперт","Арендатор","Сотрудник службы безопасности","Конкурент"
        ];

        const motives = [
            "долг","ревность","шантаж","наследство","месть","страх разоблачения","кража документов","финансовый конфликт","профессиональная конкуренция","тайная связь"
        ];

        const images = [
            "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1000&q=80",
            "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1000&q=80",
            "https://images.unsplash.com/photo-1564078516393-cf04bd966897?w=1000&q=80",
            "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1000&q=80",
            "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=1000&q=80"
        ];

        const suspectPhotos = [
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80",
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80",
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&q=80",
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80"
        ];

        for (let i = 1; i <= 100; i++) {
            const location = locations[(i - 1) % locations.length];
            const victim = victims[(i * 3) % victims.length];
            const method = methods[(i * 7) % methods.length];
            const motive = motives[(i * 5) % motives.length];
            const guiltyIndex = i % 4;
            const suspects = [];

            for (let j = 0; j < 4; j++) {
                const isGuilty = j === guiltyIndex;
                suspects.push({
                    name: firstNames[(i * 3 + j * 5) % firstNames.length],
                    role: roles[(i * 7 + j * 3) % roles.length],
                    photo: suspectPhotos[(i + j) % suspectPhotos.length],
                    guilty: isGuilty,
                    suspicion: isGuilty ? 38 + ((i * 7 + j * 11) % 24) : 8 + ((i * 13 + j * 9) % 35),
                    motive: isGuilty ? motive : motives[(i + j + 3) % motives.length],
                    alibi: isGuilty
                        ? "В его алиби есть временной промежуток, который никто не может подтвердить."
                        : "Алиби подтверждается независимым свидетелем и журналом посещений.",
                    relation: isGuilty
                        ? "С жертвой его связывал скрытый конфликт."
                        : "Связь с жертвой была формальной и не указывает на преступление.",
                    clueReaction: isGuilty
                        ? "Он начинает нервничать и пытается перевести разговор на другую тему."
                        : "Он спокойно объясняет происхождение этой улики.",
                    evidence: isGuilty
                        ? "Его отпечатки нашли на предмете, который должен был быть недоступен посторонним."
                        : "Найденная улика не совпадает с его маршрутом и временем пребывания."
                });
            }

            cases.push({
                id: i,
                title: `Дело №${i}: Тайна ${location}`,
                image: images[(i - 1) % images.length],
                description: `В ${location} ${victim} ${method}. Показания свидетелей расходятся, а записи камер имеют подозрительный пробел.`,
                difficulty: i <= 20 ? "Средняя" : i <= 50 ? "Высокая" : i <= 75 ? "Очень высокая" : "Экспертная",
                clues: [
                    `Улика №${100 + i}: след неизвестного вещества на поверхности.`,
                    "Камера наблюдения отключалась ровно на 11 минут.",
                    "В журнале доступа есть исправленная запись.",
                    "Один из свидетелей скрыл часть информации.",
                    `Возможный мотив связан с темой: ${motive}.`,
                    "На одном из предметов обнаружен частично стёртый отпечаток."
                ],
                suspects: suspects,
                hint: `Сравните алиби всех четырёх подозреваемых. Особенно внимательно проверьте временной промежуток, мотив «${motive}» и доступ к месту преступления.`
            });
        }

        return cases;
    },

    save: function() {
        localStorage.setItem("det_name", this.state.playerName);
        localStorage.setItem("det_level", String(this.state.level));
        localStorage.setItem("det_lives", String(this.state.lives));
        localStorage.setItem("det_hints", String(this.state.hints));
        localStorage.setItem("det_hints_initialized", String(this.state.hintsInitialized));
        localStorage.setItem("det_sound", this.state.soundEnabled ? "on" : "off");
        localStorage.setItem("det_last_life_regen", String(this.state.lastLifeRegen));
    },

    updateHeader: function() {
        const player = document.getElementById("player-display");
        const lives = document.getElementById("lives-count");
        const level = document.getElementById("level-count");
        const hints = document.getElementById("hints-count");
        const caseHints = document.getElementById("case-hints-count");

        if (player) player.textContent = this.state.playerName || "Детектив";
        if (lives) lives.textContent = `${this.state.lives}/5`;
        if (level) level.textContent = this.state.level;
        if (hints) hints.textContent = this.state.hints;
        if (caseHints) caseHints.textContent = this.state.hints;
    },

    openScreen: function(screenId) {
        document.querySelectorAll(".screen").forEach((screen) => {
            screen.classList.add("hidden");
        });

        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.remove("hidden");
            window.scrollTo(0, 0);
        }

        this.tap("light");
        this.playSound("click");
    },

    start: function() {
        if (!this.canPlay()) {
            this.openScreen("screen-result");
            const icon = document.getElementById("result-icon");
            const title = document.getElementById("result-title");
            const text = document.getElementById("result-text");
            if (icon) icon.textContent = "⏳";
            if (title) title.textContent = "Жизни закончились";
            if (text) text.textContent = "Одна жизнь восстанавливается каждый час.";
            return;
        }

        const input = document.getElementById("player-name-input");
        const name = input?.value.trim();
        this.state.playerName = name || "Детектив";

        this.initAudio();
        this.playSound("start");

        const header = document.getElementById("header");
        if (header) header.classList.remove("hidden");

        this.save();
        this.updateHeader();
        this.loadCase();
    },

    loadCase: function() {
        this.applyLifeRegen();

        if (this.state.lives <= 0) {
            this.openScreen("screen-result");
            const icon = document.getElementById("result-icon");
            const title = document.getElementById("result-title");
            const text = document.getElementById("result-text");
            if (icon) icon.textContent = "⏳";
            if (title) title.textContent = "Жизни закончились";
            if (text) text.textContent = "Одна жизнь восстанавливается каждый час.";
            return;
        }

        const index = (this.state.level - 1) % this.cases.length;
        const sourceCase = this.cases[index];
        this.state.currentCase = JSON.parse(JSON.stringify(sourceCase));
        this.state.currentSuspect = null;
        this.state.currentSuspectIndex = null;
        this.state.questionsLeft = this.getQuestionLimit();

        this.renderCase();
        this.updateHeader();
        this.openScreen("screen-case");
    },

    getQuestionLimit: function() {
        if (this.state.level >= 76) return 5;
        if (this.state.level >= 51) return 6;
        if (this.state.level >= 21) return 7;
        return 8;
    },

    renderCase: function() {
        const currentCase = this.state.currentCase;
        if (!currentCase) return;

        const image = document.getElementById("case-img");
        const title = document.getElementById("case-title");
        const description = document.getElementById("case-desc");
        const questions = document.getElementById("questions-left-badge");
        const difficulty = document.getElementById("case-difficulty");

        if (image) image.src = currentCase.image;
        if (title) title.textContent = currentCase.title;
        if (description) description.textContent = currentCase.description;
        if (questions) questions.textContent = `${this.state.questionsLeft}/${this.getQuestionLimit()}`;
        if (difficulty) difficulty.textContent = `Сложность: ${currentCase.difficulty}`;

        this.renderClues();
        this.renderSuspects();
        this.renderVerdict();
    },
    renderClues: function() {
        const container = document.getElementById("clues-container");
        if (!container || !this.state.currentCase) return;
        container.innerHTML = "";
        this.state.currentCase.clues.forEach((clue, index) => {
            const item = document.createElement("div");
            item.className = "list-item";
            item.innerHTML = `<span class="list-number">${index + 1}</span><span>${this.escapeHTML(clue)}</span>`;
            container.appendChild(item);
        });
    },

    renderSuspects: function() {
        const container = document.getElementById("suspects-container");
        if (!container || !this.state.currentCase) return;
        container.innerHTML = "";
        this.state.currentCase.suspects.forEach((suspect, index) => {
            const button = document.createElement("button");
            button.className = "suspect-card";
            button.type = "button";
            button.innerHTML = `
                <img src="${suspect.photo}" alt="">
                <span class="suspect-card-info">
                    <strong>${this.escapeHTML(suspect.name)}</strong>
                    <small>${this.escapeHTML(suspect.role)}</small>
                </span>
                <span class="suspect-card-arrow">›</span>
            `;
            button.addEventListener("click", () => this.openInterrogation(index));
            container.appendChild(button);
        });
    },

    renderVerdict: function() {
        const container = document.getElementById("verdict-container");
        if (!container || !this.state.currentCase) return;
        container.innerHTML = "";
        this.state.currentCase.suspects.forEach((suspect, index) => {
            const button = document.createElement("button");
            button.className = "verdict-card";
            button.type = "button";
            button.textContent = `⚖️ Обвинить: ${suspect.name}`;
            button.addEventListener("click", () => this.makeVerdict(index));
            container.appendChild(button);
        });
    },

    openInterrogation: function(index) {
        const suspect = this.state.currentCase?.suspects[index];
        if (!suspect) return;

        this.state.currentSuspect = suspect;
        this.state.currentSuspectIndex = index;

        const photo = document.getElementById("suspect-photo");
        const name = document.getElementById("suspect-name");
        const role = document.getElementById("suspect-role");
        const chat = document.getElementById("chat-box");

        if (photo) photo.src = suspect.photo;
        if (name) name.textContent = suspect.name;
        if (role) role.textContent = suspect.role;

        if (chat) {
            chat.innerHTML = "";
            this.addMessage("sus", `Допрос начат. У вас осталось ${this.state.questionsLeft} вопросов.`);
        }

        this.updateSuspicion(suspect.suspicion);
        this.openScreen("screen-interrogation");
    },

    updateSuspicion: function(value) {
        const suspicion = Math.max(0, Math.min(100, Number(value) || 0));
        if (this.state.currentSuspect) this.state.currentSuspect.suspicion = suspicion;

        const valueElement = document.getElementById("suspicion-value");
        const fillElement = document.getElementById("suspicion-fill");

        if (valueElement) valueElement.textContent = `${suspicion}%`;
        if (fillElement) {
            fillElement.style.width = `${suspicion}%`;
            fillElement.style.background = suspicion >= 75
                ? "linear-gradient(90deg, #d29922, #f85149)"
                : suspicion >= 45
                    ? "linear-gradient(90deg, #2ea043, #d29922)"
                    : "#2ea043";
        }
    },

    addSuspicion: function(amount) {
        if (!this.state.currentSuspect) return;
        const current = this.state.currentSuspect.suspicion || 0;
        this.updateSuspicion(current + amount);
    },

    quickAsk: function(type) {
        const questions = {
            alibi: "Где вы были во время преступления?",
            motive: "Какой у вас был мотив?",
            clue: "Что вы знаете об этой улике?",
            relation: "Какие у вас были отношения с жертвой?"
        };

        const input = document.getElementById("user-question");
        if (input) input.value = questions[type] || "";
        this.askQuestion(type);
    },

    askQuestion: function(type = null) {
        const input = document.getElementById("user-question");
        const question = input?.value.trim();
        if (!question && !type) return;

        if (this.state.questionsLeft <= 0) {
            this.addMessage("sus", "Вопросы закончились. Теперь нужно принять решение.");
            this.playSound("warning");
            this.notify("warning");
            return;
        }

        const questionType = type || this.detectQuestionType(question);
        const suspect = this.state.currentSuspect;

        this.addMessage("det", question || this.questionText(questionType));
        this.state.questionsLeft -= 1;

        const badge = document.getElementById("questions-left-badge");
        if (badge) badge.textContent = `${this.state.questionsLeft}/${this.getQuestionLimit()}`;
        if (input) input.value = "";

        const amount = suspect?.guilty ? 14 : 5;
        this.addSuspicion(amount);

        setTimeout(() => {
            const answer = this.getSuspectAnswer(questionType, suspect);
            this.addMessage("sus", answer);
            this.playSound("message");
        }, 260);

        this.playSound("question");
        this.tap("medium");
    },

    getSuspectAnswer: function(type, suspect) {
        if (!suspect) return AIEngine.getAnswer(type, null);
        if (type === "alibi") return suspect.alibi;
        if (type === "motive") return `Мой возможный мотив — ${suspect.motive}. Но это не означает, что я виновен.`;
        if (type === "relation") return suspect.relation;
        if (type === "clue") return `${suspect.clueReaction} ${suspect.evidence}`;
        return AIEngine.getAnswer(type, suspect);
    },

    detectQuestionType: function(question) {
        const text = String(question || "").toLowerCase();
        if (text.includes("где") || text.includes("алиби") || text.includes("находил")) return "alibi";
        if (text.includes("зачем") || text.includes("мотив") || text.includes("почему")) return "motive";
        if (text.includes("улика") || text.includes("бокал") || text.includes("ключ") || text.includes("записк") || text.includes("камера") || text.includes("отпечат")) return "clue";
        if (text.includes("жертв") || text.includes("отношен") || text.includes("знаком")) return "relation";
        return "default";
    },
            questionText: function(type) {
        const texts = {
            alibi: "Где вы были во время преступления?",
            motive: "Какой у вас был мотив?",
            clue: "Что вы знаете об этой улице?",
            relation: "Какие у вас были отношения с жертвой?",
            default: "Что вы можете рассказать?"
        };
        return texts[type] || texts.default;
    },

    addMessage: function(type, text) {
        const chat = document.getElementById("chat-box");
        if (!chat) return;
        const message = document.createElement("div");
        message.className = `message ${type}`;
        message.textContent = text;
        chat.appendChild(message);
        chat.scrollTop = chat.scrollHeight;
    },

    buyHint: function() {
        if (this.state.hints <= 0) {
            this.addMessage("sus", "Бесплатные подсказки закончились.");
            this.playSound("warning");
            this.notify("warning");
            return;
        }

        const hint = this.state.currentCase?.hint;
        if (!hint) return;

        this.state.hints -= 1;
        this.save();
        this.updateHeader();
        this.addMessage("sus", `💡 Анализ ИИ: ${hint}`);
        this.playSound("hint");
        this.notify("success");
    },

    makeVerdict: function(index) {
        const suspects = this.state.currentCase?.suspects || [];
        const selected = suspects[index];
        if (!selected) return;

        if (selected.guilty) {
            const oldLevel = this.state.level;
            this.state.level += 1;

            let reward = 0;
            if (this.state.level % 10 === 0 && this.state.level !== oldLevel) {
                this.state.hints += 1;
                reward = 1;
            }

            this.save();
            this.updateHeader();
            this.showResult(true, selected.name, reward);
            this.playSound("success");
            this.notify("success");
        } else {
            this.state.lives -= 1;
            if (this.state.lives < 0) this.state.lives = 0;
            this.save();
            this.updateHeader();
            this.showResult(false, selected.name, 0);
            this.playSound("error");
            this.notify("error");

            if (this.state.lives <= 0) {
                this.state.lives = 0;
                this.save();
                this.updateHeader();
                this.openScreen("screen-result");
                return;
            }
        }
    },

    showResult: function(success, selectedName, reward) {
        const icon = document.getElementById("result-icon");
        const title = document.getElementById("result-title");
        const text = document.getElementById("result-text");
        const player = document.getElementById("result-player");
        const level = document.getElementById("result-level");
        const lives = document.getElementById("result-lives");

        if (icon) icon.textContent = success ? "🎯" : "❌";
        if (title) title.textContent = success ? "Дело раскрыто" : "Ошибка обвинения";

        if (text) {
            if (success && reward > 0) {
                text.textContent = `Вы правильно определили преступника: ${selectedName}. Награда за уровень ${this.state.level}: +${reward} бесплатная подсказка.`;
            } else if (success) {
                text.textContent = `Вы правильно определили преступника: ${selectedName}.`;
            } else {
                text.textContent = `Вы обвинили ${selectedName}, но это был неправильный выбор.`;
            }
        }

        if (player) player.textContent = this.state.playerName;
        if (level) level.textContent = this.state.level;
        if (lives) lives.textContent = `${this.state.lives}/5`;

        this.openScreen("screen-result");
    },

    initAudio: function() {
        if (!this.state.soundEnabled) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            if (!this.audio.context) this.audio.context = new AudioContext();
            if (this.audio.context.state === "suspended") this.audio.context.resume();
        } catch (error) {}
    },

    playSound: function(type) {
        if (!this.state.soundEnabled) return;

        try {
            this.initAudio();
            const context = this.audio.context;
            if (!context) return;

            const sounds = {
                click: { frequency: 430, duration: 0.04, volume: 0.035, wave: "sine" },
                start: { frequency: 560, duration: 0.14, volume: 0.06, wave: "sine" },
                question: { frequency: 250, duration: 0.07, volume: 0.045, wave: "triangle" },
                message: { frequency: 640, duration: 0.06, volume: 0.035, wave: "sine" },
                hint: { frequency: 760, duration: 0.18, volume: 0.07, wave: "sine" },
                success: { frequency: 820, duration: 0.22, volume: 0.08, wave: "triangle" },
                warning: { frequency: 180, duration: 0.16, volume: 0.06, wave: "sawtooth" },
                error: { frequency: 120, duration: 0.28, volume: 0.08, wave: "square" }
            };

            const sound = sounds[type] || sounds.click;
            const oscillator = context.createOscillator();
            const gain = context.createGain();

            oscillator.type = sound.wave;
            oscillator.frequency.setValueAtTime(sound.frequency, context.currentTime);
            gain.gain.setValueAtTime(0, context.currentTime);
            gain.gain.linearRampToValueAtTime(sound.volume, context.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + sound.duration);

            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start();
            oscillator.stop(context.currentTime + sound.duration + 0.02);
        } catch (error) {}
    },

    toggleSound: function() {
        this.state.soundEnabled = !this.state.soundEnabled;
        if (this.state.soundEnabled) {
            this.initAudio();
            this.playSound("success");
        }
        this.save();
        this.updateSoundButton();
    },

    updateSoundButton: function() {
        const button = document.getElementById("sound-toggle");
        if (button) {
            button.textContent = this.state.soundEnabled ? "🔊 Звук включён" : "🔇 Звук выключен";
        }
    },

    tap: function(style = "light") {
        try {
            this.tg?.HapticFeedback?.impactOccurred(style);
        } catch (error) {}
    },

    notify: function(type = "success") {
        try {
            this.tg?.HapticFeedback?.notificationOccurred(type);
        } catch (error) {}
    },

    escapeHTML: function(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
};

document.addEventListener("DOMContentLoaded", () => {
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            if (window.Telegram.WebApp.BackButton) {
                window.Telegram.WebApp.BackButton.hide();
            }
        }
    } catch (e) {}

    try {
        Game.init();
    } catch (e) {
        console.error("Game init error:", e);
    }
});
