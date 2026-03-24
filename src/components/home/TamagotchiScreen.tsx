'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useVictoriaStore } from '@/store';
import { getMoodTier, MOOD_TIER_NAMES } from '@/types';
import { PixelCharacter } from './PixelCharacter';
import { cn } from '@/lib/utils';

export function TamagotchiScreen() {
  const { t } = useTranslation();
  const moodScore = useVictoriaStore((s) => s.moodScore);
  const settings = useVictoriaStore((s) => s.settings);
  const adjustMoodScore = useVictoriaStore((s) => s.adjustMoodScore);
  const [tapFeedback, setTapFeedback] = useState<string | null>(null);

  const moodTier = getMoodTier(moodScore);
  const tierName = MOOD_TIER_NAMES[moodTier];

  // Derived stat bars (happy from score, focus from recent activity, health from fitness)
  const happyBar = moodScore;
  const focusBar = Math.min(100, moodScore + 10); // slightly offset
  const healthBar = Math.max(20, Math.min(100, moodScore + 5));

  const handleInteract = () => {
    const responses: Record<string, string[]> = {
      sunshine: ['♥', '★', '✦'],
      balanced: ['~', '·', '…'],
      sideeye: ['…', '?', '¬'],
      icequeen: ['❄', '·', ''],
      dark: ['', '', '·'],
    };
    const opts = responses[moodTier];
    const pick = opts[Math.floor(Math.random() * opts.length)];
    if (pick) {
      setTapFeedback(pick);
      setTimeout(() => setTapFeedback(null), 1200);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Mood name */}
      <div className="mb-2">
        <span className="font-pixel text-[8px]" style={{ color: 'var(--text-muted)' }}>
          {tierName.toUpperCase()}
        </span>
      </div>

      {/* The shell + screen */}
      <div
        className="tama-shell w-full max-w-[280px] aspect-square flex items-center justify-center p-5"
        style={{ position: 'relative' }}
      >
        <div className="tama-screen w-full h-full flex flex-col items-center justify-between p-3">
          {/* Character area */}
          <div className="flex-1 flex items-center justify-center relative">
            <PixelCharacter
              mode={settings.characterMode}
              moodTier={moodTier}
              animationLevel={settings.animationLevel}
              onInteract={handleInteract}
            />
            {/* Tap feedback */}
            {tapFeedback && (
              <div
                className="absolute top-0 right-0 font-pixel text-sm pointer-events-none"
                style={{
                  animation: 'heartFloat 1.2s ease-out forwards',
                  color: 'var(--accent)',
                }}
              >
                {tapFeedback}
              </div>
            )}
          </div>

          {/* Stat bars */}
          <div className="w-full space-y-1 mt-2">
            <StatBar label={t('mood.happy')} value={happyBar} color="#22c55e" />
            <StatBar label={t('mood.focus')} value={focusBar} color="#3b82f6" />
            <StatBar label={t('mood.health')} value={healthBar} color="#f59e0b" />
          </div>
        </div>
      </div>

      {/* Score display */}
      <div className="mt-3 flex items-center gap-2">
        <div
          className="px-3 py-1 rounded-full border border-theme"
          style={{ backgroundColor: 'var(--shell)' }}
        >
          <span className="font-pixel text-[9px]">{t('mood.score')}: {moodScore}</span>
        </div>
      </div>
    </div>
  );
}

function StatBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-pixel text-[6px] w-14 text-right" style={{ color: 'var(--screen-dark)' }}>
        {label}
      </span>
      <div className="mood-bar-track flex-1">
        <div
          className="mood-bar-fill"
          style={{
            width: `${value}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
