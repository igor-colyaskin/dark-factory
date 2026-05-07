# Контекст для продолжения работы над Dark Factory

Я веду pet-project под названием Dark Factory (DF) — ИИ-агенты,
которые генерируют простые веб-приложения по текстовому заказу.
Работаю с Claude в режиме "штурман + пилот": Claude анализирует,
предлагает решения, я принимаю стратегические решения.

## Быстрый статус

**Версия в работе:** v0.8 — PROFILES 🔧 (Phase 0 + Phase 1 готовы, следующая Phase 2)
**Последняя выпущенная:** v0.7 — VERIFY ✅ (тег `v0.7`)
**Среда:** корп. VDI (SAP), LLM через Hyperspace (localhost:6655),
GitHub — личный аккаунт через OAuth App.
**Рабочий документ:** `docs/work/v0.8-profiles.md`

## Что сделать в первую очередь

1. Прочитай файлы в таком порядке:
   - `CONCEPT.md` — принципы, философия, архитектура (быстро)
   - `ROADMAP.md` — вектор и описание v0.8 PROFILES
   - `docs/work/v0.8-profiles.md` — текущий план фаз и решения
   - память `integration_card_template.md` — анализ шаблона карточки

2. После прочтения — кратко перескажи:
   - Что сделано в v0.8 (Phase 0, Phase 1)
   - Что нужно сделать в Phase 2 (промпты Integration Card)
   - Есть ли что-то неясное

3. Жди подтверждения прежде чем предлагать действия.

## Что v0.8 уже дала проекту (Phases 0–1)

**Phase 0 — Profile infrastructure ("кассета"):**
- `server/profiles/nodejs-app.js` — текущий pipeline как явный профиль
  `{ id, name, prompts: { architect, developer, tester }, deployer, verifier }`
- `server/profiles/index.js` — `resolveProfile()` по `ACTIVE_PROFILE` env var,
  `setActiveProfile()`, `getAvailableProfiles()`, `getActiveProfileId()`
- `server/index.js` — грузит промпты через `activeProfile.prompts.*`
- `server/orchestrator.js` — `this.profile = resolveProfile()`, `profileId` в getState(),
  `refreshProfile()` метод

**Phase 1 — Profile selector в Settings:**
- `GET/POST /api/settings/profile` — читать/менять активный профиль
- Settings page: блок "Factory Profile" с radio buttons (auto-switch)
- При смене профиля вызывается `orchestrator.refreshProfile()`

**Следующая — Phase 2: Integration Card profile**
- `server/prompts/integration-card/architect.js`
- `server/prompts/integration-card/developer.js`
- `server/prompts/integration-card/tester.js`
- `server/profiles/integration-card.js` (deployer: 'none', verifier: 'manifest')

## Ключевые знания для Phase 2

**Шаблон карточки:** `templateSF/` в корне репо (временно, для изучения).
Подробный анализ — в памяти `integration_card_template.md`.

**Суть:** DF для Integration Card — это "умный copy-paste от шаблона".
Developer agent механически заполняет ровно 5 extension points:
1. `DataHelper._processData()` — маппинг BE (PascalCase) → viewmodel (camelCase)
2. `View.view.xml` — FormElements с bindings
3. `i18n/i18n.properties` — реальные лейблы
4. `manifest.json` — namespace, destination, keywords
5. `MockDataGenerator.getData()` — BE-shaped mock object

Файлы которые НЕ трогаются: `Component.js`, `DataHelper.loadData()`, `mockserver.js`.

**Spec от архитектора должен содержать:**
- cardSlug → namespace `com.sap.partner.wz.{slug}`
- cardTitle, cardSubtitle, formTitle
- destinationName (CF destination)
- fields[]: { beField, viewKey, i18nKey, label, control, formatter? }
- mockData: { BeField: "value" }

**deployer: 'none'** — нет running server, нет Local Runner.
**verifier: 'manifest'** — структурная проверка manifest.json (Phase 4).

## Что v0.7 дала проекту

- `server/verifier-a.js` — HTTP + keyword scan HTML+JS
- `server/verifier-b.js` — puppeteer screenshot + gemini vision
- `server/verifier.js` — compositor, `verifier.run(url, spec) → Report`
- Оркестратор: состояние VERIFYING, executeVerify(), verificationReport в state
- UI: renderVerificationReport в pickup (verdict badge + features + vision summary)

## Известный блокер

**Fly.io заблокирован на корп. VDI** — решён через Local Runner (v0.6).
LLM через Hyperspace. **LLM_API_KEY нужно прописывать вручную в `.env`**.

## Ключевые решения, которые остаются в силе

- **sourceUrl, не githubUrl** — абстракция от конкретного бэкенда
- **Нет Deployer facade** — до второй живой реализации
- **On-demand UX** — приложение не запущено по умолчанию
- **GITHUB_PUSH non-blocking** — GitHub-push бонус, не блокер
- **Deployer Contract** — trigger-based: когда появится второй живой деплоер
- **Profile = кассета** — промпты + deployer + verifier, выбирается в Settings

## Технические детали среды

- **OS:** Windows 11 VDI (нестабильно — сессии могут обрываться)
- **Shell:** Git Bash
- **Node.js:** v24, `npm start` / `npm run dev`
- **LLM:** Hyperspace LiteLLM (localhost:6655, OpenAI-compatible)
  Модели: `anthropic--claude-4.6-opus`, `anthropic--claude-4.6-sonnet`, `gemini-2.5-flash`
- **GitHub:** личный аккаунт через OAuth App (scope: `repo delete_repo`)
- **Запуск:** `npm run mock:fast` для быстрой проверки без LLM
- **Port:** 3000 (помни про зомби-процесс — `npm run restart`)
- **Local Runner порты:** 3100–3999

## Чего не делать

- Не начинай код/действия до прочтения файлов
- Не пересказывай документы подробно — только summary
- Не игнорируй `docs/log.md` — там прецеденты и инсайты
- Не предлагай пересмотр архитектурных решений без запроса
- Не создавай абстракции "на будущее" без реальной потребности
