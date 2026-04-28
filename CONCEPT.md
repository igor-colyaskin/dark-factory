# CONCEPT.md — Dark Factory v0.1

## Версия документа

| Версия     | Дата       | Статус       | Изменения                    |
|------------|------------|--------------|------------------------------|
| v0.1-draft | 2025-06-XX | Утверждено   | Первичная концепция          |

## 1. Что такое Dark Factory

Dark Factory (DF) — веб-приложение, реализующее концепцию
"фабрики приложений". Пользователь описывает желаемое приложение
в текстовом поле, DF автоматически организует процесс разработки
через AI-агентов и выдаёт готовый результат.

Метафора: фастфуд.
- Сделал заказ
- Смотришь, как готовят (прозрачность: время, деньги, этапы)
- Забираешь готовое

## 2. Ключевые принципы

1. ПРОЗРАЧНОСТЬ — пользователь видит каждый шаг, стоимость, время
2. ПРОСТОТА — линейный pipeline, ручные approvals
3. ЭВОЛЮЦИОННОСТЬ — v0.1 -> v0.2 -> ... через загрузку этого файла в контекст
4. НАДЁЖНОСТЬ — оркестратор = детерминированный код, не AI

## 3. Два уровня разработки

Уровень 1 (мета):
  Разработчик + Roo Code в VSCode -> строит Dark Factory.
  Это vibe coding процесс для курсового проекта.

Уровень 2 (продукт):
  Dark Factory + OpenRouter API -> строит целевое приложение.
  Roo Code НЕ используется внутри DF.
  DF — самостоятельное веб-приложение с собственным backend.

## 4. Архитектура

### 4.1 Общая схема

  BROWSER (UI)
  +--------------------------------------------------+
  |                                                    |
  |  +----------+  +--------------+  +----------+     |
  |  |  ORDER   |  |MANUFACTURING |  |  PICKUP  |     |
  |  |          |  |              |  |          |     |
  |  | textarea |  | US table     |  | result   |     |
  |  | submit   |  | status/cost  |  | open app |     |
  |  +----------+  +--------------+  +----------+     |
  |                                                    |
  +---------------------------|------------------------+
                              | SSE (real-time updates)
                              |
  EXPRESS SERVER               |
  +---------------------------|------------------------+
  |                           v                        |
  |  +----------------------------------------------+  |
  |  |              ORCHESTRATOR                     |  |
  |  |              (state machine)                  |  |
  |  |                                               |  |
  |  |  IDLE -> ORDERING -> ARCH_WORKING ->          |  |
  |  |  ARCH_REVIEW -> DEV_WORKING -> DEV_CHECK ->   |  |
  |  |  TEST_RUNNING -> DELIVERING -> DONE           |  |
  |  +-------|-----------------|--------------------+  |
  |          |                 |                       |
  |    +-----v-----+    +-----v------+   +---------+  |
  |    |   Agent   |    |   Agent    |   |   AC    |  |
  |    |  Manager  |    |  Prompts   |   | Checker |  |
  |    |           |    |  Library   |   |(scripts)|  |
  |    +-----+-----+    +------------+   +---------+  |
  |          |                                         |
  +----------|------ ----------------------------------+
             |
             v HTTPS
  +--------------------+
  |    OpenRouter      |
  |       API          |
  +--------------------+

### 4.2 Компоненты UI

Одностраничное приложение. Три блока появляются последовательно.

БЛОК ORDER:
  - textarea: "Опишите приложение, которое вы хотите создать"
  - кнопка Submit
  - Появляется первым, всегда видим

БЛОК MANUFACTURING:
  - Появляется после Submit
  - Таблица User Stories:
    | #  | User Story    | Agent | Status    | Cost  | Time   |
    | 1  | Architecture  | Arc   | Done      | $0.42 | 2m 15s |
    | 2  | Development   | Dev   | Running   | $0.08 | 0m 30s |
    | 3  | Testing       | Tst   | Waiting   | --    | --     |
  - Кнопки Approve / Ask Question (для шагов, требующих одобрения)
  - Итоговая строка: Total Cost / Total Time
  - Зона вопросов от агентов (если есть)

БЛОК PICKUP:
  - Появляется когда все US = Done
  - "Ваше приложение готово!"
  - Кнопка "Открыть" (DF запускает node workspace/app.js, даёт ссылку)
  - Кнопка "Скачать" (zip)

ОТЛОЖЕНО до v0.2:
  - Поле обратной связи: Да / Нет
  - Текст тикета -> новый эпик -> повторный цикл

### 4.3 Orchestrator (state machine)

