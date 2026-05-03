# infra.md — Dark Factory: инфраструктура

Инфраструктурные компоненты DF: внешние интеграции, режимы работы,
форматы хранилищ.

---

## Fly Manager

### Overview

Fly Manager is a module that integrates Dark Factory with Fly.io for deploying generated applications to the cloud.

### Features

- **Programmatic app creation** via flyctl CLI
- **Automatic Dockerfile and fly.toml generation** from templates
- **Deployment with retry logic** for transient errors
- **Health monitoring** until app is ready
- **Automatic cleanup** after TTL expiration

#### Configuration

Required environment variables in `.env`:

```bash
FLY_API_TOKEN=your-fly-api-token-here
FLY_ORG_SLUG=your-org-slug-here
```

#### Getting Credentials

```bash
# Install flyctl
# Windows: https://fly.io/docs/hands-on/install-flyctl/
# Mac/Linux: curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Get API token
flyctl auth token

# Get organization slug
flyctl orgs list
```

### API Reference

#### `createApp(appName)`

Creates a new Fly.io application.

**Parameters:**
- `appName` (string): Unique app name

**Returns:**
```javascript
{
  success: boolean,
  appName?: string,
  error?: string
}
```

#### `prepareWorkspace(workspacePath, appName)`

Generates Dockerfile and fly.toml in the workspace.

**Parameters:**
- `workspacePath` (string): Path to workspace directory
- `appName` (string): App name for fly.toml

**Returns:**
```javascript
{
  success: boolean,
  error?: string
}
```

#### `deploy(workspacePath, appName)`

Deploys the application to Fly.io with retry logic.

**Parameters:**
- `workspacePath` (string): Path to workspace directory
- `appName` (string): App name

**Returns:**
```javascript
{
  success: boolean,
  error?: string,
  duration?: number  // milliseconds
}
```

**Retry behavior:**
- Max retries: 2
- Timeout: 180 seconds
- Exponential backoff on transient errors

#### `waitForHealthy(appName, timeoutMs = 60000)`

Waits for the app to become healthy.

**Parameters:**
- `appName` (string): App name
- `timeoutMs` (number): Timeout in milliseconds (default: 60000)

**Returns:**
```javascript
{
  success: boolean,
  url?: string,
  error?: string
}
```

**Polling:**
- Interval: 5 seconds
- Checks machine state via `flyctl status --json`

#### `getAppUrl(appName)`

Returns the public URL for the app.

**Parameters:**
- `appName` (string): App name

**Returns:**
- `string`: Public URL (e.g., `https://my-app.fly.dev`)

#### `destroyApp(appName)`

Destroys the Fly.io application.

**Parameters:**
- `appName` (string): App name

**Returns:**
```javascript
{
  success: boolean,
  error?: string
}
```

### Transient Error Handling

The following errors are considered transient and will trigger retries:

- "unable to pull image"
- "timeout"
- "connection refused"
- "network error"
- "temporary failure"
- "try again"

Non-transient errors (e.g., validation errors, auth failures) fail immediately.

### Templates

#### Dockerfile.template

Located at `server/templates/Dockerfile.template`

Variables:
- `{{NODE_VERSION}}`: Node.js version (default: 22)

#### fly.toml.template

Located at `server/templates/fly.toml.template`

Variables:
- `{{APP_NAME}}`: Application name
- `{{INTERNAL_PORT}}`: Internal port (default: 8080)

Configuration:
- Region: `fra` (Frankfurt)
- Memory: 256MB
- CPU: shared-cpu-1x
- Auto-stop: enabled
- Auto-start: enabled
- Min machines: 0

### Testing

#### Unit Tests

```bash
node --test test/fly-manager.test.js
```

Tests retry logic, error detection, and URL generation.

#### Integration Test

```bash
node test/fly-integration.test.js
```

**Prerequisites:**
- Valid `FLY_API_TOKEN` and `FLY_ORG_SLUG` in `.env`
- `flyctl` installed and authenticated
- Valid Node.js app in `workspace/` directory

**What it does:**
1. Creates a real Fly app
2. Prepares workspace with Dockerfile and fly.toml
3. Deploys the app
4. Waits for it to become healthy
5. Verifies URL is accessible
6. Cleans up (destroys the app)

**Cost:** ~$0.01-0.05 per test run

### Usage Example

