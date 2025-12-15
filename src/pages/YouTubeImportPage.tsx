import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Youtube,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  Filter,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Info,
  Play,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';

const levelColors: Record<string, string> = {
  'A1': 'bg-green-500/20 text-green-400 border-green-500/30',
  'A2': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'B1': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'B2': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'C1': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'C2': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

const partOfSpeechLabels: Record<string, string> = {
  'noun': 'сущ.',
  'verb': 'гл.',
  'adjective': 'прил.',
  'adverb': 'нар.',
  'other': 'др.',
};

export const YouTubeImportPage: React.FC = () => {
  const {
    targetLanguage,
    refreshData,
    youtubeImport,
    setYouTubeUrl,
    setYouTubeLoading,
    setYouTubeError,
    setYouTubeResult,
    setYouTubeAddResult,
    updateYouTubeWords,
    resetYouTubeImport,
  } = useAppStore();

  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showExisting, setShowExisting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [expandedWord, setExpandedWord] = useState<string | null>(null);

  // Use store state
  const { url, isLoading, error, result: importResult, addResult } = youtubeImport;

  const handleImport = async () => {
    if (!url.trim()) return;

    setYouTubeLoading(true);
    setYouTubeError(null);
    setYouTubeResult(null);
    setYouTubeAddResult(null);

    try {
      if (!window.electronAPI) {
        throw new Error('Electron API недоступен');
      }

      const result = await window.electronAPI.youtube.import(url, targetLanguage);

      if (!result.success) {
        setYouTubeError(result.error || 'Неизвестная ошибка');
        return;
      }

      // Initialize selected state for new words
      const newWordsWithSelection = (result.newWords || []).map(w => ({
        ...w,
        selected: true // Select all by default
      }));

      setYouTubeResult({
        videoId: result.videoId,
        language: result.language,
        totalWords: result.totalWords,
        uniqueWords: result.uniqueWords,
        newWords: newWordsWithSelection,
        existingWords: result.existingWords || []
      });
    } catch (err: any) {
      setYouTubeError(err.message || 'Ошибка импорта');
    } finally {
      setYouTubeLoading(false);
    }
  };

  const toggleWordSelection = (word: string) => {
    if (!importResult) return;

    updateYouTubeWords(
      importResult.newWords.map(w =>
        w.word === word ? { ...w, selected: !w.selected } : w
      )
    );
  };

  const selectAll = () => {
    if (!importResult) return;
    updateYouTubeWords(
      importResult.newWords.map(w => ({ ...w, selected: true }))
    );
  };

  const deselectAll = () => {
    if (!importResult) return;
    updateYouTubeWords(
      importResult.newWords.map(w => ({ ...w, selected: false }))
    );
  };

  const handleAddWords = async () => {
    if (!importResult) return;

    const selectedWords = importResult.newWords.filter(w => w.selected && w.translation);
    if (selectedWords.length === 0) {
      setYouTubeError('Выберите слова для добавления');
      return;
    }

    setIsAdding(true);
    setYouTubeError(null);

    try {
      const result = await window.electronAPI.youtube.addWords(
        selectedWords,
        targetLanguage,
        `youtube:${importResult.videoId}`
      );

      if (result.success) {
        setYouTubeAddResult({ success: true, added: result.added });
        // Remove added words from the list
        updateYouTubeWords(
          importResult.newWords.filter(w => !w.selected)
        );
        refreshData();
      } else {
        setYouTubeError(result.error || 'Ошибка добавления');
      }
    } catch (err: any) {
      setYouTubeError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleReset = () => {
    resetYouTubeImport();
    setSelectedLevel(null);
    setShowExisting(false);
    setExpandedWord(null);
  };

  const filteredWords = importResult?.newWords.filter(w => {
    if (selectedLevel && w.level !== selectedLevel) return false;
    return true;
  }) || [];

  const selectedCount = filteredWords.filter(w => w.selected).length;
  const wordsWithTranslation = filteredWords.filter(w => w.translation).length;

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const levelCounts = levels.reduce((acc, level) => {
    acc[level] = importResult?.newWords.filter(w => w.level === level).length || 0;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/20">
              <Youtube className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Импорт из YouTube</h1>
              <p className="text-muted-foreground">
                Извлеките слова из субтитров видео и добавьте их в словарь
              </p>
            </div>
          </div>

          {/* Reset button - show when we have results */}
          {importResult && (
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Новый импорт
            </Button>
          )}
        </div>

        {/* URL Input */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setYouTubeUrl(e.target.value)}
                  placeholder="Вставьте ссылку на YouTube видео..."
                  className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={handleImport}
                disabled={isLoading || !url.trim()}
                className="px-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Анализ...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Анализировать
                  </>
                )}
              </Button>
            </div>

            {/* Info */}
            <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                Видео должно иметь субтитры (автоматические или загруженные).
                Язык определяется автоматически, но вы можете переключить его в боковой панели.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="border-red-500/30 bg-red-500/10">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-400">{error}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    onClick={() => setYouTubeError(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success message */}
        <AnimatePresence>
          {addResult?.success && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="border-green-500/30 bg-green-500/10">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <p className="text-green-400">
                    Добавлено {addResult.added} слов в словарь!
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading state */}
        {isLoading && (
          <Card>
            <CardContent className="p-12 flex flex-col items-center justify-center">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <Youtube className="w-6 h-6 text-red-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="mt-4 text-muted-foreground">Получение субтитров...</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Анализ текста и определение уровня слов
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {importResult && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {importResult.totalWords?.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">всего слов</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {importResult.uniqueWords}
                  </div>
                  <div className="text-sm text-muted-foreground">уникальных</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {importResult.newWords.length}
                  </div>
                  <div className="text-sm text-muted-foreground">новых слов</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    {importResult.existingWords.length}
                  </div>
                  <div className="text-sm text-muted-foreground">уже в словаре</div>
                </CardContent>
              </Card>
            </div>

            {/* Video preview */}
            {importResult.videoId && (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-video bg-black/50 flex items-center justify-center">
                    <a
                      href={`https://youtube.com/watch?v=${importResult.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      <Play className="w-5 h-5 text-red-500" />
                      <span>Открыть видео</span>
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Level filter */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Filter className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Фильтр по уровню:</span>
                  <div className="flex gap-2">
                    <Button
                      variant={selectedLevel === null ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedLevel(null)}
                    >
                      Все ({importResult.newWords.length})
                    </Button>
                    {levels.map(level => (
                      <Button
                        key={level}
                        variant={selectedLevel === level ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedLevel(selectedLevel === level ? null : level)}
                        disabled={levelCounts[level] === 0}
                      >
                        {level} ({levelCounts[level]})
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Выбрать все
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Снять выбор
                </Button>
                <span className="text-sm text-muted-foreground">
                  Выбрано: {selectedCount} из {filteredWords.length}
                  {wordsWithTranslation < filteredWords.length && (
                    <span className="text-orange-400 ml-2">
                      ({filteredWords.length - wordsWithTranslation} без перевода)
                    </span>
                  )}
                </span>
              </div>
              <Button
                onClick={handleAddWords}
                disabled={isAdding || selectedCount === 0}
                className="gap-2"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Добавление...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Добавить выбранные ({selectedCount})
                  </>
                )}
              </Button>
            </div>

            {/* Words list */}
            <div className="space-y-2">
              {filteredWords.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Нет слов для отображения
                  </CardContent>
                </Card>
              ) : (
                filteredWords.map((word) => (
                  <motion.div
                    key={word.word}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <Card
                      className={cn(
                        'transition-all cursor-pointer hover:border-primary/50',
                        word.selected && 'border-primary bg-primary/5',
                        !word.translation && 'opacity-60'
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleWordSelection(word.word)}
                            className={cn(
                              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                              word.selected
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground/30'
                            )}
                          >
                            {word.selected && <CheckCircle className="w-4 h-4 text-white" />}
                          </button>

                          {/* Word info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-lg">{word.word}</span>
                              {word.transcription && (
                                <span className="text-sm text-muted-foreground">
                                  {word.transcription}
                                </span>
                              )}
                              <Badge className={cn('text-xs', levelColors[word.level])}>
                                {word.level}
                              </Badge>
                              {word.partOfSpeech && (
                                <span className="text-xs text-muted-foreground">
                                  {partOfSpeechLabels[word.partOfSpeech] || word.partOfSpeech}
                                </span>
                              )}
                            </div>
                            <div className="text-muted-foreground mt-1">
                              {word.translation || (
                                <span className="text-orange-400 italic">Перевод не определён</span>
                              )}
                            </div>
                          </div>

                          {/* Frequency */}
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              ×{word.frequency}
                            </div>
                          </div>

                          {/* Expand button */}
                          {word.contexts.length > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedWord(expandedWord === word.word ? null : word.word);
                              }}
                            >
                              {expandedWord === word.word ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Contexts */}
                        <AnimatePresence>
                          {expandedWord === word.word && word.contexts.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 pt-4 border-t border-border"
                            >
                              <div className="text-sm text-muted-foreground mb-2">
                                Контекст из видео:
                              </div>
                              <div className="space-y-2">
                                {word.contexts.map((ctx, idx) => (
                                  <div
                                    key={idx}
                                    className="text-sm p-2 bg-background rounded border border-border"
                                  >
                                    "{ctx}"
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>

            {/* Show existing words toggle */}
            {importResult.existingWords.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <button
                    onClick={() => setShowExisting(!showExisting)}
                    className="w-full flex items-center justify-between"
                  >
                    <span className="text-muted-foreground">
                      {importResult.existingWords.length} слов уже в вашем словаре
                    </span>
                    {showExisting ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showExisting && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-border"
                      >
                        <div className="flex flex-wrap gap-2">
                          {importResult.existingWords.map(w => (
                            <Badge
                              key={w.word}
                              variant="outline"
                              className={cn(
                                'text-sm',
                                w.inProgress && 'border-primary text-primary'
                              )}
                            >
                              {w.word}
                              {w.inProgress && (
                                <BookOpen className="w-3 h-3 ml-1" />
                              )}
                            </Badge>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Empty state */}
        {!isLoading && !importResult && !error && (
          <Card>
            <CardContent className="p-12 text-center">
              <Youtube className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">Как это работает?</h3>
              <div className="text-muted-foreground text-sm space-y-2 max-w-md mx-auto">
                <p>1. Вставьте ссылку на YouTube видео с субтитрами</p>
                <p>2. Мы извлечём все слова и определим их уровень</p>
                <p>3. Выберите нужные слова и добавьте их в словарь</p>
                <p>4. Учите слова из любимых видео!</p>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
};

export default YouTubeImportPage;
