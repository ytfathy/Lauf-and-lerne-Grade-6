import type { WorldId } from './types';

export interface WorldTrainStyle {
  bodyColor: number;
  stripeColor: number;
  roofColor: number;
  glowColor: number;
  isMaglev?: boolean;
}

export interface WorldConfig {
  id: WorldId;
  name: string;
  shortTag: string;
  description: string;
  unlockCost: number;
  atmosphereTags: [string, string, string];

  // Sky & Fog & Lighting
  skyTopHex: string;
  skyMidHex: string;
  skyHorizonHex: string;
  sunOrMoonHex: string;
  isNight: boolean;
  fogColor: number;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  rimColor: number;

  // Ground, Path & Track Materials
  groundColor: number;
  groundSecondaryHex: string;
  trackBaseHex: string;
  sleeperHex: string;
  railColor: number;
  railEmissive: number;
  platformBaseHex: string;
  platformTrimHex: string;
  platformMetalness: number;

  // Obstacles & Trains
  barrierPrimaryHex: string;
  barrierSecondaryHex: string;
  gantryColor: number;
  barricadeColor: number;
  trainStyles: [WorldTrainStyle, WorldTrainStyle, WorldTrainStyle];

  // Environment & Particles
  weatherType: 'sandstorm' | 'sunbeams' | 'fireflies' | 'snowstorm' | 'neon_rain';
  weatherColor: number;
  weatherCount: number;
  accentColor: number;
  previewGradient: string;

  // Audio Profile
  musicTempoMs: number;
  musicScale: number[];
  musicBass: number[];
  musicWave: OscillatorType;
  ambientToneHz: number;
}

