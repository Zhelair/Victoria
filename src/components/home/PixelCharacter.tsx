'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { CharacterMode, MoodTier } from '@/types';

interface PixelCharacterProps {
  mode: CharacterMode;
  moodTier: MoodTier;
  animationLevel?: 'full' | 'reduced' | 'off';
  isIdle?: boolean;
  onInteract?: () => void;
  className?: string;
}

// ─── Pixel Art primitives ─────────────────────────────────────────────────────

const PIXEL = 8;

function Pixel({ color, size = 1 }: { color: string; size?: number }) {
  if (color === 'transparent' || color === '')
    return <div style={{ width: PIXEL * size, height: PIXEL, display: 'inline-block' }} />;
  return (
    <div
      style={{
        width: PIXEL * size,
        height: PIXEL,
        backgroundColor: color,
        display: 'inline-block',
        imageRendering: 'pixelated',
      }}
    />
  );
}

function PixelRow({ pixels }: { pixels: Array<string | [string, number]> }) {
  return (
    <div style={{ display: 'flex', lineHeight: 0 }}>
      {pixels.map((p, i) =>
        Array.isArray(p) ? <Pixel key={i} color={p[0]} size={p[1]} /> : <Pixel key={i} color={p} />
      )}
    </div>
  );
}

// ─── Creature ─────────────────────────────────────────────────────────────────

const C = {
  body: '#4a9f4a',
  bodyDark: '#2d7a2d',
  eye: '#0f380f',
  blush: '#ff9999',
  mouth: '#0f380f',
  tongue: '#ff6666',
  bubbleRim: '#88bbff',
  bubbleFill: '#ddeeff',
  bubbleStem: '#88bbff',
};

function CreatureSprite({ mood, blinking }: { mood: MoodTier; blinking?: boolean }) {
  const T = 'transparent';
  const eye = blinking ? C.body : C.eye;

  if (mood === 'sunshine') return (
    <div>
      <PixelRow pixels={[T, T, C.body, T, T, T, C.body, T, T]} />
      <PixelRow pixels={[T, C.body, C.body, T, T, T, C.body, C.body, T]} />
      <PixelRow pixels={[T, T, C.body, C.body, C.body, C.body, C.body, T, T]} />
      <PixelRow pixels={[T, C.body, eye, C.body, C.body, eye, C.body, T, T]} />
      <PixelRow pixels={[T, C.body, C.blush, C.body, C.body, C.blush, C.body, T, T]} />
      <PixelRow pixels={[T, C.body, C.body, C.mouth, C.tongue, C.mouth, C.body, T, T]} />
      <PixelRow pixels={[T, T, C.body, C.body, C.body, C.body, C.body, T, T]} />
      <PixelRow pixels={[T, T, C.body, T, T, T, C.body, T, T]} />
    </div>
  );

  if (mood === 'balanced') return (
    <div>
      <PixelRow pixels={[T, T, C.body, C.body, C.body, C.body, C.body, T, T]} />
      <PixelRow pixels={[T, C.body, C.body, C.body, C.body, C.body, C.body, C.body, T]} />
      <PixelRow pixels={[T, C.body, eye, C.body, C.body, eye, C.body, C.body, T]} />
      <PixelRow pixels={[T, C.body, C.body, C.body, C.body, C.body, C.body, C.body, T]} />
      <PixelRow pixels={[T, C.body, C.body, C.mouth, C.mouth, C.mouth, C.body, C.body, T]} />
      <PixelRow pixels={[T, T, C.body, C.body, C.body, C.body, C.body, T, T]} />
      <PixelRow pixels={[T, T, T, C.body, T, C.body, T, T, T]} />
    </div>
  );

  if (mood === 'sideeye') return (
    <div>
      <PixelRow pixels={[T, T, C.body, C.body, C.body, C.body, C.body, T, T]} />
      <PixelRow pixels={[T, C.body, C.body, C.body, C.body, C.body, C.body, C.body, T]} />
      <PixelRow pixels={[T, C.body, C.body, eye, C.body, C.body, eye, C.body, T]} />
      <PixelRow pixels={[T, C.body, C.body, C.body, C.body, C.body, C.body, C.body, T]} />
      <PixelRow pixels={[T, C.body, C.body, C.mouth, C.mouth, C.body, C.body, C.body, T]} />
      <PixelRow pixels={[T, T, C.body, C.body, C.body, C.body, C.body, T, T]} />
      <PixelRow pixels={[T, T, T, C.body, T, C.body, T, T, T]} />
    </div>
  );

  // icequeen / dark
  const b = mood === 'dark' ? C.bodyDark : C.bodyDark;
  return (
    <div>
      <PixelRow pixels={[T, T, b, b, b, b, b, T, T]} />
      <PixelRow pixels={[T, b, b, b, b, b, b, b, T]} />
      <PixelRow pixels={[T, b, eye, b, b, eye, b, b, T]} />
      <PixelRow pixels={[T, b, b, b, b, b, b, b, T]} />
      <PixelRow pixels={[T, b, C.mouth, C.mouth, b, b, b, b, T]} />
      <PixelRow pixels={[T, T, b, b, b, b, b, T, T]} />
      {mood === 'dark' && <PixelRow pixels={[T, T, T, T, C.eye, T, T, T, T]} />}
    </div>
  );
}

