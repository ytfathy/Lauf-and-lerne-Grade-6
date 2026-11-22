import React, { useEffect } from 'react';
import { BookOpen, Play, Settings, Trophy } from 'lucide-react';
import openingBgImg from '../assets/images/opening_german_railway_bg_1794679756610.jpg';
import { GAME_TITLE } from '../game/constants';
import {
  GoldStarCoinSvg,
  InternationalEducationEgyptLogo,
  MalekLogoSvg,
} from './GameIcons';
import { Malek3DIntroCanvas } from './Malek3DIntroCanvas';

interface OpeningScreenProps {
  bestScore: number;
  unclaimedMissions: number;
  modalOpen: boolean;
  onPlay: () => void;
  onOpenLessons: () => void;
  onOpenAchievements: () => void;
  onOpenSettings: () => void;
}

const FLOATING_COINS = [
  { id: 'c1', left: '25%', bottom: '18%', size: 'w-12 h-12 sm:w-16 sm:h-16', delay: '0s' },
  { id: 'c2', left: '64%', bottom: '20%', size: 'w-10 h-10 sm:w-12 sm:h-12', delay: '0.7s' },
  { id: 'c3', left: '72%', bottom: '21%', size: 'w-11 h-11 sm:w-14 sm:h-14', delay: '1.35s' },
  { id: 'c4', left: '19%', bottom: '32%', size: 'w-8 h-8 sm:w-10 sm:h-10', delay: '1.9s' },
];

const SPARKLES = [
  { id: 's1', left: '34%', top: '24%', delay: '0.2s', size: 'w-5 h-5' },
  { id: 's2', left: '68%', top: '19%', delay: '1.1s', size: 'w-6 h-6' },
  { id: 's3', left: '22%', top: '42%', delay: '0.6s', size: 'w-4 h-4' },
  { id: 's4', left: '76%', top: '46%', delay: '1.6s', size: 'w-5 h-5' },
  { id: 's5', left: '46%', top: '12%', delay: '0.9s', size: 'w-4 h-4' },
];

