import { DEFAULT_SAVE_DATA, DEFAULT_SETTINGS, LESSONS, SEED_LEADERBOARD } from './constants';
import { WORLD_CONFIGS } from './WorldConfiguration';
import type { LeaderboardEntry, LessonId, SaveData, WorldId } from './types';

const STORAGE_KEY = 'run_with_malek_save_v2';
const LEGACY_KEY = 'run_with_malek_save_v1';

const LEGACY_WORLD_MAP: Record<string, WorldId> = {
  cairo: 'modern_cairo',
  alexandria: 'modern_cairo',
  ancient: 'ancient_egypt',
  modern: 'futuristic_city',
  desert: 'ancient_egypt',
  festival: 'futuristic_city',
};

function normalizeWorldId(raw: unknown): WorldId {
  if (typeof raw === 'string') {
    if (raw in WORLD_CONFIGS) return raw as WorldId;
    if (raw in LEGACY_WORLD_MAP) return LEGACY_WORLD_MAP[raw];
  }
  return 'modern_cairo';
}

function normalizeLessonId(raw: unknown): LessonId {
  if (typeof raw === 'string' && LESSONS.some((l) => l.id === raw)) {
    return raw as LessonId;
  }
  return DEFAULT_SAVE_DATA.selectedLessonId;
}

export class SaveManager {
  public static load(): SaveData {
    try {
      const raw =
        window.localStorage.getItem(STORAGE_KEY) ??
        window.localStorage.getItem(LEGACY_KEY);
      if (!raw) return structuredClone(DEFAULT_SAVE_DATA);
      const parsed = JSON.parse(raw) as Partial<SaveData>;

      const unlockedCharacters =
        Array.isArray(parsed.unlockedCharacters) && parsed.unlockedCharacters.length > 0
          ? parsed.unlockedCharacters
          : ['malek'];
      const selectedCharacterId =
        typeof parsed.selectedCharacterId === 'string' &&
        unlockedCharacters.includes(parsed.selectedCharacterId)
          ? parsed.selectedCharacterId
          : 'malek';

      const allWorldIds = Object.keys(WORLD_CONFIGS) as WorldId[];
      const selectedWorldId = normalizeWorldId(parsed.selectedWorldId);
      const selectedLessonId = normalizeLessonId(parsed.selectedLessonId);

      const leaderboard: LeaderboardEntry[] =
        Array.isArray(parsed.leaderboard) && parsed.leaderboard.length > 0
          ? parsed.leaderboard
          : [...SEED_LEADERBOARD];

      return {
        totalCoins:
          typeof parsed.totalCoins === 'number'
            ? Math.max(0, parsed.totalCoins)
            : DEFAULT_SAVE_DATA.totalCoins,
        totalGems:
          typeof parsed.totalGems === 'number'
            ? Math.max(0, parsed.totalGems)
            : DEFAULT_SAVE_DATA.totalGems,
        bestScore:
          typeof parsed.bestScore === 'number' ? Math.max(0, parsed.bestScore) : 0,
        totalDistance:
          typeof parsed.totalDistance === 'number' ? Math.max(0, parsed.totalDistance) : 0,
        unlockedCharacters,
        selectedCharacterId,
        unlockedWorlds: allWorldIds,
        selectedWorldId,
        selectedLessonId,
        upgradeLevels: {
          ...DEFAULT_SAVE_DATA.upgradeLevels,
          ...(parsed.upgradeLevels ?? {}),
        },
        hoverboardCharges:
          typeof parsed.hoverboardCharges === 'number'
            ? Math.max(0, parsed.hoverboardCharges)
            : DEFAULT_SAVE_DATA.hoverboardCharges,
        missionProgress: {
          ...DEFAULT_SAVE_DATA.missionProgress,
          ...(parsed.missionProgress ?? {}),
        },
        claimedMissions: Array.isArray(parsed.claimedMissions) ? parsed.claimedMissions : [],
        unlockedAchievements: Array.isArray(parsed.unlockedAchievements)
          ? parsed.unlockedAchievements
          : [],
        leaderboard,
        settings: {
          ...DEFAULT_SETTINGS,
          ...(parsed.settings ?? {}),
        },
      };
    } catch {
      return structuredClone(DEFAULT_SAVE_DATA);
    }
  }

  public static save(data: SaveData): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }

  public static recordRun(
    board: LeaderboardEntry[],
    score: number,
    distance: number,
    characterId: string,
    worldId: WorldId,
  ): LeaderboardEntry[] {
    if (score <= 0) return board;
    const entry: LeaderboardEntry = {
      id: `run-${Date.now()}`,
      name: 'You',
      characterId,
      score: Math.round(score),
      distance: Math.round(distance),
      worldId,
      isPlayer: true,
    };
    return [...board, entry].sort((a, b) => b.score - a.score).slice(0, 10);
  }

  public static loadUsedQuestionIds(): Set<string> {
    try {
      const raw = window.localStorage.getItem('run_with_malek_used_questions_v1');
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? new Set(parsed.filter((id): id is string => typeof id === 'string'))
        : new Set();
    } catch {
      return new Set();
    }
  }

  public static saveUsedQuestionIds(ids: Set<string>): void {
    try {
      window.localStorage.setItem('run_with_malek_used_questions_v1', JSON.stringify([...ids]));
    } catch {
      // Ignore storage errors cleanly
    }
  }
}
