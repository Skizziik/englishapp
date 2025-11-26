import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Target,
  Bell,
  Volume2,
  Moon,
  Sun,
  Key,
  Download,
  Upload,
  Save,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Textarea,
} from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import type { Settings, UserProfile } from '@/types';
import { cn } from '@/lib/utils';

export const SettingsPage: React.FC = () => {
  const { settings, profile, setSettings, setProfile } = useAppStore();

  const [localSettings, setLocalSettings] = useState<Partial<Settings>>({});
  const [localProfile, setLocalProfile] = useState<Partial<UserProfile>>({});
  const [geminiKey, setGeminiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
    if (profile) {
      setLocalProfile(profile);
    }
  }, [settings, profile]);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      if (window.electronAPI) {
        if (Object.keys(localSettings).length > 0) {
          await window.electronAPI.settings.update(localSettings);
          setSettings(localSettings as Settings);
        }
        if (Object.keys(localProfile).length > 0) {
          await window.electronAPI.profile.update(localProfile);
          setProfile(localProfile as UserProfile);
        }
        if (geminiKey) {
          await window.electronAPI.gemini.setApiKey(geminiKey);
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.data.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `english-learning-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        const data = JSON.parse(text);
        if (window.electronAPI) {
          const success = await window.electronAPI.data.import(data);
          if (success) {
            alert('Данные успешно импортированы!');
            window.location.reload();
          } else {
            alert('Ошибка при импорте данных');
          }
        }
      }
    };
    input.click();
  };

  const ToggleSwitch: React.FC<{
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description?: string;
    icon?: React.ReactNode;
  }> = ({ checked, onChange, label, description, icon }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <div>
          <p className="font-medium">{label}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'w-12 h-6 rounded-full transition-all duration-200 relative',
          checked ? 'bg-primary' : 'bg-secondary'
        )}
      >
        <div
          className={cn(
            'absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200',
            checked ? 'left-7' : 'left-1'
          )}
        />
      </button>
    </div>
  );

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Настройки</h1>
            <p className="text-muted-foreground">
              Настройте приложение под себя
            </p>
          </div>
          <Button
            variant={saveSuccess ? 'success' : 'glow'}
            onClick={handleSave}
            disabled={isSaving}
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Сохранено
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </>
            )}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Профиль
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Имя
                </label>
                <Input
                  value={localProfile.name || ''}
                  onChange={(e) =>
                    setLocalProfile({ ...localProfile, name: e.target.value })
                  }
                  placeholder="Ваше имя"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Целевой уровень
                </label>
                <div className="flex gap-2">
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => (
                    <Button
                      key={level}
                      variant={
                        localProfile.targetLevel === level ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() =>
                        setLocalProfile({ ...localProfile, targetLevel: level })
                      }
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Goal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5" />
                Ежедневная цель
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Тип цели
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={
                      localProfile.dailyGoalType === 'cards' ? 'default' : 'outline'
                    }
                    onClick={() =>
                      setLocalProfile({ ...localProfile, dailyGoalType: 'cards' })
                    }
                  >
                    Карточки
                  </Button>
                  <Button
                    variant={
                      localProfile.dailyGoalType === 'time' ? 'default' : 'outline'
                    }
                    onClick={() =>
                      setLocalProfile({ ...localProfile, dailyGoalType: 'time' })
                    }
                  >
                    Время (минуты)
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Количество{' '}
                  {localProfile.dailyGoalType === 'time' ? 'минут' : 'карточек'}
                </label>
                <Input
                  type="number"
                  value={localProfile.dailyGoalTarget || 50}
                  onChange={(e) =>
                    setLocalProfile({
                      ...localProfile,
                      dailyGoalTarget: parseInt(e.target.value) || 50,
                    })
                  }
                  min={1}
                  max={500}
                />
              </div>
            </CardContent>
          </Card>

          {/* App Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Приложение
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <ToggleSwitch
                checked={localSettings.soundEnabled ?? true}
                onChange={(checked) =>
                  setLocalSettings({ ...localSettings, soundEnabled: checked })
                }
                label="Звуки"
                description="Воспроизводить звуки при ответах"
                icon={<Volume2 className="w-5 h-5" />}
              />
              <ToggleSwitch
                checked={localSettings.autoPlayAudio ?? true}
                onChange={(checked) =>
                  setLocalSettings({ ...localSettings, autoPlayAudio: checked })
                }
                label="Автопроизношение"
                description="Автоматически произносить слова"
                icon={<Volume2 className="w-5 h-5" />}
              />
              <ToggleSwitch
                checked={localSettings.notificationsEnabled ?? true}
                onChange={(checked) =>
                  setLocalSettings({
                    ...localSettings,
                    notificationsEnabled: checked,
                  })
                }
                label="Уведомления"
                description="Напоминания о занятиях"
                icon={<Bell className="w-5 h-5" />}
              />
            </CardContent>
          </Card>

          {/* SRS Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                🧠 Интервальное повторение
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Новых карточек в день
                </label>
                <Input
                  type="number"
                  value={localSettings.srsNewCardsPerDay ?? 20}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      srsNewCardsPerDay: parseInt(e.target.value) || 20,
                    })
                  }
                  min={1}
                  max={100}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Максимум повторений в день
                </label>
                <Input
                  type="number"
                  value={localSettings.srsReviewCardsPerDay ?? 100}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      srsReviewCardsPerDay: parseInt(e.target.value) || 100,
                    })
                  }
                  min={1}
                  max={500}
                />
              </div>
            </CardContent>
          </Card>

          {/* Gemini Integration */}
          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                AI Ассистент (Gemini)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleSwitch
                checked={localSettings.geminiEnabled ?? false}
                onChange={(checked) =>
                  setLocalSettings({ ...localSettings, geminiEnabled: checked })
                }
                label="Включить AI ассистент"
                description="Используйте Gemini для объяснений и диалогов"
              />
              {localSettings.geminiEnabled && (
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    API ключ Gemini
                  </label>
                  <Input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="Введите ваш API ключ"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Получите API ключ на{' '}
                    <a
                      href="https://makersuite.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google AI Studio
                    </a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="w-5 h-5" />
                Данные
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Экспортируйте или импортируйте свои данные для резервного копирования
                или переноса на другое устройство.
              </p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Экспорт
                </Button>
                <Button variant="outline" onClick={handleImport}>
                  <Upload className="w-4 h-4 mr-2" />
                  Импорт
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};
