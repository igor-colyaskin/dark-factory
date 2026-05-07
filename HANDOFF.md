# Контекст для продолжения работы над Dark Factory

Я веду pet-project под названием Dark Factory (DF) — ИИ-агенты,
которые генерируют простые веб-приложения по текстовому заказу.
Работаю с Claude в режиме "штурман + пилот": Claude анализирует,
предлагает решения, я принимаю стратегические решения.

## Быстрый статус

**Версия в работе:** v0.8 — PROFILES 🔧 (не начата)
**Последняя выпущенная:** v0.7 — VERIFY ✅ (тег `v0.7`)
**Среда:** корп. VDI (SAP), LLM через Hyperspace (localhost:6655),
GitHub — личный аккаунт через OAuth App.
**Рабочий документ:** будет `docs/work/v0.8-profiles.md` (создать при старте)

## Что сделать в первую очередь

1. Прочитай файлы в таком порядке:
   - `CONCEPT.md` — принципы, философия, архитектура (быстро)
   - `ROADMAP.md` — вектор и описание v0.8 PROFILES
   - `docs/log.md` — история фаз и решений, включая v0.7
   - `docs/contracts.md` — контракты компонентов

2. После прочтения — кратко перескажи:
   - Что такое PROFILES и зачем оно
   - Что v0.7 оставила для v0.8
   - Какой первый вопрос нужно решить, чтобы стартовать v0.8
   - Есть ли что-то неясное

3. Жди подтверждения прежде чем предлагать действия.

## Что v0.7 дала проекту

- **`server/verifier-a.js`** — HTTP-проверка + keyword scan HTML + linked JS файлов по spec.features
- **`server/verifier-b.js`** — puppeteer-core скриншот + gemini-2.5-flash vision → структурированный JSON
- **`server/verifier.js`** (compositor) — `verifier.run(url, spec) → Report`. A→B, graceful degradation.
  Контракт Report: `{ url, timestamp, structural, features[], vision, visionError, verdict }`
  Verdict: PASS / PARTIAL / FAIL / SKIPPED (в fake deploy) / ERROR
- **Оркестратор:** состояние `VERIFYING` между `DEPLOYING` и `GITHUB_PUSH`
  - `executeVerify()` — вызывает compositor, хранит `verificationReport` в state
  - `executeFakeDeploy`: VERIFYING мгновенно, verdict: SKIPPED
- **US4 Verification (agent: 'Ver')** — строка в таблице Manufacturing
- **UI:** renderVerificationReport в pickup block — verdict badge + список features + vision summary
  Скрыт при SKIPPED. Цветовая схема: PASS=зелёный, PARTIAL=жёлтый, FAIL=красный

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
- **Deployer Contract** — trigger-based: когда появится второй живой деплоер

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
