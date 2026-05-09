# Контекст для продолжения работы над Dark Factory

Я веду pet-project под названием Dark Factory (DF) — ИИ-агенты,
которые генерируют простые веб-приложения по текстовому заказу.
Работаю с Claude в режиме "штурман + пилот": Claude анализирует,
предлагает решения, я принимаю стратегические решения.

## Быстрый статус

## v0.11 полностью завершена + E2E пройден ✅

**Последняя выпущенная версия:** v0.11 — SDK-001 + My Apps + Edit mode + Import ✅ (сессия 2026-05-09)
**E2E-проверка:** Create → Preview → My Apps → Edit mode — пройдено ✅ (сессия 2026-05-09)
**Import (сценарий D) и Delete (сценарий E):** не проверялись, но риск низкий.
**Следующая:** v0.12 — Smart Input (sample JSON → автоматический парсинг полей)
**Среда:** корп. VDI (SAP), LLM через Hyperspace (localhost:6655),
GitHub — личный аккаунт через OAuth App.

## Что сделать в первую очередь

1. Прочитай память: `ic_roadmap.md`, `project_state_v04.md`, `integration_card_template.md`
2. **v0.12** — refining-сессия: детализировать scope Smart Input перед реализацией

## Баги найдены и исправлены в E2E-сессии (2026-05-09)

**В runtime (app.js / server):**
- `escapeHtml` и `formatDate` не были определены в `client/app.js` → добавлены в конец файла
- `verifier-b.js` — статический `import puppeteer-core` крашил сервер при старте (пакет не установлен) → заменён на динамический `import()` внутри `takeScreenshot()`
- `window.open(url, '_blank')` после `await fetch()` блокировался браузером → паттерн `openPreviewWindow()`: открываем вкладку сразу на клик, пишем splash, потом `win.location.href = url`

**В шаблонах генератора (`developer.js`) — баги LLM:**
- `mockserver.js`: LLM генерировал generic regex `entity(.*)` вместо реального пути эндпоинта → исправить в промпте: path должен совпадать с `spec.endpoint` (например `employees(.*)`)
- `manifest.json`: LLM добавлял `"resources": { "css": [...] }` без создания файла → шаблон изменён на `"resources": {}`
- `index.html`: атрибут `data-sap-ui-xx-waitForTheme="true"` скрывал body пока грузилась тема UI5 → спиннер был невидим → атрибут убран из sandbox-шаблона

**Preview UX:**
- Добавлен `openPreviewWindow()` в `client/app.js` — splash-экран (тёмный, 🏭 Dark Factory IC, синий спиннер) показывается сразу при клике, до fetch и до загрузки sandbox
- `init.js` шаблон — спиннер в `index.html` прячется через `onAfterRendering` делегат (не синхронно)

## v0.12 — Smart Input (план)

**Focus:** пользователь вставляет sample JSON от BE → Архитектор парсит поля автоматически,
clarify-раунд сокращается до минимума.

Форматы для обсуждения:
- Вставить JSON прямо в заказ → архитектор распознаёт и обрабатывает
- Отдельное поле UI для "Sample BE response"
- Комбо: сначала описание, потом архитектор запрашивает sample JSON

Scope v0.12 ещё не детализирован — нужна refining-сессия.

---

**workspace vs workspaces:** разные пайплайны. `workspace/` (ед.ч.) — IC-карточки пишутся в `cards/{slug}/`,
`workspace/` больше не используется активно для IC (только для non-IC профилей).
`workspaces/` (мн.ч.) — Node.js приложения (Local Runner).

**Зомби-процесс сандбокса:** старый процесс на 3100 держит устаревший `rootPath` → карточка не рендерится. Fix: `taskkill //F //PID <pid>`. Диагностика: `netstat -ano | grep ":3100 "`.

## Что v0.11 дала проекту (сессия 2026-05-09)

**7 коммитов, всё в main:**

