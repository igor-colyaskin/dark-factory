> ⚠️ Документ отражает v0.1. Актуализация — в v0.2 Фаза 8.
# 🏭 Dark Factory v0.1

**Application Factory** — веб-приложение для автоматической генерации приложений через AI-агентов.

## Концепция

Метафора фастфуда:
1. 📝 **Сделал заказ** — описываешь желаемое приложение
2. ⚙️ **Смотришь как готовят** — наблюдаешь работу агентов в реальном времени
3. 🎉 **Забираешь готовое** — получаешь работающее приложение

## Быстрый старт

### Установка

```bash
git clone <repository>
cd dark-factory
npm install
```

### Настройка

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Добавьте ваш OpenRouter API ключ в `.env`:

```
OPENROUTER_API_KEY=sk-or-ваш-ключ
```

### Запуск

**Production режим** (реальные API вызовы):
```bash
npm start
```

**Mock-full режим** (для разработки, пишет файлы):
```bash
npm run mock:full
```

**Mock-fast режим** (самый быстрый, использует готовые файлы):
```bash
npm run mock:fast
```

**Demo режим** (для презентаций):
```bash
npm run demo
```

Откройте http://localhost:3000 в браузере.

## Режимы работы

| Режим | Агенты | Файлы | Время | Стоимость | Использование |
|-------|--------|-------|-------|-----------|---------------|
| **production** | Real API | workspace/ | 60-90s | $$$ | Реальная генерация |
| **mock-full** | Mock | workspace/ | ~6s | $0 | Отладка + тест File Manager |
| **mock-fast** | Mock | mock-workspace/ → workspace/ | ~6s | $0 | Быстрая отладка UI |
| **demo** | Mock | mock-workspace/ → workspace/ | ~9s | $0 | Презентации |

## Использование

1. Откройте http://localhost:3000
2. Введите описание приложения в текстовое поле
3. Нажмите "Submit Order"
4. Наблюдайте процесс создания в реальном времени
5. Когда готово, следуйте инструкциям для запуска созданного приложения

### Запуск созданного приложения

```bash
cd workspace
npm install
npm start
```

Откройте http://localhost:3001 в браузере.

## Архитектура

### Компоненты

- **Orchestrator** — State machine, управляет процессом
- **Agent Manager** — Вызовы OpenRouter API
- **File Manager** — Запись файлов в workspace/
- **AC Checker** — Проверка качества кода
- **Cost Tracker** — Отслеживание стоимости и времени

### Агенты

| Агент | Модель | Роль |
|-------|--------|------|
| Architect | claude-opus-4 | Проектирование архитектуры |
| Developer | claude-sonnet-4 | Написание кода |
| Tester | gemini-2.5-flash | Code review |

### Pipeline

```
IDLE → ORDERING → ARCH_WORKING → ARCH_REVIEW → 
DEV_WORKING → DEV_CHECK → TEST_RUNNING → 
DELIVERING → DONE
```

## Полезные команды

```bash
npm start              # Запуск в production режиме
npm run dev            # Запуск с автоперезагрузкой
npm run restart        # Перезапуск с убийством процесса
npm run clean          # Очистка state/ и workspace/
npm run fresh          # Полная очистка + перезапуск
npm run mock:full      # Mock режим с записью файлов
npm run mock:fast      # Mock режим с готовыми файлами
npm run demo           # Demo режим для презентаций
```

## Структура проекта

```
dark-factory/
├── server/              # Backend
│   ├── index.js         # Express server + SSE
│   ├── orchestrator.js  # State machine
│   ├── agent-manager.js # OpenRouter API calls
│   ├── mock-agent-manager.js # Mock responses
│   ├── file-manager.js  # File operations
│   ├── ac-checker.js    # Acceptance criteria checks
│   ├── cost-tracker.js  # Cost/time tracking
│   └── prompts/         # Agent prompts
│       ├── architect.js
│       ├── developer.js
│       └── tester.js
├── client/              # Frontend
│   ├── index.html       # UI (3 blocks)
│   ├── styles.css       # Fast-food theme
│   └── app.js           # SSE listener + logic
├── workspace/           # Generated applications
├── mock-workspace/      # Pre-built app for mock modes
├── state/               # Pipeline state
└── test/                # Tests
    ├── orchestrator.test.js
    └── agents.test.js
```

## Разработка

### Тестирование

**Orchestrator (без API):**
```bash
node test/orchestrator.test.js
```

**Агенты (с реальным API):**
```bash
node test/agents.test.js
```

### Отладка

Используйте `mock:full` для быстрой итерации:
- Изменяете UI → перезагружаете страницу
- Изменяете backend → `npm run mock:full`
- Полный цикл за 6 секунд, $0

## Ограничения v0.1

Dark Factory создаёт только простые приложения:
- Node.js + Express
- Vanilla HTML/CSS/JavaScript (без фреймворков)
- In-memory данные (без БД)
- Порт 3001 (чтобы не конфликтовать с DF на 3000)

## Документация

- [`CONCEPT.md`](CONCEPT.md) — Полная концепция проекта
- [`TRACKER.md`](TRACKER.md) — Прогресс разработки
- [`BOOTSTRAP.md`](BOOTSTRAP.md) — Инструкции по настройке

## Лицензия

Курсовой проект, 2025-2026
