# Контекст для продолжения работы над Dark Factory

Я веду pet-project под названием Dark Factory (DF) — ИИ-агенты,
которые генерируют простые веб-приложения по текстовому заказу.
Работаю с Claude в режиме "штурман + пилот": Claude анализирует,
предлагает решения, я принимаю стратегические решения.

## Быстрый статус

**Последняя выпущенная:** v0.8 — PROFILES ✅ (тег `v0.8`)
**Версия в работе:** v0.9 — IC с тестами и документацией
**Среда:** корп. VDI (SAP), LLM через Hyperspace (localhost:6655),
GitHub — личный аккаунт через OAuth App.
**Рабочий документ:** создать `docs/work/v0.9.md` в начале сессии

## Что сделать в первую очередь

1. Прочитай файлы в таком порядке:
   - память `ic_roadmap.md` — scope v0.9, протокол, layout, шаблоны
   - память `plugin_architecture.md` — proto-F концепция, Square 1/2, plugin contract
   - память `integration_card_template.md` — структура шаблона

2. После прочтения — кратко перескажи план v0.9 и жди подтверждения.

3. Не начинай код до подтверждения.

## Что сделано с момента v0.8

**Шаблоны IC (2026-05-08):**
- `templateSF/` перемещён → `server/prompts/integration-card/templates/form-rest/`
- Создан `server/prompts/integration-card/templates/table-odata2/` —
  sap.m.Table + OData v2, MockServer.simulate() с metadata.xml, без тестов,
  без DataHelper, без test-скриптов в package.json
- `docs/CARDS.md` — анализ 37 карточек команды

**Архитектурные решения (2026-05-08):**
- Plugin architecture: Path 2 — factory выпускает single-plugin продукты
  (DF-IC, DF-Telegram), не комбинации. Детали → `plugin_architecture.md`
- Square 1 (= DF-base с JS+Node) → Square 2 (= после v0.9 + plugin contract рефактор)
- Combo-commit механизм: все IC-коммиты сгоняются в один cherry-pick-able коммит
- Draft/Release toggle из UI убран → Архитектор задаёт output-вопросы
  отдельным блоком в конце clarify-раунда
- Протокол (REST/OData2/OData4/REST/Другое) — radio в clarify-раунде Архитектора
- Layout (m.Table/Form/Другое) — radio в clarify-раунде Архитектора

## v0.9 — что планируем

Подробности в памяти `ic_roadmap.md`. Кратко:

1. **Architect output questions** — вместо Draft/Release toggle:
   "Нужны unit-тесты? Нужна документация?" в конце clarify-раунда
2. **Protocol question** — REST/OData2/OData4/Другое в clarify,
   `generateStaticFiles()` выбирает вариант mockserver (REST или OData)
3. **Layout question** — m.Table/Form/Другое, developer выбирает шаблон
4. **Unit тесты (если запрошены):**
   - `DataHelper.qunit.js` (только для form-rest, LLM по spec.fields)
   - `AllTests.js`, `.nycrc.json` — static, inline в generateStaticFiles
   - `npm test` скрипт в package.json — только если тесты запрошены
   - DEV_CHECK для IC: запускает `npm test`, ошибки → DEV agent
5. **README.md** — статический шаблон + подстановка из spec
6. **Confluence page** — markdown/wiki рядом с README (нужен шаблон от Игоря)
7. **Fix:** Tester agent видит только 5 LLM-файлов — исправить

**Перед стартом кода:**
- Получить от Игоря шаблон Confluence-страницы

## Ключевые знания

**Два шаблона карточки:**
- `templates/form-rest/` — SimpleForm + REST + полные тесты (8% карточек команды)
- `templates/table-odata2/` — sap.m.Table + OData2, без тестов (55% карточек)

**table-odata2 extension points (5):**
1. `manifest.json` — namespace, destination, OData service path (`TEMPLATETABLE_SRV`)
2. `View.view.xml` — Table columns + ColumnListItem cells
3. `i18n/i18n.properties` — column headers (COL_FIELD_*)
4. `test/data/metadata.xml` — OData entity type + properties
5. `test/data/TemplateEntitySet.json` — mock array

**form-rest extension points (5):**
1. `DataHelper._processData()` — BE (PascalCase) → viewmodel (camelCase)
2. `View.view.xml` — FormElements с bindings
3. `i18n/i18n.properties` — лейблы
4. `manifest.json` — namespace, destination, keywords
5. `MockDataGenerator.getData()` — BE-shaped mock object

**Токены:** Hyperspace LiteLLM режет вывод на ~8192 токенах.
Developer agent не должен выдавать >4000 токенов — держать extension points маленькими.

**Plugin contract (текущее состояние):**
Сейчас `generateStaticFiles`, `runDevCheck`, `executeManifestVerify` живут вне профиля.
После v0.9 — plugin contract рефактор: всё переезжает внутрь профиля,
combo-commit IC станет чистым. Детали → `plugin_architecture.md`.

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

## Ключевые решения, которые остаются в силе

- **sourceUrl, не githubUrl** — абстракция от конкретного бэкенда
- **Нет Deployer facade** — до второй живой реализации
- **On-demand UX** — приложение не запущено по умолчанию
- **GITHUB_PUSH non-blocking** — GitHub-push бонус, не блокер
- **Profile = кассета** — промпты + deployer + verifier, выбирается в Settings
- **Plugin Path 2** — factory выпускает single-plugin продукты, не комбинации
- **Cherry-pick combo-commit** — механизм дистрибуции плагинов через git
- **Square 2 goal** — plugin contract complete, IC combo-commit чистый

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
