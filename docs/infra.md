# infra.md — Dark Factory: инфраструктура

Инфраструктурные компоненты DF: внешние интеграции, режимы работы,
форматы хранилищ.

---

## Fly Manager — Area-51

Fly.io заблокирован на корпоративном VDI SAP. Модуль `server/fly-manager.js` существует,
но не используется. Деплой через Local Runner (см. ниже).

Вернуться к Fly.io: когда/если VDI-ограничения будут сняты.

---

## Run Modes v0.6+

### Обзор

Dark Factory поддерживает 4 режима работы. **Применимы только к Node.js-app профилю.**
IC-профиль (`integration-card`) всегда работает в production-режиме — mock-режимы для него не настроены.

### Режимы

#### 1. Production (по умолчанию)

- Реальные вызовы Hyperspace LiteLLM API
- Файлы пишутся в `workspace/` (Node.js) или `cards/{slug}/` (IC)
- `npm start` / `npm run dev`

#### 2. Mock-Full

- Mock-ответы от агентов, реальная запись файлов, реальный Local Runner deploy
- `npm run mock:full`

#### 3. Mock-Fast

- Mock-ответы, копирует `mock-workspace/` → `workspace/`, fake URL
- `npm run mock:fast` — ~6 секунд, для итераций по UI

#### 4. Demo

- Как mock-fast, но с искусственными задержками для презентаций
- `npm run demo`

### Сравнение

| Параметр | production | mock-full | mock-fast | demo |
|----------|-----------|-----------|-----------|------|
| **API вызовы** | ✅ Real | ❌ Mock | ❌ Mock | ❌ Mock |
| **Запись файлов** | ✅ Yes | ✅ Yes | ❌ Copy | ❌ Copy |
| **Deploy** | Local Runner | Local Runner | Fake URL | Fake URL |
| **Время** | 60-90s | ~30s | ~6s | ~16s |

### Зомби-процесс на порту 3000

Голый `npm start` не убивает предыдущий процесс. Для разработки — `npm run restart` или `npm run dev`.
Диагностика: `netstat -ano | grep ":3000 "`.

---

## Apps Store `draft`

### Роль
Персистентное хранилище записей об успешно созданных приложениях.
Один файл на всё хранилище: `state/apps.json`.

### Формат записи

\`\`\`json
{
  "version": 1,
  "nextNumber": 510,
  "apps": [
    {
      "number": 509,
      "id": "df-todo-app",
      "flyAppName": "df-todo-app",
      "createdAt": "2026-05-02T14:23:45.000Z",
      "order": "Простое TODO-приложение...",
      "architectOutput": "...",
      "url": "https://df-todo-app.fly.dev",
      "metrics": {
        "totalCost": 0.14,
        "totalTime": 160,
        "agents": { "arc": {...}, "dev": {...}, "tst": {...} }
      }
    }
  ]
}
\`\`\`

### Ключевые свойства
- Номера монотонные, не переиспользуются при удалении
- Атомарная запись: tmp → rename
- Битый файл → backup (`apps.json.corrupt-<ts>`) + новый пустой
- TTL не реализован — удаление только вручную через UI
- Записи из до-v0.2.1 не импортируются (начинаем с чистого листа)

### Жизненный цикл записи
1. **Создание:** orchestrator вызывает `addApp()` перед DONE (не блокирует DONE при ошибке)
2. **Чтение:** API endpoints `/api/my-apps` (list) и `/api/my-apps/:id` (single)
3. **Удаление:** API endpoint `DELETE /api/my-apps/:id` — Fly teardown и GitHub repo удаление best-effort, запись из архива удаляется всегда

### Эволюция (планируется)
- **v0.3+:** заменить `architectOutput` (сырой JSON) на структурированный `spec`
  с полями summary, features, screens, constraints, warnings. Открытый вопрос:
  отдельное поле или переименование — решится в v0.3 Phase 3.
- **v0.5+:** новая область — references к прошлым приложениям
  ("как #25, но другое")

### Источники истины
- **Модуль:** `server/apps-store.js`
- **Интеграция в orchestrator:** `server/orchestrator.js` → `archiveApp()`
- **API:** `server/index.js` → `/api/my-apps/*` endpoints
- **UI:** `client/app.js` → Products page rendering

---

## GitHub Integration `baseline`

> **IC-профиль:** GitHub убран из scope DF-IC (решение 2026-05-09).
> Всё нижеследующее применимо только к Node.js-app профилю.

### Обзор

GitHub Client — первая имплементация Source Storage контракта (v0.4).
После успешного деплоя оркестратор пушит код в GitHub-репо пользователя.

### OAuth App

- Тип: OAuth App (не PAT, не GitHub App)
- Scope: `repo delete_repo`
- Callback: `/auth/github/callback`
- Токены: `state/github-tokens.json` (в `.gitignore`)

### Именование репозиториев

`df-<slug>-<number>` — унифицированное с именем деплоя.
При конфликте имён: суффикс `-2`, `-3`.

### Содержимое репозитория

```
README.md       — название, описание, features, running, бэдж DF
SPEC.md         — human-readable spec + raw JSON в <details>
app.js          — код от Developer
package.json
public/         — если есть frontend
```

### Topics (автоматически)

`dark-factory`, `ai-generated`, `nodejs`

### Настройки

- Приватные по умолчанию
- Owner: аккаунт пользователя (не DF)
- Коммит происходит после успешного деплоя

### GITHUB_PUSH — non-blocking

GitHub-push не блокирует заказ. При любой ошибке (недоступен,
не подключён, token expired) — `sourceUrl = null`, заказ завершается.

### Источники истины
- **GitHub Client:** `server/github-client.js`
- **Token storage:** `server/github-tokens.js`
- **OAuth routes:** `server/routes/github-auth.js`
- **README/SPEC:** `server/readme-generator.js`
- **Orchestrator integration:** `server/orchestrator.js` → `executeGithubPush()`
- **Delete integration:** `server/index.js` → `DELETE /api/my-apps/:id`

---