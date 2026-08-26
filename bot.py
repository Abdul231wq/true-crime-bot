import os
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
)
from cases import CASES

# Настройка логирования
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)

# Токен берется из переменных окружения (Environment Variables)
TOKEN = os.getenv("BOT_TOKEN")

# Хранилище состояний пользователей (в памяти)
user_states = {}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Стартовое меню"""
    keyboard = [
        [InlineKeyboardButton("🔍 Выбрать дело", callback_data="list_cases")],
        [InlineKeyboardButton("📜 Правила игры", callback_data="rules")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    text = (
        "🕵️‍♂️ **Добро пожаловать в True Crime Detective Bot!**\n\n"
        "Здесь вам предстоит расследовать реальные запутаные дела прошлых лет. "
        "Изучайте улики, проводите допросы и выносите вердикт."
    )
    
    if update.message:
        await update.message.reply_text(text, reply_markup=reply_markup, parse_mode="Markdown")
    else:
        query = update.callback_query
        await query.answer()
        await query.edit_message_text(text, reply_markup=reply_markup, parse_mode="Markdown")

async def handle_rules(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Раздел правил"""
    query = update.callback_query
    await query.answer()
    
    keyboard = [[InlineKeyboardButton("🔙 Назад", callback_data="start_menu")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    text = (
        "📖 **Правила:**\n"
        "1. Выберите дело из списка.\n"
        "2. Изучите вводные данные и доступные улики.\n"
        "3. Когда будете готовы, нажмите 'Вынести вердикт' и выберите правильную версию."
    )
    await query.edit_message_text(text, reply_markup=reply_markup, parse_mode="Markdown")

async def list_cases(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Список доступных дел"""
    query = update.callback_query
    await query.answer()
    
    keyboard = []
    for case_id, case in CASES.items():
        keyboard.append([InlineKeyboardButton(case["title"], callback_data=f"select_{case_id}")])
    
    keyboard.append([InlineKeyboardButton("🔙 В главное меню", callback_data="start_menu")])
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text("📂 **Выберите дело для расследования:**", reply_markup=reply_markup, parse_mode="Markdown")

async def start_case(update: Update, context: ContextTypes.DEFAULT_TYPE, case_id: str):
    """Запуск конкретного дела"""
    query = update.callback_query
    user_id = query.from_user.id
    
    # Инициализация состояния пользователя
    user_states[user_id] = {
        "case_id": case_id,
        "investigated": set()
    }
    
    await render_case_screen(query, user_id)

async def render_case_screen(query, user_id):
    """Отрисовка экрана расследования"""
    state = user_states.get(user_id)
    case = CASES[state["case_id"]]
    
    keyboard = []
    # Кнопки для исследования
    for action_key, action_data in case["choices"].items():
        status = "✅ " if action_key in state["investigated"] else "🔍 "
        keyboard.append([InlineKeyboardButton(f"{status}{action_data['text']}", callback_data=f"investigate_{action_key}")])
    
    # Кнопка для вердикта доступна всегда
    keyboard.append([InlineKeyboardButton("⚖️ Вынести вердикт", callback_data="go_verdict")])
    keyboard.append([InlineKeyboardButton("🚪 Покинуть дело", callback_data="list_cases")])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    text = f"**{case['title']}**\n\n{case['intro']}"
    await query.edit_message_text(text, reply_markup=reply_markup, parse_mode="Markdown")

async def handle_investigation(update: Update, context: ContextTypes.DEFAULT_TYPE, action_key: str):
    """Обработка выбора улики"""
    query = update.callback_query
    await query.answer()
    user_id = query.from_user.id
    state = user_states.get(user_id)
    
    if not state:
        await start(update, context)
        return

    case = CASES[state["case_id"]]
    state["investigated"].add(action_key)
    
    result_text = case["choices"][action_key]["result"]
    
    keyboard = [[InlineKeyboardButton("🔙 К уликам", callback_data="back_to_investigation")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(f"🔍 **Результат осмотра:**\n\n{result_text}", reply_markup=reply_markup, parse_mode="Markdown")

async def show_verdict_screen(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Экран выбора вердикта"""
    query = update.callback_query
    await query.answer()
    user_id = query.from_user.id
    state = user_states.get(user_id)
    
    case = CASES[state["case_id"]]
    
    keyboard = []
    for v_key, v_text in case["verdict_options"].items():
        keyboard.append([InlineKeyboardButton(v_text, callback_data=f"answer_{v_key}")])
        
    keyboard.append([InlineKeyboardButton("🔙 Вернуться к уликам", callback_data="back_to_investigation")])
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(f"⚖️ **{case['verdict_question']}**", reply_markup=reply_markup, parse_mode="Markdown")

async def handle_answer(update: Update, context: ContextTypes.DEFAULT_TYPE, answer_key: str):
    """Проверка ответа"""
    query = update.callback_query
    await query.answer()
    user_id = query.from_user.id
    state = user_states.get(user_id)
    
    case = CASES[state["case_id"]]
    final_text = case["final_answers"][answer_key]
    
    keyboard = [
        [InlineKeyboardButton("📂 Другие дела", callback_data="list_cases")],
        [InlineKeyboardButton("🏠 В главное меню", callback_data="start_menu")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(f"🏁 **Итог расследования:**\n\n{final_text}", reply_markup=reply_markup, parse_mode="Markdown")

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Маршрутизация всех нажатий кнопок"""
    query = update.callback_query
    data = query.data
    user_id = query.from_user.id
    
    if data == "start_menu":
        await start(update, context)
    elif data == "rules":
        await handle_rules(update, context)
    elif data == "list_cases":
        await list_cases(update, context)
    elif data.startswith("select_"):
        case_id = data.replace("select_", "")
        await start_case(update, context, case_id)
    elif data.startswith("investigate_"):
        action_key = data.replace("investigate_", "")
        await handle_investigation(update, context, action_key)
    elif data == "back_to_investigation":
        await render_case_screen(query, user_id)
    elif data == "go_verdict":
        await show_verdict_screen(update, context)
    elif data.startswith("answer_"):
        answer_key = data.replace("answer_", "")
        await handle_answer(update, context, answer_key)

def main():
    """Запуск бота"""
    if not TOKEN:
        raise ValueError("BOT_TOKEN не найден в переменных окружения!")
        
    app = Application.builder().token(TOKEN).build()
    
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(button_handler))
    
    print("Бот запущен...")
    app.run_polling()

if __name__ == "__main__":
    main()
  
