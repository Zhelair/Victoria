'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { CharacterMode, MoodTier } from '@/types';

interface PixelCharacterProps {
  mode: CharacterMode;
  moodTier: MoodTier;
  animationLevel?: 'full' | 'reduced' | 'off';
  onInteract?: () => void;
  className?: string;
}

// ─── Pixel Art using CSS (pure CSS pixel sprites) ─────────────────────────────
// Each character is drawn using a grid of colored divs
// Size unit: 1 pixel = 6px

const PIXEL = 6;

function Pixel({ color, size = 1 }: { color: string; size?: number }) {
  if (color === 'transparent' || color === '') return (
    <div style={{ width: PIXEL * size, height: PIXEL, display: 'inline-block' }} />
  );
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
      {pixels.map((p, i) => {
        if (Array.isArray(p)) {
          return <Pixel key={i} color={p[0]} size={p[1]} />;
        }
        return <Pixel key={i} color={p} />;
      })}
    </div>
  );
}

// ─── Creature Sprites ─────────────────────────────────────────────────────────

const CREATURE_COLORS = {
  body: '#4a9f4a',
  bodyDark: '#2d7a2d',
  eye: '#0f380f',
  eyeWhite: '#8bbc0f',
  blush: '#ff9999',
  mouth: '#0f380f',
  tongue: '#ff6666',
  star: '#ffdd00',
  tear: '#4499ff',
  steam: '#cccccc',
};

function CreatureSprite({ mood }: { mood: MoodTier }) {
  const c = CREATURE_COLORS;
  const T = 'transparent';

  const sprites: Record<MoodTier, JSX.Element> = {
    sunshine: (
      <div>
        {/* Arms up happy */}
        <PixelRow pixels={[T, T, c.body, T, T, T, c.body, T, T]} />
        <PixelRow pixels={[T, c.body, c.body, T, T, T, c.body, c.body, T]} />
        <PixelRow pixels={[T, T, c.body, c.body, c.body, c.body, c.body, T, T]} />
        <PixelRow pixels={[T, c.body, c.eye, c.body, c.body, c.eye, c.body, T, T]} />
        <PixelRow pixels={[T, c.body, c.blush, c.body, c.body, c.blush, c.body, T, T]} />
        <PixelRow pixels={[T, c.body, c.body, c.mouth, c.tongue, c.mouth, c.body, T, T]} />
        <PixelRow pixels={[T, T, c.body, c.body, c.body, c.body, c.body, T, T]} />
        <PixelRow pixels={[T, T, c.body, T, T, T, c.body, T, T]} />
      </div>
    ),
    balanced: (
      <div>
        <PixelRow pixels={[T, T, c.body, c.body, c.body, c.body, c.body, T, T]} />
        <PixelRow pixels={[T, c.body, c.body, c.body, c.body, c.body, c.body, c.body, T]} />
        <PixelRow pixels={[T, c.body, c.eye, c.body, c.body, c.eye, c.body, c.body, T]} />
        <PixelRow pixels={[T, c.body, c.body, c.body, c.body, c.body, c.body, c.body, T]} />
        <PixelRow pixels={[T, c.body, c.body, c.mouth, c.mouth, c.mouth, c.body, c.body, T]} />
        <PixelRow pixels={[T, T, c.body, c.body, c.body, c.body, c.body, T, T]} />
        <PixelRow pixels={[T, T, T, c.body, T, c.body, T, T, T]} />
      </div>
    ),
    sideeye: (
      <div>
        <PixelRow pixels={[T, T, c.body, c.body, c.body, c.body, c.body, T, T]} />
        <PixelRow pixels={[T, c.body, c.body, c.body, c.body, c.body, c.body, c.body, T]} />
        <PixelRow pixels={[T, c.body, c.body, c.eye, c.body, c.body, c.eye, c.body, T]} />
        <PixelRow pixels={[T, c.body, c.body, c.body, c.body, c.body, c.body, c.body, T]} />
        <PixelRow pixels={[T, c.body, c.body, c.mouth, c.mouth, c.body, c.body, c.body, T]} />
        <PixelRow pixels={[T, T, c.body, c.body, c.body, c.body, c.body, T, T]} />
        <PixelRow pixels={[T, T, T, c.body, T, c.body, T, T, T]} />
      </div>
    ),
    icequeen: (
      <div>
        <PixelRow pixels={[T, T, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, T, T]} />
        <PixelRow pixels={[T, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, T]} />
        <PixelRow pixels={[T, c.bodyDark, c.eye, c.bodyDark, c.bodyDark, c.eye, c.bodyDark, c.bodyDark, T]} />
        <PixelRow pixels={[T, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, T]} />
        <PixelRow pixels={[T, c.bodyDark, c.mouth, c.mouth, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, T]} />
        <PixelRow pixels={[T, T, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, T, T]} />
      </div>
    ),
    dark: (
      <div>
        {/* Turned around or curled up */}
        <PixelRow pixels={[T, T, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, T, T]} />
        <PixelRow pixels={[T, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, T]} />
        <PixelRow pixels={[T, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, T]} />
        <PixelRow pixels={[T, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, T]} />
        <PixelRow pixels={[T, T, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, c.bodyDark, T, T]} />
        {/* Single eye peeking */}
        <PixelRow pixels={[T, T, T, T, c.eye, T, T, T, T]} />
      </div>
    ),
  };

  return sprites[mood];
}