/** Creature blowing a bubble — idle animation sprite */
function CreatureBubbleSprite() {
  const T = 'transparent';
  return (
    <div>
      {/* Bubble */}
      <PixelRow pixels={[T, T, C.bubbleRim, C.bubbleRim, C.bubbleRim, T, T, T, T]} />
      <PixelRow pixels={[T, C.bubbleRim, C.bubbleFill, C.bubbleFill, C.bubbleFill, C.bubbleRim, T, T, T]} />
      <PixelRow pixels={[T, T, C.bubbleRim, C.bubbleRim, C.bubbleRim, T, T, T, T]} />
      {/* Stem */}
      <PixelRow pixels={[T, T, T, C.bubbleStem, T, T, T, T, T]} />
      {/* Creature (puffed cheeks, pursed mouth) */}
      <PixelRow pixels={[T, T, C.body, C.body, C.body, C.body, C.body, T, T]} />
      <PixelRow pixels={[T, C.body, C.body, C.eye, C.body, C.eye, C.body, C.body, T]} />
      <PixelRow pixels={[T, C.body, C.blush, C.body, C.body, C.body, C.blush, C.body, T]} />
      <PixelRow pixels={[T, C.body, C.body, C.body, C.mouth, C.body, C.body, C.body, T]} />
      <PixelRow pixels={[T, T, C.body, C.body, C.body, C.body, C.body, T, T]} />
    </div>
  );
}

// ─── Cat ──────────────────────────────────────────────────────────────────────

const K = {
  body: '#b8e0f0',
  bodyDark: '#7ab8cc',
  earInner: '#ffb3c6',
  eye: '#2d5a6e',
  eyeShine: '#ffffff',
  nose: '#ff9999',
  mouth: '#2d5a6e',
  tail: '#7ab8cc',
  box: '#c8a855',
  boxDark: '#a08040',
  pupil: '#111111',
  tongue: '#ff8888',
};

function CatSprite({ mood, blinking }: { mood: MoodTier; blinking?: boolean }) {
  const T = 'transparent';

  if (mood === 'icequeen' || mood === 'dark') {
    return (
      <div>
        <PixelRow pixels={[K.box, K.box, K.box, K.box, K.box, K.box, K.box, K.box]} />
        <PixelRow pixels={[K.box, K.boxDark, K.boxDark, K.boxDark, K.boxDark, K.boxDark, K.boxDark, K.box]} />
        <PixelRow pixels={[K.box, K.boxDark, T, K.boxDark, K.boxDark, T, K.boxDark, K.box]} />
        <PixelRow pixels={[K.box, K.boxDark, K.pupil, K.boxDark, K.boxDark, K.pupil, K.boxDark, K.box]} />
        <PixelRow pixels={[K.box, K.boxDark, T, K.boxDark, K.boxDark, T, K.boxDark, K.box]} />
        <PixelRow pixels={[K.box, K.box, K.box, K.box, K.box, K.box, K.box, K.box]} />
        <PixelRow pixels={[K.box, K.box, K.box, K.box, K.box, K.box, K.box, K.box]} />
      </div>
    );
  }

  const eyeOpen = !blinking && (mood === 'sunshine' || mood === 'balanced');
  const isHappy = mood === 'sunshine';

  return (
    <div>
      <PixelRow pixels={[K.body, K.body, T, T, T, T, K.body, K.body]} />
      <PixelRow pixels={[K.body, K.earInner, K.body, T, T, K.body, K.earInner, K.body]} />
      <PixelRow pixels={[T, K.body, K.body, K.body, K.body, K.body, K.body, T]} />
      <PixelRow pixels={[T, K.body, eyeOpen ? K.eye : K.body, eyeOpen ? K.eyeShine : K.body,
        eyeOpen ? K.eyeShine : K.body, eyeOpen ? K.eye : K.body, K.body, T]} />
      <PixelRow pixels={[T, K.body, K.body, K.nose, K.nose, K.body, K.body, T]} />
      <PixelRow pixels={[T, K.body, K.mouth, isHappy ? K.mouth : K.body,
        isHappy ? K.mouth : K.body, K.mouth, K.body, T]} />
      <PixelRow pixels={[T, T, K.body, K.body, K.body, K.body, T, T]} />
    </div>
  );
}

