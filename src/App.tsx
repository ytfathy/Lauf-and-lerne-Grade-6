import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { CheckpointModal, GameOverModal, PauseModal } from './components/GameModals';
import { LessonSelectScreen } from './components/LessonSelectScreen';
import { OpeningScreen } from './components/OpeningScreen';
import {
  CharactersModal,
  LeaderboardModal,
  MissionsModal,
  SettingsModal,
  ShopModal,
} from './components/SubModals';
import { TitleOverlay } from './components/TitleOverlay';
import { WorldSelector } from './components/WorldSelector';
import { audioManager } from './game/AudioManager';
import {
  CHARACTERS,
  DAILY_MISSIONS,
  LESSONS,
  UPGRADE_BASE_COST,
  UPGRADE_MAX_LEVEL,
} from './game/constants';
import { GameStateManager } from './game/GameStateManager';
import {
  applyMissionProgress,
  getQuestionsForLesson,
  selectNextQuestion,
  validateQuestionBank,
  type CheckpointAttemptOutcome,
} from './game/rules';
import { SaveManager } from './game/SaveManager';
import { WORLD_CONFIGS } from './game/WorldConfiguration';
import type {
  CheckpointBank,
  CheckpointQuestion,
  GamePhase,
  HudSnapshot,
  LessonId,
  ModalView,
  PowerUpType,
  RunMissionCounters,
  RunSummary,
  SaveData,
  ScreenStep,
  WorldId,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  score: 0,
  distance: 0,
  runCoins: 0,
  runGems: 0,
  totalCoins: 0,
  speed: 20,
  multiplier: 1,
  powerUps: { magnet: 0, jetpack: 0, sneakers: 0, multiplier: 0, hoverboard: 0 },
  nextCheckpointDist: 250,
  checkpointsEnabled: true,
  shieldActive: false,
  hitFlash: 0,
  activeWorldId: 'modern_cairo',
  activeWorldName: 'Modern Cairo',
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameStateManager | null>(null);
  const usedQuestionIdsRef = useRef<Set<string>>(SaveManager.loadUsedQuestionIds());
  const checkpointResolvedRef = useRef<boolean>(false);

  const [save, setSave] = useState<SaveData>(() => SaveManager.load());
  const saveRef = useRef<SaveData>(save);
  saveRef.current = save;

  const [phase, setPhase] = useState<GamePhase>('title');
  const [screenStep, setScreenStep] = useState<ScreenStep>('opening');
  const [modalView, setModalView] = useState<ModalView>('none');
  const [previewCharId, setPreviewCharId] = useState<string>(() => save.selectedCharacterId);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [newlyCompletedMissions, setNewlyCompletedMissions] = useState<string[]>([]);

  const [questionBank, setQuestionBank] = useState<CheckpointBank | null>(null);
  const questionBankRef = useRef<CheckpointBank | null>(null);
  questionBankRef.current = questionBank;
  const [activeQuestion, setActiveQuestion] = useState<CheckpointQuestion | null>(null);
  const [checkpointDistance, setCheckpointDistance] = useState(0);
  const [checkpointNumber, setCheckpointNumber] = useState(0);

  const urlCheckpointDist = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const raw = new URLSearchParams(window.location.search).get('checkpointDist');
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 10 ? parsed : null;
  }, []);

  // Sync body dataset state for game shell & testability + pause covered background 3D engine during intro screens
  useEffect(() => {
    document.body.dataset.state = phase;
    document.body.dataset.screen = screenStep;
    document.body.dataset.world = save.selectedWorldId;
    document.body.dataset.lesson = save.selectedLessonId;
    engineRef.current?.setSuspended(phase === 'title' && screenStep !== 'character_hub');
  }, [phase, screenStep, save.selectedWorldId, save.selectedLessonId]);

  // Persist save changes & sync audio/engine config
  useEffect(() => {
    SaveManager.save(save);
    audioManager.updateSettings(save.settings);
    const engine = engineRef.current;
    if (engine) {
      engine.setTotalCoins(save.totalCoins);
      engine.setUpgradeLevels(save.upgradeLevels);
      engine.setCheckpointConfig(
        save.settings.checkpointsEnabled,
        urlCheckpointDist ?? save.settings.checkpointIntervalMeters,
      );
    }
  }, [save, urlCheckpointDist]);

  // Load external educational question bank JSON
  useEffect(() => {
    let active = true;
    fetch('/questions.json')
      .then((res) => res.json())
      .then((raw) => {
        if (!active) return;
        setQuestionBank(validateQuestionBank(raw));
      })
      .catch(() => {
        // Ignore fetch errors cleanly if offline
      });
    return () => {
      active = false;
    };
  }, []);

  const handleGameOver = useCallback(
    (summary: RunSummary, missionCounters: RunMissionCounters) => {
      const cur = saveRef.current;
      const isNewBest = summary.score > cur.bestScore;
      const bestScore = Math.max(cur.bestScore, summary.score);

      const { updated: updatedMissions, newlyCompleted } = applyMissionProgress(
        cur.missionProgress,
        DAILY_MISSIONS,
        missionCounters,
      );

      const newAchievements = [...cur.unlockedAchievements];
      for (const mId of newlyCompleted) {
        const def = DAILY_MISSIONS.find((m) => m.id === mId);
        if (def && !newAchievements.includes(def.achievementTitle)) {
          newAchievements.push(def.achievementTitle);
        }
      }

      const nextSave: SaveData = {
        ...cur,
        totalCoins: cur.totalCoins + summary.pendingCoinsToBank,
        totalGems: cur.totalGems + summary.gemsCollected,
        bestScore,
        totalDistance: cur.totalDistance + summary.distance,
        missionProgress: updatedMissions,
        unlockedAchievements: newAchievements,
        leaderboard: SaveManager.recordRun(
          cur.leaderboard,
          summary.score,
          summary.distance,
          cur.selectedCharacterId,
          cur.selectedWorldId,
        ),
      };

      setSave(nextSave);
      setNewlyCompletedMissions(newlyCompleted);
      setRunSummary({ ...summary, bestScore, isNewBest });
    },
    [],
  );

  const handleCheckpointDue = useCallback((distance: number) => {
    const bank = questionBankRef.current;
    if (!bank) {
      engineRef.current?.resumeGame();
      return;
    }
    const q = selectNextQuestion(
      bank,
      usedQuestionIdsRef.current,
      Math.random,
      saveRef.current.selectedLessonId,
    );
    SaveManager.saveUsedQuestionIds(usedQuestionIdsRef.current);
    checkpointResolvedRef.current = false;
    setCheckpointNumber((prev) => prev + 1);
    setCheckpointDistance(distance);
    setActiveQuestion(q);
  }, []);

  // Initialize Three.js GameStateManager once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new GameStateManager(mount, {
      onHudUpdate: (snapshot) => setHud(snapshot),
      onGameOver: handleGameOver,
      onCheckpointDue: handleCheckpointDue,
      onPhaseSync: (nextPhase) => setPhase(nextPhase),
    });

    const cur = saveRef.current;
    engine.setCharacter(cur.selectedCharacterId);
    engine.setWorld(cur.selectedWorldId);
    engine.setTotalCoins(cur.totalCoins);
    engine.setUpgradeLevels(cur.upgradeLevels);
    engine.setCheckpointConfig(
      cur.settings.checkpointsEnabled,
      urlCheckpointDist ?? cur.settings.checkpointIntervalMeters,
    );
    audioManager.setWorld(cur.selectedWorldId);
    audioManager.updateSettings(cur.settings);
    engineRef.current = engine;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setScreenStep('character_hub');
      engine.startRun();
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleCheckpointDue, handleGameOver, urlCheckpointDist]);

  const handleActivateHoverboard = useCallback(() => {
    const cur = saveRef.current;
    if (phase !== 'playing' || cur.hoverboardCharges <= 0 || hud.shieldActive) return;
    setSave((prev) => ({
      ...prev,
      hoverboardCharges: Math.max(0, prev.hoverboardCharges - 1),
    }));
    engineRef.current?.activateHoverboardFromReserve();
  }, [hud.shieldActive, phase]);

  // Global [H] shortcut to trigger reserve Hoverboard Shield during active gameplay
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') {
        handleActivateHoverboard();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleActivateHoverboard, phase]);

  const handleStart = useCallback(() => {
    audioManager.playClick();
    setModalView('none');
    setScreenStep('character_hub');
    setRunSummary(null);
    setActiveQuestion(null);
    setCheckpointNumber(0);
    checkpointResolvedRef.current = false;
    engineRef.current?.setCharacterPreview(false);
    engineRef.current?.setCharacter(saveRef.current.selectedCharacterId);
    engineRef.current?.setWorld(saveRef.current.selectedWorldId);
    engineRef.current?.setUpgradeLevels(saveRef.current.upgradeLevels);
    engineRef.current?.startRun();
  }, []);

  const handleGoToLessons = useCallback(() => {
    audioManager.playClick();
    setModalView('none');
    engineRef.current?.setCharacterPreview(false);
    engineRef.current?.setCharacter(saveRef.current.selectedCharacterId);
    setScreenStep('lessons');
  }, []);

  const handleGoToOpening = useCallback(() => {
    audioManager.playClick();
    setModalView('none');
    engineRef.current?.setCharacterPreview(false);
    setScreenStep('opening');
  }, []);

  const handleSelectLesson = useCallback((lessonId: LessonId) => {
    audioManager.playClick();
    setSave((prev) => ({ ...prev, selectedLessonId: lessonId }));
    setScreenStep('character_hub');
    setPreviewCharId(saveRef.current.selectedCharacterId);
    engineRef.current?.setCharacter(saveRef.current.selectedCharacterId);
    engineRef.current?.setCharacterPreview(true);
    setModalView('characters');
  }, []);

  const handleOpenModal = useCallback((view: ModalView) => {
    audioManager.playClick();
    setModalView(view);
    if (view === 'characters') {
      setPreviewCharId(saveRef.current.selectedCharacterId);
      engineRef.current?.setCharacter(saveRef.current.selectedCharacterId);
      engineRef.current?.setCharacterPreview(true);
    } else {
      engineRef.current?.setCharacterPreview(false);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    audioManager.playClick();
    setModalView('none');
    engineRef.current?.setCharacterPreview(false);
    engineRef.current?.setCharacter(saveRef.current.selectedCharacterId);
  }, []);

  const handlePreviewChar = useCallback((id: string) => {
    audioManager.playClick();
    setPreviewCharId(id);
    engineRef.current?.setCharacter(id);
  }, []);

  const handleBuyOrSelectChar = useCallback((id: string) => {
    const def = CHARACTERS.find((c) => c.id === id);
    if (!def) return;
    audioManager.playClick();

    setSave((prev) => {
      const owned = prev.unlockedCharacters.includes(id);
      if (owned) {
        engineRef.current?.setCharacter(id);
        return { ...prev, selectedCharacterId: id };
      }
      if (prev.totalCoins < def.price) return prev;
      audioManager.playPowerUp();
      engineRef.current?.setCharacter(id);
      return {
        ...prev,
        totalCoins: prev.totalCoins - def.price,
        unlockedCharacters: [...prev.unlockedCharacters, id],
        selectedCharacterId: id,
      };
    });
  }, []);

  const handleSelectOrUnlockWorld = useCallback((id: WorldId) => {
    const cfg = WORLD_CONFIGS[id];
    if (!cfg) return;
    audioManager.playClick();
    const prev = saveRef.current;
    const owned = prev.unlockedWorlds.includes(id);
    if (owned) {
      engineRef.current?.setWorld(id);
      setSave((cur) => ({ ...cur, selectedWorldId: id }));
      return;
    }
    if (prev.totalCoins < cfg.unlockCost) return;
    audioManager.playPowerUp();
    engineRef.current?.setWorld(id);
    setSave((cur) => ({
      ...cur,
      totalCoins: cur.totalCoins - cfg.unlockCost,
      unlockedWorlds: [...cur.unlockedWorlds, id],
      selectedWorldId: id,
    }));
  }, []);

  const handleUpgradePowerUp = useCallback((type: PowerUpType) => {
    setSave((prev) => {
      const lvl = prev.upgradeLevels[type] ?? 1;
      if (lvl >= UPGRADE_MAX_LEVEL) return prev;
      const cost = lvl * UPGRADE_BASE_COST;
      if (prev.totalCoins < cost) return prev;
      audioManager.playPowerUp();
      return {
        ...prev,
        totalCoins: prev.totalCoins - cost,
        upgradeLevels: {
          ...prev.upgradeLevels,
          [type]: lvl + 1,
        },
      };
    });
  }, []);

  const handleBuyHoverboardCharge = useCallback((currency: 'coins' | 'gems') => {
    setSave((prev) => {
      if (currency === 'coins') {
        if (prev.totalCoins < 75) return prev;
        audioManager.playPowerUp();
        return {
          ...prev,
          totalCoins: prev.totalCoins - 75,
          hoverboardCharges: prev.hoverboardCharges + 1,
        };
      }
      if (prev.totalGems < 2) return prev;
      audioManager.playPowerUp();
      return {
        ...prev,
        totalGems: prev.totalGems - 2,
        hoverboardCharges: prev.hoverboardCharges + 1,
      };
    });
  }, []);

  const handleClaimMission = useCallback((missionId: string) => {
    const m = DAILY_MISSIONS.find((item) => item.id === missionId);
    if (!m) return;
    audioManager.playPowerUp();
    setSave((prev) => {
      if (prev.claimedMissions.includes(missionId)) return prev;
      const progress = prev.missionProgress[missionId] ?? 0;
      if (progress < m.target) return prev;
      return {
        ...prev,
        totalCoins: prev.totalCoins + m.rewardCoins,
        claimedMissions: [...prev.claimedMissions, missionId],
      };
    });
  }, []);

  const handleUpdateSettings = useCallback((patch: Partial<SaveData['settings']>) => {
    audioManager.playClick();
    setSave((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  }, []);

  const handleCheckpointResolved = useCallback((outcome: CheckpointAttemptOutcome) => {
    if (checkpointResolvedRef.current) return;
    checkpointResolvedRef.current = true;

    audioManager.playCheckpoint(outcome.correct);

    if (outcome.correct && outcome.coinsAwarded > 0) {
      setSave((prev) => ({
        ...prev,
        totalCoins: prev.totalCoins + outcome.coinsAwarded,
      }));
    }

    engineRef.current?.applyCheckpointReward(
      outcome.coinsAwarded,
      outcome.scoreBonus,
      false,
      outcome.correct,
    );
  }, []);

  const handleCheckpointAutoResume = useCallback(() => {
    setActiveQuestion(null);
    engineRef.current?.resumeGame();
  }, []);

  const unclaimedMissions = useMemo(() => {
    return DAILY_MISSIONS.filter(
      (m) =>
        (save.missionProgress[m.id] ?? 0) >= m.target &&
        !save.claimedMissions.includes(m.id),
    ).length;
  }, [save.claimedMissions, save.missionProgress]);

  const questionCountsByLesson = useMemo(() => {
    if (!questionBank) return undefined;
    const counts: Partial<Record<LessonId, number>> = {};
    for (const l of LESSONS) {
      counts[l.id] = getQuestionsForLesson(questionBank.questions, l.id).length;
    }
    return counts;
  }, [questionBank]);

  const selectedChar = CHARACTERS.find((c) => c.id === save.selectedCharacterId) ?? CHARACTERS[0];
  const selectedWorld = WORLD_CONFIGS[save.selectedWorldId] ?? WORLD_CONFIGS.modern_cairo;
  const selectedLesson = LESSONS.find((l) => l.id === save.selectedLessonId) ?? LESSONS[0];
  const activeLessonLabel = `${selectedLesson.moduleLabel} · ${selectedLesson.title}`;

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#08245c]">
      {/* Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 w-full h-full"
        data-testid="game-canvas"
      />

      {/* Screen 1: Animated Opening Screen */}
      {phase === 'title' && screenStep === 'opening' && (
        <OpeningScreen
          bestScore={save.bestScore}
          unclaimedMissions={unclaimedMissions}
          modalOpen={modalView !== 'none'}
          onPlay={handleGoToLessons}
          onOpenLessons={handleGoToLessons}
          onOpenAchievements={() => handleOpenModal('missions')}
          onOpenSettings={() => handleOpenModal('settings')}
        />
      )}

      {/* Screen 2: Lesson Selection Screen */}
      {phase === 'title' && screenStep === 'lessons' && (
        <LessonSelectScreen
          selectedLessonId={save.selectedLessonId}
          questionCountsByLesson={questionCountsByLesson}
          onSelectLesson={handleSelectLesson}
          onBack={handleGoToOpening}
        />
      )}

      {/* Screen 3: Existing Character / World Hub */}
      {phase === 'title' && screenStep === 'character_hub' && (
        <TitleOverlay
          totalCoins={save.totalCoins}
          totalGems={save.totalGems}
          bestScore={save.bestScore}
          selectedCharacterName={selectedChar.name}
          selectedWorldName={selectedWorld.name}
          selectedLessonLabel={selectedLesson.title}
          unclaimedMissions={unclaimedMissions}
          activeModal={modalView}
          onStart={handleStart}
          onOpenModal={handleOpenModal}
          onBackToLessons={handleGoToLessons}
        />
      )}

      {/* Active Gameplay HUD */}
      {(phase === 'playing' || phase === 'checkpoint') && (
        <GameHud
          hud={hud}
          activeLessonLabel={selectedLesson.title}
          soundEnabled={save.settings.soundEnabled}
          hoverboardCharges={save.hoverboardCharges}
          upgradeLevels={save.upgradeLevels}
          onActivateHoverboard={handleActivateHoverboard}
          onPause={() => {
            audioManager.playClick();
            engineRef.current?.pauseGame(false);
          }}
          onToggleSound={() =>
            handleUpdateSettings({ soundEnabled: !save.settings.soundEnabled })
          }
        />
      )}

      {/* Pause Modal */}
      {phase === 'paused' && (
        <PauseModal
          onResume={() => {
            audioManager.playClick();
            engineRef.current?.resumeGame();
          }}
          onRestart={handleStart}
          onMainMenu={() => {
            audioManager.playClick();
            setScreenStep('character_hub');
            engineRef.current?.returnToTitle();
          }}
        />
      )}

      {/* Modular Educational Checkpoint Question Overlay */}
      {phase === 'checkpoint' && activeQuestion && questionBank && (
        <CheckpointModal
          question={activeQuestion}
          rewardRules={questionBank.rewardRules}
          checkpointNumber={checkpointNumber}
          distance={checkpointDistance}
          lessonLabel={activeLessonLabel}
          onAnswerResolved={handleCheckpointResolved}
          onAutoResume={handleCheckpointAutoResume}
        />
      )}

      {/* Game Over Modal */}
      {phase === 'gameover' && runSummary && (
        <GameOverModal
          summary={runSummary}
          newlyCompletedMissions={newlyCompletedMissions}
          onRestart={handleStart}
          onMainMenu={() => {
            audioManager.playClick();
            setRunSummary(null);
            setScreenStep('character_hub');
            engineRef.current?.returnToTitle();
          }}
        />
      )}

      {/* Main Menu Sub-Modals */}
      {phase === 'title' && modalView === 'characters' && (
        <CharactersModal
          save={save}
          previewCharId={previewCharId}
          activeLessonLabel={selectedLesson.title}
          onPreviewChar={handlePreviewChar}
          onBuyOrSelectChar={handleBuyOrSelectChar}
          onRotatePreview={(delta) => engineRef.current?.rotateCharacterPreview(delta)}
          onBackToLessons={handleGoToLessons}
          onStartRun={handleStart}
          onClose={handleCloseModal}
        />
      )}

      {phase === 'title' && modalView === 'worlds' && (
        <WorldSelector
          save={save}
          onSelectOrUnlockWorld={handleSelectOrUnlockWorld}
          onClose={handleCloseModal}
        />
      )}

      {phase === 'title' && modalView === 'shop' && (
        <ShopModal
          save={save}
          onUpgradePowerUp={handleUpgradePowerUp}
          onBuyHoverboardCharge={handleBuyHoverboardCharge}
          onClose={handleCloseModal}
        />
      )}

      {phase === 'title' && modalView === 'missions' && (
        <MissionsModal
          save={save}
          onClaimMission={handleClaimMission}
          onClose={handleCloseModal}
        />
      )}

      {phase === 'title' && modalView === 'leaderboard' && (
        <LeaderboardModal save={save} onClose={handleCloseModal} />
      )}

      {phase === 'title' && modalView === 'settings' && (
        <SettingsModal
          save={save}
          onUpdateSettings={handleUpdateSettings}
          onClose={handleCloseModal}
        />
      )}
    </main>
  );
}
