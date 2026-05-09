# Контекст для продолжения работы над Dark Factory

Я веду pet-project под названием Dark Factory (DF) — ИИ-агенты,
которые генерируют простые веб-приложения по текстовому заказу.
Работаю с Claude в режиме "штурман + пилот": Claude анализирует,
предлагает решения, я принимаю стратегические решения.

## Быстрый статус

## v0.10 полностью завершена ✅

**Последняя выпущенная версия:** v0.10 — UX polish + sandbox preview + npm test ✅ (сессия 2026-05-09)
**Следующая:** v0.11 — Smart input (sample JSON → auto field extraction)
**Среда:** корп. VDI (SAP), LLM через Hyperspace (localhost:6655),
GitHub — личный аккаунт через OAuth App.

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

## Что сделать в первую очередь

1. Прочитай память: `ic_roadmap.md`, `plugin_architecture.md`, `integration_card_template.md`
2. Обсудить scope v0.11 — Smart input
3. Обсудить UX-002 (Edit mode) — где хранить реестр карточек (см. backlog.md)
4. CARDS.md — обсудить и закоммитить (отложено с предыдущей сессии)

## Итоги сессии 2026-05-09 (часть 2) — бэклог и архитектурные решения

**workspace vs workspaces:** разные пайплайны. `workspace/` (ед.ч.) — IC-карточки, единый, перезаписывается.
`workspaces/` (мн.ч.) — Node.js приложения (Local Runner). Карточки никуда не "переезжают".

**Зомби-процесс сандбокса:** после миграции стабов старый процесс сандбокса на 3100 держал
устаревший `rootPath` → карточка не рендерилась. Fix: `taskkill //F //PID <pid>`, потом
нажать Preview Card снова. Команда для диагностики: `netstat -ano | grep ":3100 "`.

**Бэклог обновлён (docs/backlog.md):**
- VIZ-001, UX-001 — помечены выполненными
- TPL-001 (три точки) — подтверждён, приоритет низкий
- TPL-002 (namespace/папка конвенция) — новый, средний приоритет
- UX-002 (Edit mode) — новый, высокий приоритет, v0.12

**UX-002 — ключевой инсайт:** типичный сценарий работы разработчика — переключение между
несколькими карточками с инкрементальными изменениями. Создавать новый GitHub repo на каждое
"перекрась кнопку" неприемлемо. Нужен Edit mode (post-Submit).
**Открытый вопрос:** где хранить реестр карточек (slug → repo URL)?
Варианты: локальный `cards-registry.json`, GitHub-индекс, ручной ввод URL.

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

## Технические решения, актуальные для следующей сессии

**Confluence page:**
Placeholder реализован (title + пустая 2×2 таблица). Полный шаблон — отдельная задача.
Блокер снят, но настоящего шаблона от команды нет.

**Template analysis (pending):**
Игорь ещё не завершил анализ ~30 карточек команды на предмет второго шаблона (Table).
Решение по table-шаблону до v0.10 не нужно — только если v0.10 откроет этот вопрос.

**lastACError mechanism:**
`let lastACError` в `index.js` хранит вывод npm test при неудаче.
Передаётся в `generateUserPrompt` как 4-й параметр → попадает в retry-промпт девелопера.

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

## Что v0.11 — Smart Input (план)

**Focus:** Smart input — пользователь даёт sample JSON от BE → Архитектор парсит поля автоматически, clarify-раунд сокращается до минимума.

Форматы для обсуждения:
- Вставить JSON прямо в заказ → архитектор распознаёт и обрабатывает
- Отдельное поле UI для "Sample BE response"
- Комбо: сначала описание, потом архитектор запрашивает sample JSON

## Ключевые файлы (актуально для v0.10+)

| Файл | Роль |
|------|------|
| `HANDOFF.md` | этот файл |
| `docs/contracts.md` | контракты всех агентов, включая IC-профиль (v0.9) |
| `docs/log.md` | архив решений и фаз v0.1–v0.9 |
| `server/index.js` | writeFiles + generateStaticFiles + runDevCheck (npm install + npm test) + testGenerator вызов |
| `server/prompts/integration-card/architect.js` | protocol/layout/generateTests/generateDocs + output questions round |
| `server/prompts/integration-card/developer.js` | generateStaticFiles(spec) + основной LLM-промпт (5 файлов) + testGeneratorSystemPrompt/generateTestsUserPrompt |
| `server/prompts/integration-card/tester.js` | видит все файлы после v0.9 fix |
| `server/prompts/integration-card/templates/form-rest/` | источник шаблона и тест-референсов |

## Что починила сессия 2026-05-08 (тест-инфраструктура IC)

`npm test` падал на всех прогонах после v0.9. Три независимых бага:

**1. @sapitpe/ui5cardssdk в npm dependencies → E404**
Пакет недоступен в публичном npm (только Work Zone runtime).
Fix: убран из `dependencies`, `ui5.dependencies`, `ui5-test-runner.dependencies` в `T_PACKAGE_JSON_WITH_TESTS`.

**2. external_libs стабы не генерировались → SDK не загружался**
`DataHelper.js` импортирует `CustomError` из SDK. Стабы есть в шаблоне, но `generateStaticFiles()` их не копировал.
Fix: 4 стаб-файла добавлены в `generateStaticFiles()` всегда (нужны и для `npm test` и для `ui5 serve`).

**3. `"./Component"` в `T_ALL_TESTS` → AMD loader зависал**
`AllTests.js` импортировал `"./Component"` (test/unit/Component.js из шаблона) — файл не генерируется.
UI5 AMD loader ждал несуществующий модуль, тест-страница не инициализировалась (таймаут 1.5 мин).
Fix: убран `"./Component"` из `T_ALL_TESTS`, оставлен только `"./helpers/DataHelper.qunit"`.

**4. .nycrc.json игнорировался → coverage включала src/test/**
`ui5-test-runner` генерирует свой `.nyc_output/settings/.nycrc.json` и передаёт его nyc через `--nycrc-path`.
Наш `.nycrc.json` в корне workspace не читался. Плюс пути были неверные (relative to workspace, а cwd = src/).
Fix: пути исправлены (relative to src/), добавлен `--coverage-settings .nycrc.json` в test-команду.

**Результат:** `npm test` → 4/4, coverage только `DataHelper.js`, `src/test/**` исключён.

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
- **GITHUB_PUSH non-blocking** — GitHub-push бонус, не блокер
- **Profile = кассета** — промпты + deployer + verifier, выбирается в Settings
- **Plugin Path 2** — factory выпускает single-plugin продукты, не комбинации
- **Cherry-pick combo-commit** — механизм дистрибуции плагинов через git
- **Square 2 goal** — plugin contract complete, IC combo-commit чистый
- **Output questions, не UI-тоггл** — generateTests/generateDocs через Architect clarify-раунд
- **Confluence page** — placeholder (title + 2×2 таблица), полный шаблон позже
- **Нет HANDOFF hook** — Игорь смотрит глазами перед коммитом

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