export function OpeningScreen({
  bestScore,
  unclaimedMissions,
  modalOpen,
  onPlay,
  onOpenLessons,
  onOpenAchievements,
  onOpenSettings,
}: OpeningScreenProps) {
  useEffect(() => {
    if (modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter') {
        e.preventDefault();
        onPlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, onPlay]);

  return (
    <section
      className="fixed inset-0 z-20 overflow-hidden bg-[#0a2a66]"
      aria-label={GAME_TITLE}
      data-testid="opening-screen"
    >
      {/* Animated Sunlit German Railway Background Layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          src={openingBgImg}
          alt="Sonnige deutsche Eisenbahnstraße mit Fachwerkhäusern und Brandenburger Tor"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center animate-bg-drift"
        />

        {/* Soft Radial Sunlight Glow (No Rectangular Clip Edge) */}
        <div
          className="animate-sunray absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 68% 62% at 86% 10%, rgba(254,249,195,0.48) 0%, rgba(253,224,71,0.18) 38%, rgba(255,255,255,0) 72%)',
          }}
        />

        {/* Subtle Bottom Warm Vignette for Button Contrast */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 54% 48%, rgba(8,36,92,0.08) 0%, rgba(6,24,66,0.28) 100%)',
          }}
        />

        {/* Animated Sparkles */}
        {SPARKLES.map((sp) => (
          <svg
            key={sp.id}
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`animate-sparkle absolute text-yellow-200 drop-shadow-[0_0_8px_rgba(254,240,138,0.95)] ${sp.size}`}
            style={{ left: sp.left, top: sp.top, animationDelay: sp.delay }}
          >
            <path
              d="M12 1 L14.5 9.5 L23 12 L14.5 14.5 L12 23 L9.5 14.5 L1 12 L9.5 9.5 Z"
              fill="currentColor"
            />
          </svg>
        ))}

        {/* Floating Animated Gold Star Coins */}
        {FLOATING_COINS.map((coin) => (
          <div
            key={coin.id}
            className={`animate-coin-float absolute drop-shadow-[0_8px_14px_rgba(6,24,66,0.45)] ${coin.size}`}
            style={{ left: coin.left, bottom: coin.bottom, animationDelay: coin.delay }}
          >
            <GoldStarCoinSvg className="w-full h-full" />
          </div>
        ))}
      </div>

      {/* Top-Right: Official International Education Egypt Brand Logo (Blended, No Borders) */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-6 z-30 pointer-events-none flex flex-col items-end gap-1.5">
        <InternationalEducationEgyptLogo className="w-40 sm:w-56 md:w-64 h-auto" />
        {bestScore > 0 && (
          <div className="bg-[#08245c]/90 border-2 border-amber-300/85 rounded-xl px-3 py-1 text-xs font-black text-amber-200 tabular-nums shadow-lg">
            Bestleistung: {bestScore.toLocaleString()}
          </div>
        )}
      </div>

      {/* Main Content Layout: Large 3D In-Game Malek Left + Centered Title & Action Stack */}
      <div className="relative z-20 w-full h-full max-w-7xl mx-auto px-4 sm:px-8 pt-12 md:pt-0 pb-3 md:pb-0 flex flex-col md:flex-row items-center justify-between md:justify-between gap-1 sm:gap-4">
        {/* Animated In-Game 3D Malek Hero on Left */}
        <div className="relative flex items-end justify-center w-[230px] sm:w-[320px] md:w-[490px] lg:w-[570px] xl:w-[620px] h-[250px] sm:h-[340px] md:h-[670px] lg:h-[750px] xl:h-[810px] md:self-end md:pb-0 shrink-0 md:-ml-10 pointer-events-none select-none">
          {/* Warm Speed/Golden Glow Behind Malek */}
          <div
            aria-hidden="true"
            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[66%] h-[14%] rounded-full bg-amber-300/45 blur-xl"
          />
          <Malek3DIntroCanvas className="w-full h-full" variant="hero" />
        </div>

        {/* Center/Right Title & Vertical Game Menu */}
        <div className="flex flex-col items-center justify-center w-full max-w-[470px] md:mr-auto md:ml-2 pb-1 md:pb-4">
          {/* Official German Game Title Lockup */}
          <div className="animate-title-enter w-full max-w-[290px] sm:max-w-[450px] mb-1.5 sm:mb-4">
            <MalekLogoSvg className="w-full h-auto" />
          </div>

          {/* Primary Menu Buttons Matching Opening Reference */}
          <nav
            aria-label="Hauptmenü"
            className="w-full max-w-[320px] sm:max-w-[350px] flex flex-col items-stretch gap-2.5 sm:gap-3"
          >
            {/* Primary Green Pulsing SPIELEN Button */}
            <button
              type="button"
              data-start-opening="true"
              data-testid="opening-play-btn"
              onClick={onPlay}
              className="animate-play-pulse group relative flex items-center justify-center gap-3 w-full min-h-[58px] sm:min-h-[68px] px-7 py-3 rounded-full bg-gradient-to-b from-[#65e83a] via-[#2fc21c] to-[#15803d] hover:from-[#7ef44e] hover:to-[#16a34a] active:translate-y-0.5 text-white font-black text-2xl sm:text-3xl tracking-wide border-[3px] border-white shadow-[0_7px_0_#14532d,0_14px_26px_rgba(4,15,44,0.55)] cursor-pointer transition-transform"
            >
              <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-white drop-shadow" />
              <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]">Spielen</span>
            </button>

            {/* Lektionen Button */}
            <button
              type="button"
              data-testid="opening-lessons-btn"
              onClick={onOpenLessons}
              className="flex items-center justify-center gap-3 w-full min-h-[46px] sm:min-h-[52px] px-6 py-2.5 rounded-full bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#1e40af] hover:from-[#60a5fa] hover:to-[#1d4ed8] active:translate-y-0.5 text-white font-black text-lg sm:text-xl border-[2.5px] border-white/95 shadow-[0_5px_0_#072566,0_10px_18px_rgba(4,15,44,0.45)] cursor-pointer transition-transform"
            >
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-amber-200 shrink-0" />
              <span>Lektionen</span>
            </button>

            {/* Erfolge (Achievements / Missions) Button */}
            <button
              type="button"
              data-testid="opening-achievements-btn"
              onClick={onOpenAchievements}
              className="relative flex items-center justify-center gap-3 w-full min-h-[46px] sm:min-h-[52px] px-6 py-2.5 rounded-full bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#1e40af] hover:from-[#60a5fa] hover:to-[#1d4ed8] active:translate-y-0.5 text-white font-black text-lg sm:text-xl border-[2.5px] border-white/95 shadow-[0_5px_0_#072566,0_10px_18px_rgba(4,15,44,0.45)] cursor-pointer transition-transform"
            >
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 shrink-0" />
              <span>Erfolge</span>
              {unclaimedMissions > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-black tabular-nums border border-white">
                  {unclaimedMissions}
                </span>
              )}
            </button>

            {/* Einstellungen (Settings) Button */}
            <button
              type="button"
              data-testid="opening-settings-btn"
              onClick={onOpenSettings}
              className="flex items-center justify-center gap-3 w-full min-h-[46px] sm:min-h-[52px] px-6 py-2.5 rounded-full bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#1e40af] hover:from-[#60a5fa] hover:to-[#1d4ed8] active:translate-y-0.5 text-white font-black text-lg sm:text-xl border-[2.5px] border-white/95 shadow-[0_5px_0_#072566,0_10px_18px_rgba(4,15,44,0.45)] cursor-pointer transition-transform"
            >
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0" />
              <span>Einstellungen</span>
            </button>
          </nav>
        </div>
      </div>
    </section>
  );
}
