# Dark Factory — Handoff

Детали задач — [`docs/backlog.md`](docs/backlog.md). Протокол — [`docs/PROTOCOL.md`](docs/PROTOCOL.md).

**Сессий с последнего WARM-ревью: 3** (порог: 5)

## Быстрый старт

Читай только этот файл. Остальное — по запросу задачи.

---

## Текущий статус

**v0.13 — в работе.** Цель: питч тимлиду. Детали демо — [`docs/DEMO.md`](docs/DEMO.md).

Активные задачи до демо:
- DEMO-001 Fixture-карточка ✅
- DEMO-002 3 именованных тега на demo/chronicle-source ✅
- DEMO-004 Сценарий Block 1 (Generate) — **следующая сессия**
- DEMO-005 Сценарий Block 2 (Clone) — **следующая сессия**
- DOC-001 Chronicle ✅
- DOC-002 README + confluence.html при генерации ✅
- DOC-003 Chronicle → reminder об обновлении confluence.html ✅
- UX-012/013/014/015 ✅

---

## Находки последней сессии (2026-05-13 #15, part 2)

- Edit button убрана из UI; INF-003 (Edit mode) добавлен в бэклог — после демо
- Chronicle docs reminder: диалог после Apply с кнопками Skip / Done
- Language Rule добавлен в три промпта (architect, developer, viewGenerator): весь генерируемый контент — только английский
- Баг: DELETE карточки возвращал EBUSY если sandbox-процесс остался живым после сессии — решается `taskkill //F //PID <pid>` на порту 3100

---

## Следующая сессия

- [ ] DEMO-004: сценарий Block 1 — точный текст заказа, хронометраж, прогнать 2-3 раза
- [ ] DEMO-005: сценарий Block 2 — clone + mini-intro текст
