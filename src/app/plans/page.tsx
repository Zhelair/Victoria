'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { AppShell } from '@/components/layout/AppShell';
import { db } from '@/lib/db';
import { createFitnessPlan, DEFAULT_FITNESS_PROFILE, FITNESS_SOURCE_LINKS } from '@/lib/fitness-plan';
import {
  bootstrapReminderPush,
  createReminderFromDraft,
  patchReminder,
  removeReminder,
  sendReminderAction,
  syncRemindersFromServer,
} from '@/lib/reminder-client';
import {
  buildReminderSummary,
  getBrowserTimeZone,
  REMINDER_CATEGORY_OPTIONS,
  REMINDER_REPEAT_OPTIONS,
  REMINDER_SOUND_OPTIONS,
} from '@/lib/reminders';
import { cn, getTodayDateKey } from '@/lib/utils';
import { useVictoriaStore } from '@/store';
import type {
  FitnessDay,
  FitnessPlanProfile,
  Goal,
  Reminder,
  ReminderCategory,
  ReminderRepeat,
  ReminderSoundMode,
  TodoItem,
} from '@/types';

export default function PlansPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'fitness' | 'todos' | 'goals' | 'reminders'>('fitness');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextTab = new URLSearchParams(window.location.search).get('tab');
    if (nextTab === 'fitness' || nextTab === 'todos' || nextTab === 'goals' || nextTab === 'reminders') {
      setActiveTab(nextTab);
    }
  }, []);

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        <div
          className="flex border-b border-theme px-3 pt-3"
          style={{ backgroundColor: 'var(--card-bg)' }}
        >
          {(['fitness', 'todos', 'goals', 'reminders'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 font-pixel text-[7px] rounded-t-lg transition-colors',
                activeTab === tab ? 'border-b-2' : 'opacity-50'
              )}
              style={{
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                borderColor: activeTab === tab ? 'var(--accent)' : 'transparent',
              }}
            >
              {tab === 'fitness'
                ? t('plans.fitnessPlan')
                : tab === 'todos'
                  ? t('plans.todos')
                  : tab === 'goals'
                    ? t('plans.goals')
                    : 'Reminders'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'fitness' && <FitnessTab />}
          {activeTab === 'todos' && <TodosTab />}
          {activeTab === 'goals' && <GoalsTab />}
          {activeTab === 'reminders' && <RemindersTab />}
        </div>
      </div>
    </AppShell>
  );
}

