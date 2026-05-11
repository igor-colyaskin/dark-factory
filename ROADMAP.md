# ROADMAP.md — Dark Factory Long-Term Plan

**Статус:** черновик, обновляется по мере продвижения
**Последнее обновление:** 2026-05-11
**Принцип:** фиксируем вектор, а не обязательства. Идеи, не дожившие
до реализации за 2 версии — удаляются (принцип "не копим хвосты").

---

## Ориентир

Довести DF до уровня **Proto DF** — платформы, из которой собираются
специализированные фабрики под конкретные домены.

Это **не цель**, а ориентир. Цель — навыки: научиться работать с командой
агентов, понять как устроен диалог человека и LLM, получить опыт
проектирования agent-систем.

Если v0.1 — велосипед, v0.2 — скутер, то горизонт — авиазавод:
не один самолёт, а платформа для производства специализированных DF.
Каждый шаг по маршруту оправдывает себя полученным опытом.

---

## Главный вектор: от workflow к agency

**Workflow (начало):** пользователь говорит → агенты выполняют → готово.
Агенты — руки без головы.

**Agency (цель):** агенты говорят "подожди" вместо "готово".
Спрашивают, предупреждают, проверяют, помнят.

Пройденные стадии:
```
NEGOTIATE → REMEMBER → VERIFY → PROFILES → IC
  v0.3        v0.5       v0.7     v0.8      v0.9
```

Текущий вектор: углубление IC-профиля (v0.11.1 ✅ → v0.12 ✅ → v0.12.1 ✅ → v0.13 demo prep, в работе).
Параллельный горизонт: когда IC достаточно зрел — новый специализированный профиль.

---

## Выпущенные версии

### v0.1 — Велосипед ✅
Pipeline работает. Агенты вызываются через OpenRouter. Результат — код
в workspace/. Учебная задача решена.

### v0.2 — Скутер ✅
Приложения деплоятся на Fly.io. Публичная ссылка, QR-код.
Получатель не ставит Docker/Node — достаточно браузера.

### v0.2.1 — Шасси ✅
Products page: архив всех созданных приложений. CRUD через UI.
App slug из текста заказа (первый микро-шаг agency).

### v0.3 — NEGOTIATE ✅
Архитектор останавливается и разговаривает с заказчиком.
Два режима: clarify (структурированные вопросы с вариантами) и spec
(полная спецификация перед разработкой). Spec Review UI.

Метрики dogfooding:
- Ясный заказ (Pomodoro): $0.12, 1 мин, 0 раундов вопросов
- Неоднозначный заказ (Habits): $0.18, 1:28, 1 раунд вопросов

### v0.4 — GitHub Integration ✅
Код сгенерированных приложений пушится в GitHub-репо пользователя.
README.md и SPEC.md коммитятся вместе с кодом. При удалении — репо удаляется.
Переход на Hyperspace LiteLLM (SAP internal proxy).

Ключевые решения:
- Поле `sourceUrl` (не `githubUrl`) — абстракция от конкретного бэкенда
- GITHUB_PUSH non-blocking: если GitHub недоступен, заказ завершается с `sourceUrl: null`
- Нет Deployer/Storage facade — контракт выводится из двух реализаций, не из одной

### v0.5 — REMEMBER ✅
Архитектор использует прошлый заказ как baseline.
Кнопка "Повторить с изменениями" → `readApp` читает SPEC.md из GitHub →
архитектор применяет только дельту без лишних вопросов.

Ключевые решения:
- UI-кнопка, не текстовый парсинг — детерминированный триггер
- Prefix stripped в `generateUserPrompt` — агент видит только дельту

### v0.6 — Local Runner ✅
Fly.io заменён на локальный запуск. Полный pipeline работает на корп. VDI.
On-demand UX: кнопка "Открыть" стартует приложение и открывает localhost:PORT.

Ключевые решения:
- `local-runner.js`: копирует workspace, npm install, npm start, ждёт HTTP
- `process-registry.js`: in-memory реестр для teardown
- On-demand UX, не постоянный URL — честная модель для localhost

### v0.7 — VERIFY ✅
Верификатор проверяет работу агентов: HTTP + keyword scan (VerifierA) и
puppeteer screenshot + gemini-2.5-flash vision (VerifierB). VERIFYING state
в pipeline. Verification Report в UI.

Ключевые решения:
- VerifierA сканирует HTML + linked JS файлы (фичи в JS, не в static HTML)
- Порог ≥1 ключевое слово — spec и код используют разные слова (task/todo, count/total)
- Compositor: graceful degradation при ошибке VerifierB
- Стратегическое: Proto DF → specialized DFs, plugin = cherry-pick combo-commit

