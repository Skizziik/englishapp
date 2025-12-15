# Language Learning App

Modern desktop application for learning English and Italian with spaced repetition, gamification, AI assistant, and neural text-to-speech.

![Electron](https://img.shields.io/badge/Electron-27.3-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)

<p align="center">
  <img src="docs/screenshot-main.png" alt="App Screenshot" width="800">
</p>

## Overview

Language Learning App is a comprehensive desktop application designed to accelerate vocabulary acquisition through scientifically-proven methods. It combines the **SM-2 spaced repetition algorithm** with gamification elements, **AI-powered explanations** (Google Gemini), and high-quality **neural TTS** (Chatterbox-Turbo) to create an engaging and effective learning experience.

## Key Features

### Multi-Language Support
- **English** — 8,000+ words from A1 to C2 CEFR levels
- **Italian** — 3,000+ words with Russian translations
- **Instant language switching** with separate progress tracking
- **More languages coming soon**

---

## Learning Modes

### Learn Mode (Flashcards)
Interactive flashcard-based learning with contextual sentences:
- Three response options: **Know**, **Don't Know**, **Hard**
- Auto-pronunciation using neural TTS
- Progress tracking with visual indicators
- Filter by CEFR level (A1-C2)

### Review Mode (Spaced Repetition)
SM-2 algorithm implementation for optimal long-term retention:
- Four quality levels: **Again**, **Hard**, **Good**, **Easy**
- Dynamic interval adjustment based on performance
- Ease factor tracking per word
- Review forecasting and statistics

### Sprint Mode
Timed vocabulary challenges for rapid recall:
- **60-second** default (configurable: 30, 60, 90, 120s)
- **Combo system** for consecutive correct answers
- **Score multipliers** up to 4x for streaks
- Keyboard controls (Arrow keys or 1/2)
- Personal best tracking

### Widget Mode
Compact always-on-top floating window:
- Passive learning while working
- Auto-advancement with configurable intervals
- One-click word status updates
- Minimalist design

---

## AI Assistant (Gemini)

Four specialized modes powered by **Google Gemini**:

| Mode | Description |
|------|-------------|
| **Chat** | Free-form conversation practice with AI tutor |
| **Explain** | Detailed explanations with etymology, usage, mnemonics |
| **Examples** | Context-rich sentences from books, movies, TV shows |
| **Grammar** | Real-time grammar correction and feedback |

### AI Features
- **Context sentences** — AI generates examples from literature and popular media
- **Personalized recommendations** — Weekly goals based on your progress
- **Automatic TTS for responses** — AI responses are read aloud (English only)
- **Streaming TTS** — Sentence-by-sentence generation for faster playback

---

## Neural Text-to-Speech

Powered by **Chatterbox-Turbo** for high-quality speech synthesis:

- **GPU acceleration** — CUDA/MPS with CPU fallback
- **Intelligent caching** — Generated audio is cached to disk
- **Offline playback** — Cached words play without TTS server
- **Streaming for AI** — Sentence-by-sentence generation with overlap pipeline
- **Background server** — Automatic lifecycle management

### How TTS Works
```
User clicks word → Check cache → Hit? Play from file
                              → Miss? Generate → Cache → Play
```

---

## Gamification System

### Experience Points (XP)
- Earn XP for learning activities
- Level progression from beginner to expert
- Bonus XP for combos and accuracy

### Daily Streaks
- Track consecutive learning days
- Streak protection
- Personal streak records

### Achievements
- **16+ achievements** across categories
- Words learned, XP earned, streaks maintained
- Progress tracking for each achievement

### Daily Goals
- Set targets by cards or time
- Visual progress indicators
- Customizable goals

---

## YouTube Integration

Import vocabulary directly from YouTube videos:
- Automatic subtitle extraction
- AI-powered word extraction from captions
- Context preservation from video content
- Difficulty estimation for extracted words

---

## Statistics & Analytics

### Progress Tracking
- Daily/weekly/monthly learning activity
- Words learned over time visualization
- Review performance metrics
- Accuracy tracking per word

### AI Analytics
- Personalized progress analysis
- Strength and weakness identification
- Custom learning recommendations

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Framework | Electron 27.3 |
| Frontend | React 18.2 + TypeScript 5.3 |
| Styling | Tailwind CSS 3.4 + Framer Motion |
| State | Zustand |
| Database | better-sqlite3 |
| AI | Google Gemini API |
| TTS | Chatterbox-Turbo (PyTorch) |
| Build | Vite + electron-builder |
| UI | Radix UI + Lucide Icons |
| Charts | Recharts |

---

## Installation

### Download Installer
Get the latest release from [Releases](https://github.com/yourusername/english-learning-app/releases):
- `English Learning Setup 1.0.0.exe` — Windows installer

### Build from Source

#### Prerequisites
- Node.js 18+
- Python 3.10+ (for TTS)
- CUDA-compatible GPU (optional, for accelerated TTS)

#### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/english-learning-app.git
cd english-learning-app

# Install dependencies
npm install

# Rebuild native modules for Electron
npm run rebuild

# Start development server
npm run dev
```

### TTS Setup (Optional)

For neural text-to-speech functionality:

```bash
# Install Python dependencies
pip install flask flask-cors torch torchaudio
pip install chatterbox-tts

# The TTS server starts automatically when enabled in settings
```

### Build for Production

```bash
# Build for Windows
npm run package:win

# Build for macOS
npm run package:mac

# Build for Linux
npm run package:linux
```

---

## Configuration

### Gemini API
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Navigate to Settings → AI Assistant
3. Enter your API key
4. Test the connection

### TTS Settings
1. Enable TTS in Settings
2. Click "Start TTS Server"
3. Wait for model preload (first launch only)
4. Auto-pronunciation activates

---

## Project Structure

```
english-learning-app/
├── electron/                # Electron main process
│   ├── main.ts             # Application entry point
│   ├── preload.ts          # IPC bridge
│   ├── database.ts         # SQLite database service
│   ├── tts-service.ts      # TTS server management
│   ├── srs-engine.ts       # SM-2 algorithm
│   └── gemini.ts           # AI API integration
├── src/                    # React renderer process
│   ├── components/
│   │   ├── ui/             # UI primitives
│   │   ├── layout/         # Sidebar, TitleBar
│   │   ├── learning/       # WordCard, QuizCard
│   │   └── widgets/        # WordOfDay, etc.
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── LearnPage.tsx
│   │   ├── ReviewPage.tsx
│   │   ├── SprintPage.tsx
│   │   ├── DictionaryPage.tsx
│   │   ├── AssistantPage.tsx
│   │   ├── StatisticsPage.tsx
│   │   ├── AchievementsPage.tsx
│   │   ├── WidgetPage.tsx
│   │   └── SettingsPage.tsx
│   ├── stores/             # Zustand state stores
│   ├── lib/                # Utilities (tts.ts, srs.ts)
│   └── types/              # TypeScript definitions
├── python/                 # Python TTS server
│   └── tts_server.py       # Flask TTS API
├── data/                   # Word databases (JSON)
│   ├── english-raw.json
│   └── italian-raw.json
└── public/                 # Static assets
```

---

## Data Format

Words are stored in JSON format:

```json
{
  "word": "ephemeral",
  "translation": "ephemeral (short-lived)",
  "transcription": "/ɪˈfem(ə)rəl/",
  "example": "Fame is ephemeral in the digital age.",
  "difficulty": 3,
  "level": "C1"
}
```

---

## Quick Start Guide

1. **Select language** — English or Italian in Settings
2. **Start learning** — Go to "Learn" and select your level
3. **Take quizzes** — Reinforce knowledge through testing
4. **Review regularly** — Use SRS for long-term retention
5. **Play Sprint** — Compete with yourself for high scores
6. **Track progress** — View statistics and achievements

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Know word | `→` or `2` |
| Don't know | `←` or `1` |
| Hard | `↓` or `3` |
| Play audio | `Space` |

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [SM-2 Algorithm](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2) — Spaced repetition by Piotr Wozniak
- [Chatterbox](https://github.com/resemble-ai/chatterbox) — Neural TTS by Resemble AI
- [Google Gemini](https://ai.google.dev/) — AI language model
- [Radix UI](https://www.radix-ui.com/) — Accessible components

### Inspired by
- [Duolingo](https://www.duolingo.com/) — Gamification
- [Anki](https://apps.ankiweb.net/) — SRS algorithm
- [Memrise](https://www.memrise.com/) — Learning modes
- [Quizlet](https://quizlet.com/) — Flashcards

---

<p align="center">
  <b>Built with passion for language learners</b>
</p>
