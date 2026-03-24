'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useVictoriaStore } from '@/store';
import { getMoodTier, MOOD_TIER_NAMES } from '@/types';
import { PixelCharacter } from './PixelCharacter';

export function TamagotchiScreen() {
  const { t } = useTranslation();
  const moodScore = useVictoriaStore((s) => s.moodScore);
  const settings = useVictoriaStore((s) => s.settings);
  const adjustMoodScore = useVictoriaStore((s) => s.adjustMoodScore);
  const miniGameUsage = useVictoriaStore((s) => s.miniGameUsage);
  const recordMiniGame = useVictoriaStore((s) => s.recordMiniGame);

  const [tapFeedback, setTapFeedback] = useState<string | null>(null);
  const [gameFeedback, setGameFeedback] = useState<{ text: string; color: string } | null>(null);

  const moodTier = getMoodTier(moodScore);
  const tierName = MOOD_TIER_NAMES[moodTier];

  const today = new Date().toISOString().split('T')[0];
  const u = miniGameUsage.date === today
    ? miniGameUsage
    : { date: today, feed: 0, play: 0, cleaned: false, slept: false };

  const happyBar = moodScore;
  const focusBar = Math.min(100, moodScore + 10);
  const healthBar = Math.max(20, Math.min(100, moodScore + 5));

  const showFeedback = (text: string, color = 'var(--accent)') => {
    setGameFeedback({ text, color });
    setTimeout(() => setGameFeedback(null), 1800);
  };

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

  const handleGame = (game: 'feed' | 'play' | 'clean' | 'sleep') => {
    const result = recordMiniGame(game);
    if (!result.allowed) {
      showFeedback('Already done today!', 'var(--text-muted)');
      return;
    }
    const messages: Record<string, string> = {
      feed: `🍬 Yum! +${result.delta}`,
      play: `🎾 Wheee! +${result.delta}`,
      clean: `🛁 Squeaky clean! +${result.delta}`,
      sleep: '💤 Goodnight...',
    };
    showFeedback(messages[game] ?? 'Done!', result.delta > 0 ? '#22c55e' : 'var(--text-muted)');
  };

  const handleBellyRub = () => {
    const isBadMood = moodTier === 'icequeen' || moodTier === 'dark' || moodTier === 'sideeye';
    const hissChance = isBadMood ? 0.9 : 0.4;
    if (Math.random() < hissChance) {
      adjustMoodScore(-1);
      showFeedback('😾 HISS! She bit you! -1', '#ef4444');
    } else {
      adjustMoodScore(2);
      showFeedback('😻 Purrrr... +2', '#22c55e');
    }
  };

  const isCat = settings.characterMode === 'cat';

  return (
    <div className="flex flex-col items-center">
      {/* Mood name */}
      <div className="mb-2">
        <span className="font-pixel text-[8px]" style={{ color: 'var(--text-muted)' }}>
          {tierName.toUpperCase()}
        </span>
      </div>

      {/* Shell + screen */}
      <div
        className="tama-shell w-full max-w-[280px] aspect-square flex items-center justify-center p-5"
        style={{ position: 'relative' }}
      >
        <div className="tama-screen w-full h-full flex flex-col items-center justify-between p-3">
          <div className="flex-1 flex items-center justify-center relative">
            <PixelCharacter
              mode={settings.characterMode}
              moodTier={moodTier}
              animationLevel={settings.animationLevel}
              onInteract={handleInteract}
            />
            {tapFeedback && (
              <div
                className="absolute top-0 right-0 font-pixel text-sm pointer-events-none"
                style={{ animation: 'heartFloat 1.2s ease-out forwards', color: 'var(--accent)' }}
              >
                {tapFeedback}
              </div>
            )}
          </div>

          <div className="w-full space-y-1 mt-2">
            <StatBar label={t('mood.happy')} value={happyBar} color="#22c55e" />
            <StatBar label={t('mood.focus')} value={focusBar} color="#3b82f6" />
            <StatBar label={t('mood.health')} value={healthBar} color="#f59e0b" />
          </div>
        </div>
      </div>

      {/* Score */}
      <div className="mt-3 flex items-center gap-2">
        <div className="px-3 py-1 rounded-full border border-theme" style={{ backgroundColor: 'var(--shell)' }}>
          <span className="font-pixel text-[9px]">{t('mood.score')}: {moodScore}</span>
        </div>
      </div>

      {/* Game feedback */}
      {gameFeedback && (
        <div className="mt-1 font-pixel text-[7px] text-center" style={{ color: gameFeedback.color }}>
          {gameFeedback.text}
        </div>
      )}

      {/* Mini-game buttons */}
      <div className="flex flex-wrap gap-1.5 justify-center mt-3 w-full max-w-[280px]">
        {isCat ? (
          <>
            <MiniBtn emoji="🐭" label="MOUSE" badge={`${3 - u.play}/3`} disabled={u.play >= 3} onClick={() => handleGame('play')} />
            <MiniBtn emoji="🍣" label="TREAT" badge={`${3 - u.feed}/3`} disabled={u.feed >= 3} onClick={() => handleGame('feed')} />
            <MiniBtn emoji="🫃" label="BELLY?" onClick={handleBellyRub} />
            <MiniBtn emoji="💤" label="SLEEP" badge={u.slept ? '✓' : '1×'} disabled={u.slept} onClick={() => handleGame('sleep')} />
          </>
        ) : (
          <>
            <MiniBtn emoji="🍬" label="FEED" badge={`${3 - u.feed}/3`} disabled={u.feed >= 3} onClick={() => handleGame('feed')} />
            <MiniBtn emoji="🎾" label="PLAY" badge={`${3 - u.play}/3`} disabled={u.play >= 3} onClick={() => handleGame('play')} />
            <MiniBtn emoji="🛁" label="CLEAN" badge={u.cleaned ? '✓' : '1×'} disabled={u.cleaned} onClick={() => handleGame('clean')} />
            <MiniBtn emoji="💤" label="SLEEP" badge={u.slept ? '✓' : '1×'} disabled={u.slept} onClick={() => handleGame('sleep')} />
          </>
        )}
      </div>
    </div>
  );
}

function MiniBtn({
  emoji, label, badge, disabled, onClick,
}: {
  emoji: string;
  label: string;
  badge?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-35"
      style={{
        backgroundColor: 'var(--shell)',
        border: '1px solid var(--border)',
        minWidth: '58px',
      }}
    >
      <span style={{ fontSize: '18px', lineHeight: 1 }}>{emoji}</span>
      <span className="font-pixel" style={{ fontSize: '5px', color: 'var(--text-muted)' }}>{label}</span>
      {badge !== undefined && (
        <span className="font-pixel" style={{ fontSize: '5px', color: 'var(--accent)' }}>{badge}</span>
      )}
    </button>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-pixel text-[6px] w-14 text-right" style={{ color: 'var(--screen-dark)' }}>
        {label}
      </span>
      <div className="mood-bar-track flex-1">
        <div className="mood-bar-fill" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