// ─── Cat Sprites ──────────────────────────────────────────────────────────────

const CAT_COLORS = {
  body: '#b8e0f0',
  bodyDark: '#7ab8cc',
  ear: '#b8e0f0',
  earInner: '#ffb3c6',
  eye: '#2d5a6e',
  eyeShine: '#ffffff',
  nose: '#ff9999',
  mouth: '#2d5a6e',
  whisker: '#2d5a6e',
  tail: '#b8e0f0',
  box: '#c8a855',
  boxDark: '#a08040',
  pupil: '#111111',
};

function CatSprite({ mood }: { mood: MoodTier }) {
  const c = CAT_COLORS;
  const T = 'transparent';

  if (mood === 'icequeen' || mood === 'dark') {
    // Cardboard box mode - only eyes visible
    return (
      <div>
        <PixelRow pixels={[c.box, c.box, c.box, c.box, c.box, c.box, c.box, c.box]} />
        <PixelRow pixels={[c.box, c.boxDark, c.boxDark, c.boxDark, c.boxDark, c.boxDark, c.boxDark, c.box]} />
        <PixelRow pixels={[c.box, c.boxDark, T, c.boxDark, c.boxDark, T, c.boxDark, c.box]} />
        <PixelRow pixels={[c.box, c.boxDark, c.pupil, c.boxDark, c.boxDark, c.pupil, c.boxDark, c.box]} />
        <PixelRow pixels={[c.box, c.boxDark, T, c.boxDark, c.boxDark, T, c.boxDark, c.box]} />
        <PixelRow pixels={[c.box, c.box, c.box, c.box, c.box, c.box, c.box, c.box]} />
        <PixelRow pixels={[c.box, c.box, c.box, c.box, c.box, c.box, c.box, c.box]} />
      </div>
    );
  }

  const eyeOpen = mood === 'sunshine' || mood === 'balanced';
  const isHappy = mood === 'sunshine';

  return (
    <div>
      {/* Ears */}
      <PixelRow pixels={[c.ear, c.ear, T, T, T, T, c.ear, c.ear]} />
      <PixelRow pixels={[c.ear, c.earInner, c.ear, T, T, c.ear, c.earInner, c.ear]} />
      {/* Head */}
      <PixelRow pixels={[T, c.body, c.body, c.body, c.body, c.body, c.body, T]} />
      {/* Eyes */}
      <PixelRow pixels={[
        T, c.body,
        eyeOpen ? c.eye : c.body,
        eyeOpen ? c.eyeShine : c.body,
        eyeOpen ? c.eyeShine : c.body,
        eyeOpen ? c.eye : c.body,
        c.body, T
      ]} />
      {/* Nose & mouth */}
      <PixelRow pixels={[T, c.body, c.body, c.nose, c.nose, c.body, c.body, T]} />
      <PixelRow pixels={[
        T, c.body,
        c.mouth,
        isHappy ? c.mouth : c.body,
        isHappy ? c.mouth : c.body,
        c.mouth,
        c.body, T
      ]} />
      {/* Chin */}
      <PixelRow pixels={[T, T, c.body, c.body, c.body, c.body, T, T]} />
    </div>
  );
}

