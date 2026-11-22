import React from 'react';
import { Pause, Shield, Volume2, VolumeX } from 'lucide-react';
import { GAME_TITLE, POWERUP_LABELS } from '../game/constants';
import { getUpgradedPowerUpDuration } from '../game/rules';
import type { HudSnapshot, PowerUpType, UpgradeLevels } from '../game/types';
import { CoinIcon, GemIcon, PowerUpIcon, StarMultiplierIcon } from './GameIcons';

interface GameHudProps {
  hud: HudSnapshot;
  activeLessonLabel?: string;
  soundEnabled: boolean;
  hoverboardCharges: number;
  upgradeLevels: UpgradeLevels;
  onActivateHoverboard: () => void;
  onPause: () => void;
  onToggleSound: () => void;
}

const POWERUP_ORDER: PowerUpType[] = ['magnet', 'jetpack', 'sneakers', 'multiplier', 'hoverboard'];

export function GameHud({
  hud,
  activeLessonLabel,
  soundEnabled,
  hoverboardCharges,
  upgradeLevels,
  onActivateHoverboard,
  onPause,
  onToggleSound,
}: GameHudProps) {
  const activePowerUps = POWERUP_ORDER.filter((type) => hud.powerUps[type] > 0);
  const metersToCheckpoint = Math.max(0, hud.nextCheckpointDist - hud.distance);

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 z-10">
      {/* Top Bar: Left Controls & Distance | Center Checkpoint Clue | Right Score & Coins */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left Cluster */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause Game"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="pointer-events-auto w-11 h-11 rounded-xl bg-[#092b6b]/95 hover:bg-[#0e3f99] border-2 border-sky-400 flex items-center justify-center text-white shadow-lg cursor-pointer"
          >
            <Pause className="w-5 h-5 fill-white" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleSound();
            }}
            className="pointer-events-auto w-11 h-11 rounded-xl bg-[#092b6b]/95 hover:bg-[#0e3f99] border-2 border-sky-400 flex items-center justify-center text-white shadow-lg cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-rose-300" />}
          </button>

          <div className="bg-[#092b6b]/95 border-2 border-sky-400/80 rounded-xl px-3 py-1.5 shadow-md">
            <div className="hidden sm:block text-[10px] font-black tracking-wide text-sky-200 leading-none mb-0.5" data-testid="hud-game-title">
              {GAME_TITLE}
            </div>
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-300 leading-none">
              {hud.activeWorldName}{activeLessonLabel ? ` · ${activeLessonLabel}` : ''}
            </div>
            <div className="tabular-nums font-black text-lg text-white leading-tight" data-testid="hud-distance">
              {hud.distance}m
            </div>
          </div>
        </div>

        {/* Optional Top-Center Checkpoint Countdown */}
        {hud.checkpointsEnabled && (
          <div className="hidden md:flex items-center gap-2 bg-[#092b6b]/95 border border-amber-300/75 rounded-xl px-3.5 py-1.5 shadow">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-200">
              Checkpoint
            </span>
            <span className="tabular-nums font-black text-sm text-white">
              {metersToCheckpoint}m
            </span>
          </div>
        )}

        {/* Top-Right Cluster: Score + Coins + Gems */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 bg-[#092b6b]/95 border-2 border-sky-400 rounded-xl px-3.5 py-1.5 shadow-lg">
            <div className="flex items-center gap-1">
              <StarMultiplierIcon className="w-5 h-5" />
              <span className="font-black text-xs text-yellow-300 tabular-nums">
                x{hud.multiplier}
              </span>
            </div>
            <span
              className="tabular-nums font-black text-xl sm:text-2xl text-white tracking-tight"
              data-testid="hud-score"
            >
              {hud.score.toString().padStart(6, '0')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#092b6b]/95 border-2 border-amber-400/85 rounded-xl px-3 py-1 shadow">
              <CoinIcon className="w-5 h-5" />
              <span className="tabular-nums font-black text-base text-yellow-300" data-testid="hud-coins">
                {hud.runCoins}
              </span>
              <span className="text-[11px] font-bold text-amber-200/80 tabular-nums border-l border-amber-400/35 pl-1.5" data-testid="hud-total-coins">
                {hud.totalCoins}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#092b6b]/95 border-2 border-sky-400/85 rounded-xl px-3 py-1 shadow">
              <GemIcon className="w-4 h-4" />
              <span className="tabular-nums font-black text-base text-sky-200">
                {hud.runGems}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Active Power-up Duration Gauges & Reserve Hoverboard Trigger */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {activePowerUps.map((type) => {
            const rem = hud.powerUps[type];
            const max = getUpgradedPowerUpDuration(type, upgradeLevels);
            const pct = Math.max(0, Math.min(100, (rem / max) * 100));
            const meta = POWERUP_LABELS[type];
            return (
              <div
                key={type}
                className="flex items-center gap-2 bg-[#092b6b]/95 border-2 border-sky-400 rounded-xl px-2.5 py-1.5 shadow-lg min-w-[140px]"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-900/90 flex items-center justify-center shrink-0">
                  <PowerUpIcon type={type} className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase text-white leading-none mb-1">
                    <span>{meta.short}</span>
                    <span className="tabular-nums text-sky-200">{rem.toFixed(1)}s</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-75"
                      style={{ width: `${pct}%`, backgroundColor: meta.color }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {hud.shieldActive ? (
            <div className="bg-cyan-500/95 border-2 border-cyan-200 rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg">
              Shield Active
            </div>
          ) : hoverboardCharges > 0 ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onActivateHoverboard();
              }}
              className="pointer-events-auto flex items-center gap-1.5 bg-[#092b6b]/95 hover:bg-cyan-700 border-2 border-cyan-300 rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider text-cyan-200 shadow-lg cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              <span>[H] Shield x{hoverboardCharges}</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
