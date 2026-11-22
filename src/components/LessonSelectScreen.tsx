import React from 'react';
import { ArrowLeft, BookOpen, Check, GraduationCap, Play } from 'lucide-react';
import openingBgImg from '../assets/images/opening_german_railway_bg_1794679756610.jpg';
import lessonInlineskatenImg from '../assets/images/lesson_inlineskaten_1794679756858.jpg';
import lessonUrlaubImg from '../assets/images/lesson_urlaub_1794679757302.jpg';
import lessonGeburtstagImg from '../assets/images/lesson_geburtstag_1794679757328.jpg';
import lessonGesundheitImg from '../assets/images/lesson_gesundheit_1794679759366.jpg';
import { GAME_TITLE, LESSONS } from '../game/constants';
import type { LessonId } from '../game/types';
import {
  GoldStarCoinSvg,
  InternationalEducationEgyptLogo,
  MalekLogoSvg,
} from './GameIcons';
import { Malek3DIntroCanvas } from './Malek3DIntroCanvas';

interface LessonSelectScreenProps {
  selectedLessonId: LessonId;
  questionCountsByLesson?: Partial<Record<LessonId, number>>;
  onSelectLesson: (lessonId: LessonId) => void;
  onBack: () => void;
}

const LESSON_ARTWORK: Partial<Record<LessonId, { src: string; alt: string }>> = {
  m4_l1: {
    src: lessonInlineskatenImg,
    alt: 'Bunte Inlineskates und lila Sporthelm',
  },
  m4_l2: {
    src: lessonUrlaubImg,
    alt: 'Oranger Reisekoffer mit Flugzeug, Palme und Strandpostkarte',
  },
  m4_l3: {
    src: lessonGeburtstagImg,
    alt: 'Geburtstagstorte mit Kerzen, Luftballons und Geschenk',
  },
  m5_l1: {
    src: lessonGesundheitImg,
    alt: 'Roter Erste-Hilfe-Koffer, Stethoskop, Salat und roter Apfel',
  },
};

