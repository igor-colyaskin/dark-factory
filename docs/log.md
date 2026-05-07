# log.md — Dark Factory: архив

Архивный документ. Сюда попадает всё, что уже произошло:
решения, инсайты, выполненные фазы, отвергнутые идеи.

Читается редко, по запросу "как мы решили X" или "почему не делали Y".

---

## Decisions
Хронологический лог принятых решений с обоснованиями.
## Лог решений

  | Дата       | Решение                                         | Причина                     |
  |------------|--------------------------------------------------|-----------------------------|
  | 2025-04-27 | DF — это курсовой проект, не Learning Manager    | Амбициознее, интереснее     |
  | 2025-04-27 | SM = код (state machine), не AI-агент            | Надёжность оркестратора     |
  | 2025-04-27 | Один Dev агент (не FE+BE)                        | Простота v0.1               |
  | 2025-04-27 | SSE, не WebSocket                                | Проще для однонаправленного |
  | 2025-04-27 | Feedback loop отложен до v0.2                    | Уменьшение скоупа v0.1     |
  | 2025-04-27 | Целевое приложение = простой TODO на Node+Express | Уменьшение вариативности   |
  | 2025-04-27 | DF строим через Roo Code, DF сама вызывает API   | Разделение уровней          |
  | 2025-04-27 | Architect возвращает только path+description, не content | Избежать сломанного JSON от многострочного контента |
  | 2025-04-27 | Убран node-fetch, используется нативный fetch Node 18+ | Убрана лишняя зависимость, совместимость |
  | 2026-04-29 | v0.2: хостинг output-приложений на Fly.io            | UX без установки ПО у получателя |
  | 2026-04-29 | v0.2: локальный Docker на машине DF не требуется     | Fly remote builder        |
  | 2026-04-29 | v0.2: интеграция с Fly через flyctl CLI              | Проще HTTP API            |
  | 2026-04-29 | v0.2: AC Checker без локального runtime              | Безопасность + простота   |
  | 2026-04-29 | v0.2: TTL 24 часа hard, UI управления в v0.2.1       | Разделение scope          |
  | 2026-04-29 | v0.2: session tracking через localStorage            | Без аутентификации        |
  | 2026-04-29 | Кащейная стадия — мораторий на раздачу DF коллегам   | Фокус, нет обязательств   |
  | 2026-04-29 | v0.2: ресурсы 256MB RAM, shared-cpu-1x, fra, auto-stop | Минимальная стоимость   |
  | 2026-04-?? | Режимы через run-modes.js (флаги), не строки            | Гибкость, расширяемость |
  | 2026-04-?? | mock-fast и demo: fake deploy + визуальная метка URL    | UX отладки              |  
  | 2026-04-30 | Убраны /api/download, /api/start-app, archiver            | Legacy v0.1, не нужны после Fly-деплоя |
  | 2026-04-30 | v0.3 переосмыслен: Services, not pages (Telegram focus)   | Новая инженерная амбиция и польза owner'у |
  | 2026-04-30 | Старые v0.3 идеи выкинуты, v0.4+ — открытый список        | Принцип "не копим хвосты"              |
  | 2026-05-01 | v0.2.1: хранилище state/apps.json, атомарная запись           | Персистентный архив решений         |
  | 2026-05-01 | v0.2.1: archiveApp() в orchestrator, не блокирует DONE        | Надёжность: заказ важнее архива     |
  | 2026-05-01 | v0.2.1: монотонные номера, не переиспользуются при удалении   | Предсказуемость                     |
  | 2026-05-01 | v0.2.1: TTL отключён, удаление только вручную                 | Владелец решает сам                 |
  | 2026-05-01 | v0.2.1: табы Order/Products, client-side toggle               | Без перезагрузки, pipeline не ломается |

---

## 11. Ключевые архитектурные решения v0.2

Зафиксированы после фазы 0 (проверочный деплой Hello World на Fly.io):

