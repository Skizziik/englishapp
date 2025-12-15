import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  AlertCircle,
  Loader2,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import {
  Card,
  CardContent,
  Button,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Web Speech API types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

type CallState = 'idle' | 'checking' | 'ready' | 'in-call' | 'error';

export const VoiceChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { targetLanguage, getVoiceChatMessages, addVoiceChatMessage, clearVoiceChatMessages } = useAppStore();

  const [callState, setCallState] = useState<CallState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = getVoiceChatMessages();
  const langName = targetLanguage === 'it' ? 'Italian' : 'English';

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize Speech Recognition
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition not supported in this browser');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = targetLanguage === 'it' ? 'it-IT' : 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setCurrentTranscript('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setCurrentTranscript(interimTranscript || finalTranscript);

      if (finalTranscript) {
        handleUserMessage(finalTranscript);
      }
    };

    recognition.onerror = (event: { error: string }) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setErrorMessage(`Speech error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setCurrentTranscript('');
    };

    return recognition;
  }, [targetLanguage]);

  // Check TTS server availability
  const checkTTSServer = async (): Promise<boolean> => {
    if (!window.electronAPI?.tts) return false;

    try {
      const isRunning = await window.electronAPI.tts.isRunning();
      return isRunning;
    } catch {
      return false;
    }
  };

  // Start the call
  const startCall = async () => {
    setCallState('checking');
    setErrorMessage('');

    // Check if TTS server is running
    const ttsAvailable = await checkTTSServer();

    if (!ttsAvailable) {
      setCallState('error');
      setErrorMessage('TTS server is not running. Please start it in Settings first.');
      return;
    }

    // Check if Gemini is configured
    if (window.electronAPI) {
      const configured = await window.electronAPI.gemini.isConfigured();
      if (!configured) {
        setCallState('error');
        setErrorMessage('Gemini API is not configured. Please set it up in Settings.');
        return;
      }
    }

    // Initialize speech recognition
    const recognition = initSpeechRecognition();
    if (!recognition) {
      setCallState('error');
      return;
    }
    recognitionRef.current = recognition;

    setCallState('in-call');

    // Greet the user
    const greeting = targetLanguage === 'it'
      ? "Ciao! Sono pronto a parlare con te in italiano. Di cosa vorresti parlare oggi?"
      : "Hey! I'm ready to chat with you in English. What would you like to talk about today?";

    const greetingMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
    };
    addVoiceChatMessage(greetingMessage, targetLanguage);

    // Speak the greeting
    await speakText(greeting);
  };

  // End the call
  const endCall = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    setCallState('idle');
    setIsListening(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setCurrentTranscript('');
  };

  // Start/stop listening
  const toggleListening = () => {
    if (!recognitionRef.current || callState !== 'in-call') return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Stop any playing audio first
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
        setIsSpeaking(false);
      }

      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  };

  // Speak text using TTS
  const speakText = async (text: string): Promise<void> => {
    if (!window.electronAPI?.tts) return;

    setIsSpeaking(true);

    try {
      const result = await window.electronAPI.tts.speakNoCache(text);

      if (result?.success && result.audio) {
        await new Promise<void>((resolve) => {
          const audio = new Audio(`data:audio/wav;base64,${result.audio}`);
          currentAudioRef.current = audio;

          audio.onended = () => {
            currentAudioRef.current = null;
            setIsSpeaking(false);
            resolve();
          };

          audio.onerror = () => {
            currentAudioRef.current = null;
            setIsSpeaking(false);
            resolve();
          };

          audio.play().catch(() => {
            setIsSpeaking(false);
            resolve();
          });
        });
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
    }
  };

  // Handle user message
  const handleUserMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    addVoiceChatMessage(userMessage, targetLanguage);

    setIsProcessing(true);

    try {
      let response: { success: boolean; data?: string; error?: string };

      if (window.electronAPI) {
        response = await window.electronAPI.gemini.voiceChat(
          [...messages, userMessage].map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            content: m.content,
          })),
          targetLanguage
        );
      } else {
        // Mock response for development
        await new Promise((resolve) => setTimeout(resolve, 500));
        response = {
          success: true,
          data: "That's interesting! Tell me more about that.",
        };
      }

      if (response.success && response.data) {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.data,
          timestamp: new Date(),
        };
        addVoiceChatMessage(assistantMessage, targetLanguage);

        // Speak the response
        await speakText(response.data);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
    };
  }, []);

  // Error state - TTS not available
  if (callState === 'error') {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <Card className="max-w-md bg-gradient-to-br from-red-500/10 to-orange-500/5 border-red-500/20">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Cannot Start Voice Chat</h2>
            <p className="text-muted-foreground mb-6">{errorMessage}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button variant="glow" onClick={() => navigate('/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Open Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Idle state - not in call
  if (callState === 'idle' || callState === 'checking') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <Phone className="w-16 h-16 text-white" />
          </div>

          <h1 className="text-3xl font-bold mb-2">Voice Practice</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            Practice speaking {langName} with an AI tutor.
            Have a natural conversation and improve your pronunciation.
          </p>

          <Button
            variant="glow"
            size="lg"
            onClick={startCall}
            disabled={callState === 'checking'}
            className="px-8 py-6 text-lg"
          >
            {callState === 'checking' ? (
              <>
                <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Phone className="w-6 h-6 mr-3" />
                Start Call
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground mt-6">
            Requires TTS server to be running
          </p>
        </motion.div>
      </div>
    );
  }

  // In-call state
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold">Voice Practice</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              In call - {langName}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearVoiceChatMessages(targetLanguage)}
            className="text-muted-foreground"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Volume2 className="w-4 h-4 text-white" />
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
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Current transcript (what user is saying) */}
        {currentTranscript && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 justify-end"
          >
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-primary/50 text-primary-foreground">
              <p className="whitespace-pre-wrap italic">{currentTranscript}...</p>
            </div>
          </motion.div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
              <Volume2 className="w-4 h-4 text-white" />
            </div>
            <div className="bg-secondary rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div className="p-6 border-t border-border">
        <div className="flex items-center justify-center gap-6">
          {/* Speaking indicator */}
          <div className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full transition-all',
            isSpeaking ? 'bg-green-500/20 text-green-400' : 'bg-secondary text-muted-foreground'
          )}>
            <Volume2 className={cn('w-5 h-5', isSpeaking && 'animate-pulse')} />
            <span className="text-sm">{isSpeaking ? 'Speaking...' : 'Silent'}</span>
          </div>

          {/* Mic button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleListening}
            disabled={isProcessing || isSpeaking}
            className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center transition-all',
              isListening
                ? 'bg-red-500 shadow-lg shadow-red-500/30'
                : 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-purple-500/30',
              (isProcessing || isSpeaking) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isListening ? (
              <MicOff className="w-8 h-8 text-white" />
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
          </motion.button>

          {/* End call button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={endCall}
            className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </motion.button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {isListening ? 'Listening... Speak now!' :
           isSpeaking ? 'AI is speaking...' :
           isProcessing ? 'Thinking...' :
           'Tap the microphone to speak'}
        </p>
      </div>
    </div>
  );
};
