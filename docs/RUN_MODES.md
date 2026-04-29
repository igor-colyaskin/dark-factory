> ⚠️ Документ отражает v0.1. Актуализация — в v0.2 Фаза 8.
# Run Modes — Dark Factory v0.1

## Обзор

Dark Factory поддерживает 4 режима работы для различных сценариев использования.

## Режимы

### 1. Production (по умолчанию)

**Когда использовать:**
- Реальная генерация приложений
- Тестирование качества промптов
- Демонстрация полной функциональности

**Характеристики:**
- Агенты: Реальные вызовы OpenRouter API
- Файлы: Пишутся в `workspace/`
- Время: 60-90 секунд (зависит от сложности)
- Стоимость: $0.25-1.00 за простое приложение
- AC Checker: Полная проверка

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

### 2. Mock-Full

**Когда использовать:**
- Разработка и отладка backend
- Тестирование File Manager
- Проверка AC Checker
- Итерации по коду без затрат

**Характеристики:**
- Агенты: Mock ответы (хардкодные)
- Файлы: Пишутся в `workspace/` из mock ответов
- Время: ~6 секунд
- Стоимость: $0
- AC Checker: Полная проверка реальных файлов

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

### 3. Mock-Fast

**Когда использовать:**
- Быстрая отладка UI/UX
- Тестирование SSE обновлений
- Проверка state transitions
- Итерации по frontend

**Характеристики:**
- Агенты: Mock ответы (хардкодные)
- Файлы: Копируются из `mock-workspace/` в `workspace/`
- Время: ~6 секунд
- Стоимость: $0
- AC Checker: Пропускается (файлы уже готовы)

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

### 4. Demo

**Когда использовать:**
- Презентации проекта
- Демонстрация функциональности
- Скриншоты/видео для документации

**Характеристики:**
- Агенты: Mock ответы (хардкодные)
- Файлы: Копируются из `mock-workspace/`
- Время: ~9 секунд (искусственные задержки)
- Стоимость: $0
- AC Checker: Пропускается

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

## Сравнительная таблица

| Параметр | production | mock-full | mock-fast | demo |
|----------|-----------|-----------|-----------|------|
| **API вызовы** | ✅ Real | ❌ Mock | ❌ Mock | ❌ Mock |
| **Запись файлов** | ✅ Yes | ✅ Yes | ❌ Copy | ❌ Copy |
| **AC Checker** | ✅ Full | ✅ Full | ❌ Skip | ❌ Skip |
| **Время** | 60-90s | ~6s | ~6s | ~9s |
| **Стоимость** | $$$ | $0 | $0 | $0 |
| **Качество кода** | Real | Mock | Mock | Mock |
| **Предсказуемость** | ❌ | ✅ | ✅ | ✅ |

## Переключение режимов

### Через переменную окружения

```bash
# Windows (cmd)
set RUN_MODE=mock-full && npm start

# Windows (PowerShell)
$env:RUN_MODE="mock-full"; npm start

# Linux/Mac
RUN_MODE=mock-full npm start
```

### Через .env файл

```
RUN_MODE=mock-full
```

### Через npm скрипты (рекомендуется)

```bash
npm run mock:full   # Автоматически устанавливает RUN_MODE
```

## Mock Workspace

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

## Отладка

### Логи в разных режимах

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

## Рекомендации

### Для разработки UI
→ Используйте **mock-fast**
- Самый быстрый
- Не нужен API ключ
- Фокус на frontend

### Для разработки Backend
→ Используйте **mock-full**
- Тестирует File Manager
- Тестирует AC Checker
- Проверяет полный pipeline

### Для тестирования промптов
→ Используйте **production**
- Реальные ответы от AI
- Проверка качества генерации
- Требует API ключ

### Для презентаций
→ Используйте **demo**
- Предсказуемый результат
- Красивые задержки
- Не требует API ключ

## Troubleshooting

### Mock режим не работает

**Проблема:** Сервер всё равно вызывает реальный API

**Решение:**
1. Проверьте, что переменная установлена: `echo %RUN_MODE%`
2. Перезапустите сервер полностью
3. Используйте npm скрипты вместо ручной установки переменной

### Mock-workspace не найден

**Проблема:** Error: ENOENT: no such file or directory 'mock-workspace'

**Решение:**
1. Убедитесь, что директория `mock-workspace/` существует
2. Проверьте наличие всех файлов (app.js, public/*, package.json)
3. Используйте `mock-full` вместо `mock-fast`

### Файлы не обновляются

**Проблема:** Изменения в коде не применяются

**Решение:**
1. Используйте `npm run restart` вместо простого перезапуска
2. Или: `npx kill-port 3000 && npm start`
3. Проверьте, что нет зависших процессов: `netstat -ano | findstr :3000`
