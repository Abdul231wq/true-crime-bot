const Game = {
    tg: window.Telegram ? window.Telegram.WebApp : null,
    state: {
        playerName: localStorage.getItem('det_name') || '',
        level: parseInt(localStorage.getItem('det_level')) || 1,
        lives: parseInt(localStorage.getItem('det_lives')) ?? 5,
        currentSuspect: null,
        currentCase: null
    },

    // База дел с исправленными тематическими фото
    cases: [
        {
            id: 1,
            title: "Тайна закрытого особняка",
            img: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600",
            desc: "Владелец арт-галереи найден мертвым в кабинете. Дверь заперта изнутри, ключ лежал на столе.",
            clues: ["Записка со странным шифром '104'", "Вентиляционная решетка под потолком открыта", "Два бокала с остатками редкого вина"],
            suspects: [
                { name: "Виктор", role: "Бизнес-партнер", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300", isGuilty: false },
                { name: "Елена", role: "Ассистентка", photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300", isGuilty: true }
            ],
            guiltyIndex: 1
        },
        {
            id: 2,
            title: "Исчезновение в экспрессе",
            img: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=600",
            desc: "Из сейфа в движущемся поезде пропали секретные документальные чертежи.",
            clues: ["Сейф открыт без повреждений", "Открытое окно во время дождя", "Следы женской помады"],
            suspects: [
                { name: "Артур", role: "Проводник", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300", isGuilty: true },
                { name: "София", role: "Пассажирка", photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300", isGuilty: false }
            ],
            guiltyIndex: 0
        }
    ],

    init: function() {
        if (this.tg) this.tg.expand();
        if (isNaN(this.state.lives)) this.state.lives = 5;
        if (isNaN(this.state.level)) this.state.level = 1;

        if (this.state.playerName) {
            document.getElementById('player-name-input').value = this.state.playerName;
        }
    },

    save: function() {
        localStorage.setItem('det_name', this.state.playerName);
        localStorage.setItem('det_level', this.state.level);
        localStorage.setItem('det_lives', this.state.lives);
    },

    updateHeader: function() {
        document.getElementById('player-display').innerText = this.state.playerName || 'Детектив';
        document.getElementById('lives-count').innerText = `${this.state.lives}/5`;
        document.getElementById('level-count').innerText = this.state.level;
    },

    openScreen: function(id) {
        ['screen-start', 'screen-case', 'screen-clues', 'screen-suspects', 'screen-interrogation', 'screen-verdict'].forEach(s => {
            document.getElementById(s).classList.add('hidden');
        });
        document.getElementById(id).classList.remove('hidden');
    },

    start: function() {
        const nameInput = document.getElementById('player-name-input').value.trim();
        if (!nameInput && !this.state.playerName) {
            alert("Введите ваш позывной!");
            return;
        }
        if (nameInput) this.state.playerName = nameInput;
        this.save();
        
        document.getElementById('header').classList.remove('hidden');
        this.updateHeader();
        this.loadCase();
    },

    loadCase: function() {
        const caseIdx = (this.state.level - 1) % this.cases.length;
        this.state.currentCase = this.cases[caseIdx];
        
        document.getElementById('case-img').src = this.state.currentCase.img;
        document.getElementById('case-title').innerText = `Дело №${this.state.level}: ${this.state.currentCase.title}`;
        document.getElementById('case-desc').innerText = this.state.currentCase.desc;

        this.renderClues();
        this.renderSuspects();
        this.renderVerdict();
        this.openScreen('screen-case');
    },

    renderClues: function() {
        const cont = document.getElementById('clues-container');
        cont.innerHTML = this.state.currentCase.clues.map(c => `<div class="btn" style="text-align:left;">🔍 ${c}</div>`).join('');
    },

    renderSuspects: function() {
        const cont = document.getElementById('suspects-container');
        cont.innerHTML = this.state.currentCase.suspects.map((s, idx) => `
            <button class="btn" onclick="Game.startInterrogation(${idx})">🕵️‍♂️ ${s.name} (${s.role})</button>
        `).join('');
    },

    renderVerdict: function() {
        const cont = document.getElementById('verdict-container');
        cont.innerHTML = this.state.currentCase.suspects.map((s, idx) => `
            <button class="btn btn-danger" onclick="Game.makeVerdict(${idx})">⚖️ Арестовать: ${s.name}</button>
        `).join('');
    },

    startInterrogation: function(idx) {
        this.state.currentSuspect = this.state.currentCase.suspects[idx];
        document.getElementById('suspect-photo').src = this.state.currentSuspect.photo;
        document.getElementById('suspect-name').innerText = this.state.currentSuspect.name;
        document.getElementById('suspect-role').innerText = this.state.currentSuspect.role;
        
        const chat = document.getElementById('chat-box');
        chat.innerHTML = `<div class="msg sus"><b>${this.state.currentSuspect.name}:</b> Я слушаю вас, детектив ${this.state.playerName}. Задавайте вопросы.</div>`;
        this.openScreen('screen-interrogation');
    },

    askQuestion: async function() {
        const input = document.getElementById('user-question');
        const text = input.value.trim();
        if (!text) return;

        const chat = document.getElementById('chat-box');
        chat.innerHTML += `<div class="msg det"><b>Вы:</b> ${text}</div>`;
        input.value = '';

        const reply = await AIEngine.generateResponse(this.state.currentSuspect, text, this.state.currentCase);
        
        setTimeout(() => {
            chat.innerHTML += `<div class="msg sus"><b>${this.state.currentSuspect.name}:</b> ${reply}</div>`;
            chat.scrollTop = chat.scrollHeight;
        }, 400);
    },

    makeVerdict: function(idx) {
        if (idx === this.state.currentCase.guiltyIndex) {
            alert(`🎯 Отличная работа! Детектив ${this.state.playerName}, вы правильно раскрыли Дело №${this.state.level}!`);
            this.state.level++;
            this.save();
            this.updateHeader();
            this.loadCase();
        } else {
            this.state.lives--;
            this.save();
            this.updateHeader();
            alert(`❌ Ошибка! Ваши обвинения не подтвердились. Вы потеряли 1 жизнь.`);
            if (this.state.lives <= 0) {
                alert("Запас жизней исчерпан. Перезапуск...");
                this.state.lives = 5;
                this.save();
                this.updateHeader();
            }
            this.openScreen('screen-case');
        }
    },

    buyHint: function() {
        if (this.tg) {
            this.tg.showPopup({ title: "Подсказка ИИ", message: "Купить анализ улик за 15 Stars?", buttons: [{ type: "ok", text: "Купить" }, { type: "cancel" }] });
        }
    }
};

window.onload = () => Game.init();
                