### v0.8 — PROFILES ✅
Profile = кассета (промпты + deployer + verifier). Выбор профиля per-order.
Первый новый профиль: Integration Card (SAP Work Zone Component, Simple Form pattern).
`deployer: 'none'`, `verifier: 'manifest'` (VerifierC).

Ключевые решения:
- LLM генерирует 5 extension-point файлов, сервер — 8 статических (Hyperspace ~8192 token limit)
- VerifierC пропускает header/content для Component-типа манифеста
- Plugin Path 2: factory выпускает single-plugin продукты, не комбинации

### v0.9 — IC Tests + Docs ✅
Architect output questions (generateTests, generateDocs) — отдельный clarify-раунд
после сбора spec. DEV_CHECK запускает `npm test`. LLM генерирует DataHelper.qunit.js
(4 QUnit-модуля). README всегда, confluence.md при generateDocs.

Ключевые решения:
- Output questions вместо Draft/Release toggle — не UI-кнопки, Architect спрашивает сам
- spec.protocol, spec.layout — clarify-вопросы, новые значения без изменений UI
- `lastACError` module-level в index.js → retry-промпт Developer'а
- Confluence page = placeholder (title + 2×2 таблица), полный шаблон — отдельная задача

### v0.10 — UX polish + Sandbox preview ✅
UX-001: кнопка «Уточнить» на экране Spec Review — новый переход SPEC_REVIEW → CLARIFYING
без потери истории (до 3 раундов). VIZ-001: sandbox preview карточки с mock-данными
в отдельной вкладке через `ui5 serve`. Починен `npm test` (CDN-regex / двойные стабы).

Ключевые решения:
- `orchestrator.handleRefineRequest()` — `{ refine: true }` в clarifyHistory, сброс clarifyRound
- `server/sandbox-manager.js` — старт/стоп `ui5 serve`, один процесс per DF instance
- SDK-стабы: два набора (`sdk-stubs/resources/...` для sandbox, `sdk-stubs/com/sap/...` для npm test)
  причина: `ui5-middleware-servestatic` игнорирует mountPath → URL с /resources/ → CDN перехват

---

### v0.11 — SDK-001 + My Apps + Edit + Import ✅
Smart Clone SDK-стабы (6 файлов, полный API). IC pipeline → `cards/{slug}/`.
My Apps страница: список карточек, Edit / Preview / Import. Delta-Архитектор —
отдельный промпт для edit mode (видит файлы → патч, не spec с нуля).

### v0.11.1 — cleanup ✅
Удалены 17 мёртвых файлов: Fly.io, GitHub, Local Runner, Verifier-a/b, apps-store,
nodejs-app профиль и промпты. Settings страница убрана. Сервер минималистичный.

### v0.12 — UX polish ✅
Сортировка My Apps новые вверху (UX-004). Хранение spec.json в корне карточки (UX-005).

### v0.12.1 — bug fixes ✅
Опция «Другое» в вопросах архитектора (UX-003). Мелкие исправления.

### v0.13 — demo prep 🔄 (в работе)
Vision pre-pass + upload validation (UX-008). Developer split View.view.xml (INF-002).
protocol + viewControls[] вместо layout (TPL-004). Автовывод slug (TPL-002).
ID карточек + ссылки #NNN в заказе (UX-007). Импорт папки (UX-006).
Clone card без LLM — детерминированный namespace rename (EDT-001).
UI polish: английский, max-width 960px, phase status cards (UX-009). Цель: питч тимлиду.

---

## Следующие версии

### v1.0 — горизонт

DF становится **осмысленным собеседником**: ведёт переговоры, предлагает
альтернативы, оценивает стоимость, согласует spec, отчитывается.
Proto DF зрел настолько, что специализацию можно собрать как конфиг.

Не дата, а **состояние зрелости agency-слоя**.

---

## Открытый список идей

Не привязаны к конкретным версиям. Всплывут, когда придёт время,
или будут удалены через 2 версии без движения.

- **Smart Input** — пользователь вставляет sample JSON от BE, Архитектор парсит поля автоматически; clarify-раунд сокращается до минимума. Деферировано из v0.12.
- **Square 2** — рефакторинг plugin contract: IC-специфичное переносится внутрь профиля, combo-commit чистый. Триггер: IC-профиль полностью завершён.
- **Table pattern** — если анализ ~30 карточек команды покажет порог 50%
- **Figma/mockup input** — vision-модель извлекает поля из мокапа (v1.0+)
- **Agent-to-agent feedback** — тестер → разработчику конкретные претензии
- **Stage descriptions** — уникальный текст для каждой стадии pipeline вместо голого спиннера

---

## Принципы (напоминание)

1. **Agency over capabilities** — глубина переговоров важнее ширины умений
2. **Маленькие шаги ради понимания** — понял, прежде чем двигаться дальше
3. **Guided decisions over free-form** — варианты, а не пустое поле
4. **Не копим хвосты** — устаревшее удаляем
