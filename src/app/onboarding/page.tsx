'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useVictoriaStore } from '@/store';
import { PixelCharacter } from '@/components/home/PixelCharacter';
import { db } from '@/lib/db';
import { cn, getTodayDateKey } from '@/lib/utils';
import type { FitnessDay, FitnessPlan, Goal } from '@/types';

type Step = 'welcome' | 'name' | 'goal' | 'wakeTime' | 'done';

export default function OnboardingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const hasHydrated = useVictoriaStore((s) => s._hasHydrated);
  const updateSettings = useVictoriaStore((s) => s.updateSettings);
  const settings = useVictoriaStore((s) => s.settings);
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);

  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [wakeTime, setWakeTime] = useState('09:00');

  const seedOnboardingData = async (focus: string) => {
    const [existingGoals, existingPlan] = await Promise.all([
      db.goals.count(),
      db.fitnessPlans.filter((plan) => plan.active).first(),
    ]);

    if (existingGoals === 0) {
      const starterGoals: Goal[] = [];

      if (focus === 'job' || focus === 'both') {
        starterGoals.push({
          id: uuidv4(),
          text: 'Find a job',
          horizon: '3months',
          done: false,
          createdAt: Date.now(),
        });
      }

      if (focus === 'fitness' || focus === 'both') {
        starterGoals.push({
          id: uuidv4(),
          text: 'Build a consistent fitness routine',
          horizon: '3months',
          done: false,
          createdAt: Date.now(),
        });
      }

      if (starterGoals.length > 0) {
        await db.goals.bulkAdd(starterGoals);
      }
    }

    if (!existingPlan && (focus === 'fitness' || focus === 'both')) {
      const days: FitnessDay[] = Array.from({ length: 14 }, (_, i) => ({
        day: i + 1,
        workoutType: i % 7 === 0 || i % 7 === 3 ? 'rest' : 'home',
        exercises: [],
        done: false,
      }));

      const starterPlan: FitnessPlan = {
        id: uuidv4(),
        title: 'Starter 2 Weeks',
        createdAt: Date.now(),
        startDate: getTodayDateKey(),
        days,
        active: true,
      };

      await db.fitnessPlans.add(starterPlan);
    }
  };

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
    if (!hasHydrated) return;
    if (settings.onboardingDone) {
      router.replace('/');
    }
  }, [hasHydrated, settings.onboardingDone, router]);

  const handleComplete = async () => {
    await seedOnboardingData(goal);
    updateSettings({
      userName: name || 'friend',
      onboardingDone: true,
      wakeUpTime: wakeTime,
    });
    router.replace('/');
  };

  if (!hasHydrated) {
    return (
      <OnboardingStatus
        message={
          hydrationTimedOut
            ? 'Your saved session is taking longer than usual to restore.'
            : 'Preparing Victoria...'
        }
      />
    );
  }

  if (settings.onboardingDone) {
    return <OnboardingStatus message="Opening your companion..." />;
  }

  return (
    <div
      data-theme="midnight"
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: '#0d0d1a' }}
    >
    <div className="w-full max-w-md flex flex-col items-center">
      {/* Character */}
      <div className="mb-6">
        <PixelCharacter
          mode={settings.characterMode}
          moodTier="balanced"
          animationLevel="full"
        />
      </div>

      {/* Step content */}
      <div className="w-full">
        {step === 'welcome' && (
          <StepCard>
            <h1 className="font-pixel text-sm mb-4 text-center" style={{ color: 'var(--accent)' }}>
              {t('onboarding.welcome')}
            </h1>
            <p className="text-sm text-center leading-relaxed mb-6" style={{ color: 'var(--text)' }}>
              {t('onboarding.intro')}
            </p>
            <PrimaryButton onClick={() => setStep('name')}>{t('common.next')}</PrimaryButton>
          </StepCard>
        )}

        {step === 'name' && (
          <StepCard>
            <p className="font-pixel text-[10px] mb-4 text-center" style={{ color: 'var(--text)' }}>
              {t('onboarding.askName')}
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('onboarding.namePlaceholder')}
              className="w-full px-4 py-3 rounded-xl mb-4 text-sm outline-none"
              style={{
                backgroundColor: 'var(--shell)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep('goal')}
              autoFocus
            />
            <PrimaryButton onClick={() => setStep('goal')} disabled={!name.trim()}>
              {t('common.next')}
            </PrimaryButton>
          </StepCard>
        )}

        {step === 'goal' && (
          <StepCard>
            {name && (
              <p className="text-xs text-center mb-3" style={{ color: 'var(--accent)' }}>
                {t('onboarding.nameConfirm', { name })}
              </p>
            )}
            <p className="font-pixel text-[10px] mb-4 text-center" style={{ color: 'var(--text)' }}>
              {t('onboarding.askGoal')}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(['job', 'fitness', 'both', 'other'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => { setGoal(g); setStep('wakeTime'); }}
                  className={cn(
                    'py-3 px-2 rounded-xl text-xs font-pixel text-[8px] transition-all active:scale-95',
                    goal === g ? 'ring-2 ring-offset-1' : ''
                  )}
                  style={{
                    backgroundColor: 'var(--shell)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {t(`onboarding.goals.${g}`)}
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {step === 'wakeTime' && (
          <StepCard>
            <p className="font-pixel text-[10px] mb-4 text-center" style={{ color: 'var(--text)' }}>
              {t('onboarding.askWakeTime')}
            </p>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl mb-4 text-center text-lg outline-none"
              style={{
                backgroundColor: 'var(--shell)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            />
            <PrimaryButton onClick={() => setStep('done')}>{t('common.next')}</PrimaryButton>
          </StepCard>
        )}

        {step === 'done' && (
          <StepCard>
            <div className="text-center mb-4">
              <div className="text-4xl mb-3">✦</div>
              <p className="font-pixel text-[10px] mb-2" style={{ color: 'var(--accent)' }}>
                {t('onboarding.setupComplete')}
              </p>
            </div>
            <PrimaryButton onClick={handleComplete}>{t('onboarding.letsGo')}</PrimaryButton>
          </StepCard>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex gap-2 mt-6">
        {(['welcome', 'name', 'goal', 'wakeTime', 'done'] as Step[]).map((s, i) => (
          <div
            key={s}
            className="w-2 h-2 rounded-full transition-all"
            style={{
              backgroundColor: step === s ? 'var(--accent)' : 'var(--border)',
            }}
          />
        ))}
      </div>
    </div>
    </div>
  );
}

function OnboardingStatus({ message }: { message: string }) {
  return (
    <div
      data-theme="midnight"
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#0d0d1a' }}
    >
      <div className="card p-6 w-full max-w-md text-center">
        <p className="font-pixel text-[9px]" style={{ color: 'var(--accent)' }}>
          VICTORIA
        </p>
        <p className="text-sm mt-4" style={{ color: 'var(--text)' }}>
          {message}
        </p>
      </div>
    </div>
  );
}

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="card p-6 w-full">
      {children}
    </div>
  );
}

function PrimaryButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-xl font-pixel text-[9px] text-white transition-all active:scale-95 disabled:opacity-40"
      style={{ backgroundColor: disabled ? 'var(--border)' : 'var(--accent)' }}
    >
      {children}
    </button>
  );
}
