import { WORLD_CONFIGS, type WorldConfig } from './WorldConfiguration';
import type { GameSettings, WorldId } from './types';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private stepIndex = 0;
  private musicActive = false;
  private worldConfig: WorldConfig = WORLD_CONFIGS.modern_cairo;
  private settings: GameSettings = {
    soundEnabled: true,
    musicVolume: 0.45,
    sfxVolume: 0.7,
    checkpointsEnabled: true,
    checkpointIntervalMeters: 250,
  };

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setWorld(worldId: WorldId): void {
    this.worldConfig = WORLD_CONFIGS[worldId];
    if (this.musicActive) {
      this.stopMusic();
      this.startMusic();
    }
  }

  public updateSettings(settings: GameSettings): void {
    this.settings = { ...settings };
    this.applyVolumes();
    if (!settings.soundEnabled) {
      this.stopMusic();
    }
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.settings.soundEnabled ? 1 : 0, now, 0.02);
    this.musicGain.gain.setTargetAtTime(this.settings.musicVolume * 0.28, now, 0.03);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxVolume * 0.52, now, 0.02);
  }

  public unlock(): void {
    this.ensureContext();
  }

  public startMusic(): void {
    if (!this.settings.soundEnabled || this.musicActive) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.musicGain) return;
    this.musicActive = true;

    const cfg = this.worldConfig;
    // Subtle environmental drone/hum tuned to the world
    try {
      this.ambientOsc = ctx.createOscillator();
      this.ambientGain = ctx.createGain();
      this.ambientOsc.type = 'sine';
      this.ambientOsc.frequency.setValueAtTime(cfg.ambientToneHz, ctx.currentTime);
      this.ambientGain.gain.setValueAtTime(0.06, ctx.currentTime);
      this.ambientOsc.connect(this.ambientGain);
      this.ambientGain.connect(this.musicGain);
      this.ambientOsc.start();
    } catch {
      // Ignore audio node errors
    }

    const scheduleStep = () => {
      if (!this.musicActive || !this.settings.soundEnabled || !this.ctx || !this.musicGain) return;
      const now = this.ctx.currentTime;
      const scale = this.worldConfig.musicScale;
      const bass = this.worldConfig.musicBass;
      const idx = this.stepIndex % scale.length;
      this.stepIndex++;

      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = this.worldConfig.musicWave;
      osc.frequency.setValueAtTime(scale[idx], now);
      env.gain.setValueAtTime(0.001, now);
      env.gain.exponentialRampToValueAtTime(0.24, now + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(env);
      env.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 0.16);

      if (idx % 2 === 0) {
        const bOsc = this.ctx.createOscillator();
        const bEnv = this.ctx.createGain();
        bOsc.type = this.worldConfig.id === 'futuristic_city' ? 'sawtooth' : 'triangle';
        bOsc.frequency.setValueAtTime(bass[idx], now);
        bEnv.gain.setValueAtTime(0.001, now);
        bEnv.gain.exponentialRampToValueAtTime(0.2, now + 0.015);
        bEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
        bOsc.connect(bEnv);
        bEnv.connect(this.musicGain);
        bOsc.start(now);
        bOsc.stop(now + 0.22);
      }
    };

    this.musicTimer = window.setInterval(scheduleStep, cfg.musicTempoMs);
  }

  public stopMusic(): void {
    this.musicActive = false;
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.ambientOsc) {
      try {
        this.ambientOsc.stop();
        this.ambientOsc.disconnect();
      } catch {
        // Ignore
      }
      this.ambientOsc = null;
    }
    if (this.ambientGain) {
      this.ambientGain.disconnect();
      this.ambientGain = null;
    }
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume = 0.35,
    delay = 0,
  ): void {
    if (!this.settings.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + duration);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  public playClick(): void {
    this.playTone(540, 780, 0.06, 'sine', 0.26);
  }

  public playStep(): void {
    const base = this.worldConfig.id === 'snow_adventure' ? 140 : 95;
    const pitch = base + Math.random() * 25;
    this.playTone(pitch, 50, 0.045, 'triangle', 0.11);
  }

  public playLaneSwitch(): void {
    this.playTone(320, 490, 0.07, 'sine', 0.18);
  }

  public playJump(): void {
    const jitter = 0.92 + Math.random() * 0.16;
    this.playTone(240 * jitter, 640 * jitter, 0.16, 'sine', 0.32);
  }

  public playSlide(): void {
    this.playTone(360, 140, 0.15, 'sawtooth', 0.18);
  }

  public playCoin(combo = 0): void {
    const base = 880 + Math.min(8, combo) * 45;
    this.playTone(base, base * 1.48, 0.09, 'sine', 0.3);
    this.playTone(base * 1.5, base * 2.0, 0.08, 'triangle', 0.2, 0.04);
  }

  public playGem(): void {
    this.playTone(784, 1046, 0.12, 'triangle', 0.34);
    this.playTone(1174, 1568, 0.16, 'sine', 0.3, 0.06);
  }

  public playPowerUp(): void {
    this.playTone(440, 587, 0.1, 'triangle', 0.35, 0);
    this.playTone(587, 784, 0.12, 'triangle', 0.35, 0.08);
    this.playTone(880, 1174, 0.18, 'sine', 0.4, 0.16);
  }

  public playShieldSave(): void {
    this.playTone(620, 220, 0.22, 'sawtooth', 0.38);
    this.playTone(440, 880, 0.18, 'sine', 0.3, 0.08);
  }

  public playCrash(): void {
    this.playTone(180, 42, 0.34, 'sawtooth', 0.5);
    this.playTone(120, 35, 0.28, 'square', 0.35, 0.04);
  }

  public playCheckpoint(correct?: boolean): void {
    if (correct === undefined) {
      this.playTone(523, 659, 0.12, 'triangle', 0.32);
      this.playTone(659, 784, 0.16, 'triangle', 0.32, 0.09);
    } else if (correct) {
      this.playTone(523, 659, 0.1, 'sine', 0.35, 0);
      this.playTone(659, 784, 0.1, 'sine', 0.35, 0.08);
      this.playTone(784, 1046, 0.2, 'sine', 0.4, 0.16);
    } else {
      this.playTone(300, 210, 0.22, 'sawtooth', 0.28);
    }
  }
}

export const audioManager = new AudioManager();
