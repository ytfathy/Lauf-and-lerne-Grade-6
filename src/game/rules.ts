import {
  BASE_SPEED,
  CHECKPOINT_CONFIG,
  LANE_CENTERS,
  LESSONS,
  MAX_SPEED,
  POWERUP_DURATIONS,
  SPEED_RAMP_PER_METER,
} from './constants';
import type {
  ActivePowerUps,
  CheckpointBank,
  CheckpointQuestion,
  CoinBlueprint,
  LaneIndex,
  LessonId,
  MissionDef,
  MissionProgressMap,
  ObstacleBlueprint,
  ObstacleKind,
  PowerUpBlueprint,
  PowerUpType,
  RunMissionCounters,
  UpgradeLevels,
  WavePlan,
} from './types';

export function calculateSpeedAtDistance(distance: number): number {
  const safeDist = Math.max(0, distance);
  return Math.min(MAX_SPEED, BASE_SPEED + safeDist * SPEED_RAMP_PER_METER);
}

export function calculateRunScore(
  distance: number,
  coinsCollected: number,
  bonusScore: number,
): number {
  return Math.max(0, Math.round(distance * 5 + coinsCollected * 15 + bonusScore));
}

export function getActiveMultiplier(powerUps: ActivePowerUps): number {
  return powerUps.multiplier > 0 ? 2 : 1;
}

export function getUpgradedPowerUpDuration(type: PowerUpType, levels: UpgradeLevels): number {
  const lvl = Math.max(1, levels[type] ?? 1);
  return POWERUP_DURATIONS[type] + (lvl - 1) * 2.0;
}

export function getObstacleDimensions(kind: ObstacleKind): {
  height: number;
  length: number;
  requiresSlide: boolean;
  jumpable: boolean;
  isTrain: boolean;
} {
  switch (kind) {
    case 'low_barrier':
      return { height: 1.15, length: 1.0, requiresSlide: false, jumpable: true, isTrain: false };
    case 'high_gantry':
      return { height: 3.6, length: 1.2, requiresSlide: true, jumpable: false, isTrain: false };
    case 'full_barricade':
      return { height: 2.6, length: 1.2, requiresSlide: false, jumpable: false, isTrain: false };
    case 'stationary_train':
      return { height: 3.8, length: 16.0, requiresSlide: false, jumpable: false, isTrain: true };
    case 'train_with_ramp':
      return { height: 3.8, length: 20.0, requiresSlide: false, jumpable: false, isTrain: true };
    case 'moving_train':
      return { height: 3.8, length: 16.0, requiresSlide: false, jumpable: false, isTrain: true };
  }
}

export function isWaveFair(obstacles: ObstacleBlueprint[]): boolean {
  const blockedLanes = new Set<LaneIndex>();
  for (const obs of obstacles) {
    if (
      obs.kind === 'full_barricade' ||
      obs.kind === 'stationary_train' ||
      obs.kind === 'moving_train'
    ) {
      blockedLanes.add(obs.lane);
    }
  }
  return blockedLanes.size < 3;
}

const POWERUP_POOL: PowerUpType[] = [
  'magnet',
  'jetpack',
  'sneakers',
  'multiplier',
  'hoverboard',
];

