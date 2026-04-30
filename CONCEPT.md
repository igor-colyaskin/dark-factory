# CONCEPT.md — Dark Factory

## Версия документа

| Версия     | Дата       | Статус       | Изменения                                    |
|------------|------------|--------------|----------------------------------------------|
| v0.1-draft | 2026-04-26 | Утверждено   | Первичная концепция                          |
| v0.2-draft | 2026-04-29 | В работе     | Deploy to Cloud: Fly.io вместо child_process |

## 1. Что такое Dark Factory

Dark Factory (DF) — веб-приложение, реализующее концепцию
"фабрики приложений". Пользователь описывает желаемое приложение
в текстовом поле, DF автоматически организует процесс разработки
через AI-агентов и выдаёт готовый результат.

Метафора: фастфуд.
- Сделал заказ
- Смотришь, как готовят (прозрачность: время, деньги, этапы)
- Забираешь готовое — публичную ссылку на работающее приложение

Принцип "фастфуд, а не IKEA":
Результат работы DF — готовое приложение, доступное по публичной ссылке.
Пользователь получает работающий продукт, а не инструкцию по сборке.
Получатель ссылки (тот, кому пользователь перешлёт результат) не обязан устанавливать Docker, Node.js или что-либо ещё — достаточно браузера.

## 2. Ключевые принципы

1. ПРОЗРАЧНОСТЬ — пользователь видит каждый шаг, стоимость, время
2. ПРОСТОТА — линейный pipeline, ручные approvals
3. ЭВОЛЮЦИОННОСТЬ — v0.1 -> v0.2 -> ... через загрузку этого файла в контекст
4. НАДЁЖНОСТЬ — оркестратор = детерминированный код, не AI
5. КАЩЕЙНАЯ СТАДИЯ — в v0.2 DF однопользовательская, для владельца. Массовая раздача не в scope. Это даёт свободу экспериментировать без обязательств перед чужими пользователями.

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
  - Информационная шпаргалка (видна во время DEPLOYING):
    "Ваше приложение публикуется в облаке.
    Будет доступно по публичной ссылке 24 часа.
    Ссылкой можно поделиться с кем угодно."
   
БЛОК PICKUP (v0.2):
  - Появляется когда все US = Done и DEPLOYING = Done
  - "Ваше приложение готово!"
  - Публичный URL вида https://<app-name>.fly.dev
  - Кнопка "Открыть" (новая вкладка)
  - Кнопка "Скопировать ссылку"
  - QR-код на URL (для отправки на мобильное устройство)
  - Информационный блок: "Приложение будет доступно 24 часа"
  - Кнопка "Скачать" (zip с исходниками) — остаётся как опция

ОТЛОЖЕНО до v0.2.1:
  - Блок "Мои приложения": список созданных приложений
  - Кнопки "Продлить на 24 часа" / "Удалить сейчас"

ОТЛОЖЕНО до v0.3:
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
    | (prepare workspace: add Dockerfile and fly.toml templates)
    | (prepare zip archive as fallback artifact)
    v
  DEPLOYING
    | (Fly Manager creates app via flyctl)
    | (flyctl deploy triggers remote builder)
    | (wait for machine to become healthy, timeout 180s)
    | (retry max 2 times on transient errors)
    v
  DONE
    | (user sees Pickup block with public URL)

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

Architect response format (NO file contents):
  {
    "thinking": "brief reasoning",
    "files": [
      {"path": "app.js", "description": "what this file does"}
    ],
    "questions": [],
    "summary": "what was decided",
    "next_steps": ["recommendations"]
  }

Developer response format (WITH file contents):
  {
    "thinking": "brief reasoning",
    "files": [
      {
        "path": "app.js",
        "content": "full file content",
        "action": "create"
      }
    ],
    "questions": [],
    "summary": "what was done"
  }
  
Поле "questions": если массив не пустой, оркестратор переходит
в состояние CLARIFYING и показывает вопросы owner.

Поле "files": Agent Manager передаёт в File Manager,
который пишет файлы в workspace/.

### 4.5 AC Checker (Acceptance Criteria)

v0.2 — только статические проверки, без runtime и без локального Docker:

  architecture:
    - ARCHITECTURE.md exists in workspace/
    - ARCHITECTURE.md length > 500 characters

  development:
    - app.js (or index.js) exists in workspace/
    - node --check workspace/app.js exits with code 0
    - package.json exists, валидный JSON
    - package.json содержит "start" script
    - package.json содержит express в dependencies
    - entrypoint (из package.json start) существует в workspace/

  testing:
    - статические проверки кода (линт, наличие обязательных элементов)
    - проверка использования process.env.PORT (не хардкод)

