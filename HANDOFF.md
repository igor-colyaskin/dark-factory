# Контекст для продолжения работы над Dark Factory

Я веду pet-project под названием Dark Factory (DF) — ИИ-агенты,
которые генерируют простые веб-приложения по текстовому заказу.
Работаю с Claude в режиме "штурман + пилот": Claude анализирует,
предлагает решения, я принимаю стратегические решения.

## Быстрый статус

**Версия в работе:** v0.7 — VERIFY 🔧 (Phases 0-4 done, Phase 5 UI — следующая)
**Последняя выпущенная:** v0.6 — Local Runner ✅ (тег `v0.6`)
**Среда:** корп. VDI (SAP), LLM через Hyperspace (localhost:6655),
GitHub — личный аккаунт через OAuth App.
**Рабочий документ:** `docs/work/v0.7-verify.md`

## Что сделать в первую очередь

1. Прочитай файлы в таком порядке:
   - `CONCEPT.md` — принципы, философия, архитектура (быстро)
   - `ROADMAP.md` — вектор и описание v0.7 VERIFY
   - `docs/log.md` — история фаз и решений, включая v0.6
   - `docs/contracts.md` — контракты компонентов

2. После прочтения — кратко перескажи:
   - Что такое VERIFY и его архитектура (VerifierA + VerifierB + compositor)
   - Что v0.6 оставила для v0.7
   - Какой первый вопрос нужно решить, чтобы стартовать v0.7
   - Есть ли что-то неясное

3. Жди подтверждения прежде чем предлагать действия.

## Что v0.6 дала проекту

- **`server/local-runner.js`** — запускает сгенерированное приложение локально.
  `deploy(appName)` → копирует workspace, npm install, npm start, ждёт HTTP, возвращает `{ url, pid, port }`
- **`server/process-registry.js`** — in-memory реестр запущенных процессов `{ appName → { pid, port } }`
- **`executeLocalDeploy()`** в оркестраторе — заменяет Fly.io в реальном режиме.
  После деплоя: GITHUB_PUSH → DONE (тот же путь что и раньше)
- **`workspaces/{appName}/`** — изолированный workspace для каждого приложения
- **On-demand UX:** кнопка "Открыть" в Products вместо постоянного URL.
  `POST /api/my-apps/:id/open` — стартует если не запущен, возвращает localhost URL
- **`GET /api/my-apps/:id/status`** — проверяет process registry
- **Delete flow:** при удалении приложения убивает локальный процесс из registry
- **QR-код** скрыт для localhost URL (бессмысленен на той же машине)

## Известный блокер

**Fly.io заблокирован на корп. VDI** — решён через Local Runner (v0.6).
Полный pipeline теперь работает: DEPLOYING → GITHUB_PUSH → DONE.
Тестировалось в mock-full режиме (реальный deploy, фиктивный LLM).

**Ephemeral URLs:** `publicUrl: http://localhost:PORT` не переживает перезапуск сервера.
Это by design — on-demand модель. Приложение стартует при клике "Открыть".

LLM-часть pipeline (Arc + Dev + Tst) работает нормально через Hyperspace.
**LLM_API_KEY нужно прописывать вручную в `.env`** — Hyperspace токен
не пробрасывается автоматически в Git Bash сессии.

## Ключевые решения, которые остаются в силе

- **sourceUrl, не githubUrl** — абстракция от конкретного бэкенда
- **Нет Storage facade** до второй реализации ("контракт из двух, не из одной")
- **Нет Deployer facade** — Local Runner прямо в оркестраторе до второй реализации
- **On-demand UX** — приложение не запущено по умолчанию, только по кнопке
- **workspaces/ eviction** → Area-51 (критерии неизвестны, диск пока не проблема)
- **GITHUB_PUSH non-blocking** — GitHub-push бонус, не блокер
- **Pattern Library (REMEMBER режим B)** → Area-51

## Архитектура v0.7 VERIFY (реализовано)

Верификатор проверяет живое приложение глазами заказчика:
- **VerifierA** (`server/verifier-a.js`): HTTP GET / → 200, сканирует HTML + linked JS на ключевые слова из spec.features. Порог: ≥1 слово.
- **VerifierB** (`server/verifier-b.js`): puppeteer-core скриншот + gemini-2.5-flash vision → структурированный JSON-отчёт
- **Compositor** (`server/verifier.js`): `verifier.run(url, spec) → Report`. VerifierB failure — graceful degradation (report.visionError).
- **Контракт Report:** `{ url, timestamp, structural, features[], vision, visionError, verdict }`
- **Verdict:** PASS / PARTIAL / FAIL — производный из structural + features + vision.overallAssessment

**Оркестратор:**
- Новое состояние `VERIFYING` между `DEPLOYING` и `GITHUB_PUSH`
- US4 (Verification, agent: 'Ver') в USER_STORIES — показывается в таблице Manufacturing
- `executeLocalDeploy()`: после деплоя → `transition(VERIFYING)` → `executeVerify()` → `transition(GITHUB_PUSH)`
- `executeFakeDeploy()`: VERIFYING проходит мгновенно, `verdict: 'SKIPPED'`
- `verificationReport` хранится в state, передаётся через SSE

**Phase 5 (следующая) — UI:**
- Строка Verification в таблице Manufacturing (время, статус)
- Отображение Report в UI (verdict + краткий список features)
- Stage description для состояния VERIFYING

## Важные принципы работы

- **Agency over capabilities:** DF развивается в сторону умного агента-собеседника
- **Маленькие шаги ради понимания:** медленнее и глубже > быстрее и поверхностнее
- **Граница ROADMAP / Area-51:** можешь написать acceptance criteria → ROADMAP;
  нет AC, нет триггера → Area-51
- **Не копи хвосты:** устаревшее удаляем
- **Дофамин важен:** скучно = сигнал переосмыслить

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