export function generateFairObstacleWave(
  distance: number,
  waveIndex: number,
  rng: () => number = Math.random,
): WavePlan {
  const obstacles: ObstacleBlueprint[] = [];
  const coins: CoinBlueprint[] = [];
  const powerUps: PowerUpBlueprint[] = [];

  const openLane = Math.floor(rng() * 3) as LaneIndex;
  const difficulty = Math.min(1, distance / 1200);
  const chunkLength = 26;
  const patternRoll = rng();

  if (waveIndex < 2) {
    const lane = ((openLane + 1) % 3) as LaneIndex;
    const dims = getObstacleDimensions('low_barrier');
    obstacles.push({
      lane,
      kind: 'low_barrier',
      zOffset: 6,
      length: dims.length,
      height: dims.height,
    });
    for (let i = -2; i <= 2; i++) {
      coins.push({
        lane,
        y: 0.7 + (2 - Math.abs(i)) * 0.65,
        zOffset: 6 + i * 2.1,
      });
    }
    for (let i = 0; i < 5; i++) {
      coins.push({
        lane: openLane,
        y: 0.75,
        zOffset: 2 + i * 3.0,
        isGem: i === 2 && waveIndex === 1,
      });
    }
    return { obstacles, coins, powerUps, chunkLength };
  }

  if (patternRoll < 0.36) {
    const lanes: LaneIndex[] = [0, 1, 2];
    const trainLanes = lanes.filter((l) => l !== openLane);
    const useTwoTrains = rng() < 0.45 + difficulty * 0.35;
    const activeTrainLanes = useTwoTrains
      ? trainLanes
      : [trainLanes[Math.floor(rng() * trainLanes.length)]];

    activeTrainLanes.forEach((lane, idx) => {
      const r = rng();
      let kind: ObstacleKind = 'stationary_train';
      if (idx === 0 && r < 0.38) {
        kind = 'train_with_ramp';
      } else if (r > 0.62) {
        kind = 'moving_train';
      }
      const dims = getObstacleDimensions(kind);
      const variant = Math.floor(rng() * 3);
      obstacles.push({
        lane,
        kind,
        zOffset: 10,
        length: dims.length,
        height: dims.height,
        hasRamp: kind === 'train_with_ramp',
        speed: kind === 'moving_train' ? 10 + difficulty * 8 : 0,
        trainVariant: variant,
      });

      if (kind === 'train_with_ramp') {
        for (let c = 0; c < 5; c++) {
          coins.push({
            lane,
            y: 4.5,
            zOffset: 6 + c * 2.6,
            isGem: c === 4,
          });
        }
      }
    });

    if (!useTwoTrains && rng() < 0.5) {
      const otherClear = lanes.find((l) => l !== openLane && !activeTrainLanes.includes(l))!;
      const kind: ObstacleKind = rng() < 0.5 ? 'low_barrier' : 'high_gantry';
      const dims = getObstacleDimensions(kind);
      obstacles.push({
        lane: otherClear,
        kind,
        zOffset: 12,
        length: dims.length,
        height: dims.height,
      });
    }

    for (let i = 0; i < 5; i++) {
      coins.push({
        lane: openLane,
        y: 0.75,
        zOffset: 3 + i * 3.2,
      });
    }
  } else if (patternRoll < 0.72) {
    const lanes: LaneIndex[] = [0, 1, 2];
    for (const lane of lanes) {
      if (lane === openLane && rng() < 0.55) {
        continue;
      }
      const subRoll = rng();
      let kind: ObstacleKind;
      if (lane === openLane) {
        kind = subRoll < 0.5 ? 'low_barrier' : 'high_gantry';
      } else {
        kind = subRoll < 0.38 ? 'low_barrier' : subRoll < 0.72 ? 'high_gantry' : 'full_barricade';
      }
      const dims = getObstacleDimensions(kind);
      const zOff = 6 + (lane === 1 ? 6 : 0);
      obstacles.push({
        lane,
        kind,
        zOffset: zOff,
        length: dims.length,
        height: dims.height,
      });

      if (kind === 'low_barrier') {
        for (let i = -1; i <= 1; i++) {
          coins.push({
            lane,
            y: 1.9 + (1 - Math.abs(i)) * 0.55,
            zOffset: zOff + i * 1.9,
            isGem: i === 0 && rng() < 0.28,
          });
        }
      } else if (kind === 'high_gantry') {
        coins.push({ lane, y: 0.6, zOffset: zOff });
      }
    }

    if (coins.length < 3) {
      for (let i = 0; i < 5; i++) {
        coins.push({
          lane: openLane,
          y: 0.75,
          zOffset: 3 + i * 3.0,
        });
      }
    }
  } else {
    const lanes: LaneIndex[] = [0, 1, 2];
    const blockLane = ((openLane + 1) % 3) as LaneIndex;
    const jumpLane = ((openLane + 2) % 3) as LaneIndex;

    const d1 = getObstacleDimensions('full_barricade');
    obstacles.push({
      lane: blockLane,
      kind: 'full_barricade',
      zOffset: 7,
      length: d1.length,
      height: d1.height,
    });

    const d2 = getObstacleDimensions('low_barrier');
    obstacles.push({
      lane: jumpLane,
      kind: 'low_barrier',
      zOffset: 15,
      length: d2.length,
      height: d2.height,
    });

    for (let i = 0; i < 6; i++) {
      const targetLane = lanes[(openLane + (i >= 2 && i <= 3 ? 2 : 0)) % 3];
      coins.push({
        lane: targetLane,
        y: i >= 2 && i <= 3 ? 1.8 : 0.75,
        zOffset: 3 + i * 2.8,
        isGem: i === 3 && rng() < 0.3,
      });
    }
  }

  if (waveIndex >= 2 && (waveIndex % 3 === 0 || rng() < 0.25)) {
    const pType = POWERUP_POOL[Math.floor(rng() * POWERUP_POOL.length)];
    powerUps.push({
      lane: openLane,
      type: pType,
      y: 1.05,
      zOffset: 19,
    });
  }

  if (!isWaveFair(obstacles)) {
    const idx = obstacles.findIndex(
      (o) =>
        o.kind === 'full_barricade' ||
        o.kind === 'stationary_train' ||
        o.kind === 'moving_train',
    );
    if (idx >= 0) {
      obstacles.splice(idx, 1);
    }
  }

  return { obstacles, coins, powerUps, chunkLength };
}

