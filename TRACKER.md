# TRACKER.md — Dark Factory

## Где мы сейчас

- **Версия:** v0.3 (в работе)
- **Фаза:** гигиена документации (pre-v0.3)
- **Блокер:** нет
- **Следующий шаг:** завершить гигиеническую фазу, затем перейти к Phase 1 v0.3 (Architect Prompt v2)

## Текущая фаза: подробно

### Гигиена документации (pre-v0.3)

Цель: собрать рассеянную по проекту документацию в управляемую
структуру перед началом содержательной работы над v0.3.

- [x] Шаг 1: структура папок, переименование исходников
- [x] Шаг 2: docs/log.md (decisions, insights, phases, graveyard)
- [x] Шаг 3: docs/contracts.md (lightweight draft)
- [x] Шаг 4: docs/infra.md
- [x] Шаг 5: сокращение CONCEPT.md
- [ ] Шаг 6: сокращение TRACKER.md ← мы здесь
- [ ] Шаг 7: docs/work/v0.3-negotiate.md (consolidate DESIGN-v0.3.md)

После завершения → начало Phase 1 v0.3.

## Навигация

- **Прошлые фазы и решения:** `docs/log.md`
- **Рабочие документы текущей версии:** `docs/work/`
- **Контракты компонентов:** `docs/contracts.md`
- **Инфраструктура:** `docs/infra.md`
- **Долгосрочный вектор:** `ROADMAP.md`
- **Концепция:** `CONCEPT.md`


