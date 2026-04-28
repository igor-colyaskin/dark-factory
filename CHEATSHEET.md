# Dark Factory v0.1 — Шпаргалка

## Быстрый старт

```bash
npm install
cp .env.example .env
# Добавьте OPENROUTER_API_KEY в .env
npm start
```

Откройте http://localhost:3000

## Команды

### Основные
```bash
npm start              # Запуск (production)
npm run dev            # Запуск с автоперезагрузкой
npm run restart        # Перезапуск (убивает процесс)
```

### Режимы
```bash
npm run mock:full      # Mock + запись файлов (6s, $0)
npm run mock:fast      # Mock + готовые файлы (6s, $0)
npm run demo           # Для презентаций (9s, $0)
```

### Очистка
```bash
npm run clean          # Удалить state/ и workspace/
npm run fresh          # Очистка + перезапуск
```

## Режимы работы

| Режим | Время | $ | Для чего |
|-------|-------|---|----------|
| production | 60-90s | $$$ | Реальная генерация |
| mock-full | 6s | $0 | Отладка backend |
| mock-fast | 6s | $0 | Отладка UI |
| demo | 9s | $0 | Презентации |

## Порты

- **3000** — Dark Factory
- **3001** — Созданные приложения

## Запуск созданного приложения

```bash
cd workspace
npm install
npm start
```

Откройте http://localhost:3001

## Troubleshooting

### Порт занят
```bash
npx kill-port 3000
npm start
```

### Зависло состояние
```bash
npm run fresh
```

### Не работает mock режим
```bash
# Проверьте переменную
echo %RUN_MODE%

# Используйте npm скрипт
npm run mock:full
```

## Файлы

### Важные
- `CONCEPT.md` — Полная концепция
- `TRACKER.md` — Прогресс разработки
- `README.md` — Документация
- `docs/RUN_MODES.md` — Подробно о режимах

### Конфигурация
- `.env` — Переменные окружения
- `package.json` — Скрипты и зависимости

### State
- `state/current.json` — Текущее состояние pipeline
- `state/cost-tracking.json` — История затрат

## Агенты

| Агент | Модель | Роль | Время |
|-------|--------|------|-------|
| Architect | claude-opus-4 | Архитектура | ~20s |
| Developer | claude-sonnet-4 | Код | ~40s |
| Tester | gemini-2.5-flash | Review | ~5s |

## Pipeline States

```
IDLE → ORDERING → ARCH_WORKING → ARCH_REVIEW → 
DEV_WORKING → DEV_CHECK → TEST_RUNNING → 
DELIVERING → DONE
```

## Быстрые тесты

```bash
# Orchestrator (без API)
node test/orchestrator.test.js

# Агенты (с API, дорого!)
node test/agents.test.js
```

## Полезные ссылки

- OpenRouter: https://openrouter.ai
- Документация: `docs/`
- Тесты: `test/`
