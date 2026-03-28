'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { useVictoriaStore } from '@/store';
import { TamagotchiScreen } from '@/components/home/TamagotchiScreen';
import { AppShell } from '@/components/layout/AppShell';
import { getTodayDateKey, pickRandom } from '@/lib/utils';
import { getActivePlanDayNumber, getMorningSpark } from '@/lib/morning';
import { applyScoringRule, getPinnedHomeRules, getRuleScoreDelta } from '@/lib/scoring';
import { DEFAULT_SETTINGS, getMoodTier } from '@/types';
import { db, markDailyCheckin } from '@/lib/db';

export default function HomePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const hasHydrated = useVictoriaStore((s) => s._hasHydrated);
  const settings = useVictoriaStore((s) => s.settings);
  const moodScore = useVictoriaStore((s) => s.moodScore);
  const scoringRules = useVictoriaStore((s) => s.scoringRules);
  const streakDays = useVictoriaStore((s) => s.streakDays);
  const setActiveSphere = useVictoriaStore((s) => s.setActiveSphere);
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);

  const [tamaMode, setTamaMode] = useState(false);
  const [manualMorningOpen, setManualMorningOpen] = useState(false);
  const [autoRuleSummary, setAutoRuleSummary] = useState<Array<{ label: string; delta: number; date: string }>>([]);
  const pendingTodos = useLiveQuery(
    () => db.todos.orderBy('createdAt').filter((todo) => !todo.done).toArray(),
    []
  );
  const activeGoals = useLiveQuery(
    () => db.goals.filter((goal) => !goal.done).toArray(),
    []
  );
  const activePlan = useLiveQuery(
    () => db.fitnessPlans.filter((plan) => plan.active).first(),
    []
  );
  const quickActions = useMemo(
    () => getPinnedHomeRules(scoringRules),
    [scoringRules]
  );

  useEffect(() => {
    if (hasHydrated) {
      setHydrationTimedOut(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setHydrationTimedOut(true);
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [hasHydrated]);

  useEffect(() => {
    if (!settings.notificationsEnabled || !settings.wakeUpTime) return;

    const alreadyFiredKey = `alarm-fired-${getTodayDateKey()}`;
    const tick = setInterval(() => {
      const now = new Date();
      const [h, m] = settings.wakeUpTime.split(':').map(Number);
      if (now.getHours() === h && now.getMinutes() === m) {
        if (sessionStorage.getItem(alreadyFiredKey)) return;
        sessionStorage.setItem(alreadyFiredKey, '1');
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Good morning! ☀️', {
            body: `Time to check in, ${settings.userName || 'friend'}. Victoria is waiting.`,
            icon: '/icon-192.png',
          });
        }
      }
    }, 30_000);

    return () => clearInterval(tick);
  }, [settings.notificationsEnabled, settings.wakeUpTime, settings.userName]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!settings.onboardingDone) {
      router.replace('/onboarding');
    }
  }, [hasHydrated, settings.onboardingDone, router]);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      const raw = sessionStorage.getItem(`victoria-auto-rule-summary-${getTodayDateKey()}`);
      setAutoRuleSummary(raw ? JSON.parse(raw) : []);
    } catch {
      setAutoRuleSummary([]);
    }
  }, [hasHydrated]);

  const moodTier = getMoodTier(moodScore);
  const greetingKey = `victoria.${moodTier}_greeting` as const;
  const greetings = t(greetingKey, { returnObjects: true }) as string[];
  const victoriaLine = Array.isArray(greetings)
    ? pickRandom(greetings).replace('{{name}}', settings.userName || 'friend')
    : '';

  const handleRuleAction = async (ruleId: string) => {
    await applyScoringRule(ruleId, {
      source: 'rule',
    });
  };

  if (!hasHydrated) {
    return (
      <AppShell>
        <StatusCard
          title="Loading Victoria"
          message={
            hydrationTimedOut
              ? 'Your saved session is taking longer than usual to load.'
              : 'Restoring your local companion data...'
          }
        />
      </AppShell>
    );
  }

  if (!settings.onboardingDone) {
    return (
      <AppShell>
        <StatusCard
          title="Redirecting"
          message="Taking you to onboarding..."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-4">
        {settings.morningBriefingEnabled && (
          <div className="flex justify-end">
            <button
              onClick={() => setManualMorningOpen((prev) => !prev)}
              className="px-3 py-1.5 rounded-full font-pixel text-[7px] transition-all active:scale-95"
              style={{
                backgroundColor: 'var(--shell)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              {manualMorningOpen ? 'Hide briefing' : 'Show morning briefing'}
            </button>
          </div>
        )}

        <MorningBriefingCard
          settings={settings}
          moodTier={moodTier}
          pendingTodos={pendingTodos ?? []}
          activeGoals={activeGoals ?? []}
          activePlan={activePlan ?? null}
          streakDays={streakDays}
          forceOpen={manualMorningOpen}
          onForceClose={() => setManualMorningOpen(false)}
          onContinue={(briefing) => {
            try {
              if (briefing) {
                sessionStorage.setItem('victoria-morning-chat-briefing', briefing);
              } else {
                sessionStorage.removeItem('victoria-morning-chat-briefing');
              }
            } catch {
              // non-critical
            }
            setManualMorningOpen(false);
            setActiveSphere('daily');
            router.push('/chat?starter=morning');
          }}
        />

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

        {autoRuleSummary.length > 0 && (
          <div className="card p-3 space-y-2" style={{ borderColor: '#ef4444', borderWidth: 1 }}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-pixel text-[8px]" style={{ color: '#ef4444' }}>
                Overnight score update
              </p>
              <button
                onClick={() => {
                  try {
                    sessionStorage.removeItem(`victoria-auto-rule-summary-${getTodayDateKey()}`);
                  } catch {
                    // non-critical
                  }
                  setAutoRuleSummary([]);
                }}
                className="font-pixel text-[7px] px-2 py-1 rounded-lg"
                style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
              >
                x
              </button>
            </div>
            <div className="space-y-1">
              {autoRuleSummary.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex items-center justify-between gap-3">
                  <span className="text-xs" style={{ color: 'var(--text)' }}>
                    {item.label}
                  </span>
                  <span className="font-pixel text-[7px]" style={{ color: item.delta > 0 ? '#22c55e' : '#ef4444' }}>
                    {item.delta > 0 ? `+${item.delta}` : `${item.delta}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <TamagotchiScreen />
          <button
            onClick={() => setTamaMode(true)}
            className="absolute top-0 right-0 p-1.5 rounded-xl font-pixel text-[6px] transition-all active:scale-95"
            style={{
              backgroundColor: 'var(--shell)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
            title="Tamagotchi mode"
          >
            🎮
          </button>
        </div>

        {tamaMode && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            <button
              onClick={() => setTamaMode(false)}
              className="absolute top-4 right-4 p-2 rounded-xl font-pixel text-[9px]"
              style={{
                backgroundColor: 'var(--shell)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              ✕
            </button>
            <div className="w-full max-w-sm px-6">
              <TamagotchiScreen />
            </div>
          </div>
        )}

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

        <PinnedRuleSection
          rules={quickActions}
          onAction={handleRuleAction}
        />

        <TodayTasksWidget />
      </div>
    </AppShell>
  );
}

function PinnedRuleSection({
  rules,
  onAction,
}: {
  rules: ReturnType<typeof getPinnedHomeRules>;
  onAction: (ruleId: string) => void;
}) {
  if (rules.length === 0) {
    return (
      <div className="card p-3">
        <h3 className="font-pixel text-[8px] mb-2" style={{ color: 'var(--accent)' }}>
          Quick Actions
        </h3>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Pin up to 5 rules in Settings to show your favorite actions here.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-3">
      <h3 className="font-pixel text-[8px] mb-3" style={{ color: 'var(--accent)' }}>
        Quick Actions
      </h3>
      <div className="flex flex-wrap gap-2">
        {rules.map((rule) => {
          const delta = getRuleScoreDelta(rule);
          return (
          <button
            key={rule.id}
            onClick={() => onAction(rule.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
            style={{
              backgroundColor: 'var(--shell)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            <span>{rule.emoji}</span>
            <span className="font-pixel text-[7px]">{rule.label}</span>
            <span
              className="font-pixel text-[6px] ml-0.5"
              style={{ color: delta > 0 ? '#22c55e' : '#ef4444' }}
            >
              {delta > 0 ? `+${delta}` : `${delta}`}
            </span>
          </button>
          );
        })}
      </div>
    </div>
  );
}

function TodayTasksWidget() {
  const { t } = useTranslation();
  const todos = useLiveQuery(
    () => db.todos.orderBy('createdAt').filter((todo) => !todo.done).toArray(),
    []
  );
  const preview = (todos ?? []).slice(0, 3);
  const remaining = Math.max(0, (todos?.length ?? 0) - preview.length);

  return (
    <div className="card p-3 mb-4">
      <h3 className="font-pixel text-[8px] mb-2" style={{ color: 'var(--text-muted)' }}>
        {t('home.todayTasks')}
      </h3>
      {preview.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {t('home.noTasks')}
        </p>
      ) : (
        <div className="space-y-2">
          {preview.map((todo) => (
            <div
              key={todo.id}
              className="rounded-xl px-3 py-2"
              style={{ backgroundColor: 'var(--shell)' }}
            >
              <span className="text-xs" style={{ color: 'var(--text)' }}>
                {todo.text}
              </span>
            </div>
          ))}
          {remaining > 0 && (
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              +{remaining} more task{remaining === 1 ? '' : 's'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MorningBriefingCard({
  settings,
  moodTier,
  pendingTodos,
  activeGoals,
  activePlan,
  streakDays,
  forceOpen,
  onForceClose,
  onContinue,
}: {
  settings: ReturnType<typeof useVictoriaStore.getState>['settings'];
  moodTier: ReturnType<typeof getMoodTier>;
  pendingTodos: Array<{ id: string; text: string }>;
  activeGoals: Array<{ id: string; text: string }>;
  activePlan: { title: string; startDate: string; days: Array<{ done: boolean }> } | null;
  streakDays: number;
  forceOpen?: boolean;
  onForceClose?: () => void;
  onContinue: (briefing: string) => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [liveBriefing, setLiveBriefing] = useState<{
    briefing: string;
    weather: {
      location: string;
      temperatureC: number;
      minTemperatureC?: number;
      maxTemperatureC?: number;
      description: string;
      precipitationChance?: number;
    } | null;
    event: {
      year: number;
      text: string;
      title?: string;
      url?: string;
    } | null;
  } | null>(null);
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const userName = settings.userName || 'friend';
  const todayStamp = useMemo(
    () => getTodayDateKey(),
    []
  );
  const todayKey = useMemo(
    () => `victoria-morning-briefing-dismissed-${todayStamp}`,
    [todayStamp]
  );
  const liveCacheKey = useMemo(
    () => `victoria-morning-live-${todayStamp}`,
    [todayStamp]
  );

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(todayKey) === '1');
    } catch {
      setDismissed(false);
    }
  }, [todayKey]);

  const wakeTime =
    typeof settings.wakeUpTime === 'string' && settings.wakeUpTime.includes(':')
      ? settings.wakeUpTime
      : DEFAULT_SETTINGS.wakeUpTime;
  const now = new Date();
  const [wakeHour, wakeMinute] = wakeTime.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const wakeMinutes =
    (Number.isFinite(wakeHour) ? wakeHour : 9) * 60 + (Number.isFinite(wakeMinute) ? wakeMinute : 0);
  const isMorningWindow = currentMinutes >= wakeMinutes && currentMinutes <= wakeMinutes + 6 * 60;
  const isVisible = settings.morningBriefingEnabled && (forceOpen || isMorningWindow) && (!dismissed || forceOpen);

  useEffect(() => {
    if (!isVisible) return;
    void markDailyCheckin(todayStamp, true);
  }, [isVisible, todayStamp]);

  const topTodos = useMemo(
    () => (Array.isArray(pendingTodos) ? pendingTodos.slice(0, 3) : []),
    [pendingTodos]
  );
  const topGoals = useMemo(
    () => (Array.isArray(activeGoals) ? activeGoals.slice(0, 2) : []),
    [activeGoals]
  );
  const topTodoTexts = useMemo(
    () => topTodos.map((todo) => todo.text),
    [topTodos]
  );
  const topGoalTexts = useMemo(
    () => topGoals.map((goal) => goal.text),
    [topGoals]
  );
  const topTodoSignature = topTodoTexts.join('||');
  const topGoalSignature = topGoalTexts.join('||');
  const factCategories =
    typeof settings.morningFactCategories === 'string'
      ? settings.morningFactCategories
      : DEFAULT_SETTINGS.morningFactCategories;
  const spark = getMorningSpark(factCategories);
  const planDays = Array.isArray(activePlan?.days) ? activePlan.days : [];
  const planTitle =
    typeof activePlan?.title === 'string' && activePlan.title.trim()
      ? activePlan.title
      : 'Active plan';
  const location =
    typeof settings.morningLocation === 'string' && settings.morningLocation.trim()
      ? settings.morningLocation
      : 'No location set';
  const newsTopics =
    typeof settings.morningNewsTopics === 'string' && settings.morningNewsTopics.trim()
      ? settings.morningNewsTopics
      : 'none yet';
  const activePlanDay = activePlan
    ? getActivePlanDayNumber(
        activePlan.startDate,
        planDays.filter((day) => day.done).length
      )
    : null;
  const fallbackBriefing = [
    `Good morning, ${userName}.`,
    topTodos.length > 0
      ? `Your top tasks are ${topTodos.slice(0, 2).map((todo) => todo.text).join(' and ')}.`
      : 'You do not have any saved tasks yet, so pick one clean first win.',
    topGoals.length > 0
      ? `Keep ${topGoals[0].text} in focus today.`
      : 'Today is a good day to define one clear goal.',
    activePlanDay ? `Your active plan is ${planTitle}, day ${activePlanDay}.` : '',
    streakDays > 0
      ? `Your streak is ${streakDays} day${streakDays === 1 ? '' : 's'}, so protect the momentum.`
      : 'Today can be your reset point.',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (!isVisible) return;

    try {
      const cached = sessionStorage.getItem(liveCacheKey);
      if (cached) {
        setLiveBriefing(JSON.parse(cached));
        return;
      }
    } catch {
      // Ignore cache issues and continue with a live request.
    }

    let cancelled = false;
    setIsLiveLoading(true);

    fetch('/api/morning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName,
        personality: settings.personalityMode,
        moodTier,
        location,
        weatherEnabled: settings.morningWeatherEnabled,
        newsEnabled: settings.morningNewsEnabled,
        newsTopics,
        factCategories,
        topTodos: topTodoTexts,
        topGoals: topGoalTexts,
        planTitle,
        planDay: activePlanDay,
        streakDays,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Morning request failed');
        }

        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        setLiveBriefing(data);
        try {
          sessionStorage.setItem(liveCacheKey, JSON.stringify(data));
        } catch {
          // non-critical
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLiveBriefing(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLiveLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activePlanDay,
    dismissed,
    factCategories,
    isVisible,
    liveCacheKey,
    location,
    moodTier,
    newsTopics,
    planTitle,
    settings.morningBriefingEnabled,
    settings.morningNewsEnabled,
    settings.morningWeatherEnabled,
    settings.personalityMode,
    streakDays,
    topGoalSignature,
    topGoalTexts,
    topTodoSignature,
    topTodoTexts,
    userName,
  ]);

  const weatherSummary = liveBriefing?.weather
    ? `${liveBriefing.weather.location}: ${liveBriefing.weather.temperatureC}C, ${liveBriefing.weather.description}${
        liveBriefing.weather.maxTemperatureC !== undefined && liveBriefing.weather.minTemperatureC !== undefined
          ? `, high ${liveBriefing.weather.maxTemperatureC}C / low ${liveBriefing.weather.minTemperatureC}C`
          : ''
      }${
        liveBriefing.weather.precipitationChance !== undefined
          ? `, rain ${liveBriefing.weather.precipitationChance}%`
          : ''
      }`
    : null;

  if (!isVisible) {
    return null;
  }

  return (
    <div className="card p-4 space-y-3" style={{ borderColor: 'var(--accent)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-pixel text-[8px]" style={{ color: 'var(--accent)' }}>
            Morning Briefing
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--text)' }}>
            Good morning, {userName}. Here&apos;s your first look at today.
          </p>
        </div>
        <button
          onClick={() => {
            if (forceOpen) {
              onForceClose?.();
              return;
            }
            try {
              sessionStorage.setItem(todayKey, '1');
            } catch {
              // non-critical
            }
            setDismissed(true);
          }}
          className="font-pixel text-[8px] px-2 py-1 rounded-lg"
          style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
          aria-label={forceOpen ? 'Close morning briefing' : 'Dismiss morning briefing'}
        >
          {forceOpen ? 'close' : 'x'}
        </button>
      </div>

      <div className="space-y-2 text-xs" style={{ color: 'var(--text)' }}>
        <p>
          {topTodos.length > 0
            ? `Top tasks: ${topTodos.map((todo) => todo.text).join(' • ')}`
            : 'Top tasks: nothing queued yet, so give yourself one clear win.'}
        </p>
        <p>
          {topGoals.length > 0
            ? `Goals in focus: ${topGoals.map((goal) => goal.text).join(' • ')}`
            : 'Goals in focus: no active goals saved yet.'}
        </p>
        <p>
          {activePlanDay
            ? `Fitness plan: ${planTitle} — Day ${activePlanDay}.`
            : 'Fitness plan: no active plan today.'}
        </p>
        <p>
          {streakDays > 0
            ? `Streak check: ${streakDays} day${streakDays === 1 ? '' : 's'} running.`
            : 'Streak check: today can be your reset point.'}
        </p>
      </div>

      <div
        className="rounded-xl px-3 py-3"
        style={{ backgroundColor: 'var(--shell)', border: '1px solid var(--border)' }}
      >
        <p className="font-pixel text-[7px]" style={{ color: 'var(--accent)' }}>
          Live Morning Pulse
        </p>
        {isLiveLoading ? (
          <p className="text-xs mt-2" style={{ color: 'var(--text)' }}>
            Victoria is checking the weather and today&apos;s context...
          </p>
        ) : liveBriefing?.briefing ? (
          <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text)' }}>
            {liveBriefing.briefing}
          </p>
        ) : (
          <>
            <p className="font-pixel text-[7px] mt-2" style={{ color: 'var(--accent)' }}>
              {spark.label}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--text)' }}>
              {spark.text}
            </p>
          </>
        )}
        {weatherSummary && (
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
            Weather: {weatherSummary}
          </p>
        )}
        {liveBriefing?.event && (
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
            On this day: {liveBriefing.event.year} - {liveBriefing.event.text}
          </p>
        )}
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
          Focus profile: {location} · topics {newsTopics} · facts {factCategories || 'general'}
        </p>
      </div>

      <button
        onClick={() => onContinue(liveBriefing?.briefing || fallbackBriefing)}
        className="w-full py-3 rounded-xl font-pixel text-[8px] text-white transition-all active:scale-95"
        style={{ backgroundColor: 'var(--accent)' }}
      >
        Continue in Chat
      </button>
    </div>
  );
}

function StatusCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="p-4">
      <div className="card p-4 text-center" style={{ minHeight: '30vh' }}>
        <p className="font-pixel text-[8px]" style={{ color: 'var(--accent)' }}>
          {title}
        </p>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          {message}
        </p>
      </div>
    </div>
  );
}
