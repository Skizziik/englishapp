# Будущие фичи

Список идей для реализации в будущем.

---

## 1. Голосовой тренажёр (Voice Practice)

**Модель:** `gemini-2.5-flash-native-audio-dialog`
**Лимиты:** Unlimited RPD (без ограничений!)
**API:** Live API (WebSocket, не REST)

### Что можно сделать:

#### 1.1 Тренажёр произношения
- Пользователь говорит слово в микрофон
- AI слушает и оценивает произношение
- AI произносит слово правильно для сравнения
- Показывает ошибки и советы

#### 1.2 Разговорная практика
- Живые диалоги с AI на английском/итальянском
- AI поправляет ошибки в реальном времени
- Разные сценарии: в магазине, на работе, путешествие

#### 1.3 Диктант (Listening Practice)
- AI произносит слово или предложение
- Пользователь печатает что услышал
- Проверка понимания на слух

#### 1.4 Голосовые квизы
- "Как сказать 'собака' по-английски?"
- Пользователь отвечает голосом
- AI проверяет ответ

### Техническая реализация:

```typescript
// Подключение к Live API через WebSocket
const ws = new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent');

// Отправка аудио
ws.send(JSON.stringify({
  client_content: {
    turns: [{
      role: 'user',
      parts: [{ inline_data: { mime_type: 'audio/pcm', data: audioBase64 } }]
    }]
  }
}));

// Получение ответа (аудио + текст)
ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  // response.server_content.model_turn.parts
};
```

### Документация:
- https://ai.google.dev/gemini-api/docs/live-api

---

## 2. [Название фичи]

**Описание:** ...

**Как реализовать:** ...

---

## Заметки

- При добавлении новой идеи, указывать приоритет (высокий/средний/низкий)
- Описывать техническую сложность
- Указывать зависимости от внешних API