Runtime-проверка приложения:
  - Самостоятельного runtime в AC Checker НЕТ
  - Интеграционной проверкой служит сам DEPLOYING
  - Если приложение не стартует в Fly — это фиксируется как fail деплоя
  - Retry деплоя работает как retry AC (max 2 попытки)

Обоснование отказа от локального runtime:
  - Безопасность: не запускаем AI-сгенерированный код на машине DF
  - Простота: нет Docker, нет child_process, нет port management
  - Реалистичность: проверка происходит в целевом окружении (Fly)

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


### 4.7 Fly Manager (v0.2)

Отвечает за:
  - Создание Fly app с уникальным именем
  - Генерацию шаблонных Dockerfile и fly.toml в workspace/
  - Вызов flyctl через child_process для деплоя
  - Ожидание готовности машины
  - Извлечение публичного URL
  - Retry при транзиентных ошибках (Unable to pull image, timeout)
  - Удаление приложения по истечении TTL (фоновый процесс)

Интеграция:
  - flyctl CLI, авторизация через FLY_API_TOKEN в .env
  - Локальный Docker НЕ требуется — Fly использует remote builder
  - Шаблоны Dockerfile и fly.toml хранятся в server/templates/

Константы конфигурации:
  - Регион: fra (Frankfurt)
  - Память: 256MB RAM
  - CPU: shared-cpu-1x
  - auto_stop_machines: stop (экономия при простое)
  - auto_start_machines: true (просыпание за 1-2 сек при запросе)
  - min_machines_running: 0
  - internal_port: 8080

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

### Ограничения v0.2

DF v0.2 создаёт ТОЛЬКО простые приложения:
  - Node.js + Express + статический HTML/CSS/JS
  - Одностраничные или с минимальной навигацией
  - Данные в памяти сервера (массив/объект)
  - Никаких баз данных, фреймворков, билд-систем
  - **Порт через process.env.PORT (дефолт 8080 для Fly)**
  - Слушать на 0.0.0.0, не на localhost
  - Node.js версия >= 20 (engines в package.json)

Это сознательное ограничение для повышения надёжности генерации
и совместимости с инфраструктурой Fly.io.

### Демо-заказ

Для демонстрации используем заказ:
  "Простое приложение — список задач (TODO).
   Можно добавлять задачи, отмечать выполненными, удалять.
   Данные хранятся в памяти сервера."

## 7. Структура проекта

Directory structure:
└── dark-factory/
    ├── CHEATSHEET.md
    ├── client/
    │   ├── app.js
    │   ├── index.html
    │   └── styles.css
    ├── CONCEPT.md
    ├── docs/
    │   ├── FLY_MANAGER.md
    │   ├── presentation/
    │   │   └── screenshots/

    │   └── RUN_MODES.md
    ├── mock-workspace/
    │   ├── app.js
    │   ├── package.json
    │   └── public/
    │       ├── app.js
    │       ├── index.html
    │       └── styles.css
    ├── package-lock.json
    ├── package.json
    ├── README.md
    ├── server/
    │   ├── ac-checker.js
    │   ├── agent-manager.js
    │   ├── cost-tracker.js
    │   ├── file-manager.js
    │   ├── fly-manager.js
    │   ├── index.js
    │   ├── mock-agent-manager.js
    │   ├── orchestrator.js
    │   ├── prompts/
    │   │   ├── architect.js
    │   │   ├── developer.js
    │   │   └── tester.js
    │   └── templates/
    │       ├── Dockerfile.template
    │       └── fly.toml.template
    ├── state/

    ├── test/
    │   ├── agents.test.js
    │   ├── fly-integration.test.js
    │   ├── fly-manager.test.js
    │   └── orchestrator.test.js
    ├── test-agent.js
    ├── test-agent2.js
    ├── test-api.js
    ├── TRACKER.md
    └── workspace/