```javascript
import flyManager from './server/fly-manager.js';

const appName = 'my-app-123';
const workspacePath = './workspace';

// Create app
const createResult = await flyManager.createApp(appName);
if (!createResult.success) {
  console.error('Failed to create app:', createResult.error);
  return;
}

// Prepare workspace
const prepareResult = await flyManager.prepareWorkspace(workspacePath, appName);
if (!prepareResult.success) {
  console.error('Failed to prepare workspace:', prepareResult.error);
  return;
}

// Deploy
const deployResult = await flyManager.deploy(workspacePath, appName);
if (!deployResult.success) {
  console.error('Failed to deploy:', deployResult.error);
  return;
}

// Wait for healthy
const healthResult = await flyManager.waitForHealthy(appName);
if (!healthResult.success) {
  console.error('App not healthy:', healthResult.error);
  return;
}

console.log('App deployed:', healthResult.url);

// Later: cleanup
await flyManager.destroyApp(appName);
```

### Troubleshooting

#### "Unable to pull image" error

This is a transient error. Fly Manager will automatically retry up to 2 times.

#### "Authentication failed"

Check that `FLY_API_TOKEN` is set correctly in `.env`.

#### "App name already taken"

Choose a different app name. Use timestamp or UUID for uniqueness.

#### Deploy timeout

Increase timeout in `deploy()` call or check Fly.io status page.

#### Health check fails

- Check app logs: `flyctl logs --app <appName>`
- Verify app listens on `0.0.0.0:8080`
- Verify `process.env.PORT` is used in app code

### Cost Considerations

- **Idle apps:** ~$0 (auto-stop enabled)
- **Active apps:** ~$3/month for 256MB RAM
- **Deploy operations:** ~$0.01-0.05 per deploy
- **TTL:** 24 hours (apps auto-destroyed after)

### Security

- API token stored in `.env` (never committed)
- Token passed via environment variables, not CLI flags
- Logs mask token as `fly_***`

### Limitations (v0.2)

- Single region deployment (fra)
- No custom domains
- No persistent storage
- No database integration
- 24-hour TTL (hard limit)

### Future Enhancements (v0.2.1+)

- Multi-region deployment
- Custom TTL per app
- Persistent volume support
- Database provisioning
- Custom domain mapping


---

## Run Modes v0.2.1

### Обзор

Dark Factory поддерживает 4 режима работы для различных сценариев использования.

### Режимы

#### 1. Production (по умолчанию)

**Когда использовать:**
- Реальная генерация приложений
- Тестирование качества промптов
- Демонстрация полной функциональности

**Характеристики:**
- Агенты: Реальные вызовы OpenRouter API
- Файлы пишутся в workspace/
- Полная функциональность
- Время: 60-90 секунд
- Стоимость: $0.25-1.00 за заказ
- **Использование:** Реальная генерация приложений

**Запуск:**
```bash
npm start
# или
npm run fresh  # с очисткой
```

**Требования:**
- OpenRouter API ключ в `.env`
- Достаточный баланс на аккаунте

---

#### 2. Mock-Full

**Когда использовать:**
- Разработка и отладка backend
- Тестируется File Manager, AC Checker, Fly Manager
- Проверка AC Checker
- Итерации по коду без затрат

**Характеристики:**
- Mock ответы от агентов (хардкодные)
- Файлы пишутся в workspace/
- Тестируется File Manager, AC Checker, Fly Manager
- Реальный деплой на Fly.io (но без реального LLM — экономия на API)
- Время: ~90 секунд (основное время — деплой на Fly)
- Стоимость: $0 LLM + ~$0.01 Fly за деплой
- **Использование:** Отладка интеграции с Fly.io без расходов на LLM

**Запуск:**
```bash
npm run mock:full
```

**Что тестируется:**
- ✅ File Manager (запись файлов)
- ✅ AC Checker (проверка синтаксиса)
- ✅ Orchestrator (state transitions)
- ✅ SSE broadcasting
- ✅ Cost Tracker
- ❌ Качество промптов (используются хардкодные ответы)

---

#### 3. Mock-Fast

**Когда использовать:**
- Быстрая отладка UI/UX
- Тестирование SSE обновлений
- Проверка state transitions
- Итерации по frontend
- AC Checker: Пропускается (файлы уже готовы)

**Характеристики:**
- Агенты: Mock ответы (хардкодные)
- Файлы: Копируются из `mock-workspace/` в `workspace/`
- Не тестирует File Manager
- БЕЗ деплоя на Fly — возвращает fake URL
- Время: ~6 секунд
- Стоимость: $0
- **Использование:** Быстрая отладка UI/UX, тестирование SSE

**Запуск:**
```bash
npm run mock:fast
```

**Что тестируется:**
- ✅ Orchestrator (state transitions)
- ✅ SSE broadcasting
- ✅ UI обновления
- ✅ Cost Tracker
- ❌ File Manager (не пишет файлы)
- ❌ AC Checker (пропускается)

**Преимущества:**
- Самый быстрый режим
- Не засоряет workspace/ новыми файлами
- Предсказуемый результат

---

#### 4. Demo

**Когда использовать:**
- Презентации проекта
- Демонстрация функциональности
- Скриншоты/видео для документации