export interface PlayerCollisionBox {
  x: number;
  y: number;
  height: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
}

export interface WorldObstacleBox {
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
  bottomY: number;
  topY: number;
  kind: ObstacleKind;
}

export type CollisionOutcome =
  | { type: 'none' }
  | { type: 'land_on_top'; topY: number }
  | { type: 'crash' };

export function evaluateObstacleCollision(
  player: PlayerCollisionBox,
  obstacle: WorldObstacleBox,
): CollisionOutcome {
  const overlapX = Math.abs(player.x - obstacle.x) < player.halfWidth + obstacle.halfWidth;
  if (!overlapX) return { type: 'none' };

  const overlapZ = Math.abs(player.z - obstacle.z) < player.halfDepth + obstacle.halfDepth;
  if (!overlapZ) return { type: 'none' };

  const playerTop = player.y + player.height;
  const playerBottom = player.y;

  if (playerTop <= obstacle.bottomY + 0.08) {
    return { type: 'none' };
  }

  const isTrain =
    obstacle.kind === 'stationary_train' ||
    obstacle.kind === 'train_with_ramp' ||
    obstacle.kind === 'moving_train';
  const roofTolerance = isTrain ? 0.45 : 0.12;

  if (playerBottom >= obstacle.topY - roofTolerance) {
    if (isTrain && playerBottom <= obstacle.topY + 0.5) {
      return { type: 'land_on_top', topY: obstacle.topY };
    }
    return { type: 'none' };
  }

  if (obstacle.kind === 'train_with_ramp') {
    // Obstacles travel in +Z toward the player at z=0, so the ramp foot is at the +halfDepth front edge
    const rampLen = 4.2;
    const localZ = player.z - obstacle.z;
    const rampBottomLocalZ = obstacle.halfDepth;
    const rampTopLocalZ = obstacle.halfDepth - rampLen;

    // Approaching or climbing anywhere along the front ramp slope: lift smoothly without crashing
    if (localZ >= rampTopLocalZ - player.halfDepth) {
      const t = Math.max(0, Math.min(1, (rampBottomLocalZ - localZ) / rampLen));
      const rampY = t * obstacle.topY;
      return { type: 'land_on_top', topY: rampY };
    }

    // Transition buffer immediately past the top lip of the ramp onto the train roof
    if (localZ >= rampTopLocalZ - 2.6 && playerBottom >= Math.max(0.85, obstacle.topY * 0.3)) {
      return { type: 'land_on_top', topY: obstacle.topY };
    }
  }

  return { type: 'crash' };
}

