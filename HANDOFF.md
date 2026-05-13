# Dark Factory — Handoff

Детали задач — [`docs/backlog.md`](docs/backlog.md). Протокол — [`docs/PROTOCOL.md`](docs/PROTOCOL.md).

**Сессий с последнего WARM-ревью: 4** (порог: 5)

## Быстрый старт

Читай только этот файл. Остальное — по запросу задачи.

---

## Текущий статус

**v0.13 — технически готова к демо.** Цель: питч тимлиду. Детали демо — [`docs/DEMO.md`](docs/DEMO.md).

Все задачи до демо закрыты:
- DEMO-001 Fixture-карточка ✅
- DEMO-002 3 именованных тега на demo/chronicle-source ✅
- DEMO-004 Сценарий Block 1 (Generate) ✅ — Eintopf + BE response таблица, прогнан
- DEMO-005 Сценарий Block 2 (Clone) ✅ — import + clone работает, fixture в demo/vendor-list-table
- DOC-001 Chronicle ✅
- DOC-002 README + wiki.html при генерации ✅
- DOC-003 Chronicle → reminder перед Apply (locked until Done/Skip) ✅
- UX-012/013/014/015 ✅

---

## Находки последней сессии (2026-05-13 #16)

- Chronicle: reminder теперь перед Apply, кнопка заблокирована до Done/Skip
- Chronicle: читает версию из wiki.html (Version History table), пишет новый `<tr>` туда же
- Chronicle: при Apply автоматически делает git commit + тег `slug@version`
- Chronicle: insertReadmeRow теперь находит `## Versions` и `## Version History` правильно
- import-folder: slug берётся из имени папки источника (был баг — брал последний сегмент appId)
- demo/vendor-list-table: fixture-карточка для демо импорта, закоммичена
- Сброс для повторного прогона Chronicle: `git reset --hard "employee-directory@0.0.1"` + удалить тег новой версии перед `git gc`

---

## Следующая сессия

- [ ] Прогнать все три блока 2-3 раза в разных комбинациях — финальная репетиция перед питчем