// ─── Girl Sprites ─────────────────────────────────────────────────────────────

const GIRL_COLORS = {
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
  bow: '#ff3366',
};

function GirlSprite({ mood }: { mood: MoodTier }) {
  const c = GIRL_COLORS;
  const T = 'transparent';

  const dressColor = mood === 'sunshine' ? c.dress : mood === 'dark' ? '#444' : c.dressAlt;

  return (
    <div>
      {/* Hair top */}
      <PixelRow pixels={[T, T, c.hair, c.hair, c.hair, c.hair, T, T]} />
      {/* Head */}
      <PixelRow pixels={[T, c.hair, c.skin, c.skin, c.skin, c.skin, c.hair, T]} />
      {/* Eyes */}
      <PixelRow pixels={[T, c.hair, c.skin, c.eye, c.eye, c.skin, c.hair, T]} />
      {/* Blush & mouth */}
      {mood === 'sunshine' && (
        <PixelRow pixels={[T, c.hair, c.blush, c.skin, c.skin, c.blush, c.hair, T]} />
      )}
      <PixelRow pixels={[
        T, c.skin, c.skin,
        mood === 'icequeen' || mood === 'dark' ? c.eye : c.mouth,
        mood === 'icequeen' || mood === 'dark' ? c.eye : c.mouth,
        c.skin, c.skin, T
      ]} />
      {/* Arms & body */}
      <PixelRow pixels={[c.skin, c.skin, dressColor, dressColor, dressColor, dressColor, c.skin, c.skin]} />
      <PixelRow pixels={[T, T, dressColor, dressColor, dressColor, dressColor, T, T]} />
      {/* Skirt */}
      <PixelRow pixels={[T, dressColor, dressColor, dressColor, dressColor, dressColor, dressColor, T]} />
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
            className="absolute text-yellow-400 font-pixel text-xs"
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

// ─── Main Component ───────────────────────────────────────────────────────────

const MOOD_ANIMATIONS: Record<MoodTier, string> = {
  sunshine: 'animate-pixel-bounce',
  balanced: 'animate-pixel-float',
  sideeye: 'animate-pixel-waddle',
  icequeen: '',
  dark: 'animate-pixel-sleep',
};

export function PixelCharacter({
  mode,
  moodTier,
  animationLevel = 'full',
  onInteract,
  className,
}: PixelCharacterProps) {
  const [showEffects, setShowEffects] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (animationLevel === 'off') return;
    // Show effects periodically
    intervalRef.current = setInterval(() => {
      setShowEffects(true);
      setTimeout(() => setShowEffects(false), 2000);
    }, 8000);
    return () => clearInterval(intervalRef.current);
  }, [animationLevel]);

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
      : MOOD_ANIMATIONS[moodTier];

  const renderSprite = () => {
    switch (mode) {
      case 'cat':
        return <CatSprite mood={moodTier} />;
      case 'girl':
        return <GirlSprite mood={moodTier} />;
      default:
        return <CreatureSprite mood={moodTier} />;
    }
  };

  return (
    <div
      className={cn('relative inline-flex items-center justify-center cursor-pointer select-none', className)}
      onClick={handleClick}
      role="button"
      aria-label="Victoria - tap to interact"
    >
      <div className={cn('relative transition-transform', animClass)} style={{ imageRendering: 'pixelated' }}>
        {renderSprite()}
      </div>
      <FloatingEffects mood={moodTier} visible={showEffects && animationLevel !== 'off'} />
    </div>
  );
}
