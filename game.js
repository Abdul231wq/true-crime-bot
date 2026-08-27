const Game = {
    tg: window.Telegram?.WebApp || null,

    state: {
        playerName: localStorage.getItem("det_name") || "",
        level: Number(localStorage.getItem("det_level")) || 1,
        lives: Number(localStorage.getItem("det_lives")) || 5,

        hints: Number(localStorage.getItem("det_hints")),
        hintsInitialized:
            localStorage.getItem("det_hints_initialized") === "true",

        currentCase: null,
        currentSuspect: null,
        currentSuspectIndex: null,

        questionsLeft: 8,
        soundEnabled:
            localStorage.getItem("det_sound") !== "off"
    },

    audio: {
        context: null
    },

    cases: [],

    init: function() {
        this.cases = this.createCases();

        if (
            !this.state.hintsInitialized ||
            !Number.isFinite(this.state.hints)
        ) {
            this.state.hints = 5;
            this.state.hintsInitialized = true;
            this.save();
        }

        if (this.tg) {
            try {
                this.tg.ready();
                this.tg.expand();

                if (this.tg.BackButton) {
                    this.tg.BackButton.hide();
                }
            } catch (error) {}
        }

        const nameInput =
            document.getElementById("player-name-input");

        if (nameInput && this.state.playerName) {
            nameInput.value = this.state.playerName;
        }

        this.updateHeader();
        this.updateSoundButton();
        this.openScreen("screen-start");

        document.addEventListener("keydown", (event) => {
            if (
                event.key === "Enter" &&
                document.activeElement?.id === "user-question"
            ) {
                this.askQuestion();
            }
        });
    },

    createCases: function() {
        const cases = [];

        const locations = [
            "закрытом особняке",
            "старом отеле",
            "частной клинике",
            "загородной вилле",
            "городском музее",
            "ночном поезде",
            "портовом складе",
            "старом театре",
            "исследовательской лаборатории",
            "заброшенной станции",
            "ювелирной мастерской",
            "частном самолёте",
            "реставрационной мастерской",
            "подземном архиве",
            "дорогом ресторане",
            "судебном архиве",
            "закрытом казино",
            "старой обсерватории",
            "телевизионной студии",
            "загородной обсерватории"
        ];

        const victims = [
            "владелец галереи",
            "известный журналист",
            "директор компании",
            "политический консультант",
            "археолог",
            "финансовый аналитик",
            "музыкант",
            "инженер",
            "коллекционер",
            "бывший следователь",
            "судебный эксперт",
            "директор музея",
            "владелец казино",
            "врач-кардиолог",
            "изобретатель",
            "кинопродюсер",
            "адвокат",
            "архивариус",
            "владелец отеля",
            "профессор криминалистики"
        ];

        const methods = [
            "отравлен редким составом",
            "найден с огнестрельным ранением",
            "погиб от удара тяжёлым предметом",
            "исчез при странных обстоятельствах",
            "стал жертвой подстроенного несчастного случая",
            "был найден без сознания в запертой комнате",
            "погиб после подделки медицинских документов",
            "исчез во время отключения электричества",
            "был найден в служебном помещении",
            "погиб во время закрытого мероприятия"
        ];

        const firstNames = [
            "Алексей",
            "Марина",
            "Виктор",
            "Елена",
            "Артур",
            "София",
            "Даниил",
            "Ирина",
            "Максим",
            "Наталья",
            "Роман",
            "Ольга",
            "Михаил",
            "Валерия",
            "Кирилл",
            "Анна",
            "Павел",
            "Лидия",
            "Степан",
            "Ксения"
        ];

        const roles = [
            "Бизнес-партнёр",
            "Ассистент",
            "Охранник",
            "Проводник",
            "Коллега",
            "Родственник",
            "Журналист",
            "Врач",
            "Сосед",
            "Юрист",
            "Водитель",
            "Куратор",
            "Техник",
            "Финансовый директор",
            "Бывший супруг",
            "Секретарь",
            "Эксперт",
            "Арендатор",
            "Сотрудник службы безопасности",
            "Конкурент"
        ];

        const motives = [
            "долг",
            "ревность",
            "шантаж",
            "наследство",
            "месть",
            "страх разоблачения",
            "кража документов",
            "финансовый конфликт",
            "профессиональная конкуренция",
            "тайная связь"
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
            const location =
                locations[(i - 1) % locations.length];

            const victim =
                victims[(i * 3) % victims.length];

            const method =
                methods[(i * 7) % methods.length];

            const motive =
                motives[(i * 5) % motives.length];

            const guiltyIndex = i % 4;
            const suspects = [];

            for (let j = 0; j < 4; j++) {
                const isGuilty = j === guiltyIndex;

                const nameIndex =
                    (i * 3 + j * 5) % firstNames.length;

                const roleIndex =
                    (i * 7 + j * 3) % roles.length;

                suspects.push({
                    name: firstNames[nameIndex],
                    role: roles[roleIndex],
                    photo:
                        suspectPhotos[
                            (i + j) % suspectPhotos.length
                        ],

                    guilty: isGuilty,

                    suspicion: isGuilty
                        ? 38 + ((i * 7 + j * 11) % 24)
                        : 8 + ((i * 13 + j * 9) % 35),

                    motive: isGuilty
                        ? motive
                        : motives[(i + j + 3) % motives.length],

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

                title:
                    `Дело №${i}: Тайна ${location}`,

                image:
                    images[(i - 1) % images.length],

                description:
                    `В ${location} ${victim} ${method}. ` +
                    `Показания свидетелей расходятся, а записи камер имеют подозрительный пробел.`,

                difficulty:
                    i <= 20
                        ? "Средняя"
                        : i <= 50
                            ? "Высокая"
                            : i <= 75
                                ? "Очень высокая"
                                : "Экспертная",

                clues: [
                    `Улика №${100 + i}: след неизвестного вещества на поверхности.`,
                    "Камера наблюдения отключалась ровно на 11 минут.",
                    "В журнале доступа есть исправленная запись.",
                    "Один из свидетелей скрыл часть информации.",
                    `Возможный мотив связан с темой: ${motive}.`,
                    "На одном из предметов обнаружен частично стёртый отпечаток."
                ],

                suspects: suspects,

                hint:
                    `Сравните алиби всех четырёх подозреваемых. ` +
                    `Особенно внимательно проверьте временной промежуток, мотив «${motive}» и доступ к месту преступления.`
            });
        }

        return cases;
    },

    save: function() {
        localStorage.setItem(
            "det_name",
            this.state.playerName
        );

        localStorage.setItem(
            "det_level",
            String(this.state.level)
        );

        localStorage.setItem(
            "det_lives",
            String(this.state.lives)
        );

        localStorage.setItem(
            "det_hints",
            String(this.state.hints)
        );

        localStorage.setItem(
            "det_hints_initialized",
            String(this.state.hintsInitialized)
        );

        localStorage.setItem(
            "det_sound",
            this.state.soundEnabled ? "on" : "off"
        );
    },

    updateHeader: function() {
        const player =
            document.getElementById("player-display");

        const lives =
            document.getElementById("lives-count");

        const level =
            document.getElementById("level-count");

        const hints =
            document.getElementById("hints-count");

        const caseHints =
            document.getElementById("case-hints-count");

        if (player) {
            player.textContent =
                this.state.playerName || "Детектив";
        }

        if (lives) {
            lives.textContent =
                `${this.state.lives}/5`;
        }

        if (level) {
            level.textContent =
                this.state.level;
        }

        if (hints) {
            hints.textContent =
                this.state.hints;
        }

        if (caseHints) {
            caseHints.textContent =
                this.state.hints;
        }
    },

    openScreen: function(screenId) {
        document.querySelectorAll(".screen").forEach((screen) => {
            screen.classList.add("hidden");
        });

        const screen =
            document.getElementById(screenId);

        if (screen) {
            screen.classList.remove("hidden");
            window.scrollTo(0, 0);
        }

        this.tap("light");
        this.playSound("click");
    },

    start: function() {
        const input =
            document.getElementById("player-name-input");

        const name =
            input?.value.trim();

        this.state.playerName =
            name || "Детектив";

        this.initAudio();
        this.playSound("start");

        const header =
            document.getElementById("header");

        if (header) {
            header.classList.remove("hidden");
        }

        this.save();
        this.updateHeader();
        this.loadCase();
    },

    loadCase: function() {
        const index =
            (this.state.level - 1) %
            this.cases.length;

        const sourceCase =
            this.cases[index];

        this.state.currentCase =
            JSON.parse(JSON.stringify(sourceCase));

        this.state.currentSuspect = null;
        this.state.currentSuspectIndex = null;
        this.state.questionsLeft =
            this.getQuestionLimit();

        this.renderCase();
        this.updateHeader();
        this.openScreen("screen-case");
    },

    getQuestionLimit: function() {
        if (this.state.level >= 76) {
            return 5;
        }

        if (this.state.level >= 51) {
            return 6;
        }

        if (this.state.level >= 21) {
            return 7;
        }

        return 8;
    },

    renderCase: function() {
        const currentCase =
            this.state.currentCase;

        if (!currentCase) {
            return;
        }

        const image =
            document.getElementById("case-img");

        const title =
            document.getElementById("case-title");

        const description =
            document.getElementById("case-desc");

        const questions =
            document.getElementById(
                "questions-left-badge"
            );

        const difficulty =
            document.getElementById(
                "case-difficulty"
            );

        if (image) {
            image.src =
                currentCase.image;
        }

        if (title) {
            title.textContent =
                currentCase.title;
        }

        if (description) {
            description.textContent =
                currentCase.description;
        }

        if (questions) {
            questions.textContent =
                `${this.state.questionsLeft}/${this.getQuestionLimit()}`;
        }

        if (difficulty) {
            difficulty.textContent =
                `Сложность: ${currentCase.difficulty}`;
        }

        this.renderClues();
        this.renderSuspects();
        this.renderVerdict();
    },

    renderClues: function() {
        const container =
            document.getElementById(
                "clues-container"
            );

        if (!container || !this.state.currentCase) {
            return;
        }

        container.innerHTML = "";

        this.state.currentCase.clues.forEach(
            (clue, index) => {
                const item =
                    document.createElement("div");

                item.className =
                    "list-item";

                item.innerHTML = `
                    <span class="list-number">${index + 1}</span>
                    <span>${this.escapeHTML(clue)}</span>
                `;

                container.appendChild(item);
            }
        );
    },

    renderSuspects: function() {
        const container =
            document.getElementById(
                "suspects-container"
            );

        if (!container || !this.state.currentCase) {
            return;
        }

        container.innerHTML = "";

        this.state.currentCase.suspects.forEach(
            (suspect, index) => {
                const button =
                    document.createElement("button");

                button.className =
                    "suspect-card";

                button.type = "button";

                button.innerHTML = `
                    <img src="${suspect.photo}" alt="">
                    <span class="suspect-card-info">
                        <strong>${this.escapeHTML(suspect.name)}</strong>
                        <small>${this.escapeHTML(suspect.role)}</small>
                    </span>
                    <span class="suspect-card-arrow">›</span>
                `;

                button.addEventListener(
                    "click",
                    () => {
                        this.openInterrogation(index);
                    }
                );

                container.appendChild(button);
            }
        );
    },

    renderVerdict: function() {
        const container =
            document.getElementById(
                "verdict-container"
            );

        if (!container || !this.state.currentCase) {
            return;
        }

        container.innerHTML = "";

        this.state.currentCase.suspects.forEach(
            (suspect, index) => {
                const button =
                    document.createElement("button");

                button.className =
                    "verdict-card";

                button.type = "button";

                button.textContent =
                    `⚖️ Обвинить: ${suspect.name}`;

                button.addEventListener(
                    "click",
                    () => {
                        this.makeVerdict(index);
                    }
                );

                container.appendChild(button);
            }
        );
    },

    openInterrogation: function(index) {
        const suspect =
            this.state.currentCase?.suspects[index];

        if (!suspect) {
            return;
        }

        this.state.currentSuspect =
            suspect;

        this.state.currentSuspectIndex =
            index;

        const photo =
            document.getElementById(
                "suspect-photo"
            );

        const name =
            document.getElementById(
                "suspect-name"
            );

        const role =
            document.getElementById(
                "suspect-role"
            );

        const chat =
            document.getElementById(
                "chat-box"
            );

        if (photo) {
            photo.src =
                suspect.photo;
        }

        if (name) {
            name.textContent =
                suspect.name;
        }

        if (role) {
            role.textContent =
                suspect.role;
        }

        if (chat) {
            chat.innerHTML = "";

            this.addMessage(
                "sus",
                `Допрос начат. У вас осталось ${this.state.questionsLeft} вопросов.`
            );
        }

        this.updateSuspicion(
            suspect.suspicion
        );

        this.openScreen(
            "screen-interrogation"
        );
    },

    updateSuspicion: function(value) {
        const suspicion =
            Math.max(
                0,
                Math.min(
                    100,
                    Number(value) || 0
                )
            );

        if (this.state.currentSuspect) {
            this.state.currentSuspect.suspicion =
                suspicion;
        }

        const valueElement =
            document.getElementById(
                "suspicion-value"
            );

        const fillElement =
            document.getElementById(
                "suspicion-fill"
            );

        if (valueElement) {
            valueElement.textContent =
                `${suspicion}%`;
        }

        if (fillElement) {
            fillElement.style.width =
                `${suspicion}%`;

            if (suspicion >= 75) {
                fillElement.style.background =
                    "linear-gradient(90deg, #d29922, #f85149)";
            } else if (suspicion >= 45) {
                fillElement.style.background =
                    "linear-gradient(90deg, #2ea043, #d29922)";
            } else {
                fillElement.style.background =
                    "#2ea043";
            }
        }
    },

    addSuspicion: function(amount) {
        if (!this.state.currentSuspect) {
            return;
        }

        const current =
            this.state.currentSu
