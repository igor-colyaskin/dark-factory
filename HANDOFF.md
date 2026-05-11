# Dark Factory — Handoff

Контекст для Claude в начале сессии. Детали задач — в [`docs/backlog.md`](docs/backlog.md).

## Быстрый старт

1. Прочитай память: `ic_roadmap.md`, `project_state_v04.md`
2. Прочитай [`docs/backlog.md`](docs/backlog.md) — детали задач по ID
3. Прочитай «Находки последней сессии» ниже

---

## Текущий статус

**v0.13 — в работе.** Цель: питч тимлиду. Подробнее — [`docs/DEMO.md`](docs/DEMO.md).

**Сделано:**
- UX-008 ✅ Vision pre-pass + upload validation
- INF-002 ✅ Developer split (View.view.xml отдельно) + bug fix default export
- TPL-004 ✅ protocol + viewControls[] — layout удалён, предупреждение при > 3 контролах
- TPL-002 ✅ Автовывод slug + конвенция namespace/папка
- UX-007 ✅ ID карточек + ссылки #NNN в заказе
- UX-006 ✅ Импорт папки (webkitdirectory + /api/cards/import-folder)
- EDT-001 ✅ Clone card — детерминированный rename без LLM
- UX-009 ✅ UI polish — английский, max-width 960px, phase status cards

**Осталось до демо:**

Формальный бэклог закрыт. Идём по UX-009 итеративно — Игорь запускает, замечает, правим.

---

## Находки последней сессии (2026-05-11 #9)

**Синхронизация документации (начало сессии):**
- CONCEPT.md §8, ROADMAP.md, backlog.md EDT-001, memory/project_state_v04.md, memory/ic_roadmap.md — все приведены в соответствие с реальным состоянием v0.13

**UX-009 итерация — UI polish (не закоммичено):**

Pickup-блок:
- Убран `deploy-error-section` (предупреждение «Deploy Failed») — для IC-карточек deployer:none, секция никогда не была нужна. Удалено из HTML, JS, CSS.
- Убран вспомогательный текст под «Application Successfully Created!»
- Preview Card + New Order объединены в один ряд `.pickup-actions`; обёртка `#sandbox-preview` удалена, кнопка `#sandbox-preview-btn` показывается/скрывается напрямую

Verification-блок:
- Теперь `<details>/<summary>` — схлопнут по умолчанию; verdict виден в заголовке; стрелка ▶ показывает состояние
- Исправлено выравнивание: стрелка + «Verification» слева (gap), verdict — `margin-left: auto`

Spec Review:
- Блок «Integration Card» (заголовок) удалён; IC-поля (Card, Folder, Destination, Protocol, Controls, Fields, Tests, Docs) перенесены в левую колонку под Summary
- Горизонтальный layout: левая колонка = Summary + IC-поля, правая = Clarifications (`.spec-top-row` flex)

Status message (MessageStrip):
- Исправлена скобка-артефакт: `border-radius: 6px` → `border-radius: 0 4px 4px 0` (левая сторона квадратная, скруглённый `border-left` давал визуальный `(`)

Total-строка таблицы:
- `padding: 8px 10px` → `padding: 8px 10px 12px` (нижнее поле выровнено с боковыми)

**Стратегия демо — UI (без изменений):**
- Главная страница будет иметь три тайла: Generate / Clone / Import (UX-009 будущая итерация)
- My Apps — только управление существующими; кнопки создания уберём (UX-009 будущая итерация)
- Текущий приоритет — итеративный UX-009 по мере обнаружения во время прогонов

---

## Ключевые файлы

| Файл | Роль |
|------|------|
| `HANDOFF.md` | этот файл |
| `docs/backlog.md` | **единственный источник** описаний задач |
| `docs/contracts.md` | контракты агентов, IC spec fields |
| `docs/log.md` | архив решений и закрытых фаз |
| `docs/DEMO.md` | план питча тимлиду |
| `server/index.js` | pipeline wiring, IC workspace, /api/cards, /api/edit, /api/cards/:slug/clone |
| `server/orchestrator.js` | state machine, editMode, archiveApp |
| `server/sandbox-manager.js` | ui5 serve, skip install if node_modules exists |
| `server/prompts/integration-card/architect.js` | IC Architect system + user prompt |
| `server/prompts/integration-card/developer.js` | generateStaticFiles + LLM prompts (split) |
| `server/prompts/integration-card/delta-architect.js` | edit mode: patch-spec |
| `server/prompts/integration-card/sdk-stubs/` | SDK-стабы для offline dev/test |
| `server/cards-registry.js` | CRUD реестра cards-registry.json |
| `client/app.js` | UI логика, PHASE_CONFIGS, showPhaseStatus |
| `client/index.html` | разметка, #phase-status div |
| `client/styles.css` | стили, .phase-status варианты цветов |

---

## Среда

- **OS:** Windows 11 VDI (нестабильно), Shell: Git Bash
- **Node.js:** v24 | **Запуск:** `npm run restart` (убивает зомби-процессы)
- **LLM:** Hyperspace LiteLLM `localhost:6655`
  Модели: `anthropic--claude-4.6-opus`, `anthropic--claude-4.6-sonnet`, `gemini-2.5-flash`
- **Hyperspace output cap:** ~8192 токенов (игнорирует `max_tokens`) → паттерн: один вызов = одна задача
- **Port:** 3000 (sandbox: 3100). Зомби: `netstat -ano | grep ":3000 "` → `taskkill //F //PID <pid>`

## Чего не делать

- Не начинай код до прочтения файлов
- Не дублируй описания задач — всё в backlog.md
- Не пересматривай архитектурные решения без запроса
- Не создавай абстракции "на будущее"
- Не игнорируй `docs/log.md` — там прецеденты
