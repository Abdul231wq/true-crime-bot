const Game = {
    tg: window.Telegram?.WebApp || null,

    state: {
        playerName: localStorage.getItem("det_name") || "",
        level: Number(localStorage.getItem("det_level")) || 1,
        lives: Number(localStorage.getItem("det_lives")) || 5,

        currentCase: null,
        currentSuspect: null,

        maxQuestions: 5,
        questionsLeft: 5
    },

    cases: [
        {
            id: 1,
            title: "Тайна закрытого особняка",
            image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1000&q=80",
            description:
                "Владелец арт-галереи найден мёртвым в кабинете. Дверь была заперта изнутри, а ключ лежал на столе.",

            clues: [
                "Записка со странным шифром «104».",
                "Вентиляционная решётка под потолком открыта.",
                "На столе обнаружены два бокала с остатками редкого вина."
            ],

            suspects: [
                {
                    name: "Виктор",
                    role: "Бизнес-партнёр",
                    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80",
                    suspicion: 20,
                    guilty: false
                },
                {
                    name: "Елена",
                    role: "Ассистентка",
                    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80",
                    suspicion: 45,
                    guilty: true
                }
            ],

            hint:
                "Проверьте, кто имел доступ к кабинету и мог заранее подготовить сцену преступления."
        },

        {
            id: 2,
            title: "Исчезновение в экспрессе",
            image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1000&q=80",
            description:
                "Из сейфа в движущемся поезде пропали секретные чертежи. Взлома не обнаружено.",

            clues: [
                "Сейф открыт без повреждений.",
                "Во время дождя было открыто окно.",
                "На металлической ручке найдены следы женской помады."
            ],

            suspects: [
                {
                    name: "Артур",
                    role: "Проводник",
                    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&q=80",
                    suspicion: 55,
                    guilty: true
                },
                {
                    name: "София",
                    role: "Пассажирка",
                    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80",
                    suspicion: 15,
                    guilty: false
                }
            ],

            hint:
                "Ищите того, кто мог открыть сейф без взлома и свободно перемещаться по вагону."
        }
    ],

    init: function() {
        if (this.tg) {
            this.tg.ready();
            this.tg.expand();

            if (this.tg.BackButton) {
                this.tg.BackButton.hide();
            }
        }

        const input = document.getElementById("player-name-input");

        if (input && this.state.playerName) {
            input.value = this.state.playerName;
        }

        this.updateHeader();
        this.openScreen("screen-start");
    },

    save: function() {
        localStorage.setItem("det_name", this.state.playerName);
        localStorage.setItem("det_level", String(this.state.level));
        localStorage.setItem("det_lives", String(this.state.lives));
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

    updateHeader: function() {
        const player = document.getElementById("player-display");
        const lives = document.getElementById("lives-count");
        const level = document.getElementById("level-count");

        if (player) {
            player.textContent = this.state.playerName || "Детектив";
        }

        if (lives) {
            lives.textContent = `${this.state.lives}/5`;
        }

        if (level) {
            level.textContent = this.state.level;
        }
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
    },

    start: function() {
        const input = document.getElementById("player-name-input");
        const name = input?.value.trim();

        this.state.playerName = name || "Детектив";

        this.save();

        const header = document.getElementById("header");

        if (header) {
            header.classList.remove("hidden");
        }

        this.updateHeader();
        this.loadCase();
    },

    loadCase: function() {
        const index = (this.state.level - 1) % this.cases.length;
        const currentCase = this.cases[index];

        this.state.currentCase = this.cloneCase(currentCase);
        this.state.currentSuspect = null;
        this.state.questionsLeft = this.state.maxQuestions;

        this.renderCase();
        this.openScreen("screen-case");
    },

    cloneCase: function(data) {
        return JSON.parse(JSON.stringify(data));
    },

    renderCase: function() {
        const currentCase = this.state.currentCase;

        const image = document.getElementById("case-img");
        const title = document.getElementById("case-title");
        const description = document.getElementById("case-desc");
        const questions = document.getElementById("questions-left-badge");

        if (image) {
            image.src = currentCase.image;
        }

        if (title) {
            title.textContent = currentCase.title;
        }

        if (description) {
            description.textContent = currentCase.description;
        }

        if (questions) {
            questions.textContent =
                `${this.state.questionsLeft}/${this.state.maxQuestions}`;
        }

        this.renderClues();
        this.renderSuspects();
        this.renderVerdict();
    },

    renderClues: function() {
        const container = document.getElementById("clues-container");

        if (!container || !this.state.currentCase) {
            return;
        }

        container.innerHTML = "";

        this.state.currentCase.clues.forEach((clue, index) => {
            const item = document.createElement("div");

            item.className = "list-item";
            item.innerHTML = `
                <span class="list-number">${index + 1}</span>
                <span>${this.escapeHTML(clue)}</span>
            `;

            container.appendChild(item);
        });
    },

    renderSuspects: function() {
        const container = document.getElementById("suspects-container");

        if (!container || !this.state.currentCase) {
            return;
        }

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

            button.addEventListener("click", () => {
                this.openInterrogation(index);
            });

            container.appendChild(button);
        });
    },

    renderVerdict: function() {
        const container = document.getElementById("verdict-container");

        if (!container || !this.state.currentCase) {
            return;
        }

        container.innerHTML = "";

        this.state.currentCase.suspects.forEach((suspect, index) => {
            const button = document.createElement("button");

            button.className = "verdict-card";
            button.type = "button";
            button.textContent = `⚖️ Обвинить: ${suspect.name}`;

            button.addEventListener("click", () => {
                this.makeVerdict(index);
            });

            container.appendChild(button);
        });
    },

    openInterrogation: function(index) {
        const suspect = this.state.currentCase?.suspects[index];

        if (!suspect) {
            return;
        }

        this.state.currentSuspect = suspect;

        const photo = document.getElementById("suspect-photo");
        const name = document.getElementById("suspect-name");
        const role = document.getElementById("suspect-role");
        const chat = document.getElementById("chat-box");

        if (photo) {
            photo.src = suspect.photo;
        }

        if (name) {
            name.textContent = suspect.name;
        }

        if (role) {
            role.textContent = suspect.role;
        }

        if (chat) {
            chat.innerHTML = "";
            this.addMessage(
                "sus",
                `Вы хотите поговорить? Спрашивайте, детектив ${this.state.playerName}.`
            );
        }

        this.updateSuspicion(suspect.suspicion);
        this.openScreen("screen-interrogation");
    },

    updateSuspicion: function(value) {
        const suspicion = Math.max(0, Math.min(100, Number(value) || 0));

        if (this.state.currentSuspect) {
            this.state.currentSuspect.suspicion = suspicion;
        }

        const valueElement = document.getElementById("suspicion-value");
        const fillElement = document.getElementById("suspicion-fill");

        if (valueElement) {
            valueElement.textContent = `${suspicion}%`;
        }

        if (fillElement) {
            fillElement.style.width = `${suspicion}%`;

            if (suspicion >= 70) {
                fillElement.style.background =
                    "linear-gradient(90deg, #d29922, #f85149)";
            } else if (suspicion >= 40) {
                fillElement.style.background =
                    "linear-gradient(90deg, #2ea043, #d29922)";
            } else {
                fillElement.style.background = "#2ea043";
            }
        }
    },

    addSuspicion: function(amount) {
        if (!this.state.currentSuspect) {
            return;
        }

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

        if (input) {
            input.value = questions[type] || "";
        }

        this.askQuestion(type);
    },

    askQuestion: function(type = null) {
        const input = document.getElementById("user-question");
        const question = input?.value.trim();

        if (!question && !type) {
            return;
        }

        if (this.state.questionsLeft <= 0) {
            this.addMessage("sus", "Я больше не буду отвечать на вопросы.");
            this.notify("warning");
            return;
        }

        const questionType = type || this.detectQuestionType(question);
        const suspect = this.state.currentSuspect;

        this.addMessage("det", question || this.questionText(questionType));

        this.state.questionsLeft -= 1;

        const badge = document.getElementById("questions-left-badge");

        if (badge) {
            badge.textContent =
                `${this.state.questionsLeft}/${this.state.maxQuestions}`;
        }

        if (input) {
            input.value = "";
        }

        const increase = suspect?.guilty ? 12 : 7;
        this.addSuspicion(increase);

        setTimeout(() => {
            const answer = AIEngine.getAnswer(
                questionType,
                suspect,
                question
            );

            this.addMessage("sus", answer);
        }, 220);

        this.tap("medium");
    },

    detectQuestionType: function(question) {
        const text = String(question || "").toLowerCase();

        if (
            text.includes("где") ||
            text.includes("алиби") ||
            text.includes("находил")
        ) {
            return "alibi";
        }

        if (
            text.includes("зачем") ||
            text.includes("мотив") ||
            text.includes("почему")
        ) {
            return "motive";
        }

        if (
            text.includes("улика") ||
            text.includes("бокал") ||
            text.includes("ключ") ||
            text.includes("записк")
        ) {
            return "clue";
        }

        if (
            text.includes("жертв") ||
            text.includes("отношен") ||
            text.includes("знаком")
        ) {
            return "relation";
        }

        return "default";
    },

    questionText: function(type) {
        const texts = {
            alibi: "Где вы были во время преступления?",
            motive: "Какой у вас был мотив?",
            clue: "Что вы знаете об этой улике?",
            relation: "Какие у вас были отношения с жертвой?",
            default: "Что вы можете рассказать?"
        };

        return texts[type] || texts.default;
    },

    addMessage: function(type, text) {
        const chat = document.getElementById("chat-box");

        if (!chat) {
            return;
        }

        const message = document.createElement("div");

        message.className = `message ${type}`;
        message.textContent = text;

        chat.appendChild(message);
        chat.scrollTop = chat.scrollHeight;
    },

    buyHint: function() {
        const hint = this.state.currentCase?.hint;

        if (!hint) {
            return;
        }

        this.addMessage("sus", `💡 Анализ ИИ: ${hint}`);
        this.addSuspicion(4);
        this.notify("success");
    },

    makeVerdict: function(index) {
        const suspects = this.state.currentCase?.suspects || [];
        const selected = suspects[index];

        if (!selected) {
            return;
        }

        if (selected.guilty) {
            this.state.level += 1;
            this.save();
            this.updateHeader();
            this.showResult(true, selected.name);
            this.notify("success");
        } else {
            this.state.lives -= 1;

            if (this.state.lives <= 0) {
                this.state.lives = 0;
                this.save();
                this.updateHeader();
                this.showResult(false, selected.name);
                this.notify("error");
                return;
            }

            this.save();
            this.updateHeader();
            this.showResult(false, selected.name);
            this.notify("warning");
        }
    },

    showResult: function(success, selectedName) {
        const icon = document.getElementById("result-icon");
        const title = document.getElementById("result-title");
        const text = document.getElementById("result-text");
        const player = document.getElementById("result-player");
        const level = document.getElementById("result-level");
        const lives = document.getElementById("result-lives");

        if (success) {
            if (icon) icon.textContent = "🎯";
            if (title) title.textContent = "Дело раскрыто";
            if (text) {
                text.textContent =
                    `Вы правильно определили преступника: ${selectedName}.`;
            }
        } else {
            if (icon) icon.textContent = "❌";
            if (title) title.textContent = "Ошибка обвинения";
            if (text) {
                text.textContent =
                    `Вы обвинили ${selectedName}, но доказательств недостаточно.`;
            }
        }

        if (player) player.textContent = this.state.playerName;
        if (level) level.textContent = this.state.level;
        if (lives) lives.textContent = `${this.state.lives}/5`;

        this.openScreen("screen-result");
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
    Game.init();
});