## ============================================
## v0.3 — NEGOTIATE
## ============================================

  Цель: архитектор останавливает конвейер и разговаривает с заказчиком.
  Спрашивает, предупреждает, показывает spec. Первый настоящий agency-шаг.

  Pipeline до v0.3:
    Order → Architect → Approve → Dev → Test → Deploy → Done

  Pipeline после v0.3:
    Order → Analyze → [Clarify?] → [Blocker?] → Summary → Start → Dev → Test → Deploy → Done

  Дизайн-решения: docs/DESIGN-v0.3.md


  ФАЗА 0: ДИЗАЙН-СЕССИЯ ✅: выполнено
  =========================

  [x] 0.1  Формат ответа архитектора: три режима (clarify / blocker / spec)
  [x] 0.2  Формат вопроса: { id, text, options[], allowOther }
  [x] 0.3  Формат blocker: { message, options[], allowOther }, Cancel — кнопка UI
  [x] 0.4  Формат spec: { appSlug, summary, features, screens, constraints, warnings, estimated* }
  [x] 0.5  Summary page: всегда показывается (даже без вопросов)
  [x] 0.6  Кнопки Summary: Start / Cancel / Поправить (disabled placeholder)
  [x] 0.7  questionsLog собирается оркестратором, не архитектором
  [x] 0.8  Max 3 раунда вопросов, ~5 вопросов за раунд (мягкий лимит)
  [x] 0.9  Зафиксировано в docs/DESIGN-v0.3.md
  [x] 0.10 Коммит: "v0.3 phase 0: design decisions"


  ФАЗА 1: ARCHITECT PROMPT V2 ⬜
  ===============================

  Цель: архитектор надёжно работает в трёх режимах (clarify/blocker/spec).
  Это 80% успеха v0.3 — если промпт не работает, всё остальное бесполезно.

  [ ] 1.1  Переписать system prompt:
           - Роль: "tech lead на первой встрече с заказчиком"
           - JSON schema для трёх режимов с примерами
           - Правило: спрашивай ТОЛЬКО если ответ меняет архитектуру
           - Правило: минимум вопросов для старта, детали — в feedback (v0.4)
           - Правило: формулируй вопросы, которые подталкивают к ответам
           - Запрет: не спрашивай про цвета, шрифты, анимации
  [ ] 1.2  Два шаблона user prompt:
           - Template A (первый вызов): order
           - Template B (повторный): order + clarifyHistory + round/maxRounds
  [ ] 1.3  Ручной тест: ясный заказ ("простой TODO") → должен вернуть mode: "spec"
  [ ] 1.4  Ручной тест: неоднозначный заказ ("приложение для работы") → mode: "clarify"
  [ ] 1.5  Ручной тест: заказ с внешней зависимостью ("покажи погоду") → mode: "blocker"
  [ ] 1.6  Ручной тест: повторный вызов с history → mode: "spec"
  [ ] 1.7  Проверка: все ответы — валидный JSON, поле mode присутствует
  [ ] 1.8  Коммит: "v0.3 phase 1: architect prompt v2"


  ФАЗА 2: MOCK AGENT V2 ⬜
  =========================

  Цель: mock-agent-manager поддерживает оба пути для тестирования UI.

  [ ] 2.1  Мок "clarify" — 2-3 вопроса с вариантами и allowOther
  [ ] 2.2  Мок "blocker" — сообщение + варианты
  [ ] 2.3  Мок "spec" — полный spec со всеми полями
  [ ] 2.4  Логика переключения: первый вызов → clarify,
           второй → spec (или по ключевому слову в заказе)
  [ ] 2.5  Коммит: "v0.3 phase 2: mock agent v2"


  ФАЗА 3: ORCHESTRATOR — NEGOTIATE LOOP ⬜
  ==========================================

  Цель: state machine поддерживает цикл clarify → blocker → spec review.

  [ ] 3.1  Новые поля state: clarifyHistory[], clarifyRound, maxClarifyRounds(3),
           currentSpec, blockerInfo
  [ ] 3.2  Состояние CLARIFYING: архитектор вернул вопросы, ждём ответы
  [ ] 3.3  Состояние BLOCKER: архитектор нашёл препятствие, ждём решение
  [ ] 3.4  Состояние SPEC_REVIEW: spec готов, ждём Start/Cancel
  [ ] 3.5  Переход ARCH_WORKING → CLARIFYING (mode === "clarify")
  [ ] 3.6  Переход ARCH_WORKING → BLOCKER (mode === "blocker")
  [ ] 3.7  Переход ARCH_WORKING → SPEC_REVIEW (mode === "spec")
  [ ] 3.8  Переход CLARIFYING → ARCH_WORKING (ответы получены, history обновлена)
  [ ] 3.9  Переход BLOCKER → ARCH_WORKING (заказчик выбрал вариант)
  [ ] 3.10 Переход BLOCKER → IDLE (заказчик нажал Cancel)
  [ ] 3.11 Переход SPEC_REVIEW → DEV_WORKING (Start)
  [ ] 3.12 Переход SPEC_REVIEW → IDLE (Cancel)
  [ ] 3.13 questionsLog: оркестратор собирает из clarifyHistory для передачи в UI
  [ ] 3.14 Spec передаётся Developer'у как контекст (вместо старого architectOutput)
  [ ] 3.15 Endpoint POST /api/cancel для Cancel из Blocker и Summary
  [ ] 3.16 Удалить/переработать старый ARCH_REVIEW (заменён на SPEC_REVIEW)
  [ ] 3.17 Reset: очистка новых полей при reset()
  [ ] 3.18 Коммит: "v0.3 phase 3: orchestrator negotiate loop"


  ФАЗА 4: UI — CLARIFYING + BLOCKER ⬜
  ======================================

  Цель: заказчик видит вопросы и блокеры, отвечает через radio + кнопки.

  [ ] 4.1  HTML: блок clarifying-section в manufacturing-block
  [ ] 4.2  Рендер вопросов: radio-кнопки для options
  [ ] 4.3  allowOther: последняя опция "Другое" раскрывает textarea
  [ ] 4.4  Текст progress от архитектора вверху блока
  [ ] 4.5  Кнопка "Ответить" → POST /api/answers
  [ ] 4.6  HTML: блок blocker-section в manufacturing-block
  [ ] 4.7  Рендер блокера: ⚠️ стиль, radio для вариантов, allowOther
  [ ] 4.8  Две кнопки внизу блокера: "Отменить заказ" (secondary) + "Продолжить" (primary)
  [ ] 4.9  "Отменить заказ" → POST /api/cancel → возврат в IDLE
  [ ] 4.10 Стили: blocker визуально отличается от clarify (жёлтый/warning)
  [ ] 4.11 Коммит: "v0.3 phase 4: clarifying and blocker UI"


  ФАЗА 5: UI — SUMMARY (SPEC REVIEW) ⬜
  =======================================

  Цель: заказчик видит полный spec и принимает решение.

  [ ] 5.1  HTML: блок summary-section в manufacturing-block
  [ ] 5.2  Секция "Заказ" — исходный текст заказа
  [ ] 5.3  Секция "Уточнения" — Q&A из clarifyHistory (оркестратор)
  [ ] 5.4  Секция "Что будет сделано" — features из spec (✓ маркеры)
  [ ] 5.5  Секция "Ограничения" — constraints из spec
  [ ] 5.6  Секция "Предупреждения" — warnings из spec (⚠ стиль)
  [ ] 5.7  Секция "Оценка" — estimatedCost + estimatedTime
  [ ] 5.8  Три кнопки: Cancel / Поправить (disabled) / Start
  [ ] 5.9  Start → POST /api/approve → DEV_WORKING
  [ ] 5.10 Cancel → POST /api/cancel → IDLE
  [ ] 5.11 Коммит: "v0.3 phase 5: summary UI"


  ФАЗА 6: DEVELOPER PROMPT UPDATE ⬜
  ====================================

  Цель: Developer получает spec вместо старого architectOutput.

  [ ] 6.1  Обновить server/prompts/developer.js: user prompt принимает spec
  [ ] 6.2  Проверить что tester prompt тоже работает с новым форматом
  [ ] 6.3  Обновить mock-agent-manager если нужно
  [ ] 6.4  Коммит: "v0.3 phase 6: developer prompt update"


  ФАЗА 7: ИНТЕГРАЦИЯ И DOGFOODING ⬜
  ====================================

  Цель: полный прогон обоих путей, реальные заказы.

  [ ] 7.1  mock:fast — путь с вопросами (clarify → answers → spec → start)
  [ ] 7.2  mock:fast — путь без вопросов (spec → start)
  [ ] 7.3  mock:fast — blocker → продолжить → spec → start
  [ ] 7.4  mock:fast — blocker → отменить заказ
  [ ] 7.5  mock:fast — cancel на этапе summary
  [ ] 7.6  production — ясный заказ ("простой TODO")
  [ ] 7.7  production — неоднозначный заказ ("сделай приложение для работы")
  [ ] 7.8  production — заказ с внешней зависимостью ("покажи погоду")
  [ ] 7.9  Проверить что Products/Details работают с новым форматом spec
  [ ] 7.10 Записать метрики: стоимость, время, количество раундов
  [ ] 7.11 Коммит: "v0.3 phase 7: integration testing"


  ФАЗА 8: ДОКУМЕНТАЦИЯ И РЕЛИЗ ⬜
  =================================

  [ ] 8.1  Обновить CONCEPT.md: описание negotiate-цикла
  [ ] 8.2  Обновить docs/ROADMAP.md: v0.3 → ✅
  [ ] 8.3  Обновить README.md
  [ ] 8.4  2-3 dogfooding-заказа
  [ ] 8.5  Записать инсайты в docs/insights.md
  [ ] 8.6  Релизный коммит + тег v0.3

## ============================================
