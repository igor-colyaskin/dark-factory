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

**Осталось до демо:**

| # | ID | Задача | Оценка |
|---|----|--------|--------|
| 1 | UX-006 | Импорт папки | ~3 ч |
| 2 | UX-009 | UI polish | ~2-3 ч |

---

## Находки последней сессии (2026-05-11 #7)

**UX-007 закрыт:**
- `cards-registry.js`: auto-increment `id`, одноразовая миграция в `read()` — существующие карточки получают ID при первом обращении
- `orchestrator.js`: `resolveReferenceSpec` — парсит `#NNN`, загружает `cards/{slug}/spec.json`; бросает ошибку (не null) если карточка не найдена или нет spec.json
- `client/app.js`: badge `#N` на карточке (кликабельный, копирует в буфер), `copyCardId()`
- `client/index.html`: `status-message` перенесён из `manufacturing-block` в `page-order` — был невидим когда родительский блок `display:none`

**sandbox-manager.js — skip npm install:**
- `npm install --prefer-offline` теперь запускается только если `node_modules` не существует
- Повторные Preview на той же карточке — мгновенные

**TPL-002 закрыт:**
- `cardSlug` = название папки (единственный источник истины), kebab-case, суффикс `-card`/`-table`
- Namespace: `cardSlug` с точками → `com.sap.partner.wz.<slug-with-dots>` (дефисы → точки)
- Import paths: дефисы → слэши → `com/sap/partner/wz/<slug-with-slashes>/...`
- Архитектор выводит slug из описания, задаёт **обязательный вопрос** `q_slug` в финальном раунде (вместе с tests/docs)
- Spec Review показывает `Folder: <cardSlug>`

**Баг namespace в View.view.xml — исправлен:**
- LLM получает `cardNamespace: "pp.points.card"` (предвычисленное, без дефисов) в spec
- Добавлено в `generateUserPrompt()` и `generateViewUserPrompt()`
- `viewGeneratorSystemPrompt` обновлён: явное правило использовать `spec.cardNamespace`
- Статические файлы: умная `sub()` — `com.sap.partner.wz.SLUG` → через `slugDot`, `com/sap/partner/wz/SLUG` → через `slugPath`

**Конвенция зафиксирована в:**
- `server/prompts/integration-card/architect.js` — правила slug, q_slug в Output Questions Round
- `server/prompts/integration-card/developer.js` — cardNamespace, sub(), viewGeneratorSystemPrompt
- `client/app.js` — Folder в Spec Review
- `docs/contracts.md` — slug convention section

---

## Ключевые файлы

| Файл | Роль |
|------|------|
| `HANDOFF.md` | этот файл |
| `docs/backlog.md` | **единственный источник** описаний задач |
| `docs/contracts.md` | контракты агентов, IC spec fields |
| `docs/log.md` | архив решений и закрытых фаз |
| `docs/DEMO.md` | план питча тимлиду |
| `server/index.js` | pipeline wiring, IC workspace, /api/cards, /api/edit |
| `server/orchestrator.js` | state machine, editMode, archiveApp |
| `server/sandbox-manager.js` | ui5 serve, skip install if node_modules exists |
| `server/prompts/integration-card/architect.js` | IC Architect system + user prompt |
| `server/prompts/integration-card/developer.js` | generateStaticFiles + LLM prompts (split) |
| `server/prompts/integration-card/delta-architect.js` | edit mode: patch-spec |
| `server/prompts/integration-card/sdk-stubs/` | SDK-стабы для offline dev/test |
| `server/cards-registry.js` | CRUD реестра cards-registry.json |

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
