// ─── 8-bit Sound Effects via Web Audio API ────────────────────────────────────
// All sounds generated procedurally — no audio files required.

let _ctx: AudioContext | null = null;

function clampVolume(volume: number) {
  return Math.max(0, Math.min(1.5, volume));
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!_ctx) {
      _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return _ctx;
  } catch {
    return null;
  }
}

function beep(
  freq: number,
  duration: number,
  type: OscillatorType = 'square',
  volume = 0.18,
  delay = 0,
) {
  const c = getCtx();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    gain.gain.setValueAtTime(0, c.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + duration + 0.02);
  } catch {
    // audio not available
  }
}

function scaleVolume(baseVolume: number, multiplier = 1) {
  return clampVolume(baseVolume * multiplier);
}

// ─── Mini-game sounds ─────────────────────────────────────────────────────────

export function playFeed(multiplier = 1) {
  // Ascending happy nom-nom tones
  beep(262, 0.08, 'square', scaleVolume(0.15, multiplier), 0);
  beep(330, 0.08, 'square', scaleVolume(0.15, multiplier), 0.09);
  beep(392, 0.14, 'square', scaleVolume(0.15, multiplier), 0.18);
}

export function playPlay(multiplier = 1) {
  // Bouncy playful sequence
  beep(523, 0.06, 'square', scaleVolume(0.15, multiplier), 0);
  beep(784, 0.06, 'square', scaleVolume(0.15, multiplier), 0.08);
  beep(523, 0.06, 'square', scaleVolume(0.15, multiplier), 0.16);
  beep(659, 0.12, 'square', scaleVolume(0.15, multiplier), 0.24);
}

export function playClean(multiplier = 1) {
  // Light water-chime
  beep(880, 0.1, 'triangle', scaleVolume(0.14, multiplier), 0);
  beep(1047, 0.16, 'triangle', scaleVolume(0.14, multiplier), 0.12);
}

export function playSleep(multiplier = 1) {
  // Descending lullaby
  beep(392, 0.18, 'triangle', scaleVolume(0.12, multiplier), 0);
  beep(330, 0.18, 'triangle', scaleVolume(0.10, multiplier), 0.20);
  beep(262, 0.30, 'triangle', scaleVolume(0.08, multiplier), 0.40);
}

export function playSuccess(multiplier = 1) {
  // Classic 8-bit fanfare
  beep(523, 0.08, 'square', scaleVolume(0.15, multiplier), 0);
  beep(659, 0.08, 'square', scaleVolume(0.15, multiplier), 0.09);
  beep(784, 0.08, 'square', scaleVolume(0.15, multiplier), 0.18);
  beep(1047, 0.22, 'square', scaleVolume(0.15, multiplier), 0.27);
}

export function playError(multiplier = 1) {
  // Low buzzer
  beep(196, 0.08, 'square', scaleVolume(0.2, multiplier), 0);
  beep(175, 0.18, 'square', scaleVolume(0.2, multiplier), 0.09);
}

// ─── Cat-specific ─────────────────────────────────────────────────────────────

export function playHiss(multiplier = 1) {
  // Noise burst
  const c = getCtx();
  if (!c) return;
  try {
    const bufSize = Math.floor(c.sampleRate * 0.22);
    const buffer = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    const gain = c.createGain();
    src.connect(gain);
    gain.connect(c.destination);
    gain.gain.setValueAtTime(scaleVolume(0.3, multiplier), c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
    src.start();
    src.stop(c.currentTime + 0.25);
  } catch { /* noop */ }
}

export function playPurr(multiplier = 1) {
  // Low rumble
  beep(55, 0.12, 'sawtooth', scaleVolume(0.12, multiplier), 0);
  beep(58, 0.12, 'sawtooth', scaleVolume(0.10, multiplier), 0.12);
  beep(55, 0.12, 'sawtooth', scaleVolume(0.08, multiplier), 0.24);
}

// ─── Girl-specific ────────────────────────────────────────────────────────────

export function playGift(multiplier = 1) {
  // Sparkle arpeggio
  beep(1047, 0.08, 'triangle', scaleVolume(0.13, multiplier), 0);
  beep(1319, 0.08, 'triangle', scaleVolume(0.13, multiplier), 0.10);
  beep(1568, 0.18, 'triangle', scaleVolume(0.13, multiplier), 0.20);
}

export function playCompliment(multiplier = 1) {
  // Soft blush
  beep(659, 0.10, 'sine', scaleVolume(0.12, multiplier), 0);
  beep(784, 0.16, 'sine', scaleVolume(0.10, multiplier), 0.13);
}

// ─── Interaction ──────────────────────────────────────────────────────────────

export function playInteract(multiplier = 1) {
  beep(660, 0.07, 'square', scaleVolume(0.10, multiplier));
}

export function playBubblePop(multiplier = 1) {
  beep(880, 0.04, 'sine', scaleVolume(0.13, multiplier), 0);
  beep(1100, 0.04, 'sine', scaleVolume(0.11, multiplier), 0.05);
  beep(1500, 0.09, 'sine', scaleVolume(0.07, multiplier), 0.10);
}