/** Cat sitting relaxed — loaf position */
function CatSitSprite({ mood, blinking }: { mood: MoodTier; blinking?: boolean }) {
  const T = 'transparent';
  const halfEye = blinking ? K.body : K.bodyDark; // half-lid sleepy look

  return (
    <div>
      {/* Ears */}
      <PixelRow pixels={[K.body, K.body, T, T, T, T, K.body, K.body]} />
      <PixelRow pixels={[K.body, K.earInner, K.body, T, T, K.body, K.earInner, K.body]} />
      {/* Head */}
      <PixelRow pixels={[T, K.body, K.body, K.body, K.body, K.body, K.body, T]} />
      {/* Sleepy half-lid eyes */}
      <PixelRow pixels={[T, K.body, halfEye, K.body, K.body, halfEye, K.body, T]} />
      {/* Nose */}
      <PixelRow pixels={[T, K.body, K.body, K.nose, K.nose, K.body, K.body, T]} />
      {/* Content closed mouth */}
      <PixelRow pixels={[T, K.body, K.body, K.body, K.body, K.body, K.body, T]} />
      {/* Loaf body — paws tucked under */}
      <PixelRow pixels={[T, K.body, K.body, K.body, K.body, K.body, K.body, T]} />
      {/* Tail wrapping around */}
      <PixelRow pixels={[K.tail, K.body, K.body, K.body, K.body, K.body, K.body, K.tail]} />
    </div>
  );
}

/** Cat licking its paw */
function CatLickSprite({ mood }: { mood: MoodTier }) {
  const T = 'transparent';
  void mood; // sprite looks the same regardless of mood
  return (
    <div>
      {/* Ears */}
      <PixelRow pixels={[K.body, K.body, T, T, T, T, K.body, K.body]} />
      <PixelRow pixels={[K.body, K.earInner, K.body, T, T, K.body, K.earInner, K.body]} />
      {/* Head */}
      <PixelRow pixels={[T, K.body, K.body, K.body, K.body, K.body, K.body, T]} />
      {/* One eye closed (squinting while licking) */}
      <PixelRow pixels={[T, K.body, K.body, K.body, K.body, K.eye, K.body, T]} />
      {/* Nose */}
      <PixelRow pixels={[T, K.body, K.body, K.nose, K.nose, K.body, K.body, T]} />
      {/* Tongue out + raised paw on right side */}
      <PixelRow pixels={[T, T, K.body, K.tongue, K.body, K.body, K.body, K.body]} />
      {/* Body */}
      <PixelRow pixels={[T, T, K.body, K.body, K.body, K.body, T, T]} />
      {/* Tail */}
      <PixelRow pixels={[T, K.tail, K.body, K.body, K.body, K.tail, T, T]} />
    </div>
  );
}

// ─── Girl ─────────────────────────────────────────────────────────────────────

const G = {
  skin: '#ffd5b0',
  skinDark: '#e0a870',
  hair: '#4a3520',
  hairLight: '#7a5530',
  dress: '#ff6b9d',
  dressDark: '#cc4a7a',
  dressAlt: '#6366f1',
  eye: '#2d3a8c',
  mouth: '#cc4a4a',
  blush: '#ffaaaa',
  book: '#4466cc',
  bookPage: '#f5f0e0',
  chair: '#8b6534',
};

function GirlSprite({ mood, blinking }: { mood: MoodTier; blinking?: boolean }) {
  const T = 'transparent';
  const dressColor = mood === 'sunshine' ? G.dress : mood === 'dark' ? '#444' : G.dressAlt;
  const eyeColor = blinking ? G.skin : G.eye;

  return (
    <div>
      <PixelRow pixels={[T, T, G.hair, G.hair, G.hair, G.hair, T, T]} />
      <PixelRow pixels={[T, G.hair, G.skin, G.skin, G.skin, G.skin, G.hair, T]} />
      <PixelRow pixels={[T, G.hair, G.skin, eyeColor, eyeColor, G.skin, G.hair, T]} />
      {mood === 'sunshine' && (
        <PixelRow pixels={[T, G.hair, G.blush, G.skin, G.skin, G.blush, G.hair, T]} />
      )}
      <PixelRow pixels={[T, G.skin, G.skin,
        mood === 'icequeen' || mood === 'dark' ? G.eye : G.mouth,
        mood === 'icequeen' || mood === 'dark' ? G.eye : G.mouth,
        G.skin, G.skin, T]} />
      <PixelRow pixels={[G.skin, G.skin, dressColor, dressColor, dressColor, dressColor, G.skin, G.skin]} />
      <PixelRow pixels={[T, T, dressColor, dressColor, dressColor, dressColor, T, T]} />
      <PixelRow pixels={[T, dressColor, dressColor, dressColor, dressColor, dressColor, dressColor, T]} />
    </div>
  );
}

