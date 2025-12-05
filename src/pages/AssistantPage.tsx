import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  AlertCircle,
  Settings,
  BookOpen,
  MessageSquare,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  Button,
  Input,
  Textarea,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type Mode = 'chat' | 'explain' | 'examples' | 'grammar';

export const AssistantPage: React.FC = () => {
  const navigate = useNavigate();
  const { targetLanguage, getChatMessages, addChatMessage, clearChatMessages } = useAppStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [mode, setMode] = useState<Mode>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use store messages for current language
  const messages = getChatMessages();
  const langName = targetLanguage === 'it' ? 'итальянский' : 'английский';
  const langFlag = targetLanguage === 'it' ? '🇮🇹' : '🇬🇧';

  useEffect(() => {
    checkConfiguration();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkConfiguration = async () => {
    if (window.electronAPI) {
      const configured = await window.electronAPI.gemini.isConfigured();
      setIsConfigured(configured);
    } else {
      setIsConfigured(true); // Mock for development
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    addChatMessage(userMessage, targetLanguage);
    setInput('');
    setIsLoading(true);

    try {
      let response: { success: boolean; data?: string; error?: string };

      if (window.electronAPI) {
        switch (mode) {
          case 'explain':
            response = await window.electronAPI.gemini.explainWord(input, targetLanguage);
            break;
          case 'examples':
            response = await window.electronAPI.gemini.generateExamples(input, 3, targetLanguage);
            break;
          case 'grammar':
            response = await window.electronAPI.gemini.checkGrammar(input, targetLanguage);
            break;
          default:
            response = await window.electronAPI.gemini.chat(
              [...messages, userMessage].map((m) => ({
                role: m.role === 'user' ? 'user' : 'model',
                content: m.content,
              })),
              targetLanguage
            );
        }
      } else {
        // Mock response for development
        await new Promise((resolve) => setTimeout(resolve, 1000));
        response = {
          success: true,
          data: getMockResponse(mode, input),
        };
      }

      if (response.success && response.data) {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.data,
          timestamp: new Date(),
        };
        addChatMessage(assistantMessage, targetLanguage);
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Ошибка: ${error instanceof Error ? error.message : 'Не удалось получить ответ'}`,
        timestamp: new Date(),
      };
      addChatMessage(errorMessage, targetLanguage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const ModeButton: React.FC<{
    value: Mode;
    icon: React.ReactNode;
    label: string;
  }> = ({ value, icon, label }) => (
    <button
      onClick={() => setMode(value)}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
        mode === value
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-muted-foreground hover:text-foreground'
      )}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  if (!isConfigured) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/20">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">AI Ассистент</h2>
            <p className="text-muted-foreground mb-6">
              Настройте интеграцию с Gemini, чтобы получить доступ к AI-ассистенту
              для объяснения слов, генерации примеров и проверки грамматики.
            </p>
            <Button
              variant="glow"
              onClick={() => navigate('/settings')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Перейти в настройки
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold">AI Ассистент</h1>
              <p className="text-xs text-muted-foreground">Powered by Gemini</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{langFlag}</span>
            <span className="text-sm text-muted-foreground capitalize">{langName}</span>
          </div>
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearChatMessages(targetLanguage)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Очистить
            </Button>
          )}
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <ModeButton
            value="chat"
            icon={<MessageSquare className="w-4 h-4" />}
            label="Диалог"
          />
          <ModeButton
            value="explain"
            icon={<BookOpen className="w-4 h-4" />}
            label="Объяснить слово"
          />
          <ModeButton
            value="examples"
            icon={<Sparkles className="w-4 h-4" />}
            label="Примеры"
          />
          <ModeButton
            value="grammar"
            icon={<CheckCircle className="w-4 h-4" />}
            label="Проверка грамматики"
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold mb-2">Начните разговор</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {mode === 'chat' && `Практикуйте ${langName} в диалоге с AI`}
              {mode === 'explain' && 'Введите слово, чтобы получить объяснение'}
              {mode === 'examples' && 'Введите слово для генерации примеров'}
              {mode === 'grammar' && 'Введите текст для проверки грамматики'}
            </p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary'
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-secondary rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-3">
          {mode === 'grammar' ? (
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Введите текст для проверки..."
              className="flex-1 min-h-[80px]"
              disabled={isLoading}
            />
          ) : (
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                mode === 'chat'
                  ? 'Напишите сообщение...'
                  : mode === 'explain'
                  ? 'Введите слово для объяснения...'
                  : 'Введите слово для примеров...'
              }
              className="flex-1"
              disabled={isLoading}
            />
          )}
          <Button
            variant="glow"
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-11 w-11"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

function getMockResponse(mode: Mode, input: string): string {
  switch (mode) {
    case 'explain':
      return `**Слово: ${input}**

1. **Основное значение**: Это распространённое английское слово.

2. **Часть речи**: noun/verb

3. **Как запомнить**: Представьте ассоциацию с похожим русским словом.

4. **Типичные ошибки**: Обратите внимание на произношение.

5. **Похожие слова**: similar, alike`;

    case 'examples':
      return `📝 Примеры со словом "${input}":

🇬🇧 The teacher explained the concept clearly.
🇷🇺 Учитель чётко объяснил концепцию.
💡 Формальный контекст, образование

🇬🇧 Can you explain this to me?
🇷🇺 Можешь мне это объяснить?
💡 Разговорный контекст, просьба

🇬🇧 The manual explains how to use the device.
🇷🇺 Инструкция объясняет, как пользоваться устройством.
💡 Технический контекст`;

    case 'grammar':
      return `**Оценка**: Хорошо!

**Исправленный текст**: ${input}

**Комментарии**:
- Текст грамматически корректен
- Хорошая структура предложения

**Советы**:
- Можно добавить больше деталей для лучшего понимания`;

    default:
      return `Это ответ на ваше сообщение. В режиме разработки AI недоступен, но в готовом приложении здесь будет ответ от Gemini.

Вы написали: "${input}"`;
  }
}
