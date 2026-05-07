# Контекст для продолжения работы над Dark Factory

Я веду pet-project под названием Dark Factory (DF) — ИИ-агенты,
которые генерируют простые веб-приложения по текстовому заказу.
Работаю с Claude в режиме "штурман + пилот": Claude анализирует,
предлагает решения, я принимаю стратегические решения.

## Быстрый статус

**Последняя выпущенная:** v0.8 — PROFILES ✅ (тег `v0.8`)
**Версия в работе:** v0.9 — IC с тестами (Draft/Release режим)
**Среда:** корп. VDI (SAP), LLM через Hyperspace (localhost:6655),
GitHub — личный аккаунт через OAuth App.
**Рабочий документ:** будет `docs/work/v0.9-tests.md` (создать в начале сессии)

## Что сделать в первую очередь

1. Прочитай файлы в таком порядке:
   - память `ic_roadmap.md` — стратегические решения по v0.9+
   - память `integration_card_template.md` — структура шаблона карточки

2. После прочтения — кратко перескажи план v0.9 и жди подтверждения.

3. Не начинай код до подтверждения.

## Что v0.8 дала проекту

**Profile infrastructure (кассета):**
- `server/profiles/nodejs-app.js` — существующий pipeline как явный профиль
- `server/profiles/integration-card.js` — `deployer: 'none'`, `verifier: 'manifest'`
- `server/profiles/index.js` — `resolveProfile()`, `setActiveProfile()`, `getAvailableProfiles()`

**Integration Card pipeline:**
- `server/prompts/integration-card/architect.js` — собирает spec (cardSlug, fields[], mockData)
- `server/prompts/integration-card/developer.js` — генерирует 5 extension-point файлов; 8 статических файлов пишет `generateStaticFiles(cardSlug)` без LLM
- `server/prompts/integration-card/tester.js` — проверяет namespace, extension points, completeness
- `server/verifier-c.js` — проверяет manifest.json (6 полей, Component-тип пропускает header/content)

**Pipeline адаптации:**
- `executeNoDeploy()` в orchestrator — DEPLOYING мгновенно
- `executeManifestVerify()` — верификация без browser
- `runDevCheck()` пропускает nodejs AC checks для `deployer=none`
- `readWorkspaceFiles()` рекурсивный (для `src/` структуры IC)
- Все pipeline-функции используют `orchestrator.profile.prompts.*` (исправлен баг со stale activeProfile)

**Генерируемые файлы карточки (11 штук):**

*LLM (5 extension points):*
- `src/manifest.json` — namespace, destination, keywords
- `src/helpers/DataHelper.js` — `_processData()` маппинг BE→viewmodel
- `src/View.view.xml` — Form с FormElements по spec.fields
- `src/i18n/i18n.properties` — лейблы полей
- `src/test/utils/MockDataGenerator.js` — BE-shaped mock данные

*Сервер (8 статических):*
- `src/Component.js`, `src/Main.controller.js`, `src/model/formatter.js`
- `src/test/mockserver.js`, `src/test/utils/DataEngine.js`
- `package.json`, `ui5-local.yaml`, `ui5.yaml`

## v0.9 — что планируем

Подробности в памяти `ic_roadmap.md`. Кратко:

1. **Draft/Release флаг** — чекбокс в UI (per-order). Release = генерировать тесты.
2. **Unit тесты** — `src/test/unit/helpers/DataHelper.qunit.js` (LLM, assertions из spec.fields)
3. **Статические тест-шаблоны** — `.nycrc.json`, `src/test/unit/AllTests.js`
4. **DEV_CHECK для IC** — запускает `npm test` в workspace, ошибки → DEV agent

Референс для unit-тестов: `templateSF/src/test/unit/helpers/DataHelperTest.js`

## Ключевые знания

**Токены:** Hyperspace LiteLLM режет вывод на ~8192 токенах независимо от `max_tokens`.
Developer agent не должен выдавать >4000 токенов вывода — держать extension points маленькими.

**Шаблон карточки:** `templateSF/` в корне репо.
Подробный анализ — в памяти `integration_card_template.md`.

**5 Extension Points карточки:**
1. `DataHelper._processData()` — BE (PascalCase) → viewmodel (camelCase)
2. `View.view.xml` — FormElements с bindings
3. `i18n/i18n.properties` — лейблы
4. `manifest.json` — namespace, destination, keywords
5. `MockDataGenerator.getData()` — BE-shaped mock object

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
- **Draft/Release** — Draft = карточка без тестов, Release = карточка + тесты + DEV_CHECK

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