export const WORLD_CONFIGS: Record<WorldId, WorldConfig> = {
  ancient_egypt: {
    id: 'ancient_egypt',
    name: 'Ancient Egypt',
    shortTag: 'Pyramids & Temples',
    description: 'Sprint across golden sandstone rails past Great Pyramids, obelisks, sphinx statues, and swirling desert sands.',
    unlockCost: 0,
    atmosphereTags: ['Golden Dunes', 'Pharaoh Trains', 'Sandstorms'],
    skyTopHex: '#1d6fd1',
    skyMidHex: '#7dd3fc',
    skyHorizonHex: '#fde68a',
    sunOrMoonHex: '#fef08a',
    isNight: false,
    fogColor: 0xf6d58e,
    fogDensity: 0.0046,
    sunColor: 0xffe4a0,
    sunIntensity: 2.5,
    hemiSky: 0xfde68a,
    hemiGround: 0x92400e,
    hemiIntensity: 1.0,
    rimColor: 0xf59e0b,
    groundColor: 0xd99b52,
    groundSecondaryHex: '#c2813a',
    trackBaseHex: '#b4824a',
    sleeperHex: '#6b4226',
    railColor: 0xfbbf24,
    railEmissive: 0x2a1800,
    platformBaseHex: '#e7c697',
    platformTrimHex: '#d97706',
    platformMetalness: 0.05,
    barrierPrimaryHex: '#d97706',
    barrierSecondaryHex: '#fef3c7',
    gantryColor: 0xb45309,
    barricadeColor: 0x92400e,
    trainStyles: [
      { bodyColor: 0xca8a04, stripeColor: 0x1e3a8a, roofColor: 0xfef3c7, glowColor: 0xfef08a },
      { bodyColor: 0x7e22ce, stripeColor: 0xfacc15, roofColor: 0xe9d5ff, glowColor: 0xfde047 },
      { bodyColor: 0xb45309, stripeColor: 0x06b6d4, roofColor: 0xfde68a, glowColor: 0xfbbf24 },
    ],
    weatherType: 'sandstorm',
    weatherColor: 0xfde68a,
    weatherCount: 95,
    accentColor: 0xf59e0b,
    previewGradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 45%, #fde047 100%)',
    musicTempoMs: 195,
    musicScale: [293.66, 311.13, 392.0, 440.0, 466.16, 554.37, 440.0, 392.0],
    musicBass: [146.83, 146.83, 196.0, 196.0, 220.0, 220.0, 164.81, 146.83],
    musicWave: 'triangle',
    ambientToneHz: 110,
  },

  modern_cairo: {
    id: 'modern_cairo',
    name: 'Modern Cairo',
    shortTag: 'Capital Metro',
    description: 'Race down Cairo boulevards lined with ornate balconies, palm avenues, overpass bridges, Cairo Tower, and express metro cars.',
    unlockCost: 0,
    atmosphereTags: ['Cairo Skyline', 'Express Metro', 'City Bridges'],
    skyTopHex: '#0284c7',
    skyMidHex: '#60a5fa',
    skyHorizonHex: '#bae6fd',
    sunOrMoonHex: '#fffbeb',
    isNight: false,
    fogColor: 0xa5d8ff,
    fogDensity: 0.0036,
    sunColor: 0xfff5d6,
    sunIntensity: 2.3,
    hemiSky: 0x87ceeb,
    hemiGround: 0xb48a60,
    hemiIntensity: 1.0,
    rimColor: 0x38bdf8,
    groundColor: 0xc2a376,
    groundSecondaryHex: '#9c7e54',
    trackBaseHex: '#6f6558',
    sleeperHex: '#4a3222',
    railColor: 0xe2e8f0,
    railEmissive: 0x000000,
    platformBaseHex: '#e2d5be',
    platformTrimHex: '#facc15',
    platformMetalness: 0.1,
    barrierPrimaryHex: '#f97316',
    barrierSecondaryHex: '#ffffff',
    gantryColor: 0x1e40af,
    barricadeColor: 0xdc2626,
    trainStyles: [
      { bodyColor: 0x2563eb, stripeColor: 0xfacc15, roofColor: 0xf1f5f9, glowColor: 0xfef9c3 },
      { bodyColor: 0xdc2626, stripeColor: 0xfef08a, roofColor: 0xf8fafc, glowColor: 0xfef08a },
      { bodyColor: 0xeab308, stripeColor: 0x1d4ed8, roofColor: 0xf1f5f9, glowColor: 0xffffff },
    ],
    weatherType: 'sunbeams',
    weatherColor: 0xfef9c3,
    weatherCount: 45,
    accentColor: 0x38bdf8,
    previewGradient: 'linear-gradient(135deg, #0369a1 0%, #38bdf8 55%, #fde047 100%)',
    musicTempoMs: 180,
    musicScale: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 392.0, 329.63],
    musicBass: [130.81, 130.81, 164.81, 164.81, 196.0, 196.0, 146.83, 196.0],
    musicWave: 'triangle',
    ambientToneHz: 95,
  },

  tropical_jungle: {
    id: 'tropical_jungle',
    name: 'Tropical Jungle',
    shortTag: 'Rainforest & Waterfalls',
    description: 'Dash along mossy timber tracks beneath towering jungle canopies, cascading waterfalls, stone temples, and wooden rope bridges.',
    unlockCost: 0,
    atmosphereTags: ['Waterfalls', 'Jungle Temples', 'Fireflies'],
    skyTopHex: '#047857',
    skyMidHex: '#34d399',
    skyHorizonHex: '#d9f99d',
    sunOrMoonHex: '#fef08a',
    isNight: false,
    fogColor: 0xa7f3d0,
    fogDensity: 0.0048,
    sunColor: 0xfffbeb,
    sunIntensity: 2.2,
    hemiSky: 0x6ee7b7,
    hemiGround: 0x14532d,
    hemiIntensity: 1.05,
    rimColor: 0x34d399,
    groundColor: 0x15803d,
    groundSecondaryHex: '#166534',
    trackBaseHex: '#5c4033',
    sleeperHex: '#3b2516',
    railColor: 0xa8a29e,
    railEmissive: 0x000000,
    platformBaseHex: '#78716c',
    platformTrimHex: '#4ade80',
    platformMetalness: 0.05,
    barrierPrimaryHex: '#854d0e',
    barrierSecondaryHex: '#bef264',
    gantryColor: 0x3f6212,
    barricadeColor: 0x713f12,
    trainStyles: [
      { bodyColor: 0x15803d, stripeColor: 0xfacc15, roofColor: 0xd9f99d, glowColor: 0xfef08a },
      { bodyColor: 0x92400e, stripeColor: 0x22c55e, roofColor: 0xfef3c7, glowColor: 0xfde047 },
      { bodyColor: 0x0d9488, stripeColor: 0xfbbf24, roofColor: 0xccfbf1, glowColor: 0x99f6e4 },
    ],
    weatherType: 'fireflies',
    weatherColor: 0xd9f99d,
    weatherCount: 80,
    accentColor: 0x22c55e,
    previewGradient: 'linear-gradient(135deg, #065f46 0%, #10b981 55%, #bef264 100%)',
    musicTempoMs: 170,
    musicScale: [261.63, 329.63, 392.0, 440.0, 523.25, 587.33, 440.0, 392.0],
    musicBass: [130.81, 196.0, 146.83, 196.0, 164.81, 196.0, 130.81, 164.81],
    musicWave: 'sine',
    ambientToneHz: 140,
  },

  snow_adventure: {
    id: 'snow_adventure',
    name: 'Snow Adventure',
    shortTag: 'Frozen Peaks',
    description: 'Carve through crystalline ice tunnels, frozen rails, snow-draped alpine pines, jagged peaks, and arctic blizzards.',
    unlockCost: 0,
    atmosphereTags: ['Ice Tunnels', 'Snow Peaks', 'Blizzard'],
    skyTopHex: '#1e3a8a',
    skyMidHex: '#60a5fa',
    skyHorizonHex: '#e0f2fe',
    sunOrMoonHex: '#f0f9ff',
    isNight: false,
    fogColor: 0xcbeafe,
    fogDensity: 0.0048,
    sunColor: 0xe0f2fe,
    sunIntensity: 2.35,
    hemiSky: 0xbae6fd,
    hemiGround: 0x475569,
    hemiIntensity: 1.15,
    rimColor: 0x38bdf8,
    groundColor: 0xe2e8f0,
    groundSecondaryHex: '#cbd5e1',
    trackBaseHex: '#94a3b8',
    sleeperHex: '#334155',
    railColor: 0x7dd3fc,
    railEmissive: 0x0c4a6e,
    platformBaseHex: '#f1f5f9',
    platformTrimHex: '#38bdf8',
    platformMetalness: 0.25,
    barrierPrimaryHex: '#0284c7',
    barrierSecondaryHex: '#f0f9ff',
    gantryColor: 0x0369a1,
    barricadeColor: 0x0ea5e9,
    trainStyles: [
      { bodyColor: 0xe0f2fe, stripeColor: 0x0284c7, roofColor: 0x38bdf8, glowColor: 0xbae6fd },
      { bodyColor: 0x1d4ed8, stripeColor: 0xf8fafc, roofColor: 0x93c5fd, glowColor: 0xe0f2fe },
      { bodyColor: 0x0f766e, stripeColor: 0xe0f2fe, roofColor: 0x5eead4, glowColor: 0xffffff },
    ],
    weatherType: 'snowstorm',
    weatherColor: 0xffffff,
    weatherCount: 120,
    accentColor: 0x38bdf8,
    previewGradient: 'linear-gradient(135deg, #1e40af 0%, #38bdf8 55%, #f0f9ff 100%)',
    musicTempoMs: 190,
    musicScale: [329.63, 392.0, 493.88, 523.25, 659.25, 523.25, 493.88, 392.0],
    musicBass: [164.81, 164.81, 196.0, 196.0, 130.81, 130.81, 146.83, 196.0],
    musicWave: 'sine',
    ambientToneHz: 185,
  },

  futuristic_city: {
    id: 'futuristic_city',
    name: 'Futuristic City',
    shortTag: 'Neon Cyberpunk',
    description: 'Hyper-sprint on glowing maglev tracks past holographic sky-ads, flying cruisers, neon megatowers, and cyber-bullet trains.',
    unlockCost: 0,
    atmosphereTags: ['Neon Skyscrapers', 'Flying Cars', 'Maglev Trains'],
    skyTopHex: '#09061a',
    skyMidHex: '#1e1b4b',
    skyHorizonHex: '#581c87',
    sunOrMoonHex: '#22d3ee',
    isNight: true,
    fogColor: 0x2e1065,
    fogDensity: 0.0054,
    sunColor: 0x67e8f9,
    sunIntensity: 1.9,
    hemiSky: 0x818cf8,
    hemiGround: 0x0f172a,
    hemiIntensity: 1.1,
    rimColor: 0xf472b6,
    groundColor: 0x0f172a,
    groundSecondaryHex: '#1e1b4b',
    trackBaseHex: '#1e293b',
    sleeperHex: '#0284c7',
    railColor: 0x22d3ee,
    railEmissive: 0x0891b2,
    platformBaseHex: '#1e293b',
    platformTrimHex: '#ec4899',
    platformMetalness: 0.55,
    barrierPrimaryHex: '#ec4899',
    barrierSecondaryHex: '#22d3ee',
    gantryColor: 0x4f46e5,
    barricadeColor: 0xdb2777,
    trainStyles: [
      { bodyColor: 0x0f172a, stripeColor: 0x22d3ee, roofColor: 0x1e293b, glowColor: 0x22d3ee, isMaglev: true },
      { bodyColor: 0x3b0764, stripeColor: 0xf472b6, roofColor: 0x581c87, glowColor: 0xf472b6, isMaglev: true },
      { bodyColor: 0x172554, stripeColor: 0xa3e635, roofColor: 0x1e3a8a, glowColor: 0xa3e635, isMaglev: true },
    ],
    weatherType: 'neon_rain',
    weatherColor: 0x22d3ee,
    weatherCount: 110,
    accentColor: 0x22d3ee,
    previewGradient: 'linear-gradient(135deg, #0f172a 0%, #6d28d9 50%, #06b6d4 100%)',
    musicTempoMs: 155,
    musicScale: [220.0, 261.63, 329.63, 392.0, 440.0, 523.25, 440.0, 329.63],
    musicBass: [110.0, 110.0, 110.0, 130.81, 146.83, 146.83, 164.81, 130.81],
    musicWave: 'sawtooth',
    ambientToneHz: 75,
  },
};

export const WORLD_LIST: WorldConfig[] = [
  WORLD_CONFIGS.ancient_egypt,
  WORLD_CONFIGS.modern_cairo,
  WORLD_CONFIGS.tropical_jungle,
  WORLD_CONFIGS.snow_adventure,
  WORLD_CONFIGS.futuristic_city,
];
