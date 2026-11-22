import React from 'react';
import { ArrowLeft, ArrowUpCircle, Check, Lock, Play, RotateCw, Shield, X } from 'lucide-react';
import {
  CHARACTERS,
  CHECKPOINT_CONFIG,
  DAILY_MISSIONS,
  GAME_TITLE,
  POWERUP_LABELS,
  UPGRADE_BASE_COST,
  UPGRADE_MAX_LEVEL,
} from '../game/constants';
import { WORLD_CONFIGS } from '../game/WorldConfiguration';
import type { PowerUpType, SaveData } from '../game/types';
import { CoinIcon, GemIcon, InternationalEducationEgyptLogo, PowerUpIcon } from './GameIcons';

interface CharactersModalProps {
  save: SaveData;
  previewCharId: string;
  activeLessonLabel?: string;
  onPreviewChar: (id: string) => void;
  onBuyOrSelectChar: (id: string) => void;
  onRotatePreview: (delta: number) => void;
  onBackToLessons?: () => void;
  onStartRun?: () => void;
  onClose: () => void;
}

export function CharactersModal({
  save,
  previewCharId,
  activeLessonLabel,
  onPreviewChar,
  onBuyOrSelectChar,
  onRotatePreview,
  onBackToLessons,
  onStartRun,
  onClose,
}: CharactersModalProps) {
  const activeChar = CHARACTERS.find((c) => c.id === previewCharId) ?? CHARACTERS[0];
  const isUnlocked = save.unlockedCharacters.includes(activeChar.id);
  const isSelected = save.selectedCharacterId === activeChar.id;
  const canAfford = save.totalCoins >= activeChar.price;

  return (
    <div
      className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-4 sm:p-6"
      role="dialog"
      aria-label="Character Selection"
      data-testid="characters-modal"
    >
      {/* Top Header Bar */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {onBackToLessons && (
            <button
              type="button"
              data-testid="characters-back-lessons"
              onClick={onBackToLessons}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-2xl bg-[#092b6b] hover:bg-sky-700 border-2 border-sky-400 text-white font-black text-sm shadow-lg cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Lektionen</span>
            </button>
          )}
          <div className="bg-[#092b6b] border-2 border-sky-400 rounded-2xl px-4 py-2 shadow-lg">
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 leading-none mb-0.5">
              {GAME_TITLE}{activeLessonLabel ? ` · ${activeLessonLabel}` : ''}
            </div>
            <h2 className="text-xl font-black text-white leading-tight">Characters Roster</h2>
            <p className="text-xs text-sky-200">Drag the 3D runner or tap Rotate to inspect</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <InternationalEducationEgyptLogo className="hidden sm:block w-24 h-auto shrink-0" />
          <div className="flex items-center gap-2 bg-[#092b6b] border-2 border-amber-400 rounded-2xl px-3.5 py-2 shadow">
            <CoinIcon className="w-5 h-5" />
            <span className="tabular-nums font-black text-lg text-yellow-300">{save.totalCoins}</span>
          </div>
          <button
            type="button"
            aria-label="Close Characters"
            onClick={onClose}
            className="w-11 h-11 rounded-2xl bg-rose-600 hover:bg-rose-500 border-2 border-rose-300 flex items-center justify-center text-white shadow cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Left Side Panel leaving 3D character showcase open on center-right */}
      <div className="pointer-events-auto w-full max-w-sm bg-[#092b6b]/95 border-4 border-sky-400 rounded-3xl p-4 shadow-2xl">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
              {activeChar.role}
            </div>
            <h3 className="text-2xl font-black text-white">{activeChar.name}</h3>
            <p className="text-xs text-sky-200">{activeChar.tagline}</p>
          </div>
          <button
            type="button"
            aria-label="Rotate 3D Character"
            onClick={() => onRotatePreview(0.9)}
            className="w-10 h-10 rounded-xl bg-sky-700 hover:bg-sky-600 border border-sky-300 flex items-center justify-center text-white shrink-0 cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {CHARACTERS.map((char) => {
            const owned = save.unlockedCharacters.includes(char.id);
            const selected = save.selectedCharacterId === char.id;
            const previewing = previewCharId === char.id;
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => onPreviewChar(char.id)}
                className={`flex flex-col items-center p-2 rounded-2xl border-2 transition-colors cursor-pointer ${
                  previewing
                    ? 'bg-sky-600 border-amber-300'
                    : 'bg-[#061c4a] hover:bg-sky-800 border-sky-500/40'
                }`}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white border-2 border-white/80 mb-1"
                  style={{ backgroundColor: char.previewHex }}
                >
                  {char.badgeText}
                </div>
                <span className="text-xs font-extrabold text-white leading-tight">{char.name}</span>
                <span className="text-[10px] font-bold text-sky-200">
                  {selected ? 'Equipped' : owned ? 'Owned' : `${char.price}c`}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!isUnlocked && !canAfford}
          onClick={() => onBuyOrSelectChar(activeChar.id)}
          className={`w-full py-3 rounded-2xl font-black text-base border-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            isSelected
              ? 'bg-emerald-700 border-emerald-300 text-white'
              : isUnlocked
              ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 border-emerald-200 text-white'
              : 'bg-gradient-to-b from-amber-400 to-amber-600 border-amber-200 text-slate-950'
          }`}
        >
          {isSelected ? (
            <>
              <Check className="w-5 h-5" />
              <span>Equipped</span>
            </>
          ) : isUnlocked ? (
            <span>Equip {activeChar.name}</span>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Unlock for {activeChar.price} Coins</span>
            </>
          )}
        </button>

        {onStartRun && (
          <button
            type="button"
            data-testid="characters-start-run"
            onClick={() => {
              if (isUnlocked && !isSelected) {
                onBuyOrSelectChar(activeChar.id);
              }
              onStartRun();
            }}
            className="mt-2.5 w-full py-3 rounded-2xl bg-gradient-to-b from-[#65e83a] via-[#22c55e] to-[#15803d] hover:from-[#7ef44e] hover:to-[#16a34a] border-2 border-white text-white font-black text-base tracking-wide shadow-[0_4px_0_#14532d] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Spielen</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface ShopModalProps {
  save: SaveData;
  onUpgradePowerUp: (type: PowerUpType) => void;
  onBuyHoverboardCharge: (currency: 'coins' | 'gems') => void;
  onClose: () => void;
}

const UPGRADE_TYPES: PowerUpType[] = ['magnet', 'jetpack', 'sneakers', 'multiplier', 'hoverboard'];

export function ShopModal({
  save,
  onUpgradePowerUp,
  onBuyHoverboardCharge,
  onClose,
}: ShopModalProps) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#061539]/85 p-4"
      role="dialog"
      aria-label="Power-Up Shop"
    >
      <div className="w-full max-w-2xl bg-[#092b6b] border-4 border-sky-400 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 leading-none mb-0.5">
              {GAME_TITLE}
            </div>
            <h2 className="text-2xl font-black text-white">Power-Up Upgrades &amp; Gear</h2>
            <p className="text-xs text-sky-200">
              Extend power-up durations (+2s per level) and stock Hoverboard Shields
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-[#061c4a] border border-amber-400 rounded-xl px-3 py-1.5">
              <CoinIcon className="w-4 h-4" />
              <span className="tabular-nums font-black text-yellow-300">{save.totalCoins}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#061c4a] border border-sky-400 rounded-xl px-3 py-1.5">
              <GemIcon className="w-4 h-4" />
              <span className="tabular-nums font-black text-sky-300">{save.totalGems}</span>
            </div>
            <button
              type="button"
              aria-label="Close Shop"
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 border border-rose-300 flex items-center justify-center text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hoverboard Shield Reserve Pack */}
        <div className="bg-[#061c4a] border-2 border-cyan-400/70 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-300 flex items-center justify-center text-cyan-300 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-base text-white">
                Hoverboard Shield Pack · Owned: <span className="text-cyan-300 tabular-nums">{save.hoverboardCharges}</span>
              </div>
              <div className="text-xs text-sky-200">
                Activate mid-run with [H] or the HUD badge to survive one crash
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={save.totalCoins < 75}
              onClick={() => onBuyHoverboardCharge('coins')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-45 text-slate-950 font-black text-xs cursor-pointer disabled:cursor-not-allowed"
            >
              <CoinIcon className="w-4 h-4" />
              <span>75 Coins</span>
            </button>
            <button
              type="button"
              disabled={save.totalGems < 2}
              onClick={() => onBuyHoverboardCharge('gems')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-45 text-white font-black text-xs cursor-pointer disabled:cursor-not-allowed"
            >
              <GemIcon className="w-4 h-4" />
              <span>2 Gems</span>
            </button>
          </div>
        </div>

        {/* Power-up Level Upgrades */}
        <div className="flex flex-col gap-2.5">
          {UPGRADE_TYPES.map((type) => {
            const meta = POWERUP_LABELS[type];
            const lvl = save.upgradeLevels[type] ?? 1;
            const maxed = lvl >= UPGRADE_MAX_LEVEL;
            const cost = lvl * UPGRADE_BASE_COST;
            const canAfford = save.totalCoins >= cost;
            return (
              <div
                key={type}
                className="bg-[#061c4a] border-2 border-sky-500/40 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="w-10 h-10 rounded-xl bg-slate-900/90 border border-sky-400/30 flex items-center justify-center shrink-0">
                    <PowerUpIcon type={type} className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-black text-sm sm:text-base text-white">{meta.name}</div>
                    <div className="text-xs text-sky-200">{meta.desc}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-auto">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: UPGRADE_MAX_LEVEL }).map((_, idx) => (
                      <span
                        key={idx}
                        className={`w-4 h-2 rounded-sm ${
                          idx < lvl ? 'bg-emerald-400' : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-black text-sky-200 tabular-nums w-10">
                    Lv.{lvl}
                  </span>

                  <button
                    type="button"
                    disabled={maxed || !canAfford}
                    onClick={() => onUpgradePowerUp(type)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black text-xs border cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                      maxed
                        ? 'bg-emerald-800 border-emerald-400 text-emerald-200'
                        : 'bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 border-emerald-200 text-white'
                    }`}
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    <span>{maxed ? 'MAX' : `${cost}c`}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface MissionsModalProps {
  save: SaveData;
  onClaimMission: (missionId: string) => void;
  onClose: () => void;
}

export function MissionsModal({ save, onClaimMission, onClose }: MissionsModalProps) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#061539]/85 p-4"
      role="dialog"
      aria-label="Missions"
    >
      <div className="w-full max-w-lg bg-[#092b6b] border-4 border-sky-400 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 leading-none mb-0.5">
              {GAME_TITLE}
            </div>
            <h2 className="text-2xl font-black text-white">Daily Missions &amp; Badges</h2>
            <p className="text-xs text-sky-200">Complete objectives to earn coins and achievements</p>
          </div>
          <button
            type="button"
            aria-label="Close Missions"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 border border-rose-300 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3 mb-5">
          {DAILY_MISSIONS.map((m) => {
            const val = Math.min(m.target, save.missionProgress[m.id] ?? 0);
            const pct = Math.round((val / m.target) * 100);
            const completed = val >= m.target;
            const claimed = save.claimedMissions.includes(m.id);

            return (
              <div key={m.id} className="bg-[#061c4a] border-2 border-sky-500/40 rounded-2xl p-3.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div>
                    <div className="font-black text-base text-white">{m.title}</div>
                    <div className="text-xs text-sky-200">{m.description}</div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-400/20 border border-amber-400/50 rounded-xl px-2.5 py-1 text-xs font-black text-amber-300 shrink-0">
                    <CoinIcon className="w-4 h-4" />
                    <span>+{m.rewardCoins}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-2.5">
                  <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden border border-sky-500/30">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-sky-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="tabular-nums text-xs font-black text-sky-100">
                    {val}/{m.target}
                  </span>
                  {claimed ? (
                    <span className="px-3 py-1 rounded-xl bg-emerald-800 text-emerald-200 text-xs font-black">
                      Claimed
                    </span>
                  ) : completed ? (
                    <button
                      type="button"
                      onClick={() => onClaimMission(m.id)}
                      className="px-3.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                    >
                      CLAIM
                    </button>
                  ) : (
                    <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold">
                      In Progress
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <div className="text-xs font-black uppercase tracking-wider text-sky-300 mb-2">
            Achievements ({save.unlockedAchievements.length}/{DAILY_MISSIONS.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {DAILY_MISSIONS.map((m) => {
              const unlocked = save.unlockedAchievements.includes(m.achievementTitle);
              return (
                <span
                  key={m.id}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold border ${
                    unlocked
                      ? 'bg-amber-400/25 border-amber-400 text-amber-200'
                      : 'bg-slate-900/60 border-slate-700 text-slate-500'
                  }`}
                >
                  {m.achievementTitle}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface LeaderboardModalProps {
  save: SaveData;
  onClose: () => void;
}

export function LeaderboardModal({ save, onClose }: LeaderboardModalProps) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#061539]/85 p-4"
      role="dialog"
      aria-label="Leaderboard"
    >
      <div className="w-full max-w-md bg-[#092b6b] border-4 border-sky-400 rounded-3xl p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 leading-none mb-0.5">
              {GAME_TITLE}
            </div>
            <h2 className="text-2xl font-black text-white">World Leaderboard</h2>
            <p className="text-xs text-sky-200">
              Total distance across all runs: {save.totalDistance.toLocaleString()}m
            </p>
          </div>
          <button
            type="button"
            aria-label="Close Leaderboard"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 border border-rose-300 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {save.leaderboard.map((entry, idx) => {
            const worldLabel = entry.worldId ? WORLD_CONFIGS[entry.worldId]?.name : undefined;
            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border-2 ${
                  entry.isPlayer
                    ? 'bg-sky-700/80 border-amber-300'
                    : 'bg-[#061c4a] border-sky-500/35'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-900/80 flex items-center justify-center font-black text-sm text-amber-300 tabular-nums">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="font-black text-sm text-white">{entry.name}</div>
                    <div className="text-[11px] text-sky-200 tabular-nums">
                      {entry.distance}m{worldLabel ? ` · ${worldLabel}` : ''}
                    </div>
                  </div>
                </div>
                <div className="tabular-nums font-black text-lg text-yellow-300">
                  {entry.score.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface SettingsModalProps {
  save: SaveData;
  onUpdateSettings: (patch: Partial<SaveData['settings']>) => void;
  onClose: () => void;
}

export function SettingsModal({ save, onUpdateSettings, onClose }: SettingsModalProps) {
  const s = save.settings;
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#061539]/85 p-4"
      role="dialog"
      aria-label="Game Settings"
    >
      <div className="w-full max-w-md bg-[#092b6b] border-4 border-sky-400 rounded-3xl p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 leading-none mb-0.5">
              {GAME_TITLE}
            </div>
            <h2 className="text-2xl font-black text-white">Game Settings</h2>
          </div>
          <button
            type="button"
            aria-label="Close Settings"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 border border-rose-300 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between bg-[#061c4a] border border-sky-500/40 rounded-2xl p-3.5">
            <div>
              <div className="font-black text-sm text-white">Sound &amp; Music</div>
              <div className="text-xs text-sky-200">Toggle all Web Audio playback</div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ soundEnabled: !s.soundEnabled })}
              className={`px-4 py-1.5 rounded-xl font-black text-xs border cursor-pointer ${
                s.soundEnabled
                  ? 'bg-emerald-500 border-emerald-200 text-white'
                  : 'bg-slate-700 border-slate-500 text-slate-300'
              }`}
            >
              {s.soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="bg-[#061c4a] border border-sky-500/40 rounded-2xl p-3.5">
            <div className="flex justify-between text-xs font-black text-white mb-2">
              <span>Music Volume</span>
              <span className="tabular-nums text-sky-300">{Math.round(s.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.musicVolume}
              onChange={(e) => onUpdateSettings({ musicVolume: Number(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <div className="bg-[#061c4a] border border-sky-500/40 rounded-2xl p-3.5">
            <div className="flex justify-between text-xs font-black text-white mb-2">
              <span>SFX Volume</span>
              <span className="tabular-nums text-sky-300">{Math.round(s.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.sfxVolume}
              onChange={(e) => onUpdateSettings({ sfxVolume: Number(e.target.value) })}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          <div className="bg-[#061c4a] border border-sky-500/40 rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-black text-sm text-white">Educational Checkpoints</div>
                <div className="text-xs text-sky-200">Pause at distance intervals for bonus quizzes</div>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ checkpointsEnabled: !s.checkpointsEnabled })}
                className={`px-4 py-1.5 rounded-xl font-black text-xs border cursor-pointer ${
                  s.checkpointsEnabled
                    ? 'bg-emerald-500 border-emerald-200 text-white'
                    : 'bg-slate-700 border-slate-500 text-slate-300'
                }`}
              >
                {s.checkpointsEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {s.checkpointsEnabled && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-sky-200 mr-auto">Interval:</span>
                {CHECKPOINT_CONFIG.intervalOptionsMeters.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onUpdateSettings({ checkpointIntervalMeters: m })}
                    className={`px-3 py-1 rounded-xl text-xs font-black border cursor-pointer ${
                      s.checkpointIntervalMeters === m
                        ? 'bg-amber-400 border-amber-200 text-slate-950'
                        : 'bg-slate-800 border-slate-600 text-sky-100'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
