# Контекст для продолжения работы над Dark Factory

Я веду pet-project под названием Dark Factory (DF) — ИИ-агенты,
которые генерируют простые веб-приложения по текстовому заказу.
Работаю с Claude в режиме "штурман + пилот": Claude анализирует,
предлагает решения, я принимаю стратегические решения.

## Быстрый статус

**Последняя выпущенная:** v0.9 — IC с тестами и документацией ✅
**Версия в работе:** v0.10 — Smart input (sample JSON → auto field extraction)
**Среда:** корп. VDI (SAP), LLM через Hyperspace (localhost:6655),
GitHub — личный аккаунт через OAuth App.
**Рабочий документ:** `docs/work/v0.10.md` — создать в начале следующей сессии

## Что сделать в первую очередь

1. Прочитай файлы в таком порядке:
   - память `ic_roadmap.md` — scope v0.9 done, v0.10 план, future
   - память `plugin_architecture.md` — proto-F, Square 1/2, plugin contract
   - память `integration_card_template.md` — структура шаблона

2. Проверь, протестировал ли Игорь v0.9 вручную (end-to-end IC с тестами).
   Если нет — предложи прогнать тест перед началом v0.10.

3. Создай `docs/work/v0.10.md` и согласуй scope.

4. Не начинай код до подтверждения.

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

## v0.10 — краткий план (согласовать)

**Focus:** Smart input — пользователь даёт sample JSON от BE → Архитектор парсит поля автоматически, clarify-раунд сокращается до минимума.

Форматы для обсуждения:
- Вставить JSON прямо в заказ → архитектор распознаёт и обрабатывает
- Отдельное поле UI для "Sample BE response"
- Комбо: сначала описание, потом архитектор запрашивает sample JSON

## Ключевые файлы (актуально для v0.9+)

| Файл | Роль |
|------|------|
| `HANDOFF.md` | этот файл |
| `docs/contracts.md` | контракты всех агентов, включая IC-профиль (v0.9) |
| `docs/log.md` | архив решений и фаз v0.1–v0.9 |
| `server/index.js:556-565` | writeFiles + generateStaticFiles(slug, spec) + lastACError |
| `server/index.js:582-625` | runDevCheck — npm test для IC + errorFeedback |
| `server/prompts/integration-card/architect.js` | protocol/layout/generateTests/generateDocs + output questions round |
| `server/prompts/integration-card/developer.js` | generateStaticFiles(spec) + LLM prompt с DataHelper.qunit.js |
| `server/prompts/integration-card/tester.js` | видит все файлы после v0.9 fix |
| `server/prompts/integration-card/templates/form-rest/` | источник шаблона и тест-референсов |

## Что v0.9 дала проекту

**Architect output questions:**
- `spec.protocol` (rest|odata2|odata4|other) и `spec.layout` (form|table|other) — spec-поля
- `spec.generateTests` и `spec.generateDocs` — отдельный clarify-раунд в конце, после "Spec готов"
- Новые опции (GraphQL, Table) не требуют новых кнопок в UI

**Static file generation (spec-aware):**
- `generateStaticFiles(cardSlug, spec)` — расширен до spec-параметра
- `README.md` — всегда, из spec.fields
- `confluence.md` — placeholder если generateDocs
- `AllTests.js` + `.nycrc.json` — static boilerplate если generateTests
- `package.json` с test-скриптом и ui5-test-runner — если generateTests

**LLM Developer:**
- 6-й файл `src/test/unit/helpers/DataHelper.qunit.js` при generateTests:
  4 QUnit-модуля (field mapping, fallback, null fallback, immutability)

**DEV_CHECK для IC:**
- `npm test` в workspace при generateTests
- Ошибки сохраняются в `lastACError` → передаются в retry-промпт developer'а

**Tester fix:**
- Статические файлы теперь входят в `developerData.files` → Tester видит все файлы

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
