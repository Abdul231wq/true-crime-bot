const Game = {
    tg: window.Telegram ? window.Telegram.WebApp : null,
    haptic: null,

    state: {
        playerName: localStorage.getItem('det_name') || '',
        level: 1,
        lives: 5,
        currentSuspect: null,
        currentCase: null,
        lastVerdictCorrect: null,
        maxQuestions: 5,
        questionsLeft: 5
    },

    cases: [
        {
            id: 1,
            title: "Тайна закрытого особняка",
            img: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600",
            desc: "Владелец арт-галереи найден мертвым в кабинете. Дверь заперта изнутри, ключ лежал на столе.",
            clues: [
                "Записка со странным шифром '104'",
                "Вентиляционная решетка под потолком открыта",
                "Два бокала с остатками редкого вина"
            ],
            suspects: [
                { name: "Виктор", role: "Бизнес-партнер", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300", isGuilty: false, suspicion: 20 },
                { name: "Елена", role: "Ассистентка", photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300", isGuilty: true, suspicion: 45 }
            ],
            guiltyIndex: 1,
            hint: "Подозрительнее всего выглядит тот, кто имел доступ к кабинету и документам жертвы."
        },
        {
            id: 2,
            title: "Исчезновение в экспрессе",
            img: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=600",
            desc: "Из сейфа в движущемся поезде пропали секретные документальные чертежи.",
            clues: [
                "Сейф открыт без повреждений",
                "Открытое окно во время дождя",
                "Следы женской помады"
            ],
            suspects: [
                { name: "Артур", role: "Проводник", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300", isGuilty: true, suspicion: 55 },
                { name: "София", role: "Пассажирка", photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300", isGuilty: false, suspicion: 15 }
            ],
            guiltyIndex: 0,
            hint: "Ищите того, у кого был доступ к сейфу без взлома."
        }
    ],

    init: function() {
        if (this.tg) {
            try {
                this.tg.ready();
                this.tg.expand();
                if (this.tg.BackButton && this.tg.BackButton.hide) this.tg.BackButton.hide();
                if (this.tg.MainButton && this.tg.MainButton.hide) this.tg.MainButton.hide();
                this.initHaptic();
            } catch (e) {}
        }

        const savedLives = parseInt(localStorage.getItem('det_lives'), 10);
        const savedLevel = parseInt(localStorage.getItem('det_level'), 10);

        this.state.lives = Number.isFinite(savedLives) ? savedLives : 5;
        this.state.level = Number.isFinite(savedLevel) ? savedLevel : 1;

        const input = document.getElementById('player-name-input');
        if (input && this.state.playerName) input.value = this.state.playerName;

        this.updateHeader();
        this.openScreen('screen-start');
    },

    initHaptic: function() {
        if (this.tg && this.tg.HapticFeedback) {
            this.haptic = this.tg.HapticFeedback;
        }
    },

    tap: function(style = 'light') {
        try {
            this.haptic?.impactOccurred(style);
        } catch (e) {}
    },

    notify: function(type = 'success') {
        try {
            this.haptic?.notificationOccurred(type);
        } catch (e) {}
    },

    select: function() {
        try {
            this.haptic?.selectionChanged();
        } catch (e) {}
    },

    save: function() {
        localStorage.setItem('det_name', this.state.playerName);
        localStorage.setItem('det_level', String(this.state.level));
        localStorage.setItem('det_lives', String(this.state.lives));
        localStorage.setItem('det_questions_left', String(this.state.questionsLeft));
    },

    updateHeader: function() {
        const playerDisplay = document.getElementById('player-display');
        const livesCount = document.getElementById('lives-count');
        const levelCount = document.getElementById('level-count');

        if (playerDisplay) playerDisplay.innerText = this.state.playerName || 'Детектив';
        if (livesCount) livesCount.innerText = `${this.state.lives}/5`;
        if (levelCount) levelCount.innerText = this.state.level;
    },

    openScreen: function(id) {
        this.tap('light');

        const screens = [
            'screen-start',
            'screen-case',
            'screen-clues',
            'screen-suspects',
            'screen-interrogation',
            'screen-verdict',
            'screen-result'
        ];

        screens.forEach(s => {
            const el = document.getElementById(s);
            if (el) el.classList.add('hidden');
        });

        const target = document.getElementById(id);
        if (target) target.classList.remove('hidden');

        this.syncTelegramButtons(id);
    },

    syncTelegramButtons: function(screenId) {
        if (!this.tg) return;

        try {
            if (this.tg.BackButton && this.tg.BackButton.hide) this.tg.BackButton.hide();
            if (this.tg.MainButton && this.tg.MainButton.hide) this.tg.MainButton.hide();

            if (
                screenId === 'screen-case' ||
                screenId === 'screen-clues' ||
                screenId === 'screen-suspects' ||
                screenId === 'screen-verdict'
            ) {
                if (this.tg.BackButton) {
                    this.tg.BackButton.onClick(() => this.openScreen('screen-case'));
                    this.tg.BackButton.show();
                }
            }

            if (screenId === 'screen-result') {
                if (this.tg.MainButton) {
                    this.tg.MainButton.setText("Следующее дело");
                    this.tg.MainButton.onClick(() => this.loadCase());
                    this.tg.MainButton.show();
                }
            }
        } catch (e) {}
    },

    showMessage: function(text, kind = 'info') {
        if (kind === 'success') this.notify('success');
        if (kind === 'error') this.notify('error');
        if (kind === 'warning') this.notify('warning');

        if (this.tg && typeof this.tg.showPopup === 'function') {
            this.tg.showPopup({
                title: "AI Detective",
                message: text,
                buttons: [{ type: "ok", text: "OK" }]
            });
        } else {
            alert(text);
        }
    },

    escapeHTML: function(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    start: function() {
        this.tap('medium');

        const input = document.getElementById('player-name-input');
        const nameInput = input ? input.value.trim() : '';

        if (!nameInput && !this.state.playerName) {
            this.showMessage("Введите ваш позывной!", 'warning');
            return;
        }

        if (nameInput) this.state.playerName = nameInput;
        this.save();

        const header = document.getElementById('header');
        if (header) header.classList.remove('hidden');

        this.updateHeader();
        this.loadCase();
    },

    resetSuspicions: function() {
        if (!this.state.currentCase) return;

        this.state.currentCase.suspects.forEach(s => {
            if (typeof s.baseSuspicion !== 'number') s.baseSuspicion = s.suspicion || 0;
            s.suspicion = s.baseSuspicion;
        });
    },

    loadCase: function() {
        this.tap('light');

        const caseIdx = (this.state.level - 1) % this.cases.length;
        this.state.currentCase = this.cases[caseIdx];
        this.state.currentSuspect = null;
        this.state.lastVerdictCorrect = null;
        this.state.questionsLeft = this.state.maxQuestions;

        this.resetSuspicions();

        const caseImg = document.getElementById('case-img');
        const caseTitle = document.getElementById('case-title');
        const caseDesc = document.getElementById('case-desc');

        if (caseImg) caseImg.src = this.state.currentCase.img;
        if (caseTitle) caseTitle.innerText = `Дело №${this.state.level}: ${this.state.currentCase.title}`;
        if (caseDesc) caseDesc.innerText = this.state.currentCase.desc;

        this.renderClues();
        this.renderSuspects();
        this.renderVerdict();
        this.openScreen('screen-case');
    },

    renderClues: function() {
        const cont = document.getElementById('clues-container');
        if (!cont || !this.state.currentCase) return;

        cont.innerHTML = this.state.currentCase.clues
            .map(c => `<div class="btn" style="text-align:left;">🔍 ${this.escapeHTML(c)}</div>`)
            .join('');
    },

    renderSuspects: function() {
        const cont = document.getElementById('suspects-container');
        if (!cont || !this.state.currentCase) return;

        cont.innerHTML = this.state.currentCase.suspects
            .map((s, idx) => `
                <button class="btn" onclick="Game.startInterrogation(${idx})">
                    🕵️‍♂️ ${this.escapeHTML(s.name)} (${this.escapeHTML(s.role)})
                </button>
            `)
            .join('');
    },

    renderVerdict: function() {
        const cont = document.getElementById('verdict-container');
        if (!cont || !this.state.currentCase) return;

        cont.innerHTML = this.state.currentCase.suspects
            .map((s, idx) => `
                <button class="btn btn-danger" onclick="Game.makeVerdict(${idx})">
                    ⚖️ Арестовать: ${this.escapeHTML(s.name)}
                </button>
            `)
            .join('');
    },

    updateSuspectUI: function() {
        if (!this.state.currentSuspect) return;

        const name = document.getElementById('suspect-name');
        if (name) name.innerText = `${this.state.currentSuspect.name} · Подозрение ${this.state.currentSuspect.suspicion}%`;

        const role = document.getElementById('suspect-role');
        if (role) role.innerText = `${this.state.currentSuspect.role} · Вопросов осталось: ${this.state.questionsLeft}`;
    },

    startInterrogation: function(idx) {
        if (!this.state.currentCase || !this.state.currentCase.suspects[idx]) return;

        this.select();
        this.state.currentSuspect = this.state.currentCase.suspects[idx];

        const photo = document.getElementById('suspect-photo');
        const name = document.getElementById('suspect-name');
        const role = document.getElementById('suspect-role');
        const input = document.getElementById('user-question');
        const chat = document.getElementById('chat-box');

        if (photo) photo.src = this.state.currentSuspect.photo;
        if (name) name.innerText = `${this.state.currentSuspect.name} · Подозрение ${this.state.currentSuspect.suspicion}%`;
        if (role) role.innerText = `${this.state.currentSuspect.role} · Вопросов осталось: ${this.state.questionsLeft}`;
        if (input) input.value = '';

        if (chat) {
            chat.innerHTML = `
                <div class="msg sus">
                    <b>${this.escapeHTML(this.state.currentSuspect.name)}:</b>
                    Я слушаю вас, детектив ${this.escapeHTML(this.state.playerName)}. Задавайте вопросы.
                </div>
            `;
        }

        this.openScreen('screen-interrogation');
    },

    quickAsk: async function(type) {
        const presets = {
            alibi: "Где вы были в момент преступления?",
            motive: "Какой у вас был мотив?",
            clue: "Что вы знаете об уликах?",
            relation: "Какие у вас были отношения с жертвой?"
        };

        const input = document.getElementById('user-question');
        if (!input || !presets[type]) return;

        if (this.state.questionsLeft <= 0) {
            this.showMessage("Вопросы закончились. Переходите к обвинению.", 'warning');
            return;
        }

        this.tap('light');
        input.value = presets[type];
        await this.askQuestion();
    },

    applySuspicionEffect: function(question, suspect, reply) {
        const q = question.toLowerCase();
        let delta = 0;

        if (q.includes("алиби") || q.includes("где вы были") || q.includes("был")) {
            delta += suspect.isGuilty ? 15 : -5;
        }

        if (q.includes("мотив") || q.includes("зачем") || q.includes("почему")) {
            delta += suspect.isGuilty ? 12 : 0;
        }

        if (q.includes("улик") || q.includes("след") || q.includes("кров") || q.includes("шифр")) {
            delta += suspect.isGuilty ? 18 : 3;
        }

        if (reply.toLowerCase().includes("адвокат") || reply.toLowerCase().includes("врать") || reply.toLowerCase().includes("не буду")) {
            delta += 8;
        }

        if (reply.toLowerCase().includes("не связано") || reply.toLowerCase().includes("не придал")) {
            delta += suspect.isGuilty ? 5 : -3;
        }

        suspect.suspicion = Math.max(0, Math.min(100, (suspect.suspicion || 0) + delta));
    },

    askQuestion: async function() {
        if (!this.state.currentSuspect) {
            this.showMessage("Сначала выберите подозреваемого.", 'warning');
            return;
        }

        if (this.state.questionsLeft <= 0) {
            this.showMessage("Вопросы закончились. Переходите к обвинению.", 'warning');
            return;
        }

        const input = document.getElementById('user-question');
        const text = input ? input.value.trim() : '';
        if (!text) return;

        this.tap('light');
        this.state.questionsLeft -= 1;
        this.save();

        const chat = document.getElementById('chat-box');
        if (!chat) return;

        chat.innerHTML += `<div class="msg det"><b>Вы:</b> ${this.escapeHTML(text)}</div>`;
        input.value = '';

        const reply = await AIEngine.generateResponse(this.state.currentSuspect, text, this.state.currentCase);
        this.applySuspicionEffect(text, this.state.currentSuspect, reply);

        setTimeout(() => {
            chat.innerHTML += `<div class="msg sus"><b>${this.escapeHTML(this.state.currentSuspect.name)}:</b> ${this.escapeHTML(reply)}</div>`;
            chat.scrollTop = chat.scrollHeight;
            this.updateSuspectUI();

            if (this.state.questionsLeft <= 0) {
                this.showMessage("Лимит вопросов исчерпан. Переходите к обвинению.", 'warning');
            }
        }, 350);
    },

    buyHint: function() {
        if (!this.state.currentCase) return;

        this.notify('warning');

        const hintText = this.state.currentCase.hint || "Внимательно сопоставьте алиби и доступ к месту преступления.";

        if (this.tg && typeof this.tg.showPopup === 'function') {
            this.tg.showPopup({
                title: "Подсказка ИИ",
                message: hintText,
                buttons: [{ type: "ok", text: "Понятно" }]
            });
        } else {
            alert(hintText);
        }
    },

    makeVerdict: function(idx) {
        if (!this.state.currentCase) return;

        const correct = idx === this.state.currentCase.guiltyIndex;
        this.state.lastVerdictCorrect = correct;

        if (correct) {
            this.notify('success');
            this.state.level += 1;
            this.save();
            this.updateHeader();
            this.updateResultScreen(true, false);
            this.openScreen('screen-result');
        } else {
            this.notify('error');
            this.state.lives -= 1;

            if (this.state.lives <= 0) {
                this.state.lives = 5;
                this.state.level = 1;
                this.save();
                this.updateHeader();
                this.updateResultScreen(false, true);
                this.openScreen('screen-result');
                return;
            }

            this.save();
            this.updateHeader();
            this.showMessage("❌ Ошибка! Вы потеряли 1 жизнь.", 'error');
            this.openScreen('screen-case');
        }
    },

    updateResultScreen: function(win, reset = false) {
        const icon = document.getElementById('result-icon');
        const title = document.getElementById('result-title');
        const text = document.getElementById('result-text');
        const player = document.getElementById('result-player');
        const level = document.getElementById('result-level');
        const lives = document.getElementById('result-lives');

        if (player) player.innerText = this.state.playerName || 'Детектив';
        if (level) level.innerText = reset ? 1 : this.state.level;
        if (lives) lives.innerText = `${this.state.lives}/5`;

        if (win) {
            if (icon) icon.innerText = "🎯";
            if (title) title.innerText = "Дело раскрыто";
            if (text) text.innerText = `Отличная работа. Дело №${this.state.level - 1} закрыто. Следующее дело уже готово.`;
        } else {
            if (icon) icon.innerText = "💥";
            if (title) title.innerText = "Архив обнулён";
            if (text) text.innerText = "Жизни закончились. Начинаем новую серию расследований.";
        }
    }
};

window.onload = () => Game.init();
