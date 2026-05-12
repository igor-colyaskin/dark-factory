# Dark Factory — Handoff

Детали задач — [`docs/backlog.md`](docs/backlog.md). Протокол — [`docs/PROTOCOL.md`](docs/PROTOCOL.md).

**Сессий с последнего WARM-ревью: 3** (порог: 5)

## Быстрый старт

Читай только этот файл. Остальное — по запросу задачи.

---

## Текущий статус

**v0.13 — в работе.** Цель: питч тимлиду. Детали демо — [`docs/DEMO.md`](docs/DEMO.md).

Активные задачи (все до демо):
- DEMO-001 Fixture-карточка — обогащение в `demo/employee-directory/` ✅ (pagination + search + mock 18 записей); нужно: sandbox-прогон, коммиты + теги v1/v2
- DOC-001 Chronicle ✅ (полностью реализован и протестирован, сессия #13)
- UX-009 итеративный polish по мере прогонов
- INFO-001 Инфо-бунт — аудит документации (INFO-001-2,5,6 ✅; остались INFO-001-3,4)

---

## Находки последней сессии (2026-05-12 #13, зависла)

**DOC-001 Chronicle — реализация завершена:**
- Сервер: `/api/chronicle/info` и `/api/chronicle/generate` переписаны — автодетект ветки + последнего тега + коммитов с тега до HEAD (From/To убраны полностью)
- Клиент: Chronicle-модалка показывает ветку, тег, список коммитов; вводишь только новую версию
- `server/prompts/integration-card/chronicle.js` создан (промпт для LLM) — **ещё не закоммичен**
- `demo/chronicle-source` в `cards/employee-directory` — ветка с 3 готовыми демо-коммитами

**Сценарий демо Chronicle:**
1. Старт на `master` карточки (`b54f9d8` — "v1 без изменений")
2. Во время демо: `git checkout -b demo/chronicle-live` + `git cherry-pick d71299e 902b7b7 fce53d7`
3. Открываем Chronicle → он видит ветку `demo/chronicle-live`, тег `v0.0.1`, 3 коммита
4. Вводим `0.0.2`, жмём Generate

**Осталось до демо (DEMO-001):**
- Закоммитить Chronicle-изменения (server/index.js, client/*, chronicle.js)
- Поставить тег `v0.0.1` на `master` карточки (иначе Chronicle не найдёт last tag)
- Прогон сценария end-to-end

---

## Следующая сессия

- [ ] DEMO-002: 3 именованных тега на demo/chronicle-source (~15 мин)
- [ ] UX-012/013/014/015: UX-polish тайлов и диалогов Chronicle
- [ ] Sandbox-прогон demo/employee-directory → коммиты
- [ ] Проработать сценарий Block 1 (Generate)
