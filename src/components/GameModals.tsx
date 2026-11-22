import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Home, Play, RotateCcw, Sparkles, Square, XCircle } from 'lucide-react';
import { GAME_TITLE } from '../game/constants';
import { resolveCheckpointAttempt, type CheckpointAttemptOutcome } from '../game/rules';
import {
  speakCheckpointQuestion,
  stopCheckpointSpeech,
  subscribeVoicesChanged,
} from '../game/speech';
import type {
  CheckpointQuestion,
  CheckpointRewardRules,
  RunSummary,
} from '../game/types';
import { CoinIcon, GemIcon } from './GameIcons';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export function PauseModal({ onResume, onRestart, onMainMenu }: PauseModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#061539]/75 p-4">
      <div className="w-full max-w-sm bg-[#092b6b] border-4 border-sky-400 rounded-3xl p-6 shadow-2xl text-center">
        <div className="text-xs font-black uppercase tracking-wider text-sky-200 mb-1.5">
          {GAME_TITLE}
        </div>
        <div className="inline-block bg-amber-400 text-slate-950 font-black uppercase tracking-wider text-xs px-4 py-1 rounded-full mb-3">
          Run Paused
        </div>
        <h2 className="text-3xl font-black text-white mb-6">Take a Breather</h2>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-white font-black text-lg border-2 border-emerald-200 shadow-[0_4px_0_#065f46] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Resume</span>
          </button>

          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-base border-2 border-sky-300 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Restart Run</span>
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-sky-100 font-bold text-base border border-slate-500 cursor-pointer"
          >
            <Home className="w-5 h-5" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface GameOverModalProps {
  summary: RunSummary;
  newlyCompletedMissions: string[];
  onRestart: () => void;
  onMainMenu: () => void;
}

export function GameOverModal({
  summary,
  newlyCompletedMissions,
  onRestart,
  onMainMenu,
}: GameOverModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#061539]/80 p-4">
      <div className="w-full max-w-md bg-[#092b6b] border-4 border-sky-400 rounded-3xl p-6 shadow-2xl">
        <div className="text-center mb-5">
          <div className="text-xs font-black uppercase tracking-wider text-sky-200 mb-1.5">
            {GAME_TITLE}
          </div>
          {summary.isNewBest ? (
            <div className="inline-flex items-center gap-1.5 bg-amber-400 text-slate-950 font-black uppercase tracking-wider text-xs px-4 py-1 rounded-full mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>New Best Score!</span>
            </div>
          ) : (
            <div className="inline-block bg-rose-500 text-white font-black uppercase tracking-wider text-xs px-4 py-1 rounded-full mb-2">
              Caught on the Tracks
            </div>
          )}
          <h2 className="text-3xl font-black text-white">Run Complete</h2>
          <p className="text-xs font-extrabold uppercase tracking-wider text-sky-300 mt-1">
            {summary.worldName}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[#061c4a] border-2 border-sky-500/50 rounded-2xl p-3 text-center">
            <div className="text-[11px] font-bold uppercase tracking-wider text-sky-300">Final Score</div>
            <div className="tabular-nums text-2xl font-black text-white">{summary.score.toLocaleString()}</div>
          </div>
          <div className="bg-[#061c4a] border-2 border-amber-400/50 rounded-2xl p-3 text-center">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Best Score</div>
            <div className="tabular-nums text-2xl font-black text-amber-300">{summary.bestScore.toLocaleString()}</div>
          </div>
          <div className="bg-[#061c4a] border-2 border-sky-500/50 rounded-2xl p-3 text-center">
            <div className="text-[11px] font-bold uppercase tracking-wider text-sky-300">Distance</div>
            <div className="tabular-nums text-xl font-black text-white">{summary.distance}m</div>
          </div>
          <div className="bg-[#061c4a] border-2 border-sky-500/50 rounded-2xl p-3 flex items-center justify-center gap-3">
            <div className="flex items-center gap-1">
              <CoinIcon className="w-5 h-5" />
              <span className="tabular-nums text-xl font-black text-yellow-300">+{summary.coinsCollected}</span>
            </div>
            {summary.gemsCollected > 0 && (
              <div className="flex items-center gap-1">
                <GemIcon className="w-4 h-4" />
                <span className="tabular-nums text-lg font-black text-sky-300">+{summary.gemsCollected}</span>
              </div>
            )}
          </div>
        </div>

        {newlyCompletedMissions.length > 0 && (
          <div className="mb-4 bg-emerald-900/60 border border-emerald-400 rounded-xl px-3.5 py-2 text-xs font-bold text-emerald-200 text-center">
            {newlyCompletedMissions.length} Mission{newlyCompletedMissions.length > 1 ? 's' : ''} Completed! Claim rewards in Missions.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-white font-black text-lg border-2 border-emerald-200 shadow-[0_4px_0_#065f46] cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Play Again</span>
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-sky-700 hover:bg-sky-600 text-white font-extrabold text-base border-2 border-sky-300/70 cursor-pointer"
          >
            <Home className="w-5 h-5" />
            <span>Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface CheckpointModalProps {
  question: CheckpointQuestion;
  rewardRules: CheckpointRewardRules;
  checkpointNumber: number;
  distance: number;
  lessonLabel?: string;
  onAnswerResolved: (outcome: CheckpointAttemptOutcome) => void;
  onAutoResume: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export function CheckpointModal({
  question,
  rewardRules,
  checkpointNumber,
  distance,
  lessonLabel,
  onAnswerResolved,
  onAutoResume,
}: CheckpointModalProps) {
  const [outcome, setOutcome] = useState<CheckpointAttemptOutcome | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [, setVoicesTick] = useState(0);

  const resolvedRef = useRef(false);
  const onAnswerResolvedRef = useRef(onAnswerResolved);
  onAnswerResolvedRef.current = onAnswerResolved;
  const onAutoResumeRef = useRef(onAutoResume);
  onAutoResumeRef.current = onAutoResume;

  const finalizeAttempt = (selectedIdx: number) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    const result = resolveCheckpointAttempt(question, selectedIdx);
    setOutcome(result);
    onAnswerResolvedRef.current(result);
  };

  // Subscribe to browser speech voice list updates and clean up playback on question change/unmount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
    const unsub = subscribeVoicesChanged(() => setVoicesTick((t) => t + 1));
    return () => {
      unsub();
      stopCheckpointSpeech();
    };
  }, []);

  useEffect(() => {
    stopCheckpointSpeech();
    setIsSpeaking(false);
    setSpeechError(null);
  }, [question.id]);

  // Automatic resume timer after answering: 2s on correct, 3s on wrong
  useEffect(() => {
    if (!outcome) return;
    const timer = window.setTimeout(() => {
      stopCheckpointSpeech();
      onAutoResumeRef.current();
    }, outcome.autoResumeMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [outcome]);

  const handleReadAloud = () => {
    setSpeechError(null);
    speakCheckpointQuestion(question, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: (msg) => {
        setIsSpeaking(false);
        setSpeechError(msg);
      },
    });
  };

  const handleStopSpeech = () => {
    stopCheckpointSpeech();
    setIsSpeaking(false);
  };

  const answered = outcome !== null;
  const isCorrect = outcome?.correct ?? false;

  const correctLetter = OPTION_LETTERS[question.correctIndex] ?? 'A';
  const correctText = question.options[question.correctIndex] ?? '';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#04102d]/92 p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Challenge Checkpoint"
      data-testid="checkpoint-modal"
    >
      <div className="animate-checkpoint-pop w-full max-w-xl bg-[#092b6b] border-4 border-amber-400 rounded-3xl p-4 sm:p-7 shadow-2xl my-auto">
        {/* Top Row: Checkpoint Title + Progress Indicator + Coin Reward */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold tracking-wide text-amber-300 mb-0.5">
              <span data-testid="checkpoint-progress">Checkpoint #{checkpointNumber}</span>
              <span aria-hidden="true">·</span>
              <span>{distance}m</span>
              {lessonLabel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-300" data-testid="checkpoint-lesson">{lessonLabel}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="text-sky-200">{question.category}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-wide text-white uppercase">
              CHALLENGE CHECKPOINT!
            </h2>
          </div>

          <div className="flex items-center gap-1.5 bg-[#061c4a] border-2 border-amber-400/80 rounded-xl px-3.5 py-1.5">
            <CoinIcon className="w-5 h-5" />
            <span className="tabular-nums font-black text-sm text-yellow-300">
              +{rewardRules.correctCoins}
            </span>
          </div>
        </div>

        {/* Optional Reading Comprehension Context */}
        {question.context && (
          <div className="mb-3.5 rounded-2xl bg-[#061c4a] border border-sky-400/45 px-3.5 py-2.5 text-xs sm:text-sm text-sky-100 leading-relaxed max-h-28 overflow-y-auto">
            {question.context}
          </div>
        )}

        {/* Question Text */}
        <h3
          className="text-xl sm:text-2xl font-black text-white leading-snug mb-3"
          data-testid="checkpoint-question"
          lang="de"
        >
          {question.prompt}
        </h3>

        {/* German Read-Aloud Controls */}
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleReadAloud}
              data-testid="checkpoint-read-aloud"
              aria-pressed={isSpeaking}
              className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-2xl border-2 font-black text-sm sm:text-base cursor-pointer transition-transform active:scale-95 ${
                isSpeaking
                  ? 'bg-amber-400 border-amber-200 text-slate-950 shadow-[0_3px_0_#92400e] ring-2 ring-amber-300/80'
                  : 'bg-sky-500 hover:bg-sky-400 border-sky-200 text-slate-950 shadow-[0_3px_0_#0369a1]'
              }`}
            >
              <span className={isSpeaking ? 'inline-block animate-pulse' : 'inline-block'}>🔊</span>
              <span>Vorlesen</span>
              {isSpeaking && (
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-slate-950/15">
                  Wird vorgelesen…
                </span>
              )}
            </button>

            {isSpeaking && (
              <button
                type="button"
                onClick={handleStopSpeech}
                data-testid="checkpoint-read-stop"
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-2xl border-2 border-rose-300 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm sm:text-base shadow-[0_3px_0_#881337] cursor-pointer active:scale-95"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Stopp</span>
              </button>
            )}
          </div>

          {speechError && (
            <div
              role="status"
              data-testid="speech-fallback"
              className="mt-2.5 rounded-xl bg-amber-950/85 border border-amber-400/75 px-3 py-2 text-xs sm:text-sm font-bold text-amber-200"
            >
              {speechError}
            </div>
          )}
        </div>

        {/* Answer Choice Buttons */}
        <div className="grid grid-cols-1 gap-2.5 mb-4">
          {question.options.map((opt, idx) => {
            const letter = OPTION_LETTERS[idx] ?? String(idx + 1);
            let btnStyle =
              'bg-[#0b3b8c] hover:bg-sky-700 active:scale-[0.99] border-sky-400/80 text-white shadow-[0_3px_0_#061c4a]';
            if (answered) {
              if (idx === question.correctIndex) {
                btnStyle =
                  'bg-emerald-600 border-emerald-300 text-white shadow-[0_3px_0_#065f46]';
              } else if (outcome?.selectedIdx === idx) {
                btnStyle =
                  'bg-rose-600 border-rose-300 text-white shadow-[0_3px_0_#881337]';
              } else {
                btnStyle = 'bg-slate-800/75 border-slate-600 text-slate-300 opacity-75';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={answered}
                data-testid={`checkpoint-option-${idx}`}
                data-correct={idx === question.correctIndex ? 'true' : 'false'}
                onClick={() => finalizeAttempt(idx)}
                className={`flex items-center gap-3 w-full min-h-[54px] text-left px-4 py-3 rounded-2xl border-2 font-bold text-base sm:text-lg ${
                  answered ? 'transition-none' : 'transition-transform duration-100'
                } cursor-pointer disabled:cursor-default ${btnStyle}`}
              >
                <span className="w-8 h-8 rounded-xl bg-slate-950/45 flex items-center justify-center font-black text-sm shrink-0">
                  {letter}
                </span>
                <span className="flex-1 leading-snug" lang="de">{opt}</span>
                {answered && idx === question.correctIndex && (
                  <CheckCircle2 className="w-6 h-6 text-emerald-100 shrink-0" />
                )}
                {answered && outcome?.selectedIdx === idx && idx !== question.correctIndex && (
                  <XCircle className="w-6 h-6 text-rose-100 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Immediate Outcome Feedback */}
        {answered ? (
          <div
            className={`rounded-2xl p-4 border-2 ${
              isCorrect
                ? 'bg-emerald-950/85 border-emerald-400'
                : 'bg-rose-950/85 border-rose-400'
            }`}
            data-testid="checkpoint-feedback"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                {isCorrect ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-300 shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-300 shrink-0" />
                )}
                <span
                  className={`font-black text-base sm:text-lg uppercase tracking-wide ${
                    isCorrect ? 'text-emerald-300' : 'text-rose-200'
                  }`}
                >
                  {isCorrect ? 'RICHTIG! +15 COINS' : 'FALSCHE ANTWORT!'}
                </span>
              </div>

              {isCorrect ? (
                <div className="animate-coin-burst inline-flex items-center gap-1.5 bg-amber-400 text-slate-950 font-black text-sm px-3 py-1 rounded-xl shadow">
                  <CoinIcon className="w-5 h-5" />
                  <span>+{outcome.coinsAwarded} COINS</span>
                </div>
              ) : (
                <span className="text-xs font-black text-rose-200/90 tabular-nums">
                  +0 Coins
                </span>
              )}
            </div>

            {!isCorrect && (
              <p className="mt-2 text-sm font-extrabold text-emerald-200">
                Richtige Antwort:{' '}
                <span className="text-white" lang="de">
                  {correctLetter}. {correctText}
                </span>
              </p>
            )}

            <div className="mt-2 text-xs font-bold text-sky-200/90">
              Das Spiel wird gleich fortgesetzt…
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs font-bold text-sky-200/90 px-1">
            <span>Wähle die richtige Antwort für +{rewardRules.correctCoins} Coins</span>
            <span>Spiel pausiert</span>
          </div>
        )}
      </div>
    </div>
  );
}
