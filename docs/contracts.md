# contracts.md — Dark Factory: контракты компонентов

Контракты между компонентами DF: что принимают, что возвращают,
какие инварианты соблюдают.

**Текущее состояние:** v0.10

**Статус документа:** draft — конспективное содержание со ссылками
на источники. Детали достаются из source по запросу, когда становятся
блокером в работе над фазой.

---

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
DEV_WORKING → DEV_CHECK → TEST_RUNNING → DELIVERING → DEPLOYING → GITHUB_PUSH → DONE`

При ошибках → `ERROR`

### Ключевые механизмы
- **Agent retry:** до 3 раз через `agent-manager.callAgentWithRetry`
- **AC retry:** до 3 раз на Developer при fail AC check
- **Deploy retry:** до 2 раз, только для транзиентных ошибок
- **Deploy timeout:** 300 секунд
- **App name generation:** `df-<slug>-<number>` — унифицировано для Deployer и GitHub
- **Archive:** перед DONE вызывает `appsStore.addApp()`, не блокирует DONE при ошибке
- **GITHUB_PUSH:** non-blocking — если GitHub недоступен, `sourceUrl = null`, заказ завершается

### Поля state
Полный список полей — в конструкторе класса `Orchestrator`.
Для UI/SSE важны: `state`, `userStories`, `questions`, `publicUrl`,
`appName`, `sourceUrl`, `error`, `isFakeDeploy` (computed), `runMode`,
`clarifyHistory`, `clarifyRound`, `currentSpec`

### Источники истины
- **State machine, переходы, поля:** `server/orchestrator.js`
- **Deploy механика:** `server/orchestrator.js` → `executeLocalDeploy` / `executeFakeDeploy`
- **SSE broadcasting:** `server/index.js` → `broadcastState`, plus
  `orchestrator.broadcastEvent` для deploy_progress events

---

## Source Storage `baseline`

> **IC-профиль:** GitHub/Source Storage убран из scope DF-IC (решение 2026-05-09).
> Вывод IC-карточки = файлы в `cards/{slug}/`, разработчик деплоит в Work Zone сам.
> Всё нижеследующее применимо только к Node.js-app профилю.

### Роль
Сохраняет исходный код сгенерированного приложения во внешнем хранилище.
GitHub Client — первая и единственная имплементация (v0.4).

### Контракт
- `saveApp(appName, files, meta) → sourceUrl` — создать репо, закоммитить файлы
- `deleteApp(appId) → void` — удалить репо
- `readApp(sourceUrl) → { success, spec }` — читает SPEC.md из репо по GitHub URL (v0.5)
- `updateApp(appId, files)` — зарезервировано для будущих версий

> Facade-модуль `storage.js` не создаётся до появления второй имплементации.
> Принцип: "контракт выводится из двух реализаций, не из одной".

### Поле `sourceUrl`
Поле `sourceUrl`, а не `githubUrl` — абстракция от конкретного бэкенда.
Хранится в `apps.json` записи. При недоступном GitHub — `null`.

### Источники истины
- **GitHub Client:** `server/github-client.js`
- **Token storage:** `server/github-tokens.js` → `state/github-tokens.json`
- **README/SPEC генерация:** `server/readme-generator.js`
- **Интеграция:** `server/orchestrator.js` → `executeGithubPush()`

---

## Local Runner `baseline`

### Роль
Запускает сгенерированное приложение локально. Первая (и единственная) реализация
Deployer-контракта (v0.6). Fly.io-адаптер — Area-51 до разблокировки VDI.

### Контракт
- `deploy(appName, onProgress?) → { url, pid, port }` — копирует workspace, npm install, npm start, ждёт HTTP
- `teardown(pid, appName) → void` — SIGTERM процессу

> Facade-модуль `deployer.js` не создаётся до появления второй реализации.

### Process Registry
`server/process-registry.js` — singleton, in-memory Map.
- `register(appName, { pid, port })` / `get(appName)` / `remove(appName)` / `list()`
- Не переживает перезапуск сервера — by design (on-demand модель)

### Источники истины
- **Local Runner:** `server/local-runner.js`
- **Process Registry:** `server/process-registry.js`
- **Интеграция:** `server/orchestrator.js` → `executeLocalDeploy()`
- **On-demand API:** `server/index.js` → `POST /api/my-apps/:id/open`, `GET /api/my-apps/:id/status`
- **Workspaces:** `workspaces/{appName}/` (в `.gitignore`)

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

## IC Profile (Integration Card) `baseline`

Контракты агентов при активном профиле `integration-card`.
Всё, что ниже, переопределяет базовые контракты Architect/Developer/Tester
только в рамках IC-профиля. Base pipeline (state machine, SSE, GitHub push) не меняется.

---

### IC Architect

#### Роль
Собирает spec SAP Work Zone Integration Card (Component / Simple Form pattern).
Те же два режима, что и base: `clarify` и `spec`.

#### Модель
Та же, что у base Architect.

#### Вход / выход

- Вход: `orderDescription` + `clarifyHistory[]` + `round / maxRounds`
- Выход (clarify): `{ mode: "clarify", questions: [{ id, text, options[], allowOther }], progress }`
- Выход (spec): `{ mode: "spec", appSlug, spec: { ...IC spec fields } }`

#### Spec fields (v0.9)

```json
{
  "cardSlug":        "employeecard",
  "cardTitle":       "Employee Details",
  "cardSubtitle":    "HR Information",
  "formTitle":       "Employee Details",
  "destinationName": "HCM_API",
  "protocol":        "rest",
  "layout":          "form",
  "generateTests":   true,
  "generateDocs":    false,
  "fields": [
    { "beField": "FirstName", "viewKey": "firstName", "i18nKey": "FIRST_NAME", "label": "First Name", "control": "Text" }
  ],
  "mockData": { "FirstName": "Adam Taylor" }
}
```

`protocol`: `rest` | `odata2` | `odata4` | `other`
`layout`: `form` | `table` | `other`
`control`: `Text` | `Link` | `ObjectStatus`

#### Output Questions Round

После сбора spec Architect задаёт ОТДЕЛЬНЫЙ clarify-раунд — только о generateTests и generateDocs.
НИКОГДА не смешивает output-вопросы с spec-вопросами.
Если последний раунд и вопросы ещё не заданы — `generateTests: false, generateDocs: false` по умолчанию.

#### Источники истины
- **System prompt + generateUserPrompt:** `server/prompts/integration-card/architect.js`

---

### IC Developer

#### Роль
Генерирует **5 extension-point файлов** через LLM и **статические файлы** без LLM.

#### Модель
Та же, что у base Developer.

#### LLM-файлы (всегда, 5 штук)

| Файл | Суть |
|------|------|
| `src/manifest.json` | sap.app.id, destination, keywords |
| `src/helpers/DataHelper.js` | `_processData()`: BE PascalCase → view camelCase |
| `src/View.view.xml` | FormElements + bindings + i18n |
| `src/i18n/i18n.properties` | CARD_TITLE, CARD_SUBTITLE, FORM_TITLE, field labels |
| `src/test/utils/MockDataGenerator.js` | BE-shaped mock object |

#### LLM-файлы (условно)

| Файл | Условие |
|------|---------|
| `src/test/unit/helpers/DataHelper.qunit.js` | `spec.generateTests = true` |

DataHelper.qunit.js — 4 QUnit-модуля: field mapping, missing fallback, null fallback, immutability.

#### Статические файлы — `generateStaticFiles(cardSlug, spec)`

**Всегда:**
`src/Component.js`, `src/Main.controller.js`, `src/model/formatter.js`,
`src/test/mockserver.js`, `src/test/utils/DataEngine.js`,
`package.json`, `ui5-local.yaml`, `ui5.yaml`, `README.md`

**Если `spec.generateDocs`:**
`confluence.md` (placeholder: title + 2×2 таблица)

**Если `spec.generateTests`:**
`src/test/unit/AllTests.js`, `.nycrc.json`,
`package.json` с test-скриптом и ui5-test-runner devDeps

#### Retry / errorFeedback
При fail DEV_CHECK (`npm test`) ошибка сохраняется в `lastACError` (index.js)
и передаётся в `generateUserPrompt` как 4-й параметр.

#### Источники истины
- **System prompt + generateUserPrompt + generateStaticFiles:** `server/prompts/integration-card/developer.js`

---

### IC Tester

#### Роль
Code review после DEV_CHECK. Не блокирует pipeline. Видит все файлы (LLM + статические) — починено в v0.9.

#### Источники истины
- **System prompt + generateUserPrompt:** `server/prompts/integration-card/tester.js`

---

### IC Pipeline отличия от base

| Аспект | Base (nodejs-app) | IC (integration-card) |
|--------|-------------------|----------------------|
| deployer | `local-runner` | `none` → DEPLOYING мгновенно |
| verifier | `vision` (puppeteer + gemini) | `manifest` → VerifierC structural check |
| DEV_CHECK | AC checker (Node.js статика) | `npm test` если generateTests, иначе skip |
| Workspace | single app.js + express | `cards/{slug}/` — постоянное хранилище (v0.11+) |

#### Источники истины
- **Profile config:** `server/profiles/integration-card.js`
- **DEV_CHECK logic:** `server/index.js` → `runDevCheck()`
- **Manifest verifier:** `server/verifier-c.js`

---

## Эволюция документа

Этот документ переходит из `draft` в `baseline` по мере того, как
отдельные разделы становятся актуальными для работы над версией.

- **v0.3 Phase 1:** Architect → полная переработка, станет `baseline`
- **v0.3 Phase 3:** Orchestrator → обновление state machine, станет `baseline`
- **v0.3 Phase 6:** Developer → адаптация под новый формат spec
- **Target App:** остаётся `draft` пока класс приложений не расширяется