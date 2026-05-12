# Dark Factory — Handoff

Детали задач — [`docs/backlog.md`](docs/backlog.md). Протокол — [`docs/PROTOCOL.md`](docs/PROTOCOL.md).

**Сессий с последнего WARM-ревью: 2** (порог: 5)

## Быстрый старт

Читай только этот файл. Остальное — по запросу задачи.

---

## Текущий статус

**v0.13 — в работе.** Цель: питч тимлиду. Детали демо — [`docs/DEMO.md`](docs/DEMO.md).

Активные задачи (все до демо):
- DEMO-001 Fixture-карточка — обогащение в `demo/employee-directory/` ✅ (pagination + search + mock 18 записей); нужно: sandbox-прогон, коммиты + теги v1/v2
- DOC-001 Chronicle — два git-ref (`from..to`), тег/хэш/HEAD, README + Confluence-фрагмент
- UX-009 итеративный polish по мере прогонов
- INFO-001 Инфо-бунт — аудит документации (INFO-001-2,5,6 ✅; остались INFO-001-3,4)

---

## Находки последней сессии (2026-05-12 #12)

**INFO-001-2 выполнен (+ INFO-001-5,6):**
- Удалено 4 файла memory: bugs (fixed), response_style (дубль CLAUDE.md), CHEATSHEET.md, ideas_6_Mai (дубль area-51)
- ic_roadmap.md и demo_pitch_v2.md подчищены от устаревших секций
- CONCEPT.md и ROADMAP.md добавлены в CLAUDE.md как COLD-референсы

**DEMO-001 частично:**
- `demo/employee-directory/` обогащена: mypaginator (EasyPagination), PaginationManager, client-side search+pagination, 18 mock-записей, confluence.md
- Осталось: sandbox-прогон → коммиты → теги v1/v2

**Новые задачи в бэклоге:**
- DOC-002: README + confluence.md v1.0 при генерации карточки
- UX-010: показывать выбранный файл/папку в диалоге импорта

---

## Следующая сессия

- [ ] Sandbox-прогон `demo/employee-directory/` → починить если что-то не так
- [ ] Коммиты + теги v1/v2 для Chronicle
- [ ] DOC-001 Chronicle — реализация