1. Хостинг output-приложений: Fly.io
   - Альтернативы рассматривались: Render (sleep), Railway, Vercel (не тот use case)
   - Выбор обоснован: универсальность Node.js, API для программного управления,
     auto-stop для экономии, прозрачная стоимость

2. Локальный Docker на машине DF: НЕ ТРЕБУЕТСЯ
   - Fly использует remote builder для сборки образов
   - Подтверждено экспериментально

3. Интеграция с Fly: через flyctl CLI (child_process)
   - Альтернатива — HTTP API, но CLI проще и стабильнее

4. Единичные ресурсы приложения: 256MB RAM, shared-cpu-1x, регион fra
   - Достаточно для простых Node.js приложений
   - Минимальная стоимость

5. Auto-stop/auto-start: включён
   - Машина засыпает при простое (экономия)
   - Просыпается за 1-2 сек при запросе

6. AC Checker: только статика + деплой как интеграционный тест
   - Никакого локального runtime AI-кода
   - Безопасность + простота

7. TTL приложений: 24 часа hard limit в v0.2
   - UI управления появится в v0.2.1
   - Автоматическая очистка через cleanup worker

8. Кащейная стадия: single-user self-hosted
   - Раздача коллегам через мораторий
   - Гигиена конфигурации (.env.example) всё равно поддерживается
   - Для будущей раздачи или для собственного переноса на другую машину

9. Конфигурация режимов работы: через флаги в server/run-modes.js
   - Централизация, расширяемость, один источник истины


## Insights
### v0.1

  - Если времени мало, frontend можно сделать максимально простым:
    даже без CSS всё должно работать функционально
  - Фаза 3 (промпты) — самая непредсказуемая по времени.
    Может потребоваться 5+ итераций на каждый промпт
  - Порядок фаз можно менять: 1 -> 2 -> 3 -> 5 -> 4 -> 6
    (frontend в конце, сначала заставить pipeline работать)

  
### v0.2.
  
  - Порядок фаз v0.2 можно варьировать. Логичный минимум для раннего интеграционного теста:
    2 (Fly Manager) → 3 (Orchestrator) → 5 (Prompts) → 9.1 (интеграционный прогон)
    Фазы 4, 6, 7, 8 можно делать параллельно или с переключением
  
  - Фаза 2 (Fly Manager) — критическая. Если здесь застрянем — всё остальное не имеет смысла.
    Заложить время на отладку интеграции с flyctl.
  
  - Каждый тестовый деплой на Fly тратит ~$0.01-0.05.
    При 20-30 итерациях отладки = $1-2 за фазу. Бюджетить не больше $10 на v0.2.
  
  - FLY_API_TOKEN безопасность: никогда не коммитить, показывать в логах как "fly_***".
  
  - Кащейная стадия: пока не раздаём DF коллегам, можно экспериментировать с API Fly
    без оглядки на обратную совместимость конфигов.

### v0.2.1
#### Products = архив решений
Обзор

v0.2.1 — тихая инфраструктурная версия DF. Вводит персистентное хранилище
сведений о созданных приложениях и UI для их просмотра/удаления.

**Метафора:** каркас самолёта получает шасси.

**Философская нагрузка:** Products — не просто список, а **архив решений**
Dark Factory. В будущих версиях (v0.3+) карточка приложения обогатится
spec'ом, verification report'ом и другими артефактами agency-слоя.

Принятые решения

