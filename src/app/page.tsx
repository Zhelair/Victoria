'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useVictoriaStore } from '@/store';
import { TamagotchiScreen } from '@/components/home/TamagotchiScreen';
import { AppShell } from '@/components/layout/AppShell';
import { getGreeting, pickRandom } from '@/lib/utils';
import { getMoodTier } from '@/types';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

const FEED_ACTIONS = [
  { key: 'healthy_meal', labelKey: 'feed.healthyMeal', emoji: '🥗', delta: 8 },
  { key: 'meditation', labelKey: 'feed.meditation', emoji: '🧘', delta: 7 },
  { key: 'slept_early', labelKey: 'feed.sleptEarly', emoji: '😴', delta: 7 },
  { key: 'no_beer', labelKey: 'feed.noBeer', emoji: '🚫🍺', delta: 10 },
];

const ACT_ACTIONS = [
  { key: 'did_workout', labelKey: 'act.pushups', emoji: '💪', delta: 10 },
  { key: 'outdoor_workout', labelKey: 'act.swim', emoji: '🏊', delta: 20 },
  { key: 'long_walk', labelKey: 'act.walk', emoji: '🚶', delta: 12 },
  { key: 'job_application', labelKey: 'act.jobApp', emoji: '📨', delta: 20 },
  { key: 'met_friend', labelKey: 'act.metFriend', emoji: '👥', delta: 15 },
  { key: 'went_out', labelKey: 'act.wentOut', emoji: '🏛️', delta: 18 },
  { key: 'cooked', labelKey: 'act.cooked', emoji: '🍳', delta: 15 },
  { key: 'cleaned_house', labelKey: 'act.cleaned', emoji: '🧹', delta: 12 },
  { key: 'did_laundry', labelKey: 'act.laundry', emoji: '👕', delta: 8 },
];

export default function HomePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const settings = useVictoriaStore((s) => s.settings);
  const _hasHydrated = useVictoriaStore((s) => s._hasHydrated);
  const moodScore = useVictoriaStore((s) => s.moodScore);
  const adjustMoodScore = useVictoriaStore((s) => s.adjustMoodScore);
  const todos = useVictoriaStore((s) => s.logCategories); // placeholder
  const streakDays = useVictoriaStore((s) => s.streakDays);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!settings.onboardingDone) {
      router.replace('/onboarding');
    }
  }, [_hasHydrated, settings.onboardingDone, router]);

  const hour = new Date().getHours();
  const greeting = getGreeting(hour);
  const moodTier = getMoodTier(moodScore);
  const greetingKey = `victoria.${moodTier}_greeting` as const;
  const greetings = t(greetingKey, { returnObjects: true }) as string[];
  const victoriaLine = Array.isArray(greetings)
    ? pickRandom(greetings).replace('{{name}}', settings.userName || 'friend')
    : '';

  const handleAction = async (key: string, delta: number, label: string) => {
    adjustMoodScore(delta);
    // Log the entry
    try {
      const today = new Date().toISOString().split('T')[0];
      await db.logEntries.add({
        id: uuidv4(),
        date: today,
        timestamp: Date.now(),
        category: key,
        value: label,
      });
    } catch {
      // non-critical
    }
  };

  if (!_hasHydrated || !settings.onboardingDone) return null;

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-4">
        {/* Greeting */}
        {victoriaLine && (
          <div
            className="card p-3 text-center"
            style={{ borderColor: 'var(--accent)', borderWidth: 1 }}
          >
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>
              {victoriaLine}
            </p>
          </div>
        )}

        {/* Tamagotchi Screen */}
        <TamagotchiScreen />

        {/* Streak badge */}
        {streakDays > 0 && (
          <div className="flex justify-center">
            <span
              className="font-pixel text-[8px] px-3 py-1 rounded-full"
              style={{ backgroundColor: 'var(--shell)', color: 'var(--accent)' }}
            >
              🔥 {t('home.streak', { days: streakDays })}
            </span>
          </div>
        )}

        {/* FEED */}
        <ActionSection
          title={t('home.feed')}
          actions={FEED_ACTIONS}
          color="var(--accent)"
          onAction={handleAction}
          t={t}
        />

        {/* ACT */}
        <ActionSection
          title={t('home.act')}
          actions={ACT_ACTIONS}
          color="#22c55e"
          onAction={handleAction}
          t={t}
        />

        {/* Today's todos quick view */}
        <TodayTasksWidget />
      </div>
    </AppShell>
  );
}

function ActionSection({
  title,
  actions,
  color,
  onAction,
  t,
}: {
  title: string;
  actions: { key: string; labelKey: string; emoji: string; delta: number }[];
  color: string;
  onAction: (key: string, delta: number, label: string) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="card p-3">
      <h3
        className="font-pixel text-[8px] mb-3"
        style={{ color }}
      >
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.key}
            onClick={() => onAction(a.key, a.delta, t(a.labelKey))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
            style={{
              backgroundColor: 'var(--shell)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            <span>{a.emoji}</span>
            <span className="font-pixel text-[7px]">{t(a.labelKey)}</span>
            <span
              className="font-pixel text-[6px] ml-0.5"
              style={{ color: a.delta > 0 ? '#22c55e' : '#ef4444' }}
            >
              +{a.delta}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TodayTasksWidget() {
  const { t } = useTranslation();
  const todos = useVictoriaStore((s) => s.logCategories);

  return (
    <div className="card p-3 mb-4">
      <h3 className="font-pixel text-[8px] mb-2" style={{ color: 'var(--text-muted)' }}>
        {t('home.todayTasks')}
      </h3>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {t('home.noTasks')}
      </p>
    </div>
  );
}