НЕ AI-агент. Детерминированный код на JavaScript.

Состояния и переходы:

  IDLE
    | (user submits order)
    v
  ORDERING
    | (order saved to state/current.json)
    v
  ARCH_WORKING
    | (Architect agent called via OpenRouter API)
    | (Arc may return "questions" -> CLARIFYING)
    v
  CLARIFYING (опционально)
    | (owner отвечает на вопросы, ответы добавляются в контекст)
    | (Arc вызывается повторно)
    v
  ARCH_REVIEW
    | (owner видит предложенную архитектуру)
    | (owner clicks Approve)
    v
  DEV_WORKING
    | (Developer agent called, creates files in workspace/)
    v
  DEV_CHECK
    | (AC Checker запускает скрипты проверки)
    | (passed -> next step; failed -> retry Dev, max 3 attempts)
    v
  TEST_RUNNING
    | (Tester agent: code review + automated checks)
    | (AC Checker: app starts, responds on localhost)
    v
  DELIVERING
    | (start target app: node workspace/app.js)
    | (prepare zip archive)
    v
  DONE
    | (user sees Pickup block)

Обработка ошибок:
  - Невалидный JSON от агента -> retry с пометкой, max 3 попытки
  - AC check failed -> retry agent, max 3 попытки
  - Все retry исчерпаны -> статус ERROR, уведомление owner

### 4.4 Agent Manager