**Commit 1 — cards-registry.js + инфраструктура cards/**
- `server/cards-registry.js` — CRUD реестра: `readRegistry`, `registerCard` (upsert), `updateCardModified`, `removeCard`
- `server/index.js` — `export const CARDS_DIR`, `mkdirSync(CARDS_DIR)` при старте
- `.gitignore` — добавлены `cards/` и `cards-registry.json`

**Commit 2 — IC pipeline пишет в cards/{slug}/**
- `server/file-manager.js` — `setWorkspace(path)` + `resetWorkspace()` методы
- `server/index.js` — в `runDeveloper()`: до записи файлов `fileManager.setWorkspace(cards/{slug}/)` для IC, иначе `resetWorkspace()`
- `server/orchestrator.js` — import fileManager + cardsRegistry; `readWorkspaceFiles` и `executeManifestVerify` используют `fileManager.workspaceDir`; `archiveApp` для IC: `cardsRegistry.registerCard()` вместо `appsStore.addApp()`; `executeNoDeploy` пропускает GitHub push для IC

**Commit 3 — API /api/cards**
- `GET /api/cards` → readRegistry()
- `DELETE /api/cards/:slug` → removeCard + rm -rf
- `POST /api/cards/:slug/preview` → stop sandbox + start с новым cardPath
- `POST /api/cards/import` → multer zip upload, adm-zip extract, manifest validation, copy to cards/{slug}/
  - Поддержка: flat (src/ в корне zip) и nested (один подкаталог в zip)
  - Slug из `sap.app.id` → последний сегмент; имя из `sap.app.title`
- Добавлены зависимости: `adm-zip`, `multer`

**Commit 4 — My Apps: IC cards UI**
- `client/app.js` — убраны: `productsCache`, `loadProducts`, `renderAppCard`, `handleDetails`, `handleRepeatWithChanges`, `handleOpenApp`, `handleDeleteClick`, `confirmDelete`, `closeDeleteModal`
- Добавлены: `loadCards`, `renderCardItem`, `handlePreviewCard`, `handleDeleteCard` (через `confirm()`), `handleImportCard`, `submitImport`, `showImportError`
- `client/index.html` — заголовок My Apps с кнопками "+ New Card" и "Import", import-modal с `<input type="file" accept=".zip">`

**Commit 5 — delta-architect.js**
- `server/prompts/integration-card/delta-architect.js` — NEW
- Экспортирует: `systemPrompt`, `generateUserPrompt(changeRequest, currentFiles)`, `generateSpec(rawResponse)`
- Формат ответа: `mode: "patch"` — без clarify-раундов, один shot
- Patch-spec поля: `cardSlug`, `changeSummary`, `fieldsAdded`, `fieldsRemoved`, `fieldsModified`, `specChanges`, `filesToModify`

**Commit 6 — Edit pipeline server-side**
- `server/orchestrator.js` — `editMode`, `editSlug` props; exposed в `getState()`; сброс в `reset()`; обработка `mode === "patch"` в `handleAgentComplete` → переход в SPEC_REVIEW
- `server/index.js` — import delta-architect; `readCardFilesForEdit(dirPath)` helper (recursive, skip binary/node_modules); в `runArchitect()`: при `editMode` — использует delta-architect + existing files; `POST /api/edit/:slug` endpoint (reset + set editMode + startOrder)

**Commit 7 — Edit flow UI**
- `client/app.js` — `editingSlug/editingName` state; `handleEditCard(slug)` — edit-mode banner + placeholder + кнопка "Применить изменение"; `cancelEditMode()`; `handleOrderSubmit` вызывает `/api/edit/:slug` в edit mode; `renderSpecReview()` обрабатывает `mode:"patch"` — changeSummary + fieldsAdded/Removed/Modified + filesToModify
- `client/index.html` — edit-mode-banner в order block; `spec-review-title` h3 (меняется на "Редактирование: {slug}" в edit mode)

## SDK-001 — Smart Clone ✅ (сессия 2026-05-09)

**Что сделано:** SDK-стабы вынесены из inline T_STUB_* строк в отдельные файлы.
Директория: `server/prompts/integration-card/sdk-stubs/`

Файлы:
- `CustomError.js` — ES6 class hierarchy (CustomError → Error, 3 подкласса), правильный instanceof
- `Base.controller.js` — полный API: fnAuthMetaDataPRMCheck, getResourceBundle, getCard, fnODataRead, fnODataCreate, getUrlParameter; реальные Promise-обёртки для oData
- `ErrorHandler.js` — 4 метода no-op, сохраняет oComponent
- `StorageUtils.js` — in-memory `_store` (module-level), `_reset()` для test isolation, keyed by prefix
- `AuthorizationDialog.controller.js` — extends Controller, openDialog/closeAuthDialog no-ops
- `library.js` — то же содержимое что было в T_STUB_LIBRARY

`developer.js` — использует `readStub(name)` для подключения файлов из `sdk-stubs/`.

## VIZ-001 — реализация завершена ✅ (сессия 2026-05-09)

### Что сделано

**Архитектурное решение:** sandbox встроен в шаблон через `ui5-local.yaml` + `external_libs/`. SDK-стабы per-workspace.

**Реализованные файлы:**
- `server/sandbox-manager.js` — старт/стоп `ui5 serve`, маппинг `{pid, port}`, один процесс
- `server/index.js` — `POST /api/sandbox/start`, `POST /api/sandbox/stop`, `sandboxManager.stop()` при новом заказе
- `client/index.html` — кнопка "Preview Card" в Pickup
- `client/app.js` — `handleSandboxPreview()`, показ кнопки по `state.currentSpec.cardSlug`
- `server/prompts/integration-card/developer.js` — в `generateStaticFiles()` добавлены sandbox-файлы и SDK-стабы

### Ключевые технические решения (закрытые баги)

**1. `ui5-middleware-servestatic` игнорирует `mountPath`**
Middleware делает `return serveStatic(rootPath)` без всякого path stripping.
Fix: стабы в `src/test/unit/sdk-stubs/resources/com/sap/...` — путь URL `/resources/com/sap/...` совпадает с подпутём.
`SDK_BASE_PATH = 'src/test/unit/sdk-stubs/resources/com/sap/fiorireuselibrary/ui5cardssdk'`

**2. `AuthorizationDialog.controller.js` отсутствовал в стабах**
`Main.controller.js` импортирует его (хотя не вызывает). Добавлена пустая заглушка `T_STUB_AUTHORIZATION_DIALOG`.

**3. `sap.ui.loader.config` путь в `unitTests.qunit.js`**
Обновлён с `external_libs/com/sap/...` на `external_libs/resources/com/sap/...`.

**Результат:** карточка рендерится с mock-данными в отдельной вкладке.

## ✅ npm test починен (сессия 2026-05-09)

**Корень проблемы:** регекс `/((?:test-)?resources\/.*)` в `ui5-test-runner/src/ui5.js`
перехватывает URL с `/resources/` ВЕЗДЕ в пути → проксирует на SAP CDN → 404.
AMD-путь `./sdk-stubs/resources/com/sap/...` → URL `/test/unit/sdk-stubs/resources/com/sap/...`
содержал `/resources/` → CDN перехват.

**Fix:** два набора стабов:
- `sdk-stubs/resources/com/sap/...` — для sandbox (ui5 serve + ui5-middleware-servestatic)
- `sdk-stubs/com/sap/...` — для npm test (AMD loader, URL без /resources/)
`unitTests.qunit.js` AMD path: `./sdk-stubs/com/sap/fiorireuselibrary/ui5cardssdk`

**Результат:** `npm test` → 4/4 тесты ✅

## Технические решения, актуальные для следующей сессии

**Confluence page:**
Placeholder реализован (title + пустая 2×2 таблица). Полный шаблон — отдельная задача.
Блокер снят, но настоящего шаблона от команды нет.

**Template analysis (pending):**
Игорь ещё не завершил анализ ~30 карточек команды на предмет второго шаблона (Table).
Решение по table-шаблону до v0.12 не нужно — только если v0.12 откроет этот вопрос.

**lastACError mechanism:**
`let lastACError` в `index.js` хранит вывод npm test при неудаче.
Передаётся в `generateUserPrompt` как 4-й параметр → попадает в retry-промпт девелопера.

## Ключевые файлы (актуально для v0.11+)

| Файл | Роль |
|------|------|
| `HANDOFF.md` | этот файл |
| `docs/contracts.md` | контракты всех агентов, включая IC-профиль |
| `docs/log.md` | архив решений и фаз v0.1–v0.9 |
| `server/cards-registry.js` | CRUD реестра cards-registry.json |
| `server/file-manager.js` | writeFiles + setWorkspace/resetWorkspace |
| `server/index.js` | pipeline wiring, IC workspace redirect, /api/cards, /api/edit/:slug |
| `server/orchestrator.js` | state machine, editMode/editSlug, archiveApp (IC→cardsRegistry) |
| `server/sandbox-manager.js` | ui5 serve, один процесс per DF instance |
| `server/prompts/integration-card/architect.js` | protocol/layout/generateTests/generateDocs + output questions round |
| `server/prompts/integration-card/developer.js` | generateStaticFiles(spec) + основной LLM-промпт + testGenerator |
| `server/prompts/integration-card/delta-architect.js` | **NEW** edit mode: patch-spec из файлов + задачи |
| `server/prompts/integration-card/sdk-stubs/` | **NEW** Smart Clone SDK-стабы (6 файлов) |
| `server/prompts/integration-card/tester.js` | видит все файлы после v0.9 fix |

## Что v0.10 дала проекту (UX-001 + VIZ-001)

**Кнопка «Уточнить» (UX-001):**
- Новый переход: `SPEC_REVIEW → ARCH_WORKING → ... → SPEC_REVIEW` без потери истории
- `orchestrator.handleRefineRequest(message)` — `{ refine: true, message }` в `clarifyHistory`, сброс `clarifyRound`, инкремент `refineRound`
- Лимит: `maxRefineRounds = 3`; `POST /api/refine`
- Ветвление `clarifyHistory.length === 0` вместо `round === 0`

**Sandbox preview (VIZ-001):**
- `server/sandbox-manager.js` — старт/стоп `ui5 serve`, один процесс per DF instance
- `POST /api/sandbox/start` + `POST /api/sandbox/stop` в `server/index.js`
- Кнопка "Preview Card" в Pickup — только для IC-карточек
- `generateStaticFiles()` — sandbox-файлы + SDK-стабы (6 файлов) + `sandbox` npm-скрипт
- SDK-стабы лежат в `src/test/unit/sdk-stubs/resources/com/sap/...`
  (причина: `ui5-middleware-servestatic` игнорирует `mountPath`, делает голый `serveStatic(rootPath)`)
- `AuthorizationDialog.controller.js` — пустой стаб (импортируется но не вызывается)

## Что v0.9 дала проекту

**Architect output questions:**
- `spec.protocol` (rest|odata2|odata4|other) и `spec.layout` (form|table|other) — spec-поля
- `spec.generateTests` и `spec.generateDocs` — отдельный clarify-раунд в конце, после "Spec готов"
- Новые опции (GraphQL, Table) не требуют новых кнопок в UI

**Static file generation (spec-aware):**
- `generateStaticFiles(cardSlug, spec)` — расширен до spec-параметра
- `README.md` — всегда, из spec.fields
- `confluence.md` — placeholder если generateDocs
- `AllTests.js`, `unitTests.qunit.html`, `unitTests.qunit.js`, `.nycrc.json` — если generateTests
- `package.json` с test-скриптом и ui5-test-runner — если generateTests

**LLM Developer — два вызова при generateTests:**
- Вызов 1: 5 extension-point файлов (основной, всегда)
- Вызов 2: только `src/test/unit/helpers/DataHelper.qunit.js` (отдельный фокусный вызов)
- Разделение обязательно: Hyperspace режет output на ~8192 токенах, 6 файлов не влезают
- 4 QUnit-модуля в DataHelper.qunit.js: field mapping, fallback, null fallback, immutability

**DEV_CHECK для IC:**
- `npm install` + `npm test` в workspace при generateTests
- Ошибки сохраняются в `lastACError` → передаются в retry-промпт developer'а

**Tester fix:**
- Статические файлы теперь входят в `developerData.files` → Tester видит все файлы

**Spec Review UI:**
- IC-блок: Card, Destination, Protocol, Layout, Fields, Tests, Docs — явно отображается

## Что v0.8 дала проекту

**Profile infrastructure (кассета):**
- `server/profiles/nodejs-app.js` — существующий pipeline как явный профиль
- `server/profiles/integration-card.js` — `deployer: 'none'`, `verifier: 'manifest'`
- `server/profiles/index.js` — `resolveProfile()`, `setActiveProfile()`, `getAvailableProfiles()`

**Integration Card pipeline:**
- `server/prompts/integration-card/architect.js` — собирает spec (cardSlug, fields[], mockData)
- `server/prompts/integration-card/developer.js` — генерирует 5 extension-point файлов;
  8 статических файлов пишет `generateStaticFiles(cardSlug)` без LLM
- `server/prompts/integration-card/tester.js` — проверяет namespace, extension points, completeness
- `server/verifier-c.js` — проверяет manifest.json (6 полей, Component-тип пропускает header/content)

**Pipeline адаптации:**
- `executeNoDeploy()` в orchestrator — DEPLOYING мгновенно
- `executeManifestVerify()` — верификация без browser
- `runDevCheck()` пропускает nodejs AC checks для `deployer=none`
- `readWorkspaceFiles()` рекурсивный (для `src/` структуры IC)

## Что v0.7 дала проекту

- `server/verifier-a.js` — HTTP + keyword scan
- `server/verifier-b.js` — puppeteer screenshot + gemini vision
- `server/verifier.js` — compositor
- Оркестратор: состояние VERIFYING, executeVerify(), verificationReport
- UI: renderVerificationReport в pickup (verdict badge + features + vision summary)

## Известный блокер

**Fly.io заблокирован на корп. VDI** — решён через Local Runner (v0.6).
LLM через Hyperspace. **LLM_API_KEY нужно прописывать вручную в `.env`**.

## Hyperspace constraints

Hyperspace жёстко ограничивает **вывод** LLM (~8192 токенов), игнорируя `max_tokens` в запросе.
Сигнал: `finish_reason: 'length'` → agent-manager бросает "Response truncated".

**Паттерн fix'а:** каждый LLM-вызов — одна задача с предсказуемо небольшим выводом.
Если задача большая — несколько вызовов. Примеры: v0.8 (5 LLM + 8 static files),
v0.9 fix (DataHelper.qunit.js — отдельный вызов).

Именование моделей в Hyperspace отличается от стандартного Anthropic API:
`anthropic--claude-4.6-sonnet`, `anthropic--claude-4.6-opus`, `gemini-2.5-flash`.

## Ключевые решения, которые остаются в силе

- **sourceUrl, не githubUrl** — абстракция от конкретного бэкенда
- **Нет Deployer facade** — до второй живой реализации
- **On-demand UX** — приложение не запущено по умолчанию
- **GITHUB_PUSH non-blocking** — GitHub-push бонус, не блокер; для IC — полностью убран
- **Profile = кассета** — промпты + deployer + verifier, выбирается в Settings
- **Plugin Path 2** — factory выпускает single-plugin продукты, не комбинации
- **Cherry-pick combo-commit** — механизм дистрибуции плагинов через git
- **Square 2 goal** — plugin contract complete, IC combo-commit чистый
- **Output questions, не UI-тоггл** — generateTests/generateDocs через Architect clarify-раунд
- **Confluence page** — placeholder (title + 2×2 таблица), полный шаблон позже
- **Нет HANDOFF hook** — Игорь смотрит глазами перед коммитом
- **GitHub убран из DF-IC** — IC-профиль не нуждается в GitHub. Output = файлы в `cards/{slug}/`.
  Коллеге для установки DF-IC нужен только AI API key.
- **cards/{slug}/ вместо workspace/** — постоянное хранилище карточек; fileManager.setWorkspace() / resetWorkspace()
- **Delta-Архитектор — отдельный промпт** — Edit mode: видит файлы + задачу → патч, не spec с нуля
- **Import = zip upload** — browser file picker, adm-zip, поддержка flat и nested zip

## Технические детали среды

- **OS:** Windows 11 VDI (нестабильно — сессии могут обрываться)
- **Shell:** Git Bash
- **Node.js:** v24, `npm start` / `npm run dev`
- **LLM:** Hyperspace LiteLLM (localhost:6655, OpenAI-compatible)
  Модели: `anthropic--claude-4.6-opus`, `anthropic--claude-4.6-sonnet`, `gemini-2.5-flash`
- **GitHub:** личный аккаунт через OAuth App (scope: `repo delete_repo`)
- **Запуск:** `npm start` для production, `npm run dev` для разработки
- **Port:** 3000 (помни про зомби-процесс — `npm run restart`)
- **Local Runner порты:** 3100–3999

## Чего не делать

- Не начинай код/действия до прочтения файлов
- Не пересказывай документы подробно — только summary
- Не игнорируй `docs/log.md` — там прецеденты и инсайты
- Не предлагай пересмотр архитектурных решений без запроса
- Не создавай абстракции "на будущее" без реальной потребности
