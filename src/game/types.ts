export type GamePhase =
  | 'title'
  | 'playing'
  | 'paused'
  | 'checkpoint'
  | 'gameover';

export type ScreenStep =
  | 'opening'
  | 'lessons'
  | 'character_hub';

export type LessonId =
  | 'm4_l1'
  | 'm4_l2'
  | 'm4_l3'
  | 'm5_l1'
  | 'by_school';

export interface LessonDef {
  id: LessonId;
  number: number;
  moduleLabel: string;
  title: string;
  categories: readonly string[];
  accentHex: string;
  badgeColor: string;
}

export type ModalView =
  | 'none'
  | 'characters'
  | 'worlds'
  | 'missions'
  | 'leaderboard'
  | 'shop'
  | 'settings';

export type LaneIndex = 0 | 1 | 2; // 0 = Left (-3.2), 1 = Center (0), 2 = Right (+3.2)

export type WorldId =
  | 'ancient_egypt'
  | 'modern_cairo'
  | 'tropical_jungle'
  | 'snow_adventure'
  | 'futuristic_city';

export type PowerUpType =
  | 'magnet'
  | 'jetpack'
  | 'sneakers'
  | 'multiplier'
  | 'hoverboard';

export type ObstacleKind =
  | 'low_barrier'
  | 'high_gantry'
  | 'full_barricade'
  | 'stationary_train'
  | 'moving_train'
  | 'train_with_ramp';

export interface ObstacleBlueprint {
  lane: LaneIndex;
  kind: ObstacleKind;
  zOffset: number;
  length: number;
  height: number;
  hasRamp?: boolean;
  speed?: number;
  trainVariant?: number; // index into world's train palettes
}

export interface CoinBlueprint {
  lane: LaneIndex;
  y: number;
  zOffset: number;
  isGem?: boolean;
}

export interface PowerUpBlueprint {
  lane: LaneIndex;
  type: PowerUpType;
  y: number;
  zOffset: number;
}

export interface WavePlan {
  obstacles: ObstacleBlueprint[];
  coins: CoinBlueprint[];
  powerUps: PowerUpBlueprint[];
  chunkLength: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  role: string;
  tagline: string;
  price: number;
  jacketColor: number;
  shirtColor: number;
  pantsColor: number;
  skinColor: number;
  accentColor: number;
  hairColor: number;
  shoeColor: number;
  backpackColor: number;
  headwear: 'none' | 'hijab_pink' | 'cap_back' | 'cap_front' | 'glasses' | 'hijab_white';
  hasHeadphones?: boolean;
  bodyBuild?: 'athletic' | 'sturdy';
  outfitStyle?: 'varsity' | 'hoodie' | 'zipper_jacket';
  longHair?: boolean;
  capFlower?: boolean;
  sunglassesOnCap?: boolean;
  backpackEmblem?: 'm' | 'flower' | 'cross' | 'star';
  hasEyelashes?: boolean;
  hasWristwatch?: boolean;
  previewHex: string;
  badgeText: string;
}

export interface ActivePowerUps {
  magnet: number;
  jetpack: number;
  sneakers: number;
  multiplier: number;
  hoverboard: number;
}

export interface UpgradeLevels {
  magnet: number;
  jetpack: number;
  sneakers: number;
  multiplier: number;
  hoverboard: number;
}

export interface HudSnapshot {
  score: number;
  distance: number;
  runCoins: number;
  runGems: number;
  totalCoins: number;
  speed: number;
  multiplier: number;
  powerUps: ActivePowerUps;
  nextCheckpointDist: number;
  checkpointsEnabled: boolean;
  shieldActive: boolean;
  hitFlash: number;
  activeWorldId: WorldId;
  activeWorldName: string;
}

export interface RunSummary {
  score: number;
  distance: number;
  coinsCollected: number;
  pendingCoinsToBank: number;
  gemsCollected: number;
  bestScore: number;
  isNewBest: boolean;
  obstaclesCleared: number;
  powerUpsCollected: number;
  checkpointsAnswered: number;
  checkpointsCorrect: number;
  worldName: string;
}

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  metric: 'coins' | 'distance' | 'jumps' | 'powerups' | 'no_crash_distance';
  target: number;
  rewardCoins: number;
  achievementTitle: string;
}

export interface MissionProgressMap {
  [missionId: string]: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  checkpointsEnabled: boolean;
  checkpointIntervalMeters: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  characterId: string;
  score: number;
  distance: number;
  worldId?: WorldId;
  isPlayer: boolean;
}

export interface SaveData {
  totalCoins: number;
  totalGems: number;
  bestScore: number;
  totalDistance: number;
  unlockedCharacters: string[];
  selectedCharacterId: string;
  unlockedWorlds: WorldId[];
  selectedWorldId: WorldId;
  selectedLessonId: LessonId;
  upgradeLevels: UpgradeLevels;
  hoverboardCharges: number;
  missionProgress: MissionProgressMap;
  claimedMissions: string[];
  unlockedAchievements: string[];
  leaderboard: LeaderboardEntry[];
  settings: GameSettings;
}

export interface CheckpointQuestion {
  id: string;
  category: string;
  prompt: string;
  context?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface CheckpointRewardRules {
  correctCoins: number;
  correctScoreBonus: number;
  grantShieldOnCorrect: boolean;
  participationCoins: number;
}

export interface CheckpointBank {
  version: string;
  title: string;
  defaultIntervalMeters: number;
  rewardRules: CheckpointRewardRules;
  questions: CheckpointQuestion[];
}

export interface RunMissionCounters {
  coins: number;
  distance: number;
  jumps: number;
  powerUps: number;
  noCrashDistance: number;
}
