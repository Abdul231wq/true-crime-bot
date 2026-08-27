const AIEngine = {
    answers: {
        alibi: [
            "Я уже говорил, где находился в тот момент.",
            "Моё алиби подтверждается камерами наблюдения.",
            "Я был далеко от места преступления.",
            "Не понимаю, почему вы снова спрашиваете об этом."
        ],

        motive: [
            "У меня не было причин желать ему смерти.",
            "Наши отношения были сложными, но это не делает меня убийцей.",
            "Он многим мешал, но я не собирался причинять ему вред.",
            "Вы пытаетесь найти мотив там, где его нет."
        ],

        clue: [
            "Я ничего не знаю об этой улике.",
            "Возможно, вы неправильно интерпретируете найденные предметы.",
            "Эта улика не доказывает мою вину.",
            "Кто-то мог специально оставить её на месте преступления."
        ],

        relation: [
            "Мы были знакомы достаточно давно.",
            "У нас были деловые отношения.",
            "Я не хочу обсуждать личную жизнь погибшего.",
            "Наши отношения были не такими, как вы думаете."
        ],

        default: [
            "Я не понимаю, к чему вы ведёте.",
            "Ответ уже был дан.",
            "Задайте вопрос конкретнее.",
            "Мне нечего добавить."
        ]
    },

    getAnswer: function(type, suspect, question = "") {
        const normalizedQuestion = question.toLowerCase();

        let category = type;

        if (!category) {
            if (
                normalizedQuestion.includes("алиби") ||
                normalizedQuestion.includes("где был") ||
                normalizedQuestion.includes("находил")
            ) {
                category = "alibi";
            } else if (
                normalizedQuestion.includes("мотив") ||
                normalizedQuestion.includes("зачем") ||
                normalizedQuestion.includes("почему")
            ) {
                category = "motive";
            } else if (
                normalizedQuestion.includes("улика") ||
                normalizedQuestion.includes("доказатель")
            ) {
                category = "clue";
            } else if (
                normalizedQuestion.includes("жертв") ||
                normalizedQuestion.includes("отношен") ||
                normalizedQuestion.includes("знаком")
            ) {
                category = "relation";
            } else {
                category = "default";
            }
        }

        const pool = this.answers[category] || this.answers.default;
        const index = Math.floor(Math.random() * pool.length);

        let answer = pool[index];

        if (suspect && suspect.name) {
            answer = `${suspect.name}: ${answer}`;
        }

        return answer;
    },

    getSuspicionChange: function(type, question = "") {
        const normalizedQuestion = question.toLowerCase();

        if (type === "alibi") return 12;
        if (type === "motive") return 15;
        if (type === "clue") return 18;
        if (type === "relation") return 8;

        if (
            normalizedQuestion.includes("лож") ||
            normalizedQuestion.includes("врёшь") ||
            normalizedQuestion.includes("винов")
        ) {
            return 20;
        }

        return 7;
    }
};