## 8. Технологические решения

  | Вопрос                       | Решение              | Обоснование            |
  |------------------------------|----------------------|------------------------|
  | SM — AI или код?             | Код (state machine)  | Надёжность             |
  | Агенты — Roo или API?       | Прямые вызовы API    | Независимость от IDE   |
  | Tester — AI или скрипты?    | Скрипты + минимум AI | Предсказуемость        |
  | Real-time обновления UI     | SSE                  | Проще WebSocket        |
  | Хранение состояния          | JSON файл            | Минимум зависимостей   |
  | DevFE + DevBE или один Dev? | Один Dev             | Простота для v0.2      |
  | Невалидный JSON от агента   | Retry (max 3)        | Простое решение        |
  | AC check failed             | Retry agent (max 3)  | Простое решение        |
  | Режимы работы               | RUN_MODE (4 режима)  | Гибкость разработки    |
  | Хостинг output-приложений   | Fly.io               | UX без установки ПО    |
  | Build образов               | Fly remote builder   | Без локального Docker  |
  | Интеграция с Fly            | flyctl CLI           | Проще HTTP API         |
  | Runtime проверка приложения | Через сам деплой     | Безопасность, простота |
  | Session tracking (v0.2.1)   | localStorage         | Без аутентификации     |
  | TTL деплоев                 | 24 часа hard         | Защита от захламления  |
  | Конфигурация режимов        | Флаги в run-modes.js | Расширяемость          |

## 8.1 Режимы работы (RUN_MODE)

Dark Factory поддерживает 4 режима работы через переменную окружения `RUN_MODE`:

### production (по умолчанию)
- Реальные вызовы OpenRouter API
- Файлы пишутся в workspace/
- Полная функциональность
- Время: 60-90 секунд
- Стоимость: $0.25-1.00 за заказ
- **Использование:** Реальная генерация приложений

### mock-full
- Mock ответы от агентов (хардкодные)
- Файлы пишутся в workspace/
- Тестируется File Manager, AC Checker, Fly Manager
- Реальный деплой на Fly.io (но без реального LLM — экономия на API)
- Время: ~90 секунд (основное время — деплой на Fly)
- Стоимость: $0 LLM + ~$0.01 Fly за деплой
- **Использование:** Отладка интеграции с Fly.io без расходов на LLM

### mock-fast
- Mock ответы от агентов
- Копирует готовые файлы из mock-workspace/
- Не тестирует File Manager
- БЕЗ деплоя на Fly — возвращает fake URL
- Время: ~6 секунд
- Стоимость: $0
- **Использование:** Быстрая отладка UI/UX, тестирование SSE

### demo
- Mock ответы от агентов
- Копирует готовые файлы из mock-workspace/
- Медленные задержки (3 сек на агента) для эффекта
- БЕЗ реального деплоя — fake URL с красивой анимацией
- Время: ~9 секунд
- Стоимость: $0
- **Использование:** Презентации, демонстрации

### Команды запуска

```bash
npm start              # production
npm run mock:full      # mock-full + clean
npm run mock:fast      # mock-fast (без clean)
npm run demo           # demo (без clean)
npm run fresh          # production + clean
```
### Техническая реализация

Режимы определяются в server/run-modes.js как наборы булевых флагов
(mockLLM, mockWorkspace, skipAC, fakeDeploy, demoDelays). Добавление
нового режима = добавление строки в объект RUN_MODES.

В режимах с fakeDeploy: true генерируется плейсхолдер-URL вида
https://df-mock-<hash>.fly.dev с визуальной пометкой в UI о том,
что деплой не производился.

## 9. Roadmap

### v0.1 — курсовой проект (45 дней)
  [x] Концепция утверждена
  [x] Линейный pipeline (3 агента: Arc, Dev, Tst)
  [x] Автоматический approval (ARCH_REVIEW -> DEV_WORKING)
  [x] Генерация простых Node.js приложений (порт 3001)
  [x] Один цикл (без повторных эпиков)
  [x] Веб-интерфейс с 3 блоками (ORDER, MANUFACTURING, PICKUP)
  [x] Cost + time tracking (через Cost Tracker)
  [x] SSE для real-time обновлений (broadcast через sseClients)
  [x] Демо с TODO-приложением
  [x] Retry механизм (max 3 попытки для агентов и AC checks)
  [x] Architect возвращает только path+description (без content)
  [x] Developer создаёт полный код всех файлов
  [x] AC Checker проверяет синтаксис и запуск приложения
  [x] File Manager записывает файлы в workspace/
  [x] npm скрипты: start, dev, restart, clean, fresh