**Характеристики:**
- Агенты: Mock ответы (хардкодные)
- Файлы: Копируются из `mock-workspace/`
- Время: ~16 секунд (искусственные задержки)
- AC Checker: Пропускается
- БЕЗ деплоя на Fly — возвращает fake URL
- Стоимость: $0
- **Использование:** Презентации, демонстрации

**Запуск:**
```bash
npm run demo
```

**Особенности:**
- Медленнее чем mock-fast (3 сек на агента вместо 1 сек)
- Создаёт эффект "работы" для презентаций
- Предсказуемый результат
- Можно добавить сценарий с вопросами

---

### Сравнительная таблица

| Параметр | production | mock-full | mock-fast | demo |
|----------|-----------|-----------|-----------|------|
| **API вызовы** | ✅ Real | ❌ Mock | ❌ Mock | ❌ Mock |
| **Запись файлов** | ✅ Yes | ✅ Yes | ❌ Copy | ❌ Copy |
| **AC Checker** | ✅ Full | ✅ Full | ❌ Skip | ❌ Skip |
| **Время** | 60-90s | ~6s | ~6s | ~16s |
| **Стоимость** | $$$ | $0 | $0 | $0 |
| **Качество кода** | Real | Mock | Mock | Mock |
| **Предсказуемость** | ❌ | ✅ | ✅ | ✅ |

### Переключение режимов

#### Через переменную окружения

```bash
# Windows (cmd)
set RUN_MODE=mock-full && npm start

# Windows (PowerShell)
$env:RUN_MODE="mock-full"; npm start

# Linux/Mac
RUN_MODE=mock-full npm start
```

#### Через .env файл

```
RUN_MODE=mock-full
```

#### Через npm скрипты (рекомендуется)

```bash
npm run mock:full   # Автоматически устанавливает RUN_MODE
```

#### Mock Workspace

Директория `mock-workspace/` содержит готовое TODO приложение для режимов mock-fast и demo.

**Структура:**
```
mock-workspace/
├── app.js              # Express server (порт 3001)
├── package.json        # Зависимости
└── public/
    ├── index.html      # UI
    ├── styles.css      # Стили
    └── app.js          # Client JS
```

**Обновление mock-workspace:**

Если изменились требования к генерируемым приложениям:
1. Запустите production режим
2. Скопируйте созданные файлы из `workspace/` в `mock-workspace/`
3. Проверьте, что порт = 3001

### Отладка

#### Логи в разных режимах

**Production:**
```
🏭 Dark Factory starting in PRODUCTION mode
   Using real OpenRouter API
Calling Architect agent (anthropic/claude-opus-4)...
Architect completed in 19s, cost: $0.0234
```

**Mock-full:**
```
🏭 Dark Factory starting in MOCK-FULL mode
   Using mock responses, writing to workspace/
[MOCK] Calling architect agent...
[MOCK] architect completed in 1s
```

**Mock-fast:**
```
🏭 Dark Factory starting in MOCK-FAST mode
   Using pre-built mock-workspace/
[MOCK] Calling architect agent...
[MOCK-FAST] Copying pre-built mock-workspace/
```

### Рекомендации

#### Для разработки UI
→ Используйте **mock-fast**
- Самый быстрый
- Не нужен API ключ
- Фокус на frontend

#### Для разработки Backend
→ Используйте **mock-full**
- Тестирует File Manager
- Тестирует AC Checker
- Проверяет полный pipeline

#### Для тестирования промптов
→ Используйте **production**
- Реальные ответы от AI
- Проверка качества генерации
- Требует API ключ

#### Для презентаций
→ Используйте **demo**
- Предсказуемый результат
- Красивые задержки
- Не требует API ключ

### Troubleshooting

#### Mock режим не работает

**Проблема:** Сервер всё равно вызывает реальный API

**Решение:**
1. Проверьте, что переменная установлена: `echo %RUN_MODE%`
2. Перезапустите сервер полностью
3. Используйте npm скрипты вместо ручной установки переменной

#### Mock-workspace не найден

**Проблема:** Error: ENOENT: no such file or directory 'mock-workspace'

**Решение:**
1. Убедитесь, что директория `mock-workspace/` существует
2. Проверьте наличие всех файлов (app.js, public/*, package.json)
3. Используйте `mock-full` вместо `mock-fast`

#### Файлы не обновляются

**Проблема:** Изменения в коде не применяются

**Решение:**
1. Используйте `npm run restart` вместо простого перезапуска
2. Или: `npx kill-port 3000 && npm start`
3. Проверьте, что нет зависших процессов: `netstat -ano | findstr :3000`


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
3. **Удаление:** API endpoint `DELETE /api/my-apps/:id` — удаляет и с Fly, и из архива

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