Отвечает за:
  - Формирование промпта (system + user + context)
  - Вызов OpenRouter API (POST https://openrouter.ai/api/v1/chat/completions)
  - Парсинг ответа
  - Извлечение файлов из ответа
  - Запись файлов на диск через File Manager
  - Подсчёт стоимости (из поля usage в ответе OpenRouter)
  - Подсчёт времени (замер от запроса до ответа)

Обязательный формат ответа агента (JSON):

  {
    "thinking": "описание хода мыслей агента",
    "files": [
      {
        "path": "relative/path/to/file.js",
        "content": "... полное содержимое файла ...",
        "action": "create"
      }
    ],
    "questions": [
      "Уточняющий вопрос к owner, если есть"
    ],
    "summary": "Что было сделано",
    "next_steps": ["Рекомендации для следующего шага"]
  }

Поле "questions": если массив не пустой, оркестратор переходит
в состояние CLARIFYING и показывает вопросы owner.

Поле "files": Agent Manager передаёт в File Manager,
который пишет файлы в workspace/.

### 4.5 AC Checker (Acceptance Criteria)

v0.1 — только программные проверки, без AI:

  architecture:
    - ARCHITECTURE.md exists in workspace/
    - ARCHITECTURE.md length > 500 characters

  development:
    - app.js (or index.js) exists in workspace/
    - node --check workspace/app.js exits with code 0
    - package.json exists (if needed)
    - npm install completes without errors (if package.json exists)

  testing:
    - node workspace/app.js starts without crash (wait 3 seconds)
    - GET http://localhost:TARGET_PORT responds with status 200
    - process can be killed cleanly

### 4.6 Cost Tracker

OpenRouter API response содержит поле usage:
  {
    "usage": {
      "prompt_tokens": 1250,
      "completion_tokens": 830,
      "total_cost": 0.0042
    }
  }

Cost Tracker:
  - Записывает стоимость каждого вызова
  - Привязывает к конкретной US
  - Замеряет wall-clock time каждого вызова
  - Отдаёт данные на фронтенд через SSE

## 5. Агенты

### 5.1 Конфигурация v0.1

  | Агент     | Роль                           | Модель           | Цена (in/out per 1M) |
  |-----------|--------------------------------|------------------|-----------------------|
  | Architect | Архитектура, структура, план    | claude-opus-4    | $15 / $75             |
  | Developer | Написание всего кода            | claude-sonnet-4  | $3 / $15              |
  | Tester    | Code review + рекомендации      | gemini-2.5-flash | $0.15 / $0.60         |

  Один агент Developer (не разделяем на FE/BE в v0.1).

  Прогноз затрат на 1 заказ (простое TODO-приложение):
    Architect: ~5K in, ~3K out  = ~$0.10 - $0.30
    Developer: ~10K in, ~8K out = ~$0.15 - $0.50
    Tester:    ~8K in, ~2K out  = ~$0.01 - $0.02
    Итого: ~$0.25 - $1.00 за простое приложение
    (с учётом возможных retry)

### 5.2 Промпты — структура

Каждый агент = system prompt + user prompt template.

System prompt содержит:
  1. Роль агента (кто ты, что ты делаешь)
  2. Обязательный формат ответа (JSON schema)
  3. Ограничения (что нельзя делать)
  4. Примеры хороших ответов (1-2 примера)

User prompt содержит:
  1. Контекст: описание заказа от пользователя
  2. Результаты предыдущих шагов (output предыдущих агентов)
  3. Конкретное задание (текущая US)
  4. Acceptance Criteria для этой US

Промпты хранятся в server/prompts/ как JS-модули
с функциями-шаблонами.

## 6. Целевое приложение (что DF создаёт)

### Ограничения v0.1

DF v0.1 создаёт ТОЛЬКО простые приложения:
  - Node.js + Express + статический HTML/CSS/JS
  - Одностраничные или с минимальной навигацией
  - Данные в памяти сервера (массив/объект)
  - Никаких баз данных, фреймворков, билд-систем

Это сознательное ограничение для повышения надёжности генерации.

### Демо-заказ

Для демонстрации используем заказ:
  "Простое приложение — список задач (TODO).
   Можно добавлять задачи, отмечать выполненными, удалять.
   Данные хранятся в памяти сервера."

## 7. Структура проекта

  dark-factory/
  |-- CONCEPT.md                    <- ЭТОТ ФАЙЛ
  |-- README.md
  |-- package.json
  |
  |-- server/
  |   |-- index.js                  Express server + SSE endpoint
  |   |-- orchestrator.js           State machine
  |   |-- agent-manager.js          API calls to OpenRouter
  |   |-- ac-checker.js             Acceptance criteria scripts
  |   |-- file-manager.js           Write generated files to disk
  |   |-- cost-tracker.js           Track API costs and time
  |   |-- prompts/
  |       |-- architect.js          Arc system + user prompt templates
  |       |-- developer.js          Dev system + user prompt templates
  |       |-- tester.js             Tst system + user prompt templates
  |
  |-- client/
  |   |-- index.html                Single page
  |   |-- styles.css                Fast-food themed UI
  |   |-- app.js                    Frontend logic + SSE listener
  |
  |-- workspace/                    Target app generated here
  |   |-- (created dynamically)
  |
  |-- state/
  |   |-- current.json              Current pipeline state
  |
  |-- docs/
      |-- presentation/
          |-- screenshots/

## 8. Технологические решения

  | Вопрос                       | Решение              | Обоснование            |
  |------------------------------|----------------------|------------------------|
  | SM — AI или код?             | Код (state machine)  | Надёжность             |
  | Агенты — Roo или API?       | Прямые вызовы API    | Независимость от IDE   |
  | Tester — AI или скрипты?    | Скрипты + минимум AI | Предсказуемость        |
  | Real-time обновления UI     | SSE                  | Проще WebSocket        |
  | Хранение состояния          | JSON файл            | Минимум зависимостей   |
  | DevFE + DevBE или один Dev? | Один Dev             | Простота для v0.1      |
  | Невалидный JSON от агента   | Retry (max 3)        | Простое решение        |
  | AC check failed             | Retry agent (max 3)  | Простое решение        |

## 9. Roadmap

### v0.1 — курсовой проект (45 дней)
  [x] Концепция утверждена
  [ ] Линейный pipeline (3 агента: Arc, Dev, Tst)
  [ ] Ручные approvals между шагами
  [ ] Генерация простых Node.js приложений
  [ ] Один цикл (без повторных эпиков)
  [ ] Веб-интерфейс с 3 блоками
  [ ] Cost + time tracking
  [ ] SSE для real-time обновлений
  [ ] Демо с TODO-приложением

### v0.2 — после курса
  [ ] Feedback loop (блок "Нет, не нравится" -> новый эпик)
  [ ] AI-агент для проверки AC
  [ ] DevFE + DevBE раздельно
  [ ] Выбор "качество/цена" в начале
  [ ] Генерация более сложных приложений
  [ ] История заказов
  [ ] Запуск целевого приложения в изолированном контейнере (Dev Containers / Docker)
  [ ] Tester пишет автотесты ПОСЛЕ кода (test-after)
  [ ] Цикл Dev <-> Tester при падении тестов (max 3 итерации)

### v0.3+ — перспектива
  [ ] SM как AI-агент
  [ ] Параллельное выполнение US
  [ ] Поддержка различных стеков (SAP CAP, React, и др.)
  [ ] Git integration (коммиты, PR)
  [ ] Деплой целевого приложения в облако
  [ ] Мультипользовательский режим
  [ ] Полный TDD: Tester пишет тесты ДО кода
  [ ] Dev пишет код для прохождения тестов
  [ ] Валидация тестов перед передачей Dev