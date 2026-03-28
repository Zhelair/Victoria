'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useVictoriaStore } from '@/store';
import { getMoodTier, MOOD_TIER_NAMES } from '@/types';
import { getTodayDateKey } from '@/lib/utils';
import { PixelCharacter } from './PixelCharacter';
import {
  playFeed, playPlay, playClean, playSleep,
  playHiss, playPurr, playGift, playCompliment, playInteract,
} from '@/lib/sounds';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function darkenHex(hex: string, factor = 0.65): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = Math.max(0, Math.round(parseInt(clean.slice(0, 2), 16) * factor));
  const g = Math.max(0, Math.round(parseInt(clean.slice(2, 4), 16) * factor));
  const b = Math.max(0, Math.round(parseInt(clean.slice(4, 6), 16) * factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TamagotchiScreen() {
  const { t } = useTranslation();
  const moodScore = useVictoriaStore((s) => s.moodScore);
  const settings = useVictoriaStore((s) => s.settings);
  const adjustMoodScore = useVictoriaStore((s) => s.adjustMoodScore);
  const miniGameUsage = useVictoriaStore((s) => s.miniGameUsage);
  const recordMiniGame = useVictoriaStore((s) => s.recordMiniGame);
  const recordGirlInteraction = useVictoriaStore((s) => s.recordGirlInteraction);

  const [tapFeedback, setTapFeedback] = useState<string | null>(null);
  const [gameFeedback, setGameFeedback] = useState<{ text: string; color: string } | null>(null);
  const [catBoxCatches, setCatBoxCatches] = useState(0);
  const [catBoxDismissed, setCatBoxDismissed] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [showMoodAdjuster, setShowMoodAdjuster] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout>();

  const moodTier = getMoodTier(moodScore);
  const tierName = MOOD_TIER_NAMES[moodTier];
  const isCat = settings.characterMode === 'cat';
  const isGirl = settings.characterMode === 'girl';
  const snd = settings.soundsEnabled;
  const soundVolume = settings.soundVolume ?? 1;

  const today = getTodayDateKey();
  const u = miniGameUsage.date === today
    ? miniGameUsage
    : {
        date: today,
        feed: 0,
        play: 0,
        cleaned: false,
        slept: false,
        giftGiven: false,
        complimentCount: 0,
      };

  const catInBox = isCat && (moodTier === 'icequeen' || moodTier === 'dark') && !catBoxDismissed;

  const happyBar = moodScore;
  const focusBar = Math.min(100, moodScore + 10);
  const healthBar = Math.max(20, Math.min(100, moodScore + 5));

  // ─── Idle detection ────────────────────────────────────────────────────────
  useEffect(() => {
    const IDLE_MS = 20_000;
    const reset = () => {
      setIsIdle(false);
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setIsIdle(true), IDLE_MS);
    };
    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll', 'click'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      clearTimeout(idleTimerRef.current);
    };
  }, []);

  // ─── Helpers ───────────────────────────────────────────────────────────────
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
    if (snd) playInteract(soundVolume);
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
    if (snd) {
      if (game === 'feed') playFeed(soundVolume);
      else if (game === 'play') playPlay(soundVolume);
      else if (game === 'clean') playClean(soundVolume);
      else if (game === 'sleep') playSleep(soundVolume);
    }
  };

  const handleBellyRub = () => {
    const isBadMood = moodTier === 'icequeen' || moodTier === 'dark' || moodTier === 'sideeye';
    const hissChance = isBadMood ? 0.9 : 0.4;
    if (Math.random() < hissChance) {
      adjustMoodScore(-1);
      showFeedback('😾 HISS! She bit you! -1', '#ef4444');
      if (snd) playHiss(soundVolume);
    } else {
      adjustMoodScore(2);
      showFeedback('😻 Purrrr... +2', '#22c55e');
      if (snd) playPurr(soundVolume);
    }
  };

  const handleMouseToy = () => {
    const result = recordMiniGame('play');
    if (!result.allowed) {
      showFeedback("She's tired of the mouse today.", 'var(--text-muted)');
      return;
    }
    if (catInBox) {
      const newCatches = catBoxCatches + 1;
      setCatBoxCatches(newCatches);
      if (newCatches >= 3) {
        setCatBoxDismissed(true);
        showFeedback('🐱 She emerges... still grumpy. +2', '#f59e0b');
        adjustMoodScore(2);
        setTimeout(() => { setCatBoxDismissed(false); setCatBoxCatches(0); }, 30000);
      } else {
        showFeedback(`👀 Two eyes blink from the box... ${3 - newCatches} more`, '#f59e0b');
        adjustMoodScore(1);
      }
    } else {
      showFeedback(`🐭 She catches it! +${result.delta}`, '#22c55e');
      if (snd) playPlay(soundVolume);
    }
  };

  const handleGirlGift = () => {
    const result = recordGirlInteraction('gift');
    if (!result.allowed) {
      showFeedback('Already gifted today!', 'var(--text-muted)');
      return;
    }
    if (moodTier === 'sunshine' || moodTier === 'balanced') {
      adjustMoodScore(3);
      showFeedback('🎁 She loves it! ✨ +3', '#22c55e');
      if (snd) playGift(soundVolume);
    } else if (moodTier === 'sideeye') {
      adjustMoodScore(1);
      showFeedback('😐 She accepts it. +1', '#f59e0b');
    } else {
      showFeedback('😒 Thrown back at you!', '#ef4444');
    }
  };

  const handleGirlCompliment = () => {
    const result = recordGirlInteraction('compliment');
    if (!result.allowed) {
      showFeedback("She's had enough compliments today!", 'var(--text-muted)');
      return;
    }
    if (moodTier === 'sunshine' || moodTier === 'balanced') {
      adjustMoodScore(1);
      showFeedback('💬 She blushes! +1', '#ff9999');
      if (snd) playCompliment(soundVolume);
    } else if (moodTier === 'sideeye') {
      showFeedback('📚 Side-eye. She keeps reading.', 'var(--text-muted)');
    } else {
      showFeedback('💅 She points at your streak...', '#ef4444');
    }
  };

  // ─── Color overrides ───────────────────────────────────────────────────────
  const shellStyle = settings.tamaShellColor
    ? { backgroundColor: settings.tamaShellColor, borderColor: darkenHex(settings.tamaShellColor) }
    : {};
  const screenStyle = settings.tamaScreenColor
    ? { backgroundColor: settings.tamaScreenColor, borderColor: darkenHex(settings.tamaScreenColor, 0.5) }
    : {};

  const applyMoodAdjustment = (delta: number) => {
    if (delta < 0) {
      const confirmed = window.confirm(
        `Lower Victoria's mood by ${Math.abs(delta)} points? This is meant for testing different mood states.`
      );
      if (!confirmed) return;
    }

    adjustMoodScore(delta);
    showFeedback(
      delta >= 0 ? `Mood adjusted +${delta}` : `Mood adjusted ${delta}`,
      delta >= 0 ? '#22c55e' : '#ef4444'
    );
    setShowMoodAdjuster(false);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Mood name */}
      <div className="mb-2">
        <span className="font-pixel text-[8px]" style={{ color: 'var(--text-muted)' }}>
          {tierName.toUpperCase()}
          {catInBox && ' · 📦 BOX MODE'}
          {isIdle && ' · 💤'}
        </span>
      </div>

      {/* Shell + screen */}
      <div
        className="tama-shell w-full max-w-[280px] aspect-square flex items-center justify-center p-5"
        style={{ position: 'relative', ...shellStyle }}
      >
        <div className="tama-screen w-full h-full flex flex-col items-center justify-between p-3" style={screenStyle}>
          <div className="flex-1 flex items-center justify-center relative">
            <PixelCharacter
              mode={settings.characterMode}
              moodTier={catBoxDismissed ? 'sideeye' : moodTier}
              animationLevel={settings.animationLevel}
              isIdle={isIdle}
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
        <button
          onClick={() => setShowMoodAdjuster((prev) => !prev)}
          className="px-2 py-1 rounded-full border border-theme font-pixel text-[7px] transition-all active:scale-95"
          style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
          title="Adjust mood score for testing"
        >
          +/-
        </button>
      </div>

      {showMoodAdjuster && (
        <div className="mt-2 flex flex-wrap justify-center gap-1.5 max-w-[280px]">
          {[-10, -5, 5, 10].map((delta) => (
            <button
              key={delta}
              onClick={() => applyMoodAdjustment(delta)}
              className="px-2.5 py-1 rounded-lg font-pixel text-[7px] transition-all active:scale-95"
              style={{
                backgroundColor: 'var(--shell)',
                color: delta > 0 ? '#22c55e' : '#ef4444',
                border: `1px solid ${delta > 0 ? '#22c55e55' : '#ef444455'}`,
              }}
            >
              {delta > 0 ? `+${delta}` : `${delta}`}
            </button>
          ))}
        </div>
      )}

      {/* Game feedback */}
      {gameFeedback && (
        <div className="mt-1 font-pixel text-[7px] text-center" style={{ color: gameFeedback.color }}>
          {gameFeedback.text}
        </div>
      )}

      {/* Mini-game buttons */}
      <div className="flex flex-wrap gap-1.5 justify-center mt-3 w-full max-w-[280px]">
        {isGirl ? (
          <>
            <MiniBtn emoji="🎁" label="GIFT" badge={u.giftGiven ? '✓' : '1×'} disabled={u.giftGiven} onClick={handleGirlGift} />
            <MiniBtn emoji="💬" label="COMPLIMENT" badge={`${3 - u.complimentCount}/3`} disabled={u.complimentCount >= 3} onClick={handleGirlCompliment} />
            <MiniBtn emoji="💤" label="SLEEP" badge={u.slept ? '✓' : '1×'} disabled={u.slept} onClick={() => handleGame('sleep')} />
          </>
        ) : isCat ? (
          <>
            <MiniBtn
              emoji="🐭"
              label={catInBox ? 'LURE' : 'MOUSE'}
              badge={`${3 - u.play}/3`}
              disabled={u.play >= 3}
              onClick={handleMouseToy}
              highlight={catInBox ? '#f59e0b40' : undefined}
            />
            <MiniBtn emoji="🍣" label="TREAT" badge={`${3 - u.feed}/3`} disabled={u.feed >= 3 || catInBox} onClick={() => handleGame('feed')} />
            <MiniBtn emoji="🫃" label="BELLY?" disabled={catInBox} onClick={handleBellyRub} />
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

      {/* Hints */}
      {catInBox && (
        <p className="mt-2 font-pixel text-center" style={{ fontSize: '6px', color: 'var(--text-muted)' }}>
          🐱 She&apos;s in the box. Use LURE 3× to coax her out.
        </p>
      )}
      {isIdle && !catInBox && (
        <p className="mt-2 font-pixel text-center" style={{ fontSize: '6px', color: 'var(--text-muted)' }}>
          She&apos;s doing her own thing... tap to wake her up.
        </p>
      )}
    </div>
  );
}

function MiniBtn({
  emoji, label, badge, disabled, onClick, highlight,
}: {
  emoji: string;
  label: string;
  badge?: string;
  disabled?: boolean;
  onClick: () => void;
  highlight?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-35"
      style={{
        backgroundColor: highlight || 'var(--shell)',
        border: `1px solid ${highlight ? '#f59e0b' : 'var(--border)'}`,
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