export function checkCheckpointDue(
  distance: number,
  nextCheckpointDist: number,
  enabled: boolean,
): boolean {
  return enabled && nextCheckpointDist > 0 && distance >= nextCheckpointDist;
}

export function applyMissionProgress(
  current: MissionProgressMap,
  missions: MissionDef[],
  counters: RunMissionCounters,
): { updated: MissionProgressMap; newlyCompleted: string[] } {
  const updated: MissionProgressMap = { ...current };
  const newlyCompleted: string[] = [];

  for (const m of missions) {
    const prev = updated[m.id] ?? 0;
    let next = prev;
    if (m.metric === 'coins') {
      next = Math.min(m.target, prev + counters.coins);
    } else if (m.metric === 'distance') {
      next = Math.min(m.target, prev + counters.distance);
    } else if (m.metric === 'jumps') {
      next = Math.min(m.target, prev + counters.jumps);
    } else if (m.metric === 'powerups') {
      next = Math.min(m.target, prev + counters.powerUps);
    } else if (m.metric === 'no_crash_distance') {
      next = Math.min(m.target, Math.max(prev, counters.noCrashDistance));
    }
    updated[m.id] = next;
    if (prev < m.target && next >= m.target) {
      newlyCompleted.push(m.id);
    }
  }

  return { updated, newlyCompleted };
}