### v0.2 — Deploy to Cloud
  Цель: пользователь получает публичную ссылку на работающее приложение,
  которой можно поделиться.

  [ ] Fly Manager (server/fly-manager.js)
  [ ] Состояние DEPLOYING в оркестраторе
  [ ] Шаблоны Dockerfile и fly.toml (server/templates/)
  [ ] AC Checker: статические проверки + деплой как интеграционный тест
  [ ] Обновлённый блок PICKUP (URL, кнопки, QR-код)
  [ ] Информационная шпаргалка во время DEPLOYING
  [ ] Retry-логика для транзиентных ошибок деплоя
  [ ] Гигиена конфигурации (.env.example, валидация при старте)
  [ ] Session ID через localStorage (закладка для v0.2.1)
  [ ] TTL 24 часа hard (без UI управления)
  [ ] Обновление режимов mock-full/mock-fast/demo под новый pipeline
  [ ] README: секция Installation

### v0.2.1 — My Apps
  Цель: пользователь видит и управляет своими приложениями.

  [ ] Хранилище state/apps.json (session-scope)
  [ ] Endpoints: GET /api/my-apps, POST /api/apps/:id/extend, DELETE /api/apps/:id
  [ ] UI блок "Мои приложения"
  [ ] Кнопки "Продлить на 24 часа", "Удалить сейчас"
  [ ] Автоматическое удаление по TTL (cleanup worker)

### v0.3 — TBD (концептуально, не планируется детально)
  [ ] Feedback loop (блок "Нет, не нравится" -> новый эпик)
  [ ] AI-агент для проверки AC
  [ ] DevFE + DevBE раздельно
  [ ] Выбор "качество/цена" в начале
  [ ] Генерация более сложных приложений
  [ ] Генерация клиентских приложений в одном HTML (игры без сервера)
  [ ] Tester пишет автотесты ПОСЛЕ кода (test-after)
  [ ] Цикл Dev <-> Tester при падении тестов (max 3 итерации)
  [ ] Поле загрузки изображения (mockup/wireframe) в блоке Order
  [ ] Отправка изображения vision-модели для описания UI
  [ ] Передача описания UI в контекст Architect
  [ ] DF as a service (деплой самой DF в облако)
  [ ] "Забрать с собой" для power-users (zip + devcontainer)

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

## 10. Ключевые архитектурные решения v0.2

Зафиксированы после фазы 0 (проверочный деплой Hello World на Fly.io):

1. Хостинг output-приложений: Fly.io
   - Альтернативы рассматривались: Render (sleep), Railway, Vercel (не тот use case)
   - Выбор обоснован: универсальность Node.js, API для программного управления,
     auto-stop для экономии, прозрачная стоимость

2. Локальный Docker на машине DF: НЕ ТРЕБУЕТСЯ
   - Fly использует remote builder для сборки образов
   - Подтверждено экспериментально

3. Интеграция с Fly: через flyctl CLI (child_process)
   - Альтернатива — HTTP API, но CLI проще и стабильнее

4. Единичные ресурсы приложения: 256MB RAM, shared-cpu-1x, регион fra
   - Достаточно для простых Node.js приложений
   - Минимальная стоимость

5. Auto-stop/auto-start: включён
   - Машина засыпает при простое (экономия)
   - Просыпается за 1-2 сек при запросе

6. AC Checker: только статика + деплой как интеграционный тест
   - Никакого локального runtime AI-кода
   - Безопасность + простота

7. TTL приложений: 24 часа hard limit в v0.2
   - UI управления появится в v0.2.1
   - Автоматическая очистка через cleanup worker

8. Кащейная стадия: single-user self-hosted
   - Раздача коллегам через мораторий
   - Гигиена конфигурации (.env.example) всё равно поддерживается
   - Для будущей раздачи или для собственного переноса на другую машину

9. Конфигурация режимов работы: через флаги в run-modes.js
   - Альтернатива — строковые if-ветки в разных местах кода
   - Выбор: централизация, прозрачность, расширяемость   

## 11. Требования к сгенерированному приложению v0.2

Developer-агент обязан создать приложение, соответствующее следующим требованиям:

package.json:
  - "start" script, запускающий сервер
  - "express" в dependencies
  - "engines.node": ">=20.0.0"

app.js (или указанный в start):
  - const port = process.env.PORT || 8080
  - app.listen(port, '0.0.0.0', ...) — слушать на всех интерфейсах
  - Корневой маршрут GET / возвращает 200

Запрещено:
  - Хардкод порта
  - app.listen без указания '0.0.0.0'
  - Зависимости от локальных файлов вне workspace/
  - Использование localhost для bind

Всё это формализуется в AC Checker как статические проверки.