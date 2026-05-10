# Dark Factory — Backlog

Единственный источник правды для описаний предстоящих задач.
Детали реализации, архитектурные решения, статус — всё здесь.

---

## IC Template

### [TPL-001] Проверить и исправить меню «три точки» в шаблонах
**Источник:** рабочий проект, сессия 2026-05-08
**Суть:** В рабочих карточках выполнена миграция: `ActionSheet` → `sap.m.Menu`,
добавлена кнопка «Required Authorization» (SDK `AuthorizationDialog`), переименованы обработчики,
`AboutDialog` переведён на `FormattedText`-паттерн.
Нужно проверить соответствие шаблонов DF и при расхождении — обновить по инструкции.
**Инструкция:** [`docs/MORE_ACTIONS_MENU_MIGRATION.md`](MORE_ACTIONS_MENU_MIGRATION.md)
**Приоритет:** низкий — **после демо**

---

### [TPL-002] Автовывод slug Архитектором + конвенция namespace/папка
**Источник:** устное обсуждение, сессия 2026-05-09
**Суть:** При ручном изготовлении карточек название папки должно соответствовать namespace —
занимает много времени и почти всегда содержит ошибки. В CARDS.md нет единой конвенции.
**Что делать:**
1. Проанализировать CARDS.md — найти доминирующую тенденцию (namespace → slug)
2. Зафиксировать конвенцию в `docs/contracts.md` и системном промпте Архитектора
3. Если в заказе не указан slug — Архитектор выводит из описания, показывает в Spec Review;
   пользователь корректирует если нужно (не спрашивает явно)
**Приоритет:** средний — **до демо** (~2 ч)

---

### [TPL-004] protocol + viewControl как ортогональные измерения → шаблоны по матрице
**Источник:** стратегическое обсуждение 2026-05-10, уточнён в сессии #3

**Архитектурное решение (финальное):**
- `spec.protocol` — `"rest"` | `"odata2"` | `"odata4"` | `"other"` — **всегда спрашивать явно**, никогда не выводить автоматически (даже из JSON-sample)
- `spec.viewControl` — конкретный UI5-класс (`"sap.m.SimpleForm"`, `"sap.m.Table"`, etc.) — выводить из структуры данных, спрашивать если неясно
- `spec.layout` — **удалить** (заменён на viewControl)

**Почему два шаблона радикально различаются:**

| Аспект | template-rest | template-odata2 |
|--------|--------------|-----------------|
| Загрузка данных | `oCard.request()` → `DataHelper._processData()` | OData2 model binding, `metadataLoaded()` → `_bindView()` |
| MockServer | `setRequests([{path, response}])` | `MockServer.simulate()` с `metadata.xml` + `EntitySet.json` |
| DataHelper | есть (`_processData` обязателен) | **нет вообще** |
| Extension point | `_processData()`, View FormElements | entity set name в `_bindView()`, Column definitions |

**Матрица выбора шаблона:**
- `sap.m.SimpleForm + rest` → `templates/template-rest/`
- `sap.m.Table + odata2` → `templates/template-odata2/`
- остальное → LLM генерирует с нуля по аналогии

**Подход к реализации (упрощённый — версия 1):**
Не читать файлы с диска. Заменить `spec.layout` → `spec.viewControl` в промптах и логике.
developer.js использует viewControl для условий вместо layout (промпты LLM остаются inline T_*).

**Что делать:**
1. ~~Переименовать `templates/form-rest/` → `templates/template-rest/`, `templates/table-odata2/` → `templates/template-odata2/`~~ ✅ (сессия 2026-05-10 #4)
2. `template-odata2/`: заменить `_bindTable()` → `_bindView()` в `Main.controller.js`
3. `architect.js` — убрать `layout`, добавить `viewControl`; protocol — всегда явный вопрос, никогда не auto-detect
4. `developer.js` — заменить все условия `spec.layout === "form/table/other"` на `spec.viewControl`-based; убрать `isTable = spec.layout === 'table'`
5. `contracts.md` — обновить IC spec fields

**Приоритет:** высокий — **до демо** (~3-4 ч, осталось ~2-3 ч)

---

## UX

### [UX-006] Импорт папки (без архива)
**Источник:** стратегическое обсуждение 2026-05-10
**Суть:** Сейчас import принимает только .zip. Поддержать загрузку папки целиком через
`<input webkitdirectory>` — FileList с относительными путями. Сервер реконструирует структуру.
**Приоритет:** средний — **до демо** (~3 ч)

---

### [UX-007] ID карточек + ссылки в заказе ("как #32")
**Источник:** стратегическое обсуждение 2026-05-10
**Суть:**
- Каждой карточке присваивается auto-increment `id` в cards-registry.json
- В UI: бейджик `#28` на карточке + иконка копирования
- В заказе: `"сделай как #32"` → Архитектор получает spec.json референсной карточки как контекст
- Реализация: spec-only (3A) — инжектим только spec.json, не код файлов

**Что делать:**
1. `cards-registry.js` — добавить `id` при `registerCard()`
2. `client/app.js` — бейджик + copy button на карточке
3. `server/index.js` — при получении заказа парсить `#NNN`, загружать spec.json по id
4. `architect.js` — принимать `referenceSpecs[]` в userPrompt
**Приоритет:** высокий — **до демо** (~6 ч)

---

### [UX-009] UI polish — финальный причёс перед демо
**Источник:** стратегическое обсуждение 2026-05-10
**Суть:** Все тексты интерфейса на английском, стиль выровнен под VSCode, мелкие UX-несоответствия.
**Приоритет:** высокий — **последний пункт до демо** (~2-3 ч)

---

## Infrastructure

### [INF-002] ✅ Проактивный split Developer-вызова
**Реализован:** сессия 2026-05-10 #3 + bug fix в сессии #4
**Bug fix:** `viewGeneratorSystemPrompt` не попал в default export → View.view.xml не генерировался.

---

## Visualization

### [VIZ-001] ✅ Local sandbox для предпросмотра сгенерированной карточки
**Реализован:** сессия 2026-05-09 (v0.10)

---

## Закрытые UX

### [UX-002] ✅ Режим редактирования (My Apps + Edit + Import) — v0.11
### [UX-003] ✅ Опция "Другое" в вопросах архитектора — v0.12.1
### [UX-004] ✅ My Apps — сортировка новые вверху — v0.12
### [UX-005] ✅ Сохранять spec.json в корне карточки — v0.12
### [UX-008] ✅ Загрузка мокапа + vision pre-pass — v0.13 (сессия 2026-05-10 #3/#4)