export function validateQuestionBank(raw: unknown): CheckpointBank {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid question bank: expected object');
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.questions) || obj.questions.length === 0) {
    throw new Error('Invalid question bank: questions array missing or empty');
  }

  const questions: CheckpointQuestion[] = obj.questions.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Invalid question at index ${idx}`);
    }
    const q = item as Record<string, unknown>;
    if (
      typeof q.id !== 'string' ||
      typeof q.category !== 'string' ||
      typeof q.prompt !== 'string' ||
      !Array.isArray(q.options) ||
      q.options.length < 2 ||
      q.options.length > 4 ||
      typeof q.correctIndex !== 'number' ||
      q.correctIndex < 0 ||
      q.correctIndex >= q.options.length
    ) {
      throw new Error(`Malformed question at index ${idx}`);
    }
    return {
      id: q.id,
      category: q.category,
      prompt: q.prompt,
      context: typeof q.context === 'string' && q.context.trim().length > 0 ? q.context : undefined,
      options: q.options.map(String),
      correctIndex: q.correctIndex,
      explanation: typeof q.explanation === 'string' ? q.explanation : '',
    };
  });

  const rr = (obj.rewardRules && typeof obj.rewardRules === 'object'
    ? obj.rewardRules
    : {}) as Record<string, unknown>;

  return {
    version: typeof obj.version === 'string' ? obj.version : '2.0.0',
    title: typeof obj.title === 'string' ? obj.title : 'Challenge Checkpoint',
    defaultIntervalMeters:
      typeof obj.defaultIntervalMeters === 'number' && obj.defaultIntervalMeters > 0
        ? obj.defaultIntervalMeters
        : CHECKPOINT_CONFIG.defaultIntervalMeters,
    rewardRules: {
      correctCoins:
        typeof rr.correctCoins === 'number' ? rr.correctCoins : CHECKPOINT_CONFIG.correctCoins,
      correctScoreBonus:
        typeof rr.correctScoreBonus === 'number'
          ? rr.correctScoreBonus
          : CHECKPOINT_CONFIG.correctScoreBonus,
      grantShieldOnCorrect:
        typeof rr.grantShieldOnCorrect === 'boolean' ? rr.grantShieldOnCorrect : false,
      participationCoins: typeof rr.participationCoins === 'number' ? rr.participationCoins : 0,
    },
    questions,
  };
}

export interface CheckpointAttemptOutcome {
  correct: boolean;
  selectedIdx: number | null;
  coinsAwarded: number;
  scoreBonus: number;
  autoResumeMs: number;
}

export function resolveCheckpointAttempt(
  question: CheckpointQuestion,
  selectedIdx: number | null,
): CheckpointAttemptOutcome {
  const isCorrect =
    selectedIdx !== null &&
    Number.isInteger(selectedIdx) &&
    selectedIdx >= 0 &&
    selectedIdx < question.options.length &&
    selectedIdx === question.correctIndex;

  if (isCorrect) {
    return {
      correct: true,
      selectedIdx,
      coinsAwarded: CHECKPOINT_CONFIG.correctCoins,
      scoreBonus: CHECKPOINT_CONFIG.correctScoreBonus,
      autoResumeMs: CHECKPOINT_CONFIG.correctAutoResumeMs,
    };
  }

  return {
    correct: false,
    selectedIdx,
    coinsAwarded: CHECKPOINT_CONFIG.wrongCoins,
    scoreBonus: 0,
    autoResumeMs: CHECKPOINT_CONFIG.wrongAutoResumeMs,
  };
}

export interface SpeechVoiceLike {
  lang: string;
  name?: string;
  localService?: boolean;
}

export function selectGermanVoice<T extends SpeechVoiceLike>(voices: readonly T[]): T | null {
  if (!voices || voices.length === 0) return null;

  const normalizeLang = (lang: string) => lang.trim().replace(/_/g, '-').toLowerCase();

  const deDeVoices = voices.filter((v) => normalizeLang(v.lang) === 'de-de');
  if (deDeVoices.length > 0) {
    return deDeVoices.find((v) => v.localService !== false) ?? deDeVoices[0];
  }

  const dePrefixVoices = voices.filter((v) => normalizeLang(v.lang).startsWith('de-'));
  if (dePrefixVoices.length > 0) {
    return dePrefixVoices.find((v) => v.localService !== false) ?? dePrefixVoices[0];
  }

  const deExact = voices.filter((v) => normalizeLang(v.lang) === 'de');
  if (deExact.length > 0) {
    return deExact[0];
  }

  return null;
}

export function cleanSpeechText(text: string): string {
  // Replace fill-in-the-blank underscores so TTS pauses instead of spelling underscores
  return text
    .replace(/\(\s*_{2,}\s*\)/g, ' … ')
    .replace(/_{2,}/g, ' … ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CHOICE_LABELS = ['A', 'B', 'C', 'D'] as const;

export function buildCheckpointSpeechSegments(question: CheckpointQuestion): string[] {
  const segments: string[] = [cleanSpeechText(question.prompt)];
  question.options.forEach((opt, idx) => {
    const label = CHOICE_LABELS[idx] ?? String(idx + 1);
    segments.push(`${label}: ${cleanSpeechText(opt)}`);
  });
  return segments;
}

export function getQuestionsForLesson(
  questions: readonly CheckpointQuestion[],
  lessonId?: LessonId | null,
): CheckpointQuestion[] {
  if (!lessonId) return [...questions];
  const lesson = LESSONS.find((l) => l.id === lessonId);
  if (!lesson) return [...questions];
  const allowedCategories = new Set(lesson.categories);
  const filtered = questions.filter((q) => allowedCategories.has(q.category));
  return filtered.length > 0 ? filtered : [...questions];
}

export function selectNextQuestion(
  bank: CheckpointBank,
  usedIds: Set<string>,
  rng: () => number = Math.random,
  lessonId?: LessonId | null,
): CheckpointQuestion {
  const scopedQuestions = getQuestionsForLesson(bank.questions, lessonId);
  let pool = scopedQuestions.filter((q) => !usedIds.has(q.id));
  if (pool.length === 0) {
    for (const q of scopedQuestions) {
      usedIds.delete(q.id);
    }
    pool = scopedQuestions;
  }
  const chosen = pool[Math.floor(rng() * pool.length)];
  usedIds.add(chosen.id);
  return chosen;
}

export function laneToX(lane: LaneIndex): number {
  return LANE_CENTERS[lane];
}
