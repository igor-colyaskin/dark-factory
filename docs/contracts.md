# contracts.md — Dark Factory: контракты компонентов

Контракты между компонентами DF: что принимают, что возвращают,
какие инварианты соблюдают.

**Текущее состояние:** v0.2.1

**Статус документа:** draft — конспективное содержание со ссылками
на источники. Детали достаются из source по запросу, когда становятся
блокером в работе над фазой.

---

## Architect `draft`

## Architect `baseline`

### Роль
Анализирует заказ, задаёт уточняющие вопросы, генерирует спецификацию.
Два режима ответа: `clarify` (вопросы с вариантами) и `spec` (спецификация).

### Модель
`anthropic/claude-opus-4` — $15 / $75 per 1M tokens

### Вход / выход
- Вход: `orderDescription` + опционально `clarifyHistory[]` + `round` / `maxRounds`
- Выход (clarify): `{ mode: "clarify", questions: [{ id, text, options[], allowOther }], progress }`
- Выход (spec): `{ mode: "spec", appSlug, spec: { summary, features[], screens[], constraints[], warnings[], estimatedCost, estimatedTime } }`

### Ключевые правила
- Ясный заказ → spec сразу, без вопросов
- Неоднозначный → clarify, 1-5 вопросов с вариантами
- Max 3 раунда, на последнем — принудительный spec
- Вопросы только если ответ меняет архитектуру
- Никогда не спрашивает про цвета, шрифты, анимации

### Источники истины
- **System prompt:** `server/prompts/architect.js` → `systemPrompt`
- **User prompt template:** `server/prompts/architect.js` → `generateUserPrompt()`
- **Калибровочный тест:** `scripts/test-architect-v2.js` (10 заказов, критерий 9/10)
---

## Developer `draft`

### Роль
Реализует приложение полностью — пишет весь код по архитектуре.

### Модель
`anthropic/claude-sonnet-4` — $3 / $15 per 1M tokens

### Вход / выход (high-level)
- Вход: `orderDescription` + полный output Architect'а + опционально
  `retryCount` и `errorFeedback`
- Выход: JSON с `files[]` где **каждый файл содержит полный `content`**
  (ключевое отличие от Architect)

### Ключевые правила (Target App)
- Серверный код: `process.env.PORT || 8080`, `listen(port, '0.0.0.0')`
- `package.json`: `start` script, `express`, `engines.node >=20.0.0`
- Никаких placeholder'ов, обрезанного кода, `// rest of code`
- Полный список — см. раздел Target App ниже

### Retry
- До 3 раз при невалидном JSON или AC check fail
- При retry в prompt добавляется `errorFeedback` из предыдущей попытки

### Источники истины
- **System prompt:** `server/prompts/developer.js` → `systemPrompt`
- **User prompt template:** `server/prompts/developer.js` → `generateUserPrompt()`
- **AC checks:** `server/ac-checker.js`

---

## Tester `draft`

### Роль
Code review после успешного AC check. Рекомендации, не блокирует pipeline.

### Модель
`google/gemini-2.5-flash` — $0.15 / $0.60 per 1M tokens

### Вход / выход (high-level)
- Вход: order + Architect output + Developer output (с полным контентом файлов)
- Выход: JSON с `files: []` (всегда пустой — Tester не пишет код),
  `summary` с уровнем оценки, `next_steps[]`

### Уровни оценки
В `summary` начинается с одного из: EXCELLENT / GOOD / ACCEPTABLE / NEEDS WORK

### Источники истины
- **System prompt:** `server/prompts/tester.js` → `systemPrompt`
- **User prompt template:** `server/prompts/tester.js` → `generateUserPrompt()`

---

## Orchestrator `draft`

### Роль
Детерминированная state machine. Координирует агентов, обрабатывает
ошибки и retry, подписывается на события через SSE.

**НЕ AI.** Обычный JavaScript class.

### States
`IDLE → ORDERING → ARCH_WORKING → [CLARIFYING →] SPEC_REVIEW →
DEV_WORKING → DEV_CHECK → TEST_RUNNING → DELIVERING → DEPLOYING → DONE`

При ошибках → `ERROR`

### Ключевые механизмы
- **Agent retry:** до 3 раз через `agent-manager.callAgentWithRetry`
- **AC retry:** до 3 раз на Developer при fail AC check
- **Deploy retry:** до 2 раз, только для транзиентных ошибок
- **Deploy timeout:** 300 секунд
- **App name generation:** из `appSlug` Architect'а, fallback на UUID
- **Archive:** перед DONE вызывает `appsStore.addApp()`, не блокирует DONE при ошибке

### Поля state
Полный список полей — в конструкторе класса `Orchestrator`.
Для UI/SSE важны: `state`, `userStories`, `questions`, `publicUrl`,
`appName`, `error`, `isFakeDeploy` (computed), `runMode`, `clarifyHistory`, `clarifyRound`, `currentSpec`

### Источники истины
- **State machine, переходы, поля:** `server/orchestrator.js`
- **Deploy механика:** `server/orchestrator.js` → `executeDeploy` / `executeFakeDeploy`
- **SSE broadcasting:** `server/index.js` → `broadcastState`, plus
  `orchestrator.broadcastEvent` для deploy_progress events

---

## Target App `draft`

### Класс приложений v0.2
Простые Node.js + Express приложения с in-memory state.

### Обязательно
- Node.js >= 20 (`package.json` → `engines.node`)
- `express` в dependencies, `start` script в scripts
- `process.env.PORT || 8080`
- `listen(port, '0.0.0.0', ...)` — обязательно `'0.0.0.0'`
- `GET /` возвращает 200
- Vanilla HTML/CSS/JS на фронте

### Запрещено
- Хардкод порта, `listen` без второго аргумента, `localhost` как bind
- БД любого вида
- Build tools, TypeScript, React/Vue/etc
- Зависимости от файлов вне проекта

### Почему
- `0.0.0.0` + `process.env.PORT` — для работы в Fly контейнере
- Vanilla + без БД — простой Dockerfile, быстрый деплой
- Node >=20 — Dockerfile template использует `node:22`

### Источники истины
- **Что проверяется статически:** `server/ac-checker.js`
- **Что требуется от Developer'а:** `server/prompts/developer.js` →
  DEPLOYMENT REQUIREMENTS section в systemPrompt
- **Dockerfile/fly.toml templates:** `server/templates/`
- **Historical context:** `CONCEPT.md` §6, §13 (будет удалено после миграции)

---

## Эволюция документа

Этот документ переходит из `draft` в `baseline` по мере того, как
отдельные разделы становятся актуальными для работы над версией.

- **v0.3 Phase 1:** Architect → полная переработка, станет `baseline`
- **v0.3 Phase 3:** Orchestrator → обновление state machine, станет `baseline`
- **v0.3 Phase 6:** Developer → адаптация под новый формат spec
- **Target App:** остаётся `draft` пока класс приложений не расширяется