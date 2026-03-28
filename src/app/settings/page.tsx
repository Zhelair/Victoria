'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useVictoriaStore } from '@/store';
import { AppShell } from '@/components/layout/AppShell';
import { db } from '@/lib/db';
import { MAX_HOME_PINNED_RULES } from '@/lib/scoring';
import { cn, getTodayDateKey } from '@/lib/utils';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import type { ScoringRule, Theme, Language, CharacterMode, PersonalityMode, SaveSlot, AppSnapshot } from '@/types';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const settings = useVictoriaStore((s) => s.settings);
  const updateSettings = useVictoriaStore((s) => s.updateSettings);
  const scoringRules = useVictoriaStore((s) => s.scoringRules);
  const addScoringRule = useVictoriaStore((s) => s.addScoringRule);
  const updateScoringRule = useVictoriaStore((s) => s.updateScoringRule);
  const deleteScoringRule = useVictoriaStore((s) => s.deleteScoringRule);
  const tier = useVictoriaStore((s) => s.tier);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [activeSection, setActiveSection] = useState<string>('appearance');
  const [passphraseInput, setPassphraseInput] = useState('');
  const [passphraseError, setPassphraseError] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [saveSlots, setSaveSlots] = useState<(SaveSlot | null)[]>([null, null, null]);
  const [slotToDelete, setSlotToDelete] = useState<number | null>(null);
  const [showClearChatsConfirm, setShowClearChatsConfirm] = useState(false);
  const [newRuleLabel, setNewRuleLabel] = useState('');
  const [newRuleEmoji, setNewRuleEmoji] = useState('✨');
  const [newRulePoints, setNewRulePoints] = useState(10);
  const [newRuleType, setNewRuleType] = useState<ScoringRule['type']>('heal');
  const [newRuleCategory, setNewRuleCategory] = useState<ScoringRule['category']>('custom');
  const [newRulePinned, setNewRulePinned] = useState(false);
  const [newRuleTriggers, setNewRuleTriggers] = useState('');

  // Load voices
  useEffect(() => {
    const loadVoices = () => setVoices(window.speechSynthesis?.getVoices() ?? []);
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // Load save slots when Data section is active
  useEffect(() => {
    if (activeSection !== 'data') return;
    db.saveSlots.toArray().then((slots) => {
      const map: (SaveSlot | null)[] = [null, null, null];
      slots.forEach((s) => { map[s.slot - 1] = s; });
      setSaveSlots(map);
    });
  }, [activeSection]);

  const refreshSlots = async () => {
    const slots = await db.saveSlots.toArray();
    const map: (SaveSlot | null)[] = [null, null, null];
    slots.forEach((s) => { map[s.slot - 1] = s; });
    setSaveSlots(map);
  };

  const handleSaveToSlot = async (slotNum: 1 | 2 | 3) => {
    const state = useVictoriaStore.getState();
    const snapshot: AppSnapshot = {
      settings: state.settings,
      scoringRules: state.scoringRules,
      logCategories: state.logCategories,
      moodScore: state.moodScore,
      streakDays: state.streakDays,
      totalDays: state.totalDays,
      goals: await db.goals.toArray(),
      todos: await db.todos.toArray(),
      fitnessPlan: await db.fitnessPlans.filter((p) => p.active).first(),
    };
    await db.saveSlots.put({
      slot: slotNum,
      label: `Save ${slotNum}`,
      savedAt: Date.now(),
      day: state.totalDays,
      moodScore: state.moodScore,
      data: snapshot,
    });
    await refreshSlots();
  };

  const handleLoadSlot = async (slot: SaveSlot) => {
    const { data } = slot;
    useVictoriaStore.setState({
      settings: data.settings,
      scoringRules: data.scoringRules,
      logCategories: data.logCategories,
      moodScore: data.moodScore,
      streakDays: data.streakDays,
      totalDays: data.totalDays,
    });
    if (data.goals?.length) await db.goals.bulkPut(data.goals);
    if (data.todos?.length) await db.todos.bulkPut(data.todos);
    if (data.fitnessPlan) await db.fitnessPlans.put(data.fitnessPlan);
  };

  const handleDeleteSlot = async (slotNum: number) => {
    await db.saveSlots.delete(slotNum);
    setSlotToDelete(null);
    await refreshSlots();
  };

  const handleClearChats = async () => {
    await db.chatThreads.clear();
    setShowClearChatsConfirm(false);
  };

  // Auto-select female voice when language changes or voices load
  useEffect(() => {
    if (!voices.length) return;
    const lang = settings.language.split('-')[0];
    const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
    if (!langVoices.length) return;
    const femaleKws = ['female', 'woman', 'zira', 'samantha', 'karen', 'moira', 'tessa', 'milena', 'alice', 'amelie', 'petra', 'monica', 'f '];
    const best =
      langVoices.find((v) => femaleKws.some((k) => v.name.toLowerCase().includes(k))) ??
      langVoices[0];
    if (!settings.selectedVoiceName) {
      updateSettings({ selectedVoiceName: best.name });
    }
  }, [voices, settings.language]); // eslint-disable-line

  // Sync language with i18n
  const handleLanguageChange = (lang: Language) => {
    updateSettings({ language: lang, selectedVoiceName: undefined }); // reset so auto-select fires
    i18n.changeLanguage(lang);
  };

  const handleThemeChange = (theme: Theme) => {
    updateSettings({ theme });
    document.documentElement.setAttribute('data-theme', theme);
  };

  const handleExport = async () => {
    const snapshot = {
      settings,
      scoringRules,
      logCategories: useVictoriaStore.getState().logCategories,
      moodScore: useVictoriaStore.getState().moodScore,
      streakDays: useVictoriaStore.getState().streakDays,
      totalDays: useVictoriaStore.getState().totalDays,
      todos: await db.todos.toArray(),
      goals: await db.goals.toArray(),
      fitnessPlan: await db.fitnessPlans.filter((p) => p.active).first(),
      logEntries: await db.logEntries.toArray(),
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `victoria-backup-${getTodayDateKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2000);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (data.settings) updateSettings(data.settings);
        if (data.scoringRules) useVictoriaStore.setState({ scoringRules: data.scoringRules });
        if (data.logCategories) useVictoriaStore.setState({ logCategories: data.logCategories });
        if (data.moodScore !== undefined) useVictoriaStore.setState({ moodScore: data.moodScore });
        if (data.todos) await db.todos.bulkPut(data.todos);
        if (data.goals) await db.goals.bulkPut(data.goals);
        if (data.fitnessPlan) await db.fitnessPlans.put(data.fitnessPlan);
        setImportDone(true);
        setTimeout(() => setImportDone(false), 6000);
      } catch {
        alert('Invalid backup file.');
      }
    };
    input.click();
  };

  const handleDeleteAll = async () => {
    if (deleteText !== 'DELETE') return;
    await db.delete();
    localStorage.clear();
    window.location.reload();
  };

  const handleUnlockTier = () => {
    const proCode = process.env.NEXT_PUBLIC_PRO_CODE || 'VICTORIA_PRO';
    const maxCode = process.env.NEXT_PUBLIC_MAX_CODE || 'VICTORIA_MAX';
    const proCodes = proCode.split(',').map((s) => s.trim());
    const maxCodes = maxCode.split(',').map((s) => s.trim());
    if (maxCodes.includes(passphraseInput)) {
      useVictoriaStore.getState().setTier('max');
      updateSettings({ tier: 'max' });
      setPassphraseInput('');
      setPassphraseError(false);
    } else if (proCodes.includes(passphraseInput)) {
      useVictoriaStore.getState().setTier('pro');
      updateSettings({ tier: 'pro' });
      setPassphraseInput('');
      setPassphraseError(false);
    } else {
      setPassphraseError(true);
    }
  };

  const pinnedRuleCount = scoringRules.filter((rule) => rule.enabled && rule.pinnedToHome).length;

  const togglePinnedRule = (rule: ScoringRule) => {
    if (!rule.pinnedToHome && pinnedRuleCount >= MAX_HOME_PINNED_RULES) {
      alert(`You can pin up to ${MAX_HOME_PINNED_RULES} Home actions.`);
      return;
    }

    updateScoringRule(rule.id, { pinnedToHome: !rule.pinnedToHome });
  };

  const createCustomRule = () => {
    const label = newRuleLabel.trim();
    if (!label) return;

    if (newRulePinned && pinnedRuleCount >= MAX_HOME_PINNED_RULES) {
      alert(`You can pin up to ${MAX_HOME_PINNED_RULES} Home actions.`);
      return;
    }

    addScoringRule({
      id: uuidv4(),
      label,
      emoji: newRuleEmoji.trim() || '✨',
      type: newRuleType,
      points: Math.max(1, Math.round(Math.abs(newRulePoints))),
      enabled: true,
      category: newRuleCategory,
      pinnedToHome: newRulePinned,
      triggerPhrases: newRuleTriggers
        .split(',')
        .map((phrase) => phrase.trim())
        .filter(Boolean),
    });

    setNewRuleLabel('');
    setNewRuleEmoji('✨');
    setNewRulePoints(10);
    setNewRuleType('heal');
    setNewRuleCategory('custom');
    setNewRulePinned(false);
    setNewRuleTriggers('');
  };

  const sections = [
    { id: 'appearance', label: t('settings.appearance') },
    { id: 'personality', label: t('settings.personality') },
    { id: 'voice', label: t('settings.voice') },
    { id: 'rules', label: t('settings.rulesEngine') },
    { id: 'data', label: t('settings.saveData') },
    { id: 'account', label: t('settings.account') },
  ];

  return (
    <AppShell>
      <div className="flex flex-col">
        {/* Section tabs (horizontal scroll) */}
        <div
          className="flex flex-wrap gap-1 px-3 py-2 border-b border-theme"
          style={{ backgroundColor: 'var(--card-bg)' }}
        >
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className="px-3 py-1.5 rounded-full transition-all font-pixel text-[7px]"
              style={{
                backgroundColor: activeSection === s.id ? 'var(--accent)' : 'var(--shell)',
                color: activeSection === s.id ? 'white' : 'var(--text-muted)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4 pb-8">
          {/* ─── Appearance ─────────────────────────────────────────── */}
          {activeSection === 'appearance' && (
            <div className="space-y-4">
              {/* Theme */}
              <SettingsSection title={t('settings.theme')}>
                <div className="flex gap-2">
                  {(['classic', 'midnight', 'clean'] as Theme[]).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => handleThemeChange(theme)}
                      className="flex-1 py-2 rounded-xl font-pixel text-[7px] transition-all"
                      style={{
                        backgroundColor: settings.theme === theme ? 'var(--accent)' : 'var(--shell)',
                        color: settings.theme === theme ? 'white' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {t(`settings.themes.${theme}`)}
                    </button>
                  ))}
                </div>
              </SettingsSection>

              {/* Language */}
              <SettingsSection title={t('settings.language')}>
                <div className="grid grid-cols-3 gap-2">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code as Language)}
                      className="py-2 px-2 rounded-xl font-pixel text-[6px] transition-all"
                      style={{
                        backgroundColor: settings.language === lang.code ? 'var(--accent)' : 'var(--shell)',
                        color: settings.language === lang.code ? 'white' : 'var(--text)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {lang.flag} {lang.name}
                    </button>
                  ))}
                </div>
              </SettingsSection>

              {/* Character */}
              <SettingsSection title={t('settings.character')}>
                {(['creature', 'girl', 'cat'] as CharacterMode[]).map((mode) => {
                  const locked = mode !== 'creature' && tier === 'free';
                  return (
                    <button
                      key={mode}
                      onClick={() => !locked && updateSettings({ characterMode: mode })}
                      className={cn(
                        'w-full flex items-center justify-between py-3 px-4 rounded-xl mb-2 transition-all',
                        locked ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
                      )}
                      style={{
                        backgroundColor: settings.characterMode === mode ? 'var(--accent)' : 'var(--shell)',
                        color: settings.characterMode === mode ? 'white' : 'var(--text)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <span className="font-pixel text-[8px]">{t(`settings.characters.${mode}`)}</span>
                      {locked && (
                        <span className="font-pixel text-[6px]" style={{ color: 'var(--text-muted)' }}>
                          🔒 Pro+
                        </span>
                      )}
                    </button>
                  );
                })}
              </SettingsSection>

              {/* Animations */}
              <SettingsSection title={t('settings.animations')}>
                <div className="flex gap-2">
                  {(['full', 'reduced', 'off'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => updateSettings({ animationLevel: level })}
                      className="flex-1 py-2 rounded-xl font-pixel text-[7px] transition-all"
                      style={{
                        backgroundColor: settings.animationLevel === level ? 'var(--accent)' : 'var(--shell)',
                        color: settings.animationLevel === level ? 'white' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {t(`settings.animationLevels.${level}`)}
                    </button>
                  ))}
                </div>
              </SettingsSection>

              {/* Companion Colors */}
              <SettingsSection title="Companion Colors">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <p className="font-pixel text-[6px] mb-2" style={{ color: 'var(--text-muted)' }}>SHELL</p>
                    <input
                      type="color"
                      value={settings.tamaShellColor ?? '#e8d5a3'}
                      onChange={(e) => updateSettings({ tamaShellColor: e.target.value })}
                      className="w-full rounded-lg cursor-pointer"
                      style={{ height: '36px', border: '1px solid var(--border)', padding: '2px 4px', backgroundColor: 'var(--shell)' }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-pixel text-[6px] mb-2" style={{ color: 'var(--text-muted)' }}>SCREEN</p>
                    <input
                      type="color"
                      value={settings.tamaScreenColor ?? '#9bbc0f'}
                      onChange={(e) => updateSettings({ tamaScreenColor: e.target.value })}
                      className="w-full rounded-lg cursor-pointer"
                      style={{ height: '36px', border: '1px solid var(--border)', padding: '2px 4px', backgroundColor: 'var(--shell)' }}
                    />
                  </div>
                  <button
                    onClick={() => updateSettings({ tamaShellColor: undefined, tamaScreenColor: undefined })}
                    className="px-3 py-2 rounded-xl font-pixel text-[6px] transition-all active:scale-95"
                    style={{ backgroundColor: 'var(--shell)', border: '1px solid var(--border)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}
                  >
                    Reset
                  </button>
                </div>
              </SettingsSection>

              {/* Sounds */}
              <SettingsSection title="Sounds">
                <ToggleRow
                  label="8-bit sound effects"
                  value={settings.soundsEnabled ?? false}
                  onChange={(v) => updateSettings({ soundsEnabled: v })}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Plays short retro sounds when interacting with the tamagotchi.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="font-pixel text-[7px]" style={{ color: 'var(--text-muted)' }}>
                    Volume
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.05}
                    value={settings.soundVolume ?? 1}
                    onChange={(e) => updateSettings({ soundVolume: Number(e.target.value) })}
                    className="flex-1"
                    disabled={!settings.soundsEnabled}
                  />
                  <span className="font-pixel text-[7px] w-10 text-right" style={{ color: 'var(--accent)' }}>
                    {Math.round((settings.soundVolume ?? 1) * 100)}%
                  </span>
                </div>
              </SettingsSection>

              {/* Wake time */}
              <SettingsSection title={t('settings.wakeUpTime')}>
                <input
                  type="time"
                  value={settings.wakeUpTime}
                  onChange={(e) => updateSettings({ wakeUpTime: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none text-center"
                  style={{
                    backgroundColor: 'var(--shell)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                />
              </SettingsSection>

              {/* Push notifications */}
              <SettingsSection title={t('settings.notifications')}>
                <ToggleRow
                  label={t('settings.enableNotifications')}
                  value={settings.notificationsEnabled}
                  onChange={async (v) => {
                    if (v && 'Notification' in window) {
                      const perm = await Notification.requestPermission();
                      updateSettings({ notificationsEnabled: perm === 'granted' });
                    } else {
                      updateSettings({ notificationsEnabled: v });
                    }
                  }}
                />
                {settings.notificationsEnabled && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Morning alarm and reminders will use the installed PWA notifications when available.
                  </p>
                )}
                {!settings.notificationsEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied' && (
                  <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                    Notifications blocked in browser. Enable them in your browser settings first.
                  </p>
                )}
              </SettingsSection>

              <SettingsSection title="Morning Routine">
                <ToggleRow
                  label="Show morning briefing on Home"
                  value={settings.morningBriefingEnabled ?? true}
                  onChange={(v) => updateSettings({ morningBriefingEnabled: v })}
                />

                <div className="space-y-2">
                  <label className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={settings.morningLocation ?? ''}
                    onChange={(e) => updateSettings({ morningLocation: e.target.value })}
                    placeholder="Sofia, Bulgaria"
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{
                      backgroundColor: 'var(--shell)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                    }}
                  />
                </div>

                <ToggleRow
                  label="Include weather preference"
                  value={settings.morningWeatherEnabled ?? true}
                  onChange={(v) => updateSettings({ morningWeatherEnabled: v })}
                />

                <ToggleRow
                  label="Include news preference"
                  value={settings.morningNewsEnabled ?? false}
                  onChange={(v) => updateSettings({ morningNewsEnabled: v })}
                />

                <div className="space-y-2">
                  <label className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    News topics
                  </label>
                  <input
                    type="text"
                    value={settings.morningNewsTopics ?? ''}
                    onChange={(e) => updateSettings({ morningNewsTopics: e.target.value })}
                    placeholder="AI, tech, politics"
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{
                      backgroundColor: 'var(--shell)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Fact categories
                  </label>
                  <input
                    type="text"
                    value={settings.morningFactCategories ?? ''}
                    onChange={(e) => updateSettings({ morningFactCategories: e.target.value })}
                    placeholder="science, history"
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{
                      backgroundColor: 'var(--shell)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                    }}
                  />
                </div>

                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Location and weather now feed the live morning briefing. News topics are still saved as preferences for future live news integration.
                </p>
              </SettingsSection>
            </div>
          )}

          {/* ─── Personality ────────────────────────────────────────── */}
          {activeSection === 'personality' && (
            <SettingsSection title={t('settings.personality')}>
              {(['cheerful', 'balanced', 'critical'] as PersonalityMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => updateSettings({ personalityMode: mode })}
                  className="w-full flex flex-col py-3 px-4 rounded-xl mb-2 text-left transition-all active:scale-95"
                  style={{
                    backgroundColor: settings.personalityMode === mode ? 'var(--accent)' : 'var(--shell)',
                    color: settings.personalityMode === mode ? 'white' : 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span className="font-pixel text-[8px]">{t(`settings.personalities.${mode}`)}</span>
                  <span
                    className="text-xs mt-1"
                    style={{ color: settings.personalityMode === mode ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}
                  >
                    {mode === 'cheerful' && 'Warm, encouraging, celebrates every win'}
                    {mode === 'balanced' && 'Honest, direct, supportive but real'}
                    {mode === 'critical' && 'Blunt, sarcastic, maximum accountability'}
                  </span>
                </button>
              ))}
            </SettingsSection>
          )}

          {/* ─── Voice ──────────────────────────────────────────────── */}
          {activeSection === 'voice' && (
            <div className="space-y-4">
              <SettingsSection title={t('settings.voice')}>
                <ToggleRow
                  label={t('settings.voiceEnabled')}
                  value={settings.voiceEnabled}
                  onChange={(v) => updateSettings({ voiceEnabled: v })}
                />
              </SettingsSection>

              {settings.voiceEnabled && (
                <>
                  <SettingsSection title={t('settings.voiceRate')}>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0.5}
                        max={2}
                        step={0.1}
                        value={settings.voiceRate}
                        onChange={(e) => updateSettings({ voiceRate: Number(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="font-pixel text-[9px] w-8" style={{ color: 'var(--accent)' }}>
                        {settings.voiceRate.toFixed(1)}x
                      </span>
                    </div>
                  </SettingsSection>

                  <SettingsSection title={t('settings.voicePitch')}>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0.5}
                        max={2}
                        step={0.1}
                        value={settings.voicePitch}
                        onChange={(e) => updateSettings({ voicePitch: Number(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="font-pixel text-[9px] w-8" style={{ color: 'var(--accent)' }}>
                        {settings.voicePitch.toFixed(1)}
                      </span>
                    </div>
                  </SettingsSection>

                  {voices.length > 0 && (
                    <SettingsSection title={t('settings.voiceSelect')}>
                      <select
                        value={settings.selectedVoiceName ?? ''}
                        onChange={(e) => updateSettings({ selectedVoiceName: e.target.value || undefined })}
                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                        style={{
                          backgroundColor: 'var(--shell)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <option value="">Default voice</option>
                        {(() => {
                          const lang = settings.language.split('-')[0];
                          const femaleKws = ['female', 'woman', 'zira', 'samantha', 'karen', 'moira', 'tessa', 'milena', 'alice', 'amelie', 'petra', 'monica'];
                          const sorted = [...voices]
                            .filter((v) => v.lang.toLowerCase().startsWith(lang))
                            .sort((a, b) => {
                              const aF = femaleKws.some((k) => a.name.toLowerCase().includes(k));
                              const bF = femaleKws.some((k) => b.name.toLowerCase().includes(k));
                              return (bF ? 1 : 0) - (aF ? 1 : 0);
                            });
                          const rest = voices.filter((v) => !v.lang.toLowerCase().startsWith(lang));
                          return [...sorted, ...rest].map((v) => (
                            <option key={v.name} value={v.name}>
                              {v.name} ({v.lang})
                            </option>
                          ));
                        })()}
                      </select>
                      {settings.language === 'bg' && (
                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                          {t('settings.bgVoiceNote')}
                        </p>
                      )}
                    </SettingsSection>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── Scoring Rules ───────────────────────────────────────── */}
          {activeSection === 'rules' && (
            <div className="space-y-3">
              <SettingsSection title="Rule Automation">
                <ToggleRow
                  label="Suggest score changes from chat"
                  value={settings.chatScoreConfirmationsEnabled}
                  onChange={(v) => updateSettings({ chatScoreConfirmationsEnabled: v })}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  When Victoria spots a known habit in chat, she can suggest applying that rule with confirmation.
                </p>
              </SettingsSection>

              <div className="card p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-pixel text-[8px]" style={{ color: 'var(--accent)' }}>
                      Home Pins
                    </h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {pinnedRuleCount}/{MAX_HOME_PINNED_RULES} rules pinned to Home quick actions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="font-pixel text-[8px]" style={{ color: 'var(--text)' }}>
                  {t('settings.damageRules')}
                </h3>
              </div>

              {scoringRules.filter((r) => r.type === 'damage').map((rule) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  onToggle={(id) => updateScoringRule(id, { enabled: !rule.enabled })}
                  onPin={() => togglePinnedRule(rule)}
                  onDelete={rule.category === 'custom' ? deleteScoringRule : undefined}
                />
              ))}

              <h3 className="font-pixel text-[8px] mt-4" style={{ color: 'var(--text)' }}>
                {t('settings.healRules')}
              </h3>

              {scoringRules.filter((r) => r.type === 'heal').map((rule) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  onToggle={(id) => updateScoringRule(id, { enabled: !rule.enabled })}
                  onPin={() => togglePinnedRule(rule)}
                  onDelete={rule.category === 'custom' ? deleteScoringRule : undefined}
                />
              ))}

              <SettingsSection title="Add Custom Rule">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRuleEmoji}
                      onChange={(e) => setNewRuleEmoji(e.target.value)}
                      className="w-16 px-3 py-2 rounded-xl text-sm outline-none text-center"
                      style={{
                        backgroundColor: 'var(--shell)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                      }}
                      maxLength={4}
                      placeholder="✨"
                    />
                    <input
                      type="text"
                      value={newRuleLabel}
                      onChange={(e) => setNewRuleLabel(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--shell)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                      }}
                      placeholder="Rule label"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newRuleType}
                      onChange={(e) => setNewRuleType(e.target.value as ScoringRule['type'])}
                      className="px-3 py-2 rounded-xl text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--shell)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <option value="heal">Heal</option>
                      <option value="damage">Damage</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={newRulePoints}
                      onChange={(e) => setNewRulePoints(Number(e.target.value) || 1)}
                      className="px-3 py-2 rounded-xl text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--shell)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                      }}
                      placeholder="Points"
                    />
                  </div>

                  <select
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value as ScoringRule['category'])}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{
                      backgroundColor: 'var(--shell)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {(['custom', 'daily', 'diet', 'fitness', 'career', 'social'] as ScoringRule['category'][]).map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={newRuleTriggers}
                    onChange={(e) => setNewRuleTriggers(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{
                      backgroundColor: 'var(--shell)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                    }}
                    placeholder="Chat trigger phrases, comma separated"
                  />

                  <ToggleRow
                    label={`Pin this rule to Home (${pinnedRuleCount}/${MAX_HOME_PINNED_RULES})`}
                    value={newRulePinned}
                    onChange={(v) => setNewRulePinned(v)}
                  />

                  <button
                    onClick={createCustomRule}
                    className="w-full py-3 rounded-xl font-pixel text-[8px] text-white transition-all active:scale-95"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    Create custom rule
                  </button>
                </div>
              </SettingsSection>
            </div>
          )}

          {/* ─── Data ───────────────────────────────────────────────── */}
          {activeSection === 'data' && (
            <div className="space-y-4">
              {/* Save Slots */}
              <SettingsSection title={t('settings.saveSlots')}>
                <div className="grid grid-cols-3 gap-2">
                  {([1, 2, 3] as const).map((n) => {
                    const slot = saveSlots[n - 1];
                    return (
                      <div
                        key={n}
                        className="flex flex-col gap-1.5 p-2 rounded-xl"
                        style={{ backgroundColor: 'var(--shell)', border: '1px solid var(--border)' }}
                      >
                        <div className="text-center">
                          <p className="font-pixel text-[7px]" style={{ color: 'var(--accent)' }}>
                            {t('settings.slot', { n })}
                          </p>
                          <p className="font-pixel mt-0.5" style={{ fontSize: '5px', color: 'var(--text-muted)' }}>
                            {slot ? `Day ${slot.day} · ${slot.moodScore}pts` : t('settings.emptySlot')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleSaveToSlot(n)}
                          className="w-full py-1 rounded-lg font-pixel text-[6px] text-white"
                          style={{ backgroundColor: 'var(--accent)' }}
                        >
                          {t('settings.saveSlot')}
                        </button>
                        {slot && slotToDelete !== n && (
                          <>
                            <button
                              onClick={() => handleLoadSlot(slot)}
                              className="w-full py-1 rounded-lg font-pixel text-[6px]"
                              style={{ backgroundColor: 'var(--shell-dark)', color: 'var(--text)' }}
                            >
                              {t('settings.loadSlot')}
                            </button>
                            <button
                              onClick={() => setSlotToDelete(n)}
                              className="w-full py-1 rounded-lg font-pixel text-[6px]"
                              style={{ backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444' }}
                            >
                              {t('settings.deleteSlot')}
                            </button>
                          </>
                        )}
                        {slot && slotToDelete === n && (
                          <div className="space-y-1">
                            <p className="font-pixel text-center" style={{ fontSize: '5px', color: '#ef4444' }}>Sure?</p>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleDeleteSlot(n)}
                                className="flex-1 py-1 rounded-lg font-pixel text-[6px] text-white"
                                style={{ backgroundColor: '#ef4444' }}
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setSlotToDelete(null)}
                                className="flex-1 py-1 rounded-lg font-pixel text-[6px]"
                                style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
                              >
                                No
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SettingsSection>

              <SettingsSection title={t('settings.saveData')}>
                <div className="space-y-2">
                  {importDone && (
                    <div
                      className="p-3 rounded-xl font-pixel text-[7px] leading-relaxed"
                      style={{ backgroundColor: '#22c55e20', border: '1px solid #22c55e', color: 'var(--text)' }}
                    >
                      ✓ Restored! {t('settings.importApiNote')}
                    </div>
                  )}
                  <button
                    onClick={handleExport}
                    className="w-full py-3 rounded-xl font-pixel text-[8px] transition-all active:scale-95"
                    style={{
                      backgroundColor: exportSuccess ? '#22c55e' : 'var(--shell)',
                      color: exportSuccess ? 'white' : 'var(--text)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {exportSuccess ? '✓ Exported!' : t('settings.exportJson')}
                  </button>
                  <button
                    onClick={handleImport}
                    className="w-full py-3 rounded-xl font-pixel text-[8px] transition-all active:scale-95"
                    style={{
                      backgroundColor: 'var(--shell)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {t('settings.importJson')}
                  </button>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t('settings.importNote')}
                  </p>
                </div>
              </SettingsSection>

              {/* API Key */}
              <SettingsSection title={t('settings.apiKeys')}>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  {t('settings.apiKeyNote')}
                </p>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t('settings.deepseekKey')}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-2"
                  style={{
                    backgroundColor: 'var(--shell)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                />
                <button
                  onClick={() => {
                    localStorage.setItem('victoria-api-key', apiKey);
                    alert('API key saved!');
                  }}
                  className="w-full py-2 rounded-xl font-pixel text-[8px] text-white"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {t('common.save')}
                </button>
              </SettingsSection>

              {/* Clear chat history */}
              <SettingsSection title="Chat History">
                {!showClearChatsConfirm ? (
                  <button
                    onClick={() => setShowClearChatsConfirm(true)}
                    className="w-full py-3 rounded-xl font-pixel text-[8px] transition-all"
                    style={{
                      backgroundColor: 'var(--shell)',
                      color: '#f59e0b',
                      border: '1px solid #f59e0b',
                    }}
                  >
                    Clear All Chats
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs" style={{ color: '#f59e0b' }}>
                      Delete all chat threads? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleClearChats}
                        className="flex-1 py-2 rounded-xl font-pixel text-[8px] text-white"
                        style={{ backgroundColor: '#f59e0b' }}
                      >
                        {t('common.delete')}
                      </button>
                      <button
                        onClick={() => setShowClearChatsConfirm(false)}
                        className="px-4 py-2 rounded-xl font-pixel text-[8px]"
                        style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </SettingsSection>

              {/* Delete all data */}
              <SettingsSection title={t('settings.deleteAllData')}>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-3 rounded-xl font-pixel text-[8px] transition-all"
                    style={{
                      backgroundColor: 'var(--shell)',
                      color: '#ef4444',
                      border: '1px solid #ef4444',
                    }}
                  >
                    {t('settings.deleteAllData')}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs" style={{ color: '#ef4444' }}>
                      {t('settings.deleteAllConfirm')}
                    </p>
                    <input
                      type="text"
                      value={deleteText}
                      onChange={(e) => setDeleteText(e.target.value)}
                      placeholder={t('settings.deleteAllPlaceholder')}
                      className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--shell)',
                        color: 'var(--text)',
                        border: '1px solid #ef4444',
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteAll}
                        disabled={deleteText !== 'DELETE'}
                        className="flex-1 py-2 rounded-xl font-pixel text-[8px] text-white disabled:opacity-40"
                        style={{ backgroundColor: '#ef4444' }}
                      >
                        {t('common.delete')}
                      </button>
                      <button
                        onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); }}
                        className="px-4 py-2 rounded-xl font-pixel text-[8px]"
                        style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </SettingsSection>
            </div>
          )}

          {/* ─── Account / Tier ─────────────────────────────────────── */}
          {activeSection === 'account' && (
            <div className="space-y-4">
              <SettingsSection title={t('settings.tier')}>
                <div
                  className="p-3 rounded-xl text-center"
                  style={{ backgroundColor: 'var(--shell)', border: '1px solid var(--border)' }}
                >
                  <span className="font-pixel text-sm" style={{ color: 'var(--accent)' }}>
                    {tier.toUpperCase()}
                  </span>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {tier === 'free' && t('tiers.proFeatures')}
                    {(tier === 'pro' || tier === 'max') && 'You have full access to all features!'}
                  </p>
                </div>
              </SettingsSection>

              {tier === 'free' && (
                <SettingsSection title={t('tiers.enterPassphrase')}>
                  <input
                    type="text"
                    value={passphraseInput}
                    onChange={(e) => { setPassphraseInput(e.target.value); setPassphraseError(false); }}
                    placeholder={t('tiers.passphrasePlaceholder')}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-2"
                    style={{
                      backgroundColor: 'var(--shell)',
                      color: 'var(--text)',
                      border: `1px solid ${passphraseError ? '#ef4444' : 'var(--border)'}`,
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleUnlockTier()}
                  />
                  {passphraseError && (
                    <p className="text-xs mb-2" style={{ color: '#ef4444' }}>
                      {t('tiers.passphraseError')}
                    </p>
                  )}
                  <button
                    onClick={handleUnlockTier}
                    className="w-full py-3 rounded-xl font-pixel text-[8px] text-white"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {t('tiers.upgrade')}
                  </button>
                </SettingsSection>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-pixel text-[8px]" style={{ color: 'var(--text-muted)' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--text)' }}>
        {label}
      </span>
      <button
        onClick={() => onChange(!value)}
        className="w-12 h-6 rounded-full transition-all relative"
        style={{ backgroundColor: value ? 'var(--accent)' : 'var(--border)' }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
          style={{ left: value ? '26px' : '2px' }}
        />
      </button>
    </div>
  );
}

function RuleRow({
  rule,
  onToggle,
  onPin,
  onDelete,
}: {
  rule: ScoringRule;
  onToggle: (id: string) => void;
  onPin: () => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        'px-3 py-3 rounded-xl transition-all space-y-2',
        !rule.enabled ? 'opacity-40' : ''
      )}
      style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start gap-3">
        <span className="text-sm flex-shrink-0">{rule.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs" style={{ color: 'var(--text)' }}>
            {rule.label}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p
              className="font-pixel text-[6px]"
              style={{ color: rule.type === 'damage' ? '#ef4444' : '#22c55e' }}
            >
              {rule.type === 'damage' ? '-' : '+'}{rule.points} pts
            </p>
            <span
              className="font-pixel text-[5px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
            >
              {rule.category}
            </span>
            {rule.pinnedToHome && (
              <span
                className="font-pixel text-[5px] px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.12)', color: '#15803d' }}
              >
                pinned
              </span>
            )}
          </div>
          {rule.triggerPhrases?.length ? (
            <p className="text-[10px] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Chat cues: {rule.triggerPhrases.join(', ')}
            </p>
          ) : null}
        </div>
        <button
          onClick={() => onToggle(rule.id)}
          className="w-10 h-5 rounded-full transition-all relative flex-shrink-0"
          style={{ backgroundColor: rule.enabled ? (rule.type === 'damage' ? '#ef4444' : '#22c55e') : 'var(--border)' }}
          title={rule.enabled ? 'Disable rule' : 'Enable rule'}
        >
          <span
            className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
            style={{ left: rule.enabled ? '22px' : '2px' }}
          />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onPin}
          className="px-2 py-1 rounded-lg font-pixel text-[6px] transition-all active:scale-95"
          style={{
            backgroundColor: rule.pinnedToHome ? 'var(--accent)' : 'var(--shell)',
            color: rule.pinnedToHome ? 'white' : 'var(--text-muted)',
            border: `1px solid ${rule.pinnedToHome ? 'var(--accent)' : 'var(--border)'}`,
          }}
        >
          {rule.pinnedToHome ? 'UNPIN HOME' : 'PIN HOME'}
        </button>
        {onDelete ? (
          <button
            onClick={() => onDelete(rule.id)}
            className="px-2 py-1 rounded-lg font-pixel text-[6px] transition-all active:scale-95"
            style={{
              backgroundColor: 'transparent',
              color: '#ef4444',
              border: '1px solid #ef4444',
            }}
          >
            DELETE
          </button>
        ) : null}
      </div>
    </div>
  );
}