Функциональность
- Страница Products с карточками всех успешно созданных приложений.
- Табы Order / Products в шапке, переключение через client-side toggle.
- Карточка: number (#506), id (df-abc123), дата, стоимость, время, URL,
  кнопки "Детали" и "Стереть".
- Details — inline-expand с сырым architectOutput.
- Удаление через modal с подтверждением, удаляет и с Fly.io, и из архива.
- Пустое состояние с приглашением перейти в Order.

Хранилище
- Файл `state/apps.json` в корне проекта.
- Структура: `{ version: 1, nextNumber: N, apps: [...] }`.
- Атомарная запись (tmp + rename).
- `/state/` добавлен в `.gitignore`.
- Номера монотонные, не переиспользуются при удалении.

Интеграция
- Запись в архив — в момент успешного DONE (вариант B).
- Существующие приложения (созданные до v0.2.1) не импортируются.
- Контекст Architect'а в v0.2.1 не трогаем (stateless остаётся).

Не-цели (явно)
- Нет поиска/фильтрации приложений.
- Нет live health-check (реальной проверки "живо или нет").
- Нет скриншотов/preview.
- Нет ссылок на прошлые заказы из текста (это v0.2.2).
- Нет персистентного хранения неудачных попыток.
- Нет master-detail layout.
- Нет глубоких URL-роутов.


#### Зомби-процесс на порту 3000

Голый `npm start` не убивает предыдущий процесс, если он висит на порту 3000.
Новый `node` стартует, но порт занят — и на запросы продолжает отвечать старый
процесс (с устаревшим кодом). Симптом: меняешь код, перезапускаешь, поведение
не меняется, `console.log` в новом коде "не работает".

Причина обнаружена в ходе отладки Фазы 2 v0.2.1.

Правило: для разработки использовать `npm run restart` (делает kill-port 3000)
или `npm run dev` (с `--watch` для автоперезапуска при изменениях). `npm start`
оставить для production-запуска на чистом окружении.

#### Принцип машинной проверки

Ручные проверки фаз — главный источник незаметно-проваленных фаз. Мозг быстро
устаёт и на однотипных проверках переходит на автопилот ("вроде ок").

Решение: на каждую фазу Roo пишет тестовый скрипт, который выводит
структурированную сводку `✓ / ✗ FAIL: ...` с финальным `ALL CHECKS PASSED` или
`N of M FAILED`. Задача владельца — не выполнять проверки, а ревьюить вывод.
Это одновременно быстрее и надёжнее ручной работы.

Исключение: сценарии, где машинная проверка технически сложна или требует
ручного визуального восприятия (UI). Их оставляем как явный список "что нужно
глазами посмотреть".

#### Не диагностировать в тумане

В ходе Фазы 2 v0.2.1 пытались искать баг интеграции через всё более глубокую
диагностику (логи, DIAG-маркеры, проверка путей). В итоге баг оказался в
другом: `npm start` не убивал зомби-процесс, и все правки уходили "в
никуда", а работал старый процесс.

Урок: если новые правки "не работают", первым делом проверять, что мы смотрим
на правильный процесс. До того как углубляться в код и логи — убедиться, что
сервер **перезапущен чистым запуском** (`npm run restart`), что его `PID` —
свежий, что `netstat -ano | grep :3000` показывает один процесс.

Диагностика кода имеет смысл только в правильно настроенной среде.
---

## Phases History
Выполненные фазы прошлых версий. Детали — в git по соответствующим коммитам/тегам.

### v0.1 — Велосипед ✅

**Статус:** завершено
**Результат:** pipeline с тремя агентами через OpenRouter работает, код пишется в workspace/

- Фаза 1: Настройка окружения
- Фаза 2: Backend — ядро
- Фаза 3: Промпты агентов
- Фаза 4: Frontend
- Фаза 5: Интеграция
- Фаза 5.5: Система режимов
- Фаза 6: Полировка и демо

### v0.2 — Скутер ✅

**Статус:** завершено 2026-05-01
**Результат:** приложения деплоятся на Fly.io, публичная ссылка, QR-код

- Фаза 0: Проверка Fly.io
- Фаза 1: Планирование
- Фаза 2: Fly Manager
- Фаза 3: Orchestrator — состояние DEPLOYING
- Фаза 4: AC Checker v0.2
- Фаза 5: Update Prompts
- Фаза 6: Frontend v0.2
- Фаза 7: Конфигурация и гигиена
- Фаза 8R: Завершение режимов
- Фаза 9R: Production run и метрики
- Фаза 9D: Удаление legacy
- Фаза 10: Релиз v0.2

### v0.2.1 — Шасси ✅

**Статус:** завершено 2026-05-02
**Результат:** Products page, persistent archive, app slug из заказа

- Фаза 1: Хранилище
- Фаза 2: Интеграция с orchestrator
- Фаза 3: API endpoints
- Фаза 4: Табы Order/Products
- Фаза 5: Products page список
- Фаза 6: Details expand
- Фаза 7: Удаление с подтверждением
- Фаза 7.5: App slug из заказа
- Фаза 8: Документация и релиз

## v0.3 — NEGOTIATE ✅

### Decisions
- Два режима архитектора (clarify/spec), без blocker (отложен в v0.3.1)
- Max 3 раунда вопросов, на последнем — принудительный spec
- Кнопка "Поправить" не показывается до v0.4
- ARCHITECTURE.md больше не генерируется архитектором
- Одна строка Architecture в таблице US, cost/time суммируется по раундам
- Поле architectOutput в apps-store сохранено, содержит JSON.stringify(spec)

### Insights
- Калибровочный тест (10 заказов) — эффективный способ валидации промпта: 10/10 за $0.40
- Architect prompt v2 надёжно различает ясные и неоднозначные заказы с первой попытки
- Стоимость negotiate-раунда ≈ $0.04-0.06 (один вызов Claude Opus)
- Общая стоимость заказа с вопросами ($0.18) всего на 50% выше чем без ($0.12)

### Phases
- Phase 1: Architect Prompt v2 (system prompt + calibration test, 10/10)
- Phase 2: Mock Agent v2 (clarify/spec modes, keyword detection)
- Phase 3: Orchestrator negotiate loop (CLARIFYING → SPEC_REVIEW states)
- Phase 4+5: Clarifying UI (radio buttons) + Spec Review UI (summary card)
- Phase 6: Developer prompt accepts spec directly
- Phase 7: Production dogfooding (2 orders, both deployed successfully)
- Phase 8: Documentation & release

---

## v0.4 — GitHub Integration ✅

### Decisions

| Дата | Решение | Причина |
|------|---------|---------|
| 2026-05-06 | Поле `sourceUrl`, не `githubUrl` | Абстракция от конкретного бэкенда Source Storage |
| 2026-05-06 | GITHUB_PUSH — non-blocking | GitHub-push бонус, не блокер. Заказ важнее |
| 2026-05-06 | Facade `storage.js` не создаётся | Контракт выводится из двух реализаций, не из одной |
| 2026-05-06 | `auto_init: true` при создании репо | Git Data API требует хотя бы одного коммита |
| 2026-05-06 | `defaultBranch` из createRepo ответа | Разные аккаунты имеют разный default (master/main) |
| 2026-05-06 | Fly teardown non-blocking | flyctl заблокирован на корп. VDI — не должен блокировать удаление |
| 2026-05-06 | GitHub repo удаляется при delete | DF создал — DF убирает. Best-effort |
| 2026-05-06 | Миграция OpenRouter → Hyperspace | SAP internal LiteLLM proxy, решает проблему VDI блокировки |

### Insights
- `auto_init: true` — обязательный параметр при создании репо через Git Data API.
  Без него создание blob'а падает с "Git Repository is empty" (409).
- Хардкод ветки `main` — скрытая ловушка. Нужно читать `defaultBranch` из ответа createRepo.
  Без этого файлы уходят в orphan-ветку отдельно от README auto_init коммита.
- Non-blocking паттерн (GITHUB_PUSH, Fly teardown) — правильный выбор для всего,
  что не является core pipeline. Пользователь не должен страдать из-за внешних сервисов.
- Принцип "контракт из двух реализаций" — сохраняет архитектуру чистой без преждевременной абстракции.

### Phases
- Phase 1: GitHub OAuth App setup, callback, token storage
- Phase 2: GitHub Client module (getUser, createRepo, setTopics, commitFiles, deleteRepo)
- Phase 3: Orchestrator — GITHUB_PUSH state, executeGithubPush(), readWorkspaceFiles()
- Phase 4: readme-generator.js — README.md и SPEC.md для каждого репо
- Phase 5: Products UI — GitHub icon на карточке, Source Code секция в Details
- Phase 6: Topics (уже в Phase 3), визуальная проверка README
- Phase 7: Integration testing (mock:fast, live, delete)
- Phase 8: Documentation & release

---

## v0.5 — REMEMBER ✅

### Decisions

| Дата | Решение | Причина |
|------|---------|---------|
| 2026-05-06 | Режим A (Order by Reference), режим B → Area-51 | B — capabilities-шаг, не agency; A даёт то же обучение за меньше сложности |
| 2026-05-06 | Передавать весь spec целиком | Spec маленький; вопрос не в объёме, а в поведении архитектора |
| 2026-05-06 | UI-кнопка, не парсинг свободного текста | Детерминированный триггер, принцип Guided decisions |
| 2026-05-06 | Prefix stripped в `generateUserPrompt` | Агент видит только дельту, appSlug не засоряется префиксом |
| 2026-05-06 | Создаём новое репо, не обновляем старое | Проще; update — будущих версий territory |

### Insights
- Reference flow работает: `referenceSpec` грузится, архитектор идёт сразу в `spec` без вопросов, дельта применяется корректно (проверено на живом LLM-вызове)
- Fly заблокирован на VDI → DEPLOYING падает → GITHUB_PUSH не запускается. Это системный блокер, не баг v0.5. Решается в v0.7 (Local Runner)
- Архитектор с referenceSpec ведёт себя предсказуемо: baseline берёт целиком, добавляет только запрошенное. Никакого "шума" от полного spec замечено не было
- `--org undefined` в ошибке flyctl — FLY_ORG_SLUG не прописан в .env. Нужно прописать если Fly когда-нибудь разблокируют

### Phases
- Phase 1: `readApp(sourceUrl)` в `github-client.js` — читает SPEC.md из репо
- Phase 2: Orchestrator — `resolveReferenceSpec()`, детект префикса, `referenceSpec` в state
- Phase 3: Architect prompt — параметр `referenceSpec`, strip prefix, baseline-инструкция
- Phase 4: UI — кнопка "Повторить с изменениями" в Products, prefill textarea
- Phase 5: Интеграционный тест (LLM live, Fly blocked — частичный)
- Phase 6: Документация и коммит

---
Отвергнутые идеи. Записываются, чтобы через полгода не вернуться к ним случайно.

*(пока пусто — заполним по мере возникновения)*

---

## v0.6 — Local Runner ✅

### Decisions

| Дата | Решение | Причина |
|------|---------|---------|
| 2026-05-06 | v0.6 = Local Runner (было VERIFY), v0.7 = VERIFY | VERIFY требует живого URL; без деплоя это слабый code review |
| 2026-05-06 | Workspace per app: `workspaces/{appName}/` | Изоляция; eviction критерии неизвестны → Area-51 |
| 2026-05-06 | On-demand UX: кнопка "Открыть", не постоянный URL | Честная модель; снимает проблему persistence после рестарта |
| 2026-05-06 | Нет Deployer facade | Контракт выводится из двух реализаций, не из одной |
| 2026-05-06 | puppeteer-core + системный Chrome | Проверено на VDI до старта v0.6 |
| 2026-05-06 | Verifier = VerifierA + VerifierB + compositor | Разные задачи, единый контракт; форма Report — из VerifierA |

### Insights
- Full pipeline на VDI теперь работает: DEPLOYING → GITHUB_PUSH → DONE (проверено в mock-full)
- mock-full время изменилось: ~6s → ~30s (npm install в Local Runner занимает время)
- `executeFakeDeploy()` оставлен без изменений — mock-fast и demo не затронуты
- Архитектурное обсуждение v0.7 VERIFY до старта кода — правильный подход:
  зафиксированы VerifierA/B/compositor, контракт, vision-подход — без строчки кода
- **Dogfooding bug:** "Повторить с изменениями" из состояния DONE показывала results-view вместо
  формы ввода. Причина: `/api/cancel` не работает из DONE (только из SPEC_REVIEW/CLARIFYING).
  Решение: `/api/reset` (любое состояние) + `pendingOrderPrefill` паттерн — применяется при IDLE via SSE

### Phases
- Phase 1: `local-runner.js` — deploy/teardown, free port, HTTP polling
- Phase 2: `process-registry.js` — in-memory lifecycle tracking
- Phase 3: Orchestrator — `executeLocalDeploy()`, GITHUB_PUSH → DONE path
- Phase 4: Delete flow — teardown on app delete + `/open` + `/status` endpoints
- Phase 5: UI — "Открыть" button, hide QR for localhost
- Phase 6: Integration test (mock-full: full pipeline end-to-end)
- Phase 7: Documentation & release

---

## v0.7 — VERIFY ✅

### Decisions

| Дата | Решение | Причина |
|------|---------|---------|
| 2026-05-07 | Hyperspace поддерживает vision — gemini-2.5-flash и claude-sonnet | Проверено в Phase 0 тестовым скриптом |
| 2026-05-07 | VerifierA сканирует HTML + linked JS файлы | Фичи реализуются в JS, не в static HTML |
| 2026-05-07 | Порог VerifierA: ≥1 ключевое слово (не 50%) | Spec и код используют разные слова (task/todo, count/total) |
| 2026-05-07 | VerifierB: gemini-2.5-flash | Дешевле claude-sonnet, подтверждён на VDI |
| 2026-05-07 | Compositor: graceful degradation при ошибке VerifierB | VerifierB — бонус, не блокер |
| 2026-05-07 | VERIFYING между DEPLOYING и GITHUB_PUSH | Приложение уже запущено, можно проверять |
| 2026-05-07 | US4 Verification (agent: 'Ver') в USER_STORIES | Показывается в таблице Manufacturing |
| 2026-05-07 | executeFakeDeploy: verdict: 'SKIPPED', блок скрыт в UI | Fake URL — не реальное приложение |

### Insights
- VerifierA: keyword scan HTML + JS — правильный уровень. Простой, дешёвый, работает на TODO-app 4/4
- VerifierB pipeline (puppeteer screenshot → base64 → gemini vision) работает на VDI без сюрпризов
- Порог ≥1 ключевое слово — контринтуитивно низкий, но обоснован: spec пишет "Mark tasks as completed",
  код содержит "completed" — нашлось 1 из 3 слов. 50%-порог давал false negative
- Vision GOOD → PASS верно; UI выглядел корректно — gemini согласился
- Phase-by-phase подход: каждый компонент тестировался отдельным скриптом до интеграции
- Стратегическое решение сессии: Proto DF → Specialized DFs (v0.8 = PROFILES, anchor = Integration Cards)
- Deployer Contract: trigger-based (когда появится второй живой деплоер), не version-based

### Phases
- Phase 0: Проверка Hyperspace image support (тестовый скрипт)
- Phase 1: VerifierA — HTTP structural + keyword scan HTML+JS
- Phase 2: VerifierB — puppeteer-core screenshot + gemini-2.5-flash vision
- Phase 3: Compositor — verifier.run(), A→B, graceful degradation
- Phase 4: Orchestrator — VERIFYING state, executeVerify(), verificationReport
- Phase 5: UI — VERIFYING/GITHUB_PUSH в switch, renderVerificationReport в pickup
- Phase 6: Integration test (mock-fast smoke + mock-full full pipeline, verdict PASS)
- Phase 7: Documentation & release