/** Girl sitting in chair reading a book */
function GirlSitReadSprite({ mood }: { mood: MoodTier }) {
  const T = 'transparent';
  const dressColor = mood === 'sunshine' ? G.dress : mood === 'dark' ? '#555' : G.dressAlt;

  return (
    <div>
      {/* Hair */}
      <PixelRow pixels={[T, T, G.hair, G.hair, G.hair, G.hair, T, T]} />
      {/* Head */}
      <PixelRow pixels={[T, G.hair, G.skin, G.skin, G.skin, G.skin, G.hair, T]} />
      {/* Eyes looking down at book */}
      <PixelRow pixels={[T, G.hair, G.skin, G.eye, G.skin, G.eye, G.hair, T]} />
      {/* Lower face — tiny reading smile */}
      <PixelRow pixels={[T, G.skin, G.skin, G.skin, G.mouth, G.skin, G.skin, T]} />
      {/* Body seated (compact) + chair arms */}
      <PixelRow pixels={[G.chair, G.skin, dressColor, dressColor, dressColor, dressColor, G.skin, G.chair]} />
      {/* Hands holding book + book cover */}
      <PixelRow pixels={[G.chair, G.skin, G.book, G.book, G.book, G.book, G.skin, G.chair]} />
      {/* Open book pages */}
      <PixelRow pixels={[T, T, G.bookPage, G.book, G.book, G.bookPage, T, T]} />
      {/* Chair legs */}
      <PixelRow pixels={[G.chair, T, T, T, T, T, T, G.chair]} />
    </div>
  );
}

// ─── Floating Effects ─────────────────────────────────────────────────────────