export function LessonSelectScreen({
  selectedLessonId,
  questionCountsByLesson,
  onSelectLesson,
  onBack,
}: LessonSelectScreenProps) {
  return (
    <section
      className="fixed inset-0 z-20 overflow-y-auto overflow-x-hidden bg-[#0a2a66] flex flex-col justify-between"
      aria-label="Lektionsauswahl"
      data-testid="lesson-select-screen"
    >
      {/* Parallax Railway Backdrop */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <img
          src={openingBgImg}
          alt={GAME_TITLE}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center animate-bg-drift"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(7,35,94,0.42) 0%, rgba(10,45,112,0.22) 50%, rgba(6,24,66,0.46) 100%)',
          }}
        />
      </div>

      {/* Top Row: Compact Game Logo Left | Centered Headline Banner | International Education Egypt Badge Right */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4 flex flex-wrap md:flex-nowrap items-center md:items-start justify-between gap-2 sm:gap-4">
        <div className="order-1 w-[132px] sm:w-[195px] md:w-[210px] shrink-0">
          <MalekLogoSvg className="w-full h-auto" />
        </div>

        <div className="order-3 md:order-2 w-full md:w-auto flex flex-col items-center text-center pt-0.5 md:pt-1 md:flex-1 min-w-0">
          <div className="inline-block max-w-full px-4 sm:px-8 py-1.5 sm:py-2 rounded-full bg-gradient-to-b from-[#2563eb] to-[#1e3a8a] border-[3px] border-white shadow-[0_6px_0_#072566,0_12px_24px_rgba(4,15,44,0.55)]">
            <h1 className="font-black uppercase tracking-wide text-base sm:text-3xl lg:text-4xl text-[#fde047] title-stroke-blue leading-none">
              WÄHLE DEINE LEKTION!
            </h1>
          </div>
          <div className="-mt-1 sm:-mt-2 px-3.5 sm:px-6 py-0.5 sm:py-1 rounded-full bg-gradient-to-b from-[#ef4444] to-[#b91c1c] border-2 border-white shadow-lg">
            <p className="font-extrabold text-[11px] sm:text-base text-white tracking-wide">
              Womit möchtest du heute starten?
            </p>
          </div>
        </div>

        <div className="order-2 md:order-3 shrink-0">
          <InternationalEducationEgyptLogo className="w-28 sm:w-36 md:w-44 h-auto" />
        </div>
      </header>

      {/* Main Content: Animated Malek Left + 2x2 Interactive Lesson Grid */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-3 sm:px-6 py-1 sm:py-1.5 flex-1 flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6">
        {/* Left Character Presence (Desktop / Tablet) */}
        <div className="hidden lg:flex relative flex-col items-center justify-end w-[300px] xl:w-[340px] h-[460px] xl:h-[520px] -ml-4 shrink-0 pointer-events-none select-none">
          <div className="animate-coin-float absolute bottom-6 right-2 w-14 h-14 z-10">
            <GoldStarCoinSvg className="w-full h-full" />
          </div>
          <Malek3DIntroCanvas className="w-full h-full" variant="lessons" />
        </div>

        {/* 2x2 Lesson Cards Grid + Featured By School Button */}
        <div
          className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-3"
          role="list"
          aria-label="Verfügbare Lektionen"
        >
          {LESSONS.filter((lesson) => lesson.id !== 'by_school').map((lesson) => {
            const isSelected = selectedLessonId === lesson.id;
            const art = LESSON_ARTWORK[lesson.id];
            const qCount = questionCountsByLesson?.[lesson.id];

            return (
              <div
                key={lesson.id}
                role="listitem"
                data-testid={`lesson-card-${lesson.id}`}
                className={`group relative rounded-[26px] bg-[#fff9ea] border-[3.5px] transition-all duration-200 hover:-translate-y-1.5 hover:rotate-[-0.4deg] overflow-hidden shadow-[0_10px_0_#0b3578,0_18px_32px_rgba(4,15,44,0.48)] ${
                  isSelected
                    ? 'border-[#fde047] ring-4 ring-amber-300/75'
                    : 'border-white hover:border-[#fde047]'
                }`}
              >
                {/* Card Top Blue Glossy Header Bar */}
                <div className="relative flex items-center justify-between gap-2 bg-gradient-to-b from-[#2563eb] via-[#1d4ed8] to-[#1e3a8a] px-4 py-2 border-b-[3px] border-[#93c5fd]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Star Number Badge */}
                    <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                      <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow" aria-hidden="true">
                        <polygon
                          points="20,2 25.4,13 37.5,14.8 28.8,23.2 30.8,35.2 20,29.5 9.2,35.2 11.2,23.2 2.5,14.8 14.6,13"
                          fill="#facc15"
                          stroke="#92400e"
                          strokeWidth="2.4"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center font-black text-sm text-[#08245c] tabular-nums pt-0.5">
                        {lesson.number}
                      </span>
                    </div>

                    <span className="font-black text-sm sm:text-base text-white tracking-wide truncate drop-shadow">
                      {lesson.moduleLabel}
                    </span>
                  </div>

                  {isSelected && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-[#fde047] shrink-0"
                      aria-label="Aktuell gewählt"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Aktiv</span>
                    </span>
                  )}
                </div>

                {/* Card Body: Pixar Lesson Artwork Left + Exact German Title & STARTEN CTA Right */}
                <div className="flex items-center gap-3 p-2.5 sm:p-3 bg-gradient-to-b from-[#fffdf7] to-[#fef3d6]">
                  {art && (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-[#fff7e6] border-2 border-amber-200/80 shrink-0 shadow-inner">
                      <img
                        src={art.src}
                        alt={art.alt}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-2.5">
                    <div>
                      <h2
                        className="font-black text-lg sm:text-xl text-[#08245c] leading-tight"
                        lang="de"
                      >
                        {lesson.title}
                      </h2>
                      {typeof qCount === 'number' && (
                        <p className="mt-1 text-xs font-bold text-[#1e40af]/80 tabular-nums">
                          {qCount} Übungsfragen · +15 Coins pro Checkpoint
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      data-testid={`lesson-start-${lesson.id}`}
                      onClick={() => onSelectLesson(lesson.id)}
                      className="inline-flex items-center justify-center gap-2 w-full sm:w-auto self-start min-h-[44px] px-5 py-2 rounded-full bg-gradient-to-b from-[#65e83a] via-[#22c55e] to-[#15803d] hover:from-[#7ef44e] hover:to-[#16a34a] active:translate-y-0.5 text-white font-black text-sm sm:text-base uppercase tracking-wider border-2 border-white shadow-[0_4px_0_#14532d,0_6px_14px_rgba(21,128,61,0.38)] cursor-pointer transition-transform"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>STARTEN</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Featured "By School" Button spanning below the 4 lessons */}
          {(() => {
            const schoolLesson = LESSONS.find((l) => l.id === 'by_school');
            if (!schoolLesson) return null;
            const isSelected = selectedLessonId === 'by_school';
            const qCount = questionCountsByLesson?.by_school;
            return (
              <div role="listitem" className="md:col-span-2" data-testid="lesson-card-by_school">
                <button
                  type="button"
                  data-testid="lesson-start-by_school"
                  onClick={() => onSelectLesson('by_school')}
                  className={`group w-full flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 rounded-[22px] px-4 sm:px-5 py-2.5 text-left bg-gradient-to-r from-[#5b21b6] via-[#6d28d9] to-[#4338ca] hover:from-[#6d28d9] hover:via-[#7c3aed] hover:to-[#4f46e5] active:translate-y-0.5 border-[3.5px] transition-all duration-200 hover:-translate-y-1 shadow-[0_7px_0_#2e1065,0_14px_24px_rgba(4,15,44,0.48)] cursor-pointer ${
                    isSelected
                      ? 'border-[#fde047] ring-4 ring-amber-300/75'
                      : 'border-white hover:border-[#fde047]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-b from-[#fde047] to-[#f59e0b] border-2 border-white flex items-center justify-center shrink-0 shadow-md">
                      <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-[#2e1065]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-lg sm:text-xl text-white tracking-wide drop-shadow">
                          By School
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-white/15 border border-amber-300/70 text-[11px] font-black uppercase tracking-wider text-[#fde047]">
                          W2 HW G6
                        </span>
                        {isSelected && (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-300"
                            aria-label="Aktuell gewählt"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Aktiv</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-indigo-100 tabular-nums">
                        {typeof qCount === 'number' ? `${qCount} Übungsfragen` : 'Schulaufgaben'} · können, wollen &amp; müssen · +15 Coins pro Checkpoint
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center justify-center gap-2 w-full sm:w-auto shrink-0 min-h-[42px] px-5 py-1.5 rounded-full bg-gradient-to-b from-[#65e83a] via-[#22c55e] to-[#15803d] group-hover:from-[#7ef44e] group-hover:to-[#16a34a] text-white font-black text-sm sm:text-base uppercase tracking-wider border-2 border-white shadow-[0_4px_0_#14532d,0_6px_14px_rgba(21,128,61,0.38)]">
                    <Play className="w-4 h-4 fill-white" />
                    <span>STARTEN</span>
                  </span>
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Bottom Dock: Zurück Button + Lektionen Indicator */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 pb-3 pt-1 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        <button
          type="button"
          data-testid="lesson-back-btn"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2.5 min-h-[48px] px-7 py-2 rounded-full bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#1e40af] hover:from-[#60a5fa] hover:to-[#1d4ed8] active:translate-y-0.5 text-white font-black text-base sm:text-lg border-[2.5px] border-white shadow-[0_5px_0_#072566,0_10px_18px_rgba(4,15,44,0.45)] cursor-pointer transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Zurück</span>
        </button>

        <div className="inline-flex items-center gap-2.5 min-h-[48px] px-7 py-2 rounded-full bg-gradient-to-b from-[#fde047] via-[#facc15] to-[#d97706] text-[#08245c] font-black text-base sm:text-lg border-[2.5px] border-white shadow-[0_5px_0_#92400e,0_10px_18px_rgba(4,15,44,0.4)]">
          <BookOpen className="w-5 h-5 text-[#08245c]" />
          <span className="tabular-nums">{LESSONS.length} Lektionen</span>
        </div>
      </footer>
    </section>
  );
}
