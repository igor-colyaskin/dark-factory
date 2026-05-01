# 🏭 Dark Factory v0.2

**Application Factory** — веб-приложение для автоматической генерации приложений через AI-агентов.

## Философия проекта

Dark Factory развивается в направлении **agency**, а не capabilities:
DF учится **договариваться** с заказчиком о задаче, а не просто
расширяет список выполнимых заказов.

Каждая новая версия — маленький осмысленный шаг с обязательным
dogfooding'ом между релизами.

Подробнее — в [CONCEPT.md](CONCEPT.md).

## Концепция

Метафора фастфуда:
1. 📝 **Сделал заказ** — описываешь желаемое приложение
2. ⚙️ **Смотришь как готовят** — наблюдаешь работу агентов в реальном времени
3. 🎉 **Забираешь готовое** — получаешь работающее приложение

## Быстрый старт

### Установка

```bash
git clone <repository>
cd dark-factory
npm install
```

### Настройка

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Добавьте необходимые ключи в `.env`:

```
OPENROUTER_API_KEY=sk-or-ваш-ключ

# For v0.2 deployment features:
FLY_API_TOKEN=your-fly-api-token
FLY_ORG_SLUG=your-org-slug
```

> 💡 Если хочешь быстро попробовать интерфейс без оформления Fly.io и без
> трат на OpenRouter — запусти `npm run mock:fast` или `npm run demo`.
> Эти режимы не требуют никаких ключей.

**Получение Fly.io credentials (для v0.2):**
```bash
# Install flyctl
# Windows: https://fly.io/docs/hands-on/install-flyctl/
# Mac/Linux: curl -L https://fly.io/install.sh | sh

# Login and get token
flyctl auth login
flyctl auth token

# Get your organization slug
flyctl orgs list
```

### Запуск

**Production режим** (реальные API вызовы):
```bash
npm start
```

**Mock-full режим** (для разработки, пишет файлы):
```bash
npm run mock:full
```

**Mock-fast режим** (самый быстрый, использует готовые файлы):
```bash
npm run mock:fast
```

**Demo режим** (для презентаций):
```bash
npm run demo
```

Откройте http://localhost:3000 в браузере.

## Режимы работы

| Режим | Агенты | Файлы | Deploy | Время | Стоимость | Использование |
|-------|--------|-------|--------|-------|-----------|---------------|
| **production** | Real API | workspace/ | Real Fly.io | 60-90s | $$$ | Реальная генерация |
| **mock-full**  | Mock | workspace/ | Real Fly.io | ~90s | $0 LLM + ~$0.01 Fly | Отладка интеграции с Fly |
| **mock-fast**  | Mock | mock-workspace/ → workspace/ | Fake URL | ~10s | $0 | Отладка UI/UX |
| **demo**       | Mock | mock-workspace/ → workspace/ | Fake URL | ~15s | $0 | Презентации |
## Использование

1. Откройте http://localhost:3000
2. Введите описание приложения в текстовое поле
3. Нажмите "Submit Order"
4. Наблюдайте процесс создания в реальном времени
5. Когда готово, следуйте инструкциям для запуска созданного приложения

+ ### Получение результата
+
+ После этапа DEPLOYING в блоке Pickup появится публичный URL вида
+ `https://df-xxxxxxxx.fly.dev`. Ссылку можно открыть, скопировать или
+ считать с QR-кода. В mock-fast/demo режимах URL поддельный (помечен плашкой).

## Архитектура

### Компоненты

- **Orchestrator** — State machine, управляет процессом
- **Agent Manager** — Вызовы OpenRouter API
- **File Manager** — Запись файлов в workspace/
- **AC Checker** — Проверка качества кода
- **Cost Tracker** — Отслеживание стоимости и времени

### Агенты

| Агент | Модель | Роль |
|-------|--------|------|
| Architect | claude-opus-4 | Проектирование архитектуры |
| Developer | claude-sonnet-4 | Написание кода |
| Tester | gemini-2.5-flash | Code review |

### Pipeline

```
IDLE → ORDERING → ARCH_WORKING → ARCH_REVIEW → 
DEV_WORKING → DEV_CHECK → TEST_RUNNING → 
DELIVERING → DONE
```

## Полезные команды

```bash
npm start              # Запуск в production режиме
npm run dev            # Запуск с автоперезагрузкой
npm run restart        # Перезапуск с убийством процесса
npm run clean          # Очистка state/ и workspace/
npm run fresh          # Полная очистка + перезапуск
npm run mock:full      # Mock режим с записью файлов
npm run mock:fast      # Mock режим с готовыми файлами
npm run demo           # Demo режим для презентаций
npm run help           # Показать все команды с описаниями
```

## Структура проекта - tbd

```
dark-factory/
├── server/              # Backend

```

## Разработка

### Тестирование

**Orchestrator (без API):**
```bash
node test/orchestrator.test.js
```

**Агенты (с реальным API):**
```bash
node test/agents.test.js
```

### Отладка

Используйте `mock:full` для быстрой итерации:
- Изменяете UI → перезагружаете страницу
- Изменяете backend → `npm run mock:full`
- Полный цикл за 6 секунд, $0

## Ограничения v0.2

Dark Factory создаёт только простые приложения:
- Node.js + Express
- Vanilla HTML/CSS/JavaScript (без фреймворков)
- In-memory данные (без БД)
+ - Порт через process.env.PORT (дефолт 8080 для Fly.io)
+ - engines.node >= 20

## Документация

- [`CONCEPT.md`](CONCEPT.md) — Полная концепция проекта
- [`TRACKER.md`](TRACKER.md) — Прогресс разработки
- [`BOOTSTRAP.md`](BOOTSTRAP.md) — Инструкции по настройке
- [`docs/RUN_MODES.md`](docs/RUN_MODES.md) — Детали режимов работы (будет обновлён в v0.2 релизе)

## Лицензия

Курсовой проект, 2025-2026
