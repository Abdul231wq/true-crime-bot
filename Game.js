const Game = {
    tg: window.Telegram ? window.Telegram.WebApp : null,
    state: {
        playerName: localStorage.getItem('det_name') || '',
        level: 1,
        lives: 5,
        currentSuspect: null,
        currentCase: null
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
                { name: "Виктор", role: "Бизнес-партнер", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300", isGuilty: false },
                { name: "Елена", role: "Ассистентка", photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300", isGuilty: true }
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
                { name: "Артур", role: "Проводник", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300", isGuilty: true },
                { name: "София", role: "Пассажирка", photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300", isGuilty: false }
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
            } catch (e) {}
        }

        const savedLives = parseInt(localStorage.getItem('det_lives'), 10);
        const savedLevel = parseInt(localStorage.getItem('det_level'), 10);

        this.state.lives = Number.isFinite(savedLives) ? savedLives : 5;
        this.state.level = Number.isFinite(savedLevel) ? savedLevel : 1;

        if (this.state.playerName) {
            const input = document.getElementById('player-name-input');
            if (input) input.value = this.state.playerName;
        }

        this.updateHeader();
        this.openScreen('screen-start');
    },

    save: function() {
        localStorage.setItem('det_name', this.state.playerName);
        localStorage.setItem('det_level', String(this.state.level));
        localStorage.setItem('det_lives', String(this.state.lives));
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
        const screens = [
            'screen-start',
            'screen-case',
            'screen-clues',
            'screen-suspects',
            'screen-interrogation',
            'screen-verdict'
        ];

        screens.forEach(s => {
            const el = document.getElementById(s);
            if (el) el.classList.add('hidden');
        });

        const target = document.getElementById(id);
        if (target) target.classList.remove('hidden');
    },

    showMessage: function(text) {
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
        const input = document.getElementById('player-name-input');
        const nameInput = input ? input.value.trim() : '';

        if (!nameInput && !this.state.playerName) {
            this.showMessage("Введите ваш позывной!");
            return;
        }

        if (nameInput) this.state.playerName = nameInput;

        this.save();

        const header = document.getElementById('header');
        if (header) header.classList.remove('hidden');

        this.updateHeader();
        this.loadCase();
    },

    loadCase: function() {
        const caseIdx = (this.state.level - 1) % this.cases.length;
        this.state.currentCase = this.cases[caseIdx];
        this.state.currentSuspect = null;

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

    startInterrogation: function(idx) {
        if (!this.state.currentCase || !this.state.currentCase.suspects[idx]) return;

        this.state.currentSuspect = this.state.currentCase.suspects[idx];

        const photo = document.getElementById('suspect-photo');
        const name = document.getElementById('suspect-name');
        const role = document.getElementById('suspect-role');
        const input = document.getElementById('user-question');
        const chat = document.getElementById('chat-box');

        if (photo) photo.src = this.state.currentSuspect.photo;
        if (name) name.innerText = this.state.currentSuspect.name;
        if (role) role.innerText = this.state.currentSuspect.role;
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

        input.value = presets[type];
        await this.askQuestion();
    },

    askQuestion: async function() {
        if (!this.state.currentSuspect) {
            this.showMessage("Сначала выберите подозреваемого.");
            return;
        }

        const input = document.getElementById('user-question');
        const text = input ? input.value.trim() : '';

        if (!text) return;

        const chat = document.getElementById('chat-box');
        if (!chat) return;

        chat.innerHTML += `<div class="msg det"><b>Вы:</b> ${this.escapeHTML(text)}</div>`;
        input.value = '';

        const reply = await AIEngine.generateResponse(this.state.currentSuspect, text, this.state.currentCase);

        setTimeout(() => {
            chat.innerHTML += `<div class="msg sus"><b>${this.escapeHTML(this.state.currentSuspect.name)}:</b> ${this.escapeHTML(reply)}</div>`;
            chat.scrollTop = chat.scrollHeight;
        }, 350);
    },

    buyHint: function() {
        if (!this.state.currentCase) return;

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

        if (idx === this.state.currentCase.guiltyIndex) {
            this.showMessage(`🎯 Отличная работа! Вы правильно раскрыли дело №${this.state.level}.`);

            this.state.level += 1;
            this.save();
            this.updateHeader();

            setTimeout(() => {
                this.loadCase();
            }, 700);
        } else {
            this.state.lives -= 1;

            if (this.state.lives <= 0) {
                this.state.lives = 5;
                this.state.level = 1;
                this.save();
                this.updateHeader();
                this.showMessage("❌ Запас жизней исчерпан. Игра начинается заново.");
                setTimeout(() => {
                    this.loadCase();
                }, 700);
                return;
            }

            this.save();
            this.updateHeader();
            this.showMessage("❌ Ошибка! Вы потеряли 1 жизнь.");
            this.openScreen('screen-case');
        }
    }
};

window.onload = () => Game.init();
