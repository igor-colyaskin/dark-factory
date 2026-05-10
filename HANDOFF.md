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

**Осталось до демо:**

| # | ID | Задача | Оценка |
|---|----|--------|--------|
| 1 | TPL-002 | Автовывод slug | ~2 ч |
| 2 | UX-007 | ID карточек + ссылки "как #32" | ~6 ч |
| 3 | UX-006 | Импорт папки | ~3 ч |
| 4 | UX-009 | UI polish | ~2-3 ч |

---

## Находки последней сессии (2026-05-10 #5)

**TPL-004 закрыт:**
- `spec.layout` удалён везде → `spec.viewControls: string[]`
- Архитектор выводит массив из заказа/мокапа; protocol всегда спрашивает явно
- Developer выбирает DataHelper shape и View structure по массиву контролов
- Предупреждение в Spec Review при `viewControls.length > 3` (amber banner)
- Проверено: SimpleForm, Table, sap.ui.table.Table, FilterBar+Table, 5 контролов — всё корректно

**Дообсуждены архитектурные решения:**
- `viewControls` — массив (не строка): поддерживает multi-control layouts
- Порог > 3: предупреждение про вайб-кодинг, не hard block
- Условная видимость контролов — дополнительный сигнал сложности (для будущих версий)

**Коммиты:**
- `0a039b8` feat(tpl-004): server — layout → viewControls[]
- `214eff9` feat(tpl-004): UI — Controls field + complex layout warning

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
| `server/prompts/integration-card/architect.js` | IC Architect system + user prompt |
| `server/prompts/integration-card/developer.js` | generateStaticFiles + LLM prompts (split) |
| `server/prompts/integration-card/delta-architect.js` | edit mode: patch-spec |
| `server/prompts/integration-card/sdk-stubs/` | SDK-стабы для offline dev/test |
| `server/sandbox-manager.js` | ui5 serve, один процесс per DF instance |
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
