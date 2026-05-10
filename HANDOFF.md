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
- TPL-004 частично: папки переименованы (`template-rest/`, `template-odata2/`)

**Осталось до демо:**

| # | ID | Задача | Оценка |
|---|----|--------|--------|
| 1 | TPL-004 | protocol + viewControl → убрать layout | ~2-3 ч |
| 2 | TPL-002 | Автовывод slug | ~2 ч |
| 3 | UX-007 | ID карточек + ссылки "как #32" | ~6 ч |
| 4 | UX-006 | Импорт папки | ~3 ч |
| 5 | UX-009 | UI polish | ~2-3 ч |

---

## Находки последней сессии (2026-05-10 #4)

**Bug fix INF-002:** `viewGeneratorSystemPrompt` и `generateViewUserPrompt` были named exports но не попали в default export `developer.js` → View.view.xml не генерировался (условие `typeof ... === 'string'` всегда false).

**UX-008 закрыт:**
- Подтверждено: vision через Hyperspace работает (Gemini 2.5 Flash)
- Upload: валидация PNG/JPG/WEBP, max 5 MB на клиенте; hint рядом с кнопкой
- Мокап разбирается корректно, спецификация правильная; колонки View не совпадают с мокапом (ограничение Vision, не баг)

**TPL-004 — важно:**
Описание задачи в HANDOFF прошлой сессии расходилось с backlog.md.
Актуальное описание + архитектурное решение теперь только в **[`docs/backlog.md`](docs/backlog.md) → TPL-004**.
Выбрана упрощённая версия 1 (inline T_* строки, без чтения файлов с диска).

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