function FitnessTab() {
  const { t } = useTranslation();
  const plans = useLiveQuery(() => db.fitnessPlans.toArray(), []);
  const activePlan = plans?.find((plan) => plan.active);
  const [showBuilder, setShowBuilder] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [profile, setProfile] = useState<FitnessPlanProfile>(DEFAULT_FITNESS_PROFILE);

  const nextDayIndex = useMemo(() => {
    if (!activePlan?.days?.length) return -1;
    const firstPending = activePlan.days.findIndex((day) => !day.done);
    return firstPending === -1 ? activePlan.days.length - 1 : firstPending;
  }, [activePlan]);

  const nextDay = nextDayIndex >= 0 && activePlan ? activePlan.days[nextDayIndex] : null;
  const completedCount = activePlan?.days.filter((day) => day.done).length ?? 0;
  const strengthCount = activePlan?.days.filter((day) => ['home', 'gym', 'outdoor'].includes(day.workoutType) && day.title?.startsWith('Strength')).length ?? 0;
  const cardioCount = activePlan?.days.filter((day) => day.title?.toLowerCase().includes('cardio')).length ?? 0;

  const createPlan = async () => {
    if (activePlan) {
      await db.fitnessPlans.update(activePlan.id, { active: false as unknown as boolean });
    }

    const plan = createFitnessPlan(profile, customTitle);
    await db.fitnessPlans.add(plan);

    setCustomTitle('');
    setProfile(DEFAULT_FITNESS_PROFILE);
    setShowBuilder(false);
  };

  const toggleDay = async (planId: string, dayIndex: number) => {
    const plan = await db.fitnessPlans.get(planId);
    if (!plan) return;

    const days = plan.days.map((day, index) =>
      index === dayIndex
        ? {
            ...day,
            done: !day.done,
            completedDate: !day.done ? getTodayDateKey() : undefined,
          }
        : day
    );

    await db.fitnessPlans.update(planId, { days });
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-pixel text-[9px]" style={{ color: 'var(--accent)' }}>
              Research-backed 14-day plan
            </h3>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Conservative presets built around steady movement, at least two strength sessions each week, and realistic recovery days.
            </p>
          </div>
          <button
            onClick={() => setShowBuilder((prev) => !prev)}
            className="px-3 py-2 rounded-xl font-pixel text-[7px] transition-all active:scale-95"
            style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
          >
            {showBuilder ? t('common.cancel') : `+ ${t('plans.newPlan')}`}
          </button>
        </div>

        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Not medical advice. Keep effort manageable, stop with sharp pain, and scale down or skip sessions if you are injured, sick, or medically limited.
        </p>

        <div className="flex flex-wrap gap-2">
          {FITNESS_SOURCE_LINKS.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="px-2 py-1 rounded-full font-pixel text-[6px]"
              style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
            >
              {source.label}
            </a>
          ))}
        </div>
      </div>

      {(showBuilder || !activePlan) && (
        <FitnessPlanBuilder
          title={customTitle}
          profile={profile}
          onTitleChange={setCustomTitle}
          onProfileChange={setProfile}
          onCreate={createPlan}
        />
      )}

      {activePlan && (
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-pixel text-[7px]" style={{ color: 'var(--text-muted)' }}>
                  Active plan
                </p>
                <h3 className="font-pixel text-[9px] mt-1" style={{ color: 'var(--accent)' }}>
                  {activePlan.title}
                </h3>
              </div>
              <span
                className="px-2 py-1 rounded-full font-pixel text-[6px]"
                style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
              >
                {completedCount}/{activePlan.days.length} done
              </span>
            </div>

            {activePlan.profile && (
              <div className="flex flex-wrap gap-2">
                {[
                  activePlan.profile.environment,
                  activePlan.profile.goal,
                  activePlan.profile.intensity,
                  `${activePlan.profile.workoutsPerWeek} / week`,
                  activePlan.profile.cardioPreference,
                ].map((item) => (
                  <span
                    key={item}
                    className="px-2 py-1 rounded-full font-pixel text-[6px]"
                    style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <MiniSummary label="Strength" value={strengthCount} />
              <MiniSummary label="Cardio" value={cardioCount} />
              <MiniSummary label="Start" value={activePlan.startDate.slice(5)} />
            </div>

            {activePlan.sourceSummary && (
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {activePlan.sourceSummary}
              </p>
            )}
          </div>

          {nextDay && (
            <div
              className="card p-4 space-y-3"
              style={{
                background: 'linear-gradient(180deg, rgba(200,181,96,0.16) 0%, rgba(255,255,255,0) 100%)',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-pixel text-[7px]" style={{ color: 'var(--text-muted)' }}>
                    {nextDay.done ? 'Latest completed day' : 'Today / next up'}
                  </p>
                  <h3 className="font-pixel text-[9px] mt-1" style={{ color: 'var(--accent)' }}>
                    {t('plans.day', { n: nextDay.day })} {nextDay.title ? `- ${nextDay.title}` : ''}
                  </h3>
                </div>
                <button
                  onClick={() => toggleDay(activePlan.id, nextDayIndex)}
                  className="px-3 py-2 rounded-xl font-pixel text-[7px] text-white transition-all active:scale-95"
                  style={{ backgroundColor: nextDay.done ? '#6b7280' : 'var(--accent)' }}
                >
                  {nextDay.done ? 'Mark undone' : 'Mark done'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge>{getWorkoutTypeLabel(nextDay, t)}</Badge>
                {nextDay.durationMin ? <Badge>{nextDay.durationMin} min</Badge> : null}
                {nextDay.intensity ? <Badge>{nextDay.intensity}</Badge> : null}
              </div>

              <ul className="space-y-2">
                {nextDay.exercises.map((exercise, index) => (
                  <li key={`${nextDay.day}-${index}`} className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>
                    {index + 1}. {exercise}
                  </li>
                ))}
              </ul>

              {nextDay.coachNote && (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {nextDay.coachNote}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activePlan.days.map((day, index) => (
              <DayCard
                key={index}
                day={day}
                dayNumber={index + 1}
                onToggle={() => toggleDay(activePlan.id, index)}
                planId={activePlan.id}
                dayIndex={index}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FitnessPlanBuilder({
  title,
  profile,
  onTitleChange,
  onProfileChange,
  onCreate,
}: {
  title: string;
  profile: FitnessPlanProfile;
  onTitleChange: (value: string) => void;
  onProfileChange: (value: FitnessPlanProfile) => void;
  onCreate: () => void;
}) {
  return (
    <div className="card p-4 space-y-4">
      <div>
        <h3 className="font-pixel text-[8px]" style={{ color: 'var(--text)' }}>
          Build your next 14 days
        </h3>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Pick the environment and effort you can actually keep. Victoria will generate a realistic 2-week block, not a fantasy grind.
        </p>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Optional custom title"
        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
        style={{
          backgroundColor: 'var(--shell)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
        }}
      />

      <PreferenceGroup
        label="Where do you train?"
        options={[
          { value: 'home', label: 'Home' },
          { value: 'gym', label: 'Gym' },
          { value: 'outdoor', label: 'Outdoor' },
        ]}
        selected={profile.environment}
        onChange={(value) => onProfileChange({ ...profile, environment: value as FitnessPlanProfile['environment'] })}
      />

      <PreferenceGroup
        label="Main goal"
        options={[
          { value: 'consistency', label: 'Consistency' },
          { value: 'strength', label: 'Strength' },
          { value: 'fat-loss', label: 'Conditioning' },
          { value: 'energy', label: 'Energy' },
        ]}
        selected={profile.goal}
        onChange={(value) => onProfileChange({ ...profile, goal: value as FitnessPlanProfile['goal'] })}
      />

      <PreferenceGroup
        label="Intensity"
        options={[
          { value: 'easy', label: 'Easy start' },
          { value: 'steady', label: 'Steady' },
          { value: 'push', label: 'Push' },
        ]}
        selected={profile.intensity}
        onChange={(value) => onProfileChange({ ...profile, intensity: value as FitnessPlanProfile['intensity'] })}
      />

      <PreferenceGroup
        label="Preferred cardio"
        options={[
          { value: 'walk', label: 'Walk' },
          { value: 'run', label: 'Run' },
          { value: 'cycle', label: 'Cycle' },
          { value: 'swim', label: 'Swim' },
          { value: 'mixed', label: 'Mixed' },
        ]}
        selected={profile.cardioPreference}
        onChange={(value) => onProfileChange({ ...profile, cardioPreference: value as FitnessPlanProfile['cardioPreference'] })}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-pixel text-[7px]" style={{ color: 'var(--text-muted)' }}>
            Main sessions per week
          </label>
          <select
            value={profile.workoutsPerWeek}
            onChange={(e) => onProfileChange({ ...profile, workoutsPerWeek: Number(e.target.value) as 3 | 4 | 5 })}
            className="w-full mt-2 px-3 py-2 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: 'var(--shell)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={() => onProfileChange({ ...profile, swimAllowed: !profile.swimAllowed })}
            className="w-full px-3 py-2 rounded-xl font-pixel text-[7px] transition-all active:scale-95"
            style={{
              backgroundColor: profile.swimAllowed ? 'var(--accent)' : 'var(--shell)',
              color: profile.swimAllowed ? 'white' : 'var(--text-muted)',
              border: `1px solid ${profile.swimAllowed ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            {profile.swimAllowed ? 'Swimming OK' : 'Swimming not for me'}
          </button>
        </div>
      </div>

      <button
        onClick={onCreate}
        className="w-full py-3 rounded-xl font-pixel text-[8px] text-white transition-all active:scale-95"
        style={{ backgroundColor: 'var(--accent)' }}
      >
        Generate 14-day plan
      </button>
    </div>
  );
}

function PreferenceGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="font-pixel text-[7px]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className="px-3 py-2 rounded-xl font-pixel text-[7px] transition-all active:scale-95"
            style={{
              backgroundColor: selected === option.value ? 'var(--accent)' : 'var(--shell)',
              color: selected === option.value ? 'white' : 'var(--text-muted)',
              border: `1px solid ${selected === option.value ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MiniSummary({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-2xl px-3 py-2"
      style={{ backgroundColor: 'var(--shell)', border: '1px solid var(--border)' }}
    >
      <p className="font-pixel text-[6px]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="font-pixel text-[8px] mt-1" style={{ color: 'var(--accent)' }}>
        {value}
      </p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="px-2 py-1 rounded-full font-pixel text-[6px]"
      style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
    >
      {children}
    </span>
  );
}

function getWorkoutTypeLabel(day: FitnessDay, t: ReturnType<typeof useTranslation>['t']) {
  if (day.workoutType === 'gym') return 'Gym workout';
  return t(`plans.${day.workoutType}`);
}

function DayCard({
  day,
  dayNumber,
  onToggle,
  planId,
  dayIndex,
}: {
  day: FitnessDay;
  dayNumber: number;
  onToggle: () => void;
  planId: string;
  dayIndex: number;
}) {
  const { t } = useTranslation();
  const [editingExercise, setEditingExercise] = useState('');
  const [showInput, setShowInput] = useState(false);

  const workoutColors = {
    rest: '#6b7280',
    home: '#3b82f6',
    outdoor: '#22c55e',
    gym: '#8b5cf6',
  };

  const addExercise = async () => {
    if (!editingExercise.trim()) return;
    const plan = await db.fitnessPlans.get(planId);
    if (!plan) return;

    const days = plan.days.map((entry, index) =>
      index === dayIndex
        ? { ...entry, exercises: [...(entry.exercises || []), editingExercise.trim()] }
        : entry
    );

    await db.fitnessPlans.update(planId, { days });
    setEditingExercise('');
    setShowInput(false);
  };

  return (
    <div
      className={cn('card p-3 transition-all space-y-3', day.done ? 'opacity-60' : '')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-pixel text-[7px]" style={{ color: 'var(--text-muted)' }}>
            {t('plans.day', { n: dayNumber })}
          </span>
          <p className="font-pixel text-[8px] mt-1" style={{ color: 'var(--text)' }}>
            {day.title || getWorkoutTypeLabel(day, t)}
          </p>
        </div>
        <button
          onClick={onToggle}
          className="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all"
          style={{
            borderColor: day.done ? '#22c55e' : 'var(--border)',
            backgroundColor: day.done ? '#22c55e' : 'transparent',
          }}
        >
          {day.done ? <span className="text-white text-[8px]">✓</span> : null}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: workoutColors[day.workoutType] }}
          />
          <span className="font-pixel text-[6px]" style={{ color: 'var(--text-muted)' }}>
            {getWorkoutTypeLabel(day, t)}
          </span>
        </span>
        {day.durationMin ? (
          <span className="font-pixel text-[6px]" style={{ color: 'var(--text-muted)' }}>
            {day.durationMin} min
          </span>
        ) : null}
      </div>

      {day.exercises.length > 0 && (
        <ul className="space-y-1.5">
          {day.exercises.slice(0, 5).map((exercise, index) => (
            <li key={index} className="text-[11px] leading-relaxed" style={{ color: 'var(--text)' }}>
              • {exercise}
            </li>
          ))}
        </ul>
      )}

      {day.coachNote && (
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {day.coachNote}
        </p>
      )}

      {showInput ? (
        <div className="flex gap-1">
          <input
            type="text"
            value={editingExercise}
            onChange={(e) => setEditingExercise(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addExercise()}
            placeholder="Custom exercise..."
            className="flex-1 px-2 py-1 rounded text-[10px] outline-none"
            style={{
              backgroundColor: 'var(--shell)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
            autoFocus
          />
          <button onClick={addExercise} className="text-[10px] px-1" style={{ color: 'var(--accent)' }}>
            ✓
          </button>
          <button onClick={() => setShowInput(false)} className="text-[10px] px-1" style={{ color: 'var(--text-muted)' }}>
            x
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="font-pixel text-[6px]"
          style={{ color: 'var(--text-muted)' }}
        >
          + add
        </button>
      )}
    </div>
  );
}

function toDateTimeLocalValue(iso: string) {
  const date = new Date(iso);
  const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function RemindersTab() {
  const { i18n } = useTranslation();
  const settings = useVictoriaStore((s) => s.settings);
  const reminders = useLiveQuery(() => db.reminders.orderBy('nextTriggerAt').toArray(), []);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [scheduledAt, setScheduledAt] = useState(() => {
    const oneHour = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    return toDateTimeLocalValue(oneHour);
  });
  const [repeat, setRepeat] = useState<ReminderRepeat>('once');
  const [category, setCategory] = useState<ReminderCategory>('personal');
  const [sound, setSound] = useState<ReminderSoundMode>('default');
  const [voicePreferred, setVoicePreferred] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [highlightedReminderId, setHighlightedReminderId] = useState<string | null>(null);
  const [shouldSpeak, setShouldSpeak] = useState(false);

  const activeReminders = (reminders ?? []).filter((reminder) => reminder.active);
  const pausedReminders = (reminders ?? []).filter((reminder) => !reminder.active);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setHighlightedReminderId(params.get('reminder'));
    setShouldSpeak(params.get('speak') === '1');
  }, []);

  const refreshReminders = async () => {
    setIsSyncing(true);
    const syncResult = await syncRemindersFromServer().catch((syncError: Error) => ({
      ok: false as const,
      reason: syncError.message,
    }));
    if (!syncResult.ok) {
      setError(syncResult.reason === 'Reminder backend is not configured yet.'
        ? 'Configure Supabase + VAPID keys to turn on real push reminders.'
        : String(syncResult.reason));
    } else {
      setError(null);
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (settings.notificationsEnabled) {
        const bootstrap = await bootstrapReminderPush().catch((bootstrapError: Error) => ({
          ok: false as const,
          reason: bootstrapError.message,
        }));
        if (!cancelled && !bootstrap.ok && bootstrap.reason !== 'permission-denied' && bootstrap.reason !== 'missing-vapid-key') {
          setError(String(bootstrap.reason));
        }
      }

      if (!cancelled) {
        await refreshReminders();
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [settings.notificationsEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!settings.voiceEnabled || !shouldSpeak) return;
    if (!('speechSynthesis' in window)) return;
    if (!highlightedReminderId || !reminders?.length) return;

    const reminder = reminders.find((entry) => entry.id === highlightedReminderId);
    if (!reminder || !reminder.voicePreferred) return;

    const utterance = new SpeechSynthesisUtterance(
      `${reminder.title}.${reminder.note ? ` ${reminder.note}` : ''}`
    );
    utterance.rate = settings.voiceRate;
    utterance.pitch = settings.voicePitch;
    utterance.lang = settings.language;
    if (settings.selectedVoiceName) {
      const voice = window.speechSynthesis.getVoices().find((entry) => entry.name === settings.selectedVoiceName);
      if (voice) utterance.voice = voice;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    const url = new URL(window.location.href);
    url.searchParams.delete('speak');
    window.history.replaceState({}, '', url.toString());
    setShouldSpeak(false);
  }, [
    highlightedReminderId,
    reminders,
    settings.language,
    settings.selectedVoiceName,
    settings.voiceEnabled,
    settings.voicePitch,
    settings.voiceRate,
    shouldSpeak,
  ]);

  const handleCreateReminder = async () => {
    setStatus(null);
    setError(null);
    setIsSaving(true);
    try {
      if (!title.trim()) {
        throw new Error('Add a reminder title first.');
      }

      const scheduledDate = new Date(scheduledAt);
      if (Number.isNaN(scheduledDate.getTime())) {
        throw new Error('Pick a valid reminder time.');
      }

      if (repeat === 'once' && scheduledDate.getTime() <= Date.now()) {
        throw new Error('Pick a future time for one-time reminders.');
      }

      if (settings.notificationsEnabled) {
        await bootstrapReminderPush().catch(() => {
          // Allow creating the reminder even if push bootstrap fails.
        });
      }

      const reminder = await createReminderFromDraft({
        title: title.trim(),
        note: note.trim() || undefined,
        scheduledFor: scheduledDate.toISOString(),
        repeat,
        category,
        sound,
        voicePreferred,
        timeZone: getBrowserTimeZone(),
      });

      setTitle('');
      setNote('');
      setRepeat('once');
      setCategory('personal');
      setSound('default');
      setVoicePreferred(false);
      const oneHour = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      setScheduledAt(toDateTimeLocalValue(oneHour));
      setStatus(`Saved reminder: ${buildReminderSummary(reminder, i18n.language)}`);
    } catch (createError: any) {
      setError(createError.message || 'Could not create reminder.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (reminder: Reminder) => {
    setError(null);
    try {
      await patchReminder(reminder.id, { active: !reminder.active });
    } catch (toggleError: any) {
      setError(toggleError.message || 'Could not update reminder.');
    }
  };

  const handleReminderAction = async (reminderId: string, action: 'done' | 'snooze') => {
    setError(null);
    try {
      await sendReminderAction(reminderId, action);
      setStatus(action === 'done' ? 'Reminder updated.' : 'Reminder snoozed for 15 minutes.');
    } catch (actionError: any) {
      setError(actionError.message || 'Could not update reminder.');
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    setError(null);
    try {
      await removeReminder(reminderId);
      setStatus('Reminder deleted.');
    } catch (deleteError: any) {
      setError(deleteError.message || 'Could not delete reminder.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-pixel text-[8px]" style={{ color: 'var(--accent)' }}>
              Real reminder center
            </h3>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Reminder text is encrypted before it leaves this device. Victoria stores only ciphertext remotely so reminders can still fire when the app is closed.
            </p>
          </div>
          <button
            onClick={() => void refreshReminders()}
            className="px-3 py-2 rounded-xl font-pixel text-[7px]"
            style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
          >
            {isSyncing ? 'Syncing...' : 'Refresh'}
          </button>
        </div>

        {!settings.notificationsEnabled && (
          <p className="text-[11px] leading-relaxed" style={{ color: '#f59e0b' }}>
            Turn on notifications in Settings so reminders can wake the installed app in the background.
          </p>
        )}

        {error && (
          <p className="text-[11px] leading-relaxed" style={{ color: '#ef4444' }}>
            {error}
          </p>
        )}

        {status && (
          <p className="text-[11px] leading-relaxed" style={{ color: '#15803d' }}>
            {status}
          </p>
        )}
      </div>

      <form
        className="card p-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleCreateReminder();
        }}
      >
        <div>
          <h3 className="font-pixel text-[8px]" style={{ color: 'var(--text-muted)' }}>
            Create reminder
          </h3>
        </div>

        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Buy toilet paper"
          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
          style={{
            backgroundColor: 'var(--shell)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        />

        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note"
          className="w-full px-3 py-2 rounded-xl text-sm outline-none min-h-[90px]"
          style={{
            backgroundColor: 'var(--shell)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-2">
            <span className="font-pixel text-[7px]" style={{ color: 'var(--text-muted)' }}>
              When
            </span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: 'var(--shell)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            />
          </label>

          <label className="space-y-2">
            <span className="font-pixel text-[7px]" style={{ color: 'var(--text-muted)' }}>
              Repeat
            </span>
            <select
              value={repeat}
              onChange={(event) => setRepeat(event.target.value as ReminderRepeat)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: 'var(--shell)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              {REMINDER_REPEAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="font-pixel text-[7px]" style={{ color: 'var(--text-muted)' }}>
              Category
            </span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as ReminderCategory)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: 'var(--shell)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              {REMINDER_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="font-pixel text-[7px]" style={{ color: 'var(--text-muted)' }}>
              Notification sound
            </span>
            <select
              value={sound}
              onChange={(event) => setSound(event.target.value as ReminderSoundMode)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: 'var(--shell)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              {REMINDER_SOUND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={() => setVoicePreferred((prev) => !prev)}
          className="w-full px-3 py-2 rounded-xl font-pixel text-[7px] transition-all active:scale-95"
          style={{
            backgroundColor: voicePreferred ? 'var(--accent)' : 'var(--shell)',
            color: voicePreferred ? 'white' : 'var(--text-muted)',
            border: `1px solid ${voicePreferred ? 'var(--accent)' : 'var(--border)'}`,
          }}
        >
          {voicePreferred ? 'Voice-preferred reminder' : 'Keep as text-only reminder'}
        </button>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3 rounded-xl font-pixel text-[8px] text-white transition-all active:scale-95"
          style={{
            backgroundColor: 'var(--accent)',
            opacity: isSaving ? 0.7 : 1,
            cursor: isSaving ? 'progress' : 'pointer',
          }}
        >
          {isSaving ? 'Saving...' : 'Save reminder'}
        </button>
      </form>

      <div className="space-y-4">
        <div>
          <p className="font-pixel text-[7px] mb-2" style={{ color: 'var(--text-muted)' }}>
            Active reminders ({activeReminders.length})
          </p>
          <div className="space-y-3">
            {activeReminders.length === 0 ? (
              <div className="card p-4">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  No active reminders yet.
                </p>
              </div>
            ) : (
              activeReminders.map((reminder) => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  highlighted={highlightedReminderId === reminder.id}
                  locale={i18n.language}
                  onToggleActive={() => void handleToggleActive(reminder)}
                  onDone={() => void handleReminderAction(reminder.id, 'done')}
                  onSnooze={() => void handleReminderAction(reminder.id, 'snooze')}
                  onDelete={() => void handleDeleteReminder(reminder.id)}
                />
              ))
            )}
          </div>
        </div>

        {pausedReminders.length > 0 && (
          <div>
            <p className="font-pixel text-[7px] mb-2" style={{ color: 'var(--text-muted)' }}>
              Paused reminders ({pausedReminders.length})
            </p>
            <div className="space-y-3">
              {pausedReminders.map((reminder) => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  highlighted={highlightedReminderId === reminder.id}
                  locale={i18n.language}
                  onToggleActive={() => void handleToggleActive(reminder)}
                  onDone={() => void handleReminderAction(reminder.id, 'done')}
                  onSnooze={() => void handleReminderAction(reminder.id, 'snooze')}
                  onDelete={() => void handleDeleteReminder(reminder.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReminderCard({
  reminder,
  highlighted,
  locale,
  onToggleActive,
  onDone,
  onSnooze,
  onDelete,
}: {
  reminder: Reminder;
  highlighted: boolean;
  locale: string;
  onToggleActive: () => void;
  onDone: () => void;
  onSnooze: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="card p-4 space-y-3"
      style={{
        border: highlighted ? '2px solid var(--accent)' : '1px solid var(--border)',
        boxShadow: highlighted ? '0 0 0 3px rgba(46, 120, 92, 0.12)' : undefined,
        opacity: reminder.active ? 1 : 0.72,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-pixel text-[8px]" style={{ color: 'var(--text)' }}>
            {reminder.title}
          </h3>
          <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {buildReminderSummary(reminder, locale)}
          </p>
        </div>
        <button
          onClick={onToggleActive}
          className="px-3 py-2 rounded-xl font-pixel text-[7px]"
          style={{
            backgroundColor: reminder.active ? 'var(--shell)' : 'var(--accent)',
            color: reminder.active ? 'var(--text-muted)' : 'white',
          }}
        >
          {reminder.active ? 'Pause' : 'Resume'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge>{reminder.category}</Badge>
        <Badge>{reminder.repeat}</Badge>
        <Badge>{reminder.sound === 'silent' ? 'silent' : 'sound on'}</Badge>
        {reminder.voicePreferred ? <Badge>voice</Badge> : null}
      </div>

      {reminder.note ? (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>
          {reminder.note}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onDone}
          className="px-3 py-2 rounded-xl font-pixel text-[7px] text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Done
        </button>
        <button
          onClick={onSnooze}
          className="px-3 py-2 rounded-xl font-pixel text-[7px]"
          style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
        >
          Snooze 15m
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-2 rounded-xl font-pixel text-[7px]"
          style={{ backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444' }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function TodosTab() {
  const { t } = useTranslation();
  const todos = useLiveQuery(() => db.todos.orderBy('createdAt').toArray(), []);
  const [newTodo, setNewTodo] = useState('');

  const addTodo = async () => {
    if (!newTodo.trim()) return;
    const todo: TodoItem = {
      id: uuidv4(),
      text: newTodo.trim(),
      done: false,
      createdAt: Date.now(),
    };
    await db.todos.add(todo);
    setNewTodo('');
  };

  const toggleTodo = async (id: string, done: boolean) => {
    await db.todos.update(id, { done: !done });
  };

  const deleteTodo = async (id: string) => {
    await db.todos.delete(id);
  };

  const pending = todos?.filter((todo) => !todo.done) ?? [];
  const done = todos?.filter((todo) => todo.done) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          placeholder={t('plans.addTodo')}
          className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
          style={{
            backgroundColor: 'var(--shell)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        />
        <button
          onClick={addTodo}
          className="px-4 py-2 rounded-xl font-pixel text-[8px] text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {t('common.add')}
        </button>
      </div>

      {pending.length === 0 && done.length === 0 && (
        <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>
          {t('plans.noTodos')}
        </p>
      )}

      <div className="space-y-2">
        {pending.map((todo) => (
          <TodoRow key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
        ))}
      </div>

      {done.length > 0 && (
        <div>
          <p className="font-pixel text-[7px] mb-2" style={{ color: 'var(--text-muted)' }}>
            {t('common.done')} ({done.length})
          </p>
          <div className="space-y-2 opacity-50">
            {done.map((todo) => (
              <TodoRow key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TodoRow({
  todo,
  onToggle,
  onDelete,
}: {
  todo: TodoItem;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-xl"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border)',
      }}
    >
      <button
        onClick={() => onToggle(todo.id, todo.done)}
        className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
        style={{
          borderColor: todo.done ? '#22c55e' : 'var(--border)',
          backgroundColor: todo.done ? '#22c55e' : 'transparent',
        }}
      >
        {todo.done ? <span className="text-white text-[8px]">✓</span> : null}
      </button>
      <span
        className={cn('flex-1 text-sm', todo.done ? 'line-through opacity-50' : '')}
        style={{ color: 'var(--text)' }}
      >
        {todo.text}
      </span>
      {todo.dueDate ? (
        <span className="font-pixel text-[6px]" style={{ color: 'var(--text-muted)' }}>
          {todo.dueDate}
        </span>
      ) : null}
      <button
        onClick={() => onDelete(todo.id)}
        className="text-xs opacity-30 hover:opacity-100 transition-opacity"
        style={{ color: '#ef4444' }}
      >
        x
      </button>
    </div>
  );
}

function GoalsTab() {
  const { t } = useTranslation();
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const [newGoal, setNewGoal] = useState('');
  const [horizon, setHorizon] = useState<Goal['horizon']>('3months');

  const addGoal = async () => {
    if (!newGoal.trim()) return;
    const goal: Goal = {
      id: uuidv4(),
      text: newGoal.trim(),
      horizon,
      done: false,
      createdAt: Date.now(),
    };
    await db.goals.add(goal);
    setNewGoal('');
  };

  const horizons: Goal['horizon'][] = ['3months', '6months', 'year', 'life'];

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <h3 className="font-pixel text-[8px]" style={{ color: 'var(--text-muted)' }}>
          {t('plans.addGoal')}
        </h3>
        <div className="flex gap-2 flex-wrap">
          {horizons.map((entry) => (
            <button
              key={entry}
              onClick={() => setHorizon(entry)}
              className="px-2 py-1 rounded-lg font-pixel text-[6px] transition-all"
              style={{
                backgroundColor: horizon === entry ? 'var(--accent)' : 'var(--shell)',
                color: horizon === entry ? 'white' : 'var(--text-muted)',
              }}
            >
              {t(`plans.horizons.${entry}`)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGoal()}
            placeholder="Your goal..."
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: 'var(--shell)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          />
          <button
            onClick={addGoal}
            className="px-4 py-2 rounded-xl font-pixel text-[8px] text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {t('common.add')}
          </button>
        </div>
      </div>

      {goals?.length === 0 ? (
        <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>
          No goals yet. What do you want to achieve?
        </p>
      ) : null}

      {horizons.map((entry) => {
        const groupedGoals = goals?.filter((goal) => goal.horizon === entry) ?? [];
        if (groupedGoals.length === 0) return null;

        return (
          <div key={entry}>
            <p className="font-pixel text-[7px] mb-2" style={{ color: 'var(--text-muted)' }}>
              {t(`plans.horizons.${entry}`)}
            </p>
            <div className="space-y-2">
              {groupedGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-start gap-3 px-3 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)' }}
                >
                  <button
                    onClick={() => db.goals.update(goal.id, { done: !goal.done })}
                    className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      borderColor: goal.done ? '#22c55e' : 'var(--border)',
                      backgroundColor: goal.done ? '#22c55e' : 'transparent',
                    }}
                  >
                    {goal.done ? <span className="text-white text-[8px]">✓</span> : null}
                  </button>
                  <div className="flex-1">
                    <p
                      className={cn('text-sm', goal.done ? 'line-through opacity-50' : '')}
                      style={{ color: 'var(--text)' }}
                    >
                      {goal.text}
                    </p>
                    {goal.targetDate ? (
                      <p className="font-pixel text-[6px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        Target: {goal.targetDate}
                      </p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => db.goals.delete(goal.id)}
                    className="text-xs opacity-30 hover:opacity-100 transition-opacity"
                    style={{ color: '#ef4444' }}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
