# Dark Factory — Project Instructions for Claude

## Session start protocol

Read **only** `HANDOFF.md` at the start of every session.
Do NOT automatically read backlog.md, ic_roadmap.md, contracts.md, or any other document
unless the user's task explicitly requires it.

`memory/MEMORY.md` index is always loaded — use it to decide what else to read on demand.

## Information temperature model

Three tiers — see `docs/PROTOCOL.md` for full rules:

- **HOT** (`HANDOFF.md`, `memory/project_state.md`): read every session, update every session
- **WARM** (`docs/backlog.md`, `docs/DEMO.md`, active feature memory files): read when starting a feature
- **COLD** (`docs/contracts.md`, `docs/log.md`, `memory/ic_roadmap.md`, etc.): read only when the task requires it

## Single source of truth

Every fact lives in exactly one place. Never duplicate — only link.
- Current project status → `HANDOFF.md` only
- Task details → `docs/backlog.md` only (reference by ID from HANDOFF)
- Architecture decisions → `docs/contracts.md` + `docs/log.md`
- Demo plan → `docs/DEMO.md`

## HANDOFF discipline

HANDOFF.md must stay a true one-pager (≤25 lines of content).
Task details and architecture rationale do not belong in HANDOFF — link to backlog/contracts instead.

## End of session

When the user says "обнови handoff" or "осталось 5%":
1. Update `HANDOFF.md` — last session findings + current status
2. Increment "Сессий с последнего WARM-ревью" counter
   - If counter reaches 5 → write in "Следующая сессия": "WARM-ревью (счётчик достиг 5)"
3. Check "Следующая сессия" field:
   - Clearly no trigger → skip, say nothing
   - Clearly there is a trigger (new feature, feature completed, architecture change, counter) → write it, tell the user
   - Unclear → ask the user

After a WARM review happens: reset counter to 0.

---

## Key files (reference)

| File | Role |
|------|------|
| `HANDOFF.md` | session context — HOT |
| `docs/backlog.md` | task details by ID — WARM |
| `docs/PROTOCOL.md` | information protocol |
| `docs/DEMO.md` | demo pitch plan — WARM |
| `CONCEPT.md` | concept, philosophy, architecture diagram — COLD |
| `ROADMAP.md` | full version history + open ideas — COLD |
| `docs/contracts.md` | agent contracts, IC spec fields — COLD |
| `docs/log.md` | decision archive — COLD |
| `docs/CARDS.md` | real project cards catalog (37 cards, namespace/protocol/control) — COLD |
| `docs/API_REVIEW.md` | SDK API usage per card, tech debt map — COLD |
| `docs/MORE_ACTIONS_MENU_MIGRATION.md` | migration instructions for TPL-001 — COLD |
| `server/index.js` | pipeline wiring, /api/cards, /api/edit, clone |
| `server/orchestrator.js` | state machine, editMode, archiveApp |
| `server/sandbox-manager.js` | ui5 serve, skip install if node_modules exists |
| `server/prompts/integration-card/architect.js` | IC Architect prompts |
| `server/prompts/integration-card/developer.js` | generateStaticFiles + LLM prompts (split) |
| `server/prompts/integration-card/delta-architect.js` | edit mode: patch-spec |
| `server/prompts/integration-card/sdk-stubs/` | SDK stubs for offline dev/test |
| `server/cards-registry.js` | CRUD cards-registry.json |
| `client/app.js` | UI logic, PHASE_CONFIGS, showPhaseStatus |
| `client/index.html` | markup, #phase-status div |
| `client/styles.css` | styles, .phase-status color variants |

## Environment

- **OS:** Windows 11 VDI (нестабильно), Shell: Git Bash
- **Node.js:** v24 | **Запуск:** `npm run restart` (убивает зомби-процессы)
- **LLM:** Hyperspace LiteLLM `localhost:6655`
  Модели: `anthropic--claude-4.6-opus`, `anthropic--claude-4.6-sonnet`, `gemini-2.5-flash`
- **Hyperspace output cap:** ~8192 токенов (игнорирует `max_tokens`) → один вызов = одна задача
- **Port:** 3000 (sandbox: 3100). Зомби: `netstat -ano | grep ":3000 "` → `taskkill //F //PID <pid>`

## Do not

- Не начинай код до прочтения нужных файлов
- Не дублируй описания задач — всё в backlog.md
- Не пересматривай архитектурные решения без запроса
- Не создавай абстракции "на будущее"
- Не игнорируй `docs/log.md` — там прецеденты
