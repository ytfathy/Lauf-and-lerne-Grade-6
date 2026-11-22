import React, { useEffect } from 'react';
import {
  ArrowLeft,
  Globe,
  Play,
  Settings,
  ShoppingBag,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { CoinIcon, GemIcon, InternationalEducationEgyptLogo, MalekLogoSvg } from './GameIcons';
import type { ModalView } from '../game/types';

interface TitleOverlayProps {
  totalCoins: number;
  totalGems: number;
  bestScore: number;
  selectedCharacterName: string;
  selectedWorldName: string;
  selectedLessonLabel?: string;
  unclaimedMissions: number;
  activeModal: ModalView;
  onStart: () => void;
  onOpenModal: (view: ModalView) => void;
  onBackToLessons?: () => void;
}

export function TitleOverlay({
  totalCoins,
  totalGems,
  bestScore,
  selectedCharacterName,
  selectedWorldName,
  selectedLessonLabel,
  unclaimedMissions,
  activeModal,
  onStart,
  onOpenModal,
  onBackToLessons,
}: TitleOverlayProps) {
  useEffect(() => {
    if (activeModal !== 'none') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeModal, onStart]);

  if (activeModal !== 'none') return null;

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-7 z-10">
      {/* Top Row: Professional Logo Lockup Left + Coins & Gems Wallet Right */}
      <div className="flex items-start justify-between gap-4">
        <div className="pointer-events-auto max-w-[240px] sm:max-w-[340px] animate-float-slow">
          <MalekLogoSvg className="w-full h-auto drop-shadow-2xl" />
          <div className="mt-1 ml-1 inline-flex flex-wrap items-center gap-1.5 bg-[#08245c]/92 border-2 border-sky-400/80 rounded-xl px-3.5 py-1 text-xs sm:text-sm font-extrabold tracking-wide text-sky-100 shadow-lg">
            <span>{selectedCharacterName}</span>
            <span className="text-sky-400">·</span>
            <span className="text-amber-300" data-testid="active-world-label">{selectedWorldName}</span>
            {selectedLessonLabel && (
              <>
                <span className="text-sky-400">·</span>
                <span className="text-emerald-300" data-testid="active-lesson-label">{selectedLessonLabel}</span>
              </>
            )}
          </div>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex items-center gap-2.5">
            <InternationalEducationEgyptLogo className="hidden sm:block w-24 md:w-28 h-auto shrink-0" />
            <div className="flex items-center gap-3 bg-[#08245c]/95 border-2 border-sky-400 rounded-2xl px-4 py-2 shadow-xl">
              <div className="flex items-center gap-1.5 pr-3 border-r border-sky-400/35">
                <CoinIcon className="w-6 h-6" />
                <span className="tabular-nums font-black text-lg text-yellow-300" data-testid="total-coins">
                  {totalCoins}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <GemIcon className="w-5 h-5" />
                <span className="tabular-nums font-black text-lg text-sky-300" data-testid="total-gems">
                  {totalGems}
                </span>
              </div>
            </div>
          </div>

          {bestScore > 0 && (
            <div className="bg-[#0b3b8c]/92 border border-amber-300/75 rounded-xl px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-200 tabular-nums shadow">
              Best {bestScore.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Center remains completely open for animated 3D Malek + World background */}

      {/* Bottom Dock: Primary PLAY CTA + 6 Required Functional Menu Buttons + Back to Lessons */}
      <div className="flex flex-col items-center gap-3 pb-1">
        <div className="pointer-events-auto flex items-center justify-center gap-3">
          {onBackToLessons && (
            <button
              type="button"
              data-testid="hub-back-lessons"
              onClick={onBackToLessons}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#08245c]/95 hover:bg-sky-700 text-white font-black text-sm sm:text-base border-2 border-sky-400 shadow-xl cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Lektionen</span>
            </button>
          )}
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStart();
            }}
            className="group flex items-center gap-3 px-10 py-3.5 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 active:translate-y-0.5 text-white font-black text-2xl tracking-wider border-2 border-emerald-200 shadow-[0_6px_0_#065f46,0_14px_28px_rgba(0,0,0,0.45)] transition-transform cursor-pointer"
          >
            <Play className="w-7 h-7 fill-white" />
            <span>PLAY</span>
          </button>
        </div>

        <nav
          aria-label="Main Menu"
          className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 bg-[#08245c]/95 border-2 border-sky-400 rounded-2xl p-2 shadow-2xl max-w-full"
        >
          <button
            type="button"
            onClick={() => onOpenModal('characters')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs sm:text-sm border border-sky-300/60 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Characters</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('worlds')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm border border-amber-200 transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span>Worlds</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('missions')}
            className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm border border-indigo-300/60 transition-colors cursor-pointer"
          >
            <Target className="w-4 h-4" />
            <span>Missions</span>
            {unclaimedMissions > 0 && (
              <span className="ml-0.5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black tabular-nums">
                {unclaimedMissions}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('leaderboard')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs sm:text-sm border border-purple-300/60 transition-colors cursor-pointer"
          >
            <Trophy className="w-4 h-4" />
            <span>Leaderboard</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('shop')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm border border-emerald-300/60 transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Shop</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('settings')}
            aria-label="Settings"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-extrabold text-xs sm:text-sm border border-slate-400/50 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </nav>

        <p className="bg-[#061842]/92 border border-sky-400/50 rounded-xl px-4 py-1 text-xs sm:text-sm font-bold tracking-wide text-sky-100 shadow-lg text-center">
          ← → / Swipe Move · ↑ / Space Jump · ↓ Slide · P Pause
        </p>
      </div>
    </div>
  );
}
