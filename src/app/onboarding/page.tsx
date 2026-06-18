'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useVictoriaStore } from '@/store';
import { PixelCharacter } from '@/components/home/PixelCharacter';

type Step = 'welcome' | 'name' | 'wakeTime' | 'done';

export default function OnboardingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const hasHydrated = useVictoriaStore((s) => s._hasHydrated);
  const updateSettings = useVictoriaStore((s) => s.updateSettings);
  const settings = useVictoriaStore((s) => s.settings);
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);

  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [wakeTime, setWakeTime] = useState('09:00');

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
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep('wakeTime')}
              autoFocus
            />
            <PrimaryButton onClick={() => setStep('wakeTime')} disabled={!name.trim()}>
              {t('common.next')}
            </PrimaryButton>
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
        {(['welcome', 'name', 'wakeTime', 'done'] as Step[]).map((s) => (
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