function FloatingEffects({ mood, visible }: { mood: MoodTier; visible: boolean }) {
  if (!visible) return null;

  if (mood === 'sunshine') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {['★', '♥', '✦'].map((star, i) => (
          <div
            key={i}
            className="absolute text-yellow-400 font-pixel"
            style={{
              animation: `starPop 1.5s ease-out ${i * 0.3}s infinite`,
              top: `${20 + i * 20}%`,
              left: `${10 + i * 30}%`,
              fontSize: '10px',
            }}
          >
            {star}
          </div>
        ))}
      </div>
    );
  }

  if (mood === 'dark') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {['Z', 'z', 'z'].map((z, i) => (
          <div
            key={i}
            className="absolute font-pixel text-gray-400"
            style={{
              animation: `zzzFloat 2s ease-out ${i * 0.6}s infinite`,
              top: `${10 + i * 15}%`,
              right: `${5 + i * 8}%`,
              fontSize: `${10 - i * 2}px`,
              opacity: 0,
            }}
          >
            {z}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// ─── Idle ZZZ overlay (while character is doing idle animations) ───────────────

function IdleOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute top-0 right-0 pointer-events-none" style={{ fontSize: '8px', opacity: 0.6 }}>
      <span
        className="font-pixel"
        style={{
          animation: 'zzzFloat 2.5s ease-out 0s infinite',
          display: 'inline-block',
          color: 'var(--text-muted)',
          opacity: 0,
        }}
      >
        z
      </span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const MOOD_ANIMATIONS: Record<MoodTier, string> = {
  sunshine: 'animate-pixel-bounce',
  balanced: 'animate-pixel-float',
  sideeye: 'animate-pixel-waddle',
  icequeen: '',
  dark: 'animate-pixel-sleep',
};

type IdleAction = 'none' | 'bubble' | 'sit' | 'lick' | 'sit_read';

const IDLE_SEQUENCES: Record<CharacterMode, IdleAction[]> = {
  creature: ['bubble', 'none', 'bubble', 'none'],
  cat: ['sit', 'lick', 'sit', 'none', 'lick'],
  girl: ['sit_read'],
};

export function PixelCharacter({
  mode,
  moodTier,
  animationLevel = 'full',
  isIdle = false,
  onInteract,
  className,
}: PixelCharacterProps) {
  const [showEffects, setShowEffects] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [wanderX, setWanderX] = useState(0);
  const [facingRight, setFacingRight] = useState(true);
  const [idleAction, setIdleAction] = useState<IdleAction>('none');
  const effectsRef = useRef<NodeJS.Timeout>();
  const blinkRef = useRef<NodeJS.Timeout>();
  const wanderRef = useRef<NodeJS.Timeout>();
  const idleRef = useRef<NodeJS.Timeout>();

  // Periodic floating effects
  useEffect(() => {
    if (animationLevel === 'off') return;
    effectsRef.current = setInterval(() => {
      setShowEffects(true);
      setTimeout(() => setShowEffects(false), 2000);
    }, 8000);
    return () => clearInterval(effectsRef.current);
  }, [animationLevel]);

  // Blinking
  useEffect(() => {
    if (animationLevel === 'off') return;
    const scheduleBlink = () => {
      const delay = 3000 + Math.random() * 2000;
      blinkRef.current = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 150);
      }, delay);
    };
    scheduleBlink();
    return () => clearTimeout(blinkRef.current);
  }, [animationLevel]);

  // Horizontal wandering — pauses when idle
  useEffect(() => {
    if (animationLevel === 'off' || animationLevel === 'reduced') return;
    if (moodTier === 'dark' || isIdle) return;
    const wander = () => {
      setWanderX((prev) => {
        const next = Math.round((Math.random() - 0.5) * 56);
        setFacingRight(next >= prev);
        return next;
      });
      wanderRef.current = setTimeout(wander, 2200 + Math.random() * 3000);
    };
    wanderRef.current = setTimeout(wander, 800 + Math.random() * 1500);
    return () => clearTimeout(wanderRef.current);
  }, [animationLevel, moodTier, isIdle]);

  // Reset position on special moods
  useEffect(() => {
    if (moodTier === 'dark') { setWanderX(-20); setFacingRight(false); }
    if (moodTier === 'icequeen') setWanderX(0);
  }, [moodTier]);

  // Idle action cycling
  useEffect(() => {
    if (!isIdle || animationLevel === 'off') {
      setIdleAction('none');
      return;
    }
    const actions = IDLE_SEQUENCES[mode];
    let idx = 0;

    const next = () => {
      setIdleAction(actions[idx % actions.length]);
      idx++;
      idleRef.current = setTimeout(next, 3800 + Math.random() * 2000);
    };

    setIdleAction(actions[0]);
    idx = 1;
    idleRef.current = setTimeout(next, 4200);

    return () => {
      clearTimeout(idleRef.current);
      setIdleAction('none');
    };
  }, [isIdle, mode, animationLevel]);

  const handleClick = () => {
    if (animationLevel !== 'off') {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
    }
    onInteract?.();
  };

  const animClass =
    animationLevel === 'off'
      ? ''
      : animationLevel === 'reduced'
      ? 'animate-pixel-float'
      : isAnimating
      ? 'animate-pixel-celebrate'
      : isIdle && idleAction !== 'none'
      ? 'animate-pixel-float' // calm float during idle
      : MOOD_ANIMATIONS[moodTier];

  const renderSprite = () => {
    // Cat in box — ignore idle (stays in box)
    const catInBox = mode === 'cat' && (moodTier === 'icequeen' || moodTier === 'dark');

    if (!catInBox) {
      if (idleAction === 'bubble') return <CreatureBubbleSprite />;
      if (idleAction === 'sit') return <CatSitSprite mood={moodTier} blinking={isBlinking} />;
      if (idleAction === 'lick') return <CatLickSprite mood={moodTier} />;
      if (idleAction === 'sit_read') return <GirlSitReadSprite mood={moodTier} />;
    }

    switch (mode) {
      case 'cat':   return <CatSprite mood={moodTier} blinking={isBlinking} />;
      case 'girl':  return <GirlSprite mood={moodTier} blinking={isBlinking} />;
      default:      return <CreatureSprite mood={moodTier} blinking={isBlinking} />;
    }
  };

  return (
    <div
      className={cn('relative inline-flex items-center justify-center cursor-pointer select-none', className)}
      onClick={handleClick}
      role="button"
      aria-label="Victoria — tap to interact"
    >
      <div
        className={cn('relative', animClass)}
        style={{
          imageRendering: 'pixelated',
          transform: `translateX(${wanderX}px) scaleX(${facingRight ? 1 : -1})`,
          transition: 'transform 0.9s ease-in-out',
        }}
      >
        {renderSprite()}
      </div>
      <FloatingEffects mood={moodTier} visible={showEffects && animationLevel !== 'off'} />
      <IdleOverlay visible={isIdle && animationLevel !== 'off'} />
    </div>
  );
}
