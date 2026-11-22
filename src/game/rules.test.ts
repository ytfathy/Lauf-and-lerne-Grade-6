import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyMissionProgress,
  buildCheckpointSpeechSegments,
  calculateRunScore,
  calculateSpeedAtDistance,
  checkCheckpointDue,
  evaluateObstacleCollision,
  generateFairObstacleWave,
  getQuestionsForLesson,
  getUpgradedPowerUpDuration,
  isWaveFair,
  resolveCheckpointAttempt,
  selectGermanVoice,
  selectNextQuestion,
  validateQuestionBank,
} from './rules';
import { DAILY_MISSIONS, GAME_TITLE, LANE_CENTERS, LESSONS, MAX_SPEED } from './constants';
import { WORLD_LIST } from './WorldConfiguration';

test('all 5 required worlds are configured with distinct visual and audio profiles', () => {
  const ids = WORLD_LIST.map((w) => w.id);
  assert.deepEqual(ids, [
    'ancient_egypt',
    'modern_cairo',
    'tropical_jungle',
    'snow_adventure',
    'futuristic_city',
  ]);
  const uniqueFog = new Set(WORLD_LIST.map((w) => w.fogColor));
  const uniqueWeather = new Set(WORLD_LIST.map((w) => w.weatherType));
  assert.equal(uniqueFog.size, 5);
  assert.equal(uniqueWeather.size, 5);
});

test('speed ramps smoothly and caps at MAX_SPEED', () => {
  const s0 = calculateSpeedAtDistance(0);
  const s500 = calculateSpeedAtDistance(500);
  const s5000 = calculateSpeedAtDistance(5000);
  assert.equal(s0, 20);
  assert.ok(s500 > s0);
  assert.equal(s5000, MAX_SPEED);
});

test('power-up upgrade levels scale duration cleanly', () => {
  const lv1 = getUpgradedPowerUpDuration('magnet', {
    magnet: 1,
    jetpack: 1,
    sneakers: 1,
    multiplier: 1,
    hoverboard: 1,
  });
  const lv4 = getUpgradedPowerUpDuration('magnet', {
    magnet: 4,
    jetpack: 1,
    sneakers: 1,
    multiplier: 1,
    hoverboard: 1,
  });
  assert.equal(lv4 - lv1, 6);
});

test('calculateRunScore computes positive integer score', () => {
  assert.equal(calculateRunScore(100, 10, 50), 700);
  assert.equal(calculateRunScore(-10, 0, 0), 0);
});

test('generateFairObstacleWave never creates an impossible 3-lane block across 500 waves', () => {
  let seed = 42;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < 500; i++) {
    const wave = generateFairObstacleWave(i * 25, i, rng);
    assert.equal(isWaveFair(wave.obstacles), true, `Wave ${i} was unfair!`);
  }
});

test('evaluateObstacleCollision handles jump-over, slide-under, ramp-climb, and crash', () => {
  const playerBase = {
    x: LANE_CENTERS[1],
    y: 0,
    height: 1.9,
    z: 10,
    halfWidth: 0.42,
    halfDepth: 0.42,
  };

  assert.equal(
    evaluateObstacleCollision(playerBase, {
      x: 0,
      z: 10,
      halfWidth: 1.1,
      halfDepth: 0.5,
      bottomY: 0,
      topY: 1.15,
      kind: 'low_barrier',
    }).type,
    'crash',
  );

  assert.equal(
    evaluateObstacleCollision(
      { ...playerBase, y: 1.4 },
      {
        x: 0,
        z: 10,
        halfWidth: 1.1,
        halfDepth: 0.5,
        bottomY: 0,
        topY: 1.15,
        kind: 'low_barrier',
      },
    ).type,
    'none',
  );

  assert.equal(
    evaluateObstacleCollision(playerBase, {
      x: 0,
      z: 10,
      halfWidth: 1.2,
      halfDepth: 0.6,
      bottomY: 1.35,
      topY: 3.6,
      kind: 'high_gantry',
    }).type,
    'crash',
  );

  assert.equal(
    evaluateObstacleCollision(
      { ...playerBase, height: 0.85 },
      {
        x: 0,
        z: 10,
        halfWidth: 1.2,
        halfDepth: 0.6,
        bottomY: 1.35,
        topY: 3.6,
        kind: 'high_gantry',
      },
    ).type,
    'none',
  );

  const roofResult = evaluateObstacleCollision(
    { ...playerBase, y: 3.85 },
    {
      x: 0,
      z: 10,
      halfWidth: 1.25,
      halfDepth: 8,
      bottomY: 0,
      topY: 3.8,
      kind: 'stationary_train',
    },
  );
  assert.equal(roofResult.type, 'land_on_top');

  // Full ramp climb simulation at both 20 m/s (60fps) and 45 m/s (20fps worst-case dt=0.05)
  for (const [speed, dt] of [
    [20, 1 / 60],
    [45, 0.05],
  ] as const) {
    let obsZ = -14;
    let playerY = 0;
    let vy = 0;
    let maxReachedY = 0;

    while (obsZ <= 14) {
      vy += -46 * dt;
      playerY += vy * dt;

      const outcome = evaluateObstacleCollision(
        { x: 0, y: playerY, height: 1.9, z: 0, halfWidth: 0.4, halfDepth: 0.4 },
        {
          x: 0,
          z: obsZ,
          halfWidth: 1.26,
          halfDepth: 10,
          bottomY: 0,
          topY: 3.8,
          kind: 'train_with_ramp',
        },
      );
      assert.notEqual(
        outcome.type,
        'crash',
        `Player crashed on ramp at speed=${speed}, obsZ=${obsZ.toFixed(2)}, playerY=${playerY.toFixed(2)}`,
      );
      const floorY = outcome.type === 'land_on_top' ? outcome.topY : 0;
      if (playerY <= floorY) {
        playerY = floorY;
        vy = 0;
      }
      maxReachedY = Math.max(maxReachedY, playerY);
      obsZ += speed * dt;
    }

    assert.equal(maxReachedY, 3.8, `Expected player to reach train roof 3.8m at speed=${speed}`);
  }

  // Side collision into train hull past the ramp at ground level still crashes
  const sideHit = evaluateObstacleCollision(
    { x: 0, y: 0, height: 1.9, z: 0, halfWidth: 0.4, halfDepth: 0.4 },
    {
      x: 0,
      z: 0,
      halfWidth: 1.26,
      halfDepth: 10,
      bottomY: 0,
      topY: 3.8,
      kind: 'train_with_ramp',
    },
  );
  assert.equal(sideHit.type, 'crash');
});

test('checkpoint due and mission progression work deterministically', () => {
  assert.equal(checkCheckpointDue(249, 250, true), false);
  assert.equal(checkCheckpointDue(250, 250, true), true);
  assert.equal(checkCheckpointDue(300, 250, false), false);

  const initial = {
    m_coins_100: 80,
    m_dist_1000: 900,
    m_jumps_20: 5,
    m_powerups_5: 4,
    m_clean_400: 200,
  };
  const { updated, newlyCompleted } = applyMissionProgress(initial, DAILY_MISSIONS, {
    coins: 30,
    distance: 150,
    jumps: 4,
    powerUps: 2,
    noCrashDistance: 420,
  });

  assert.equal(updated.m_coins_100, 100);
  assert.equal(updated.m_dist_1000, 1000);
  assert.equal(updated.m_powerups_5, 5);
  assert.equal(updated.m_clean_400, 400);
  assert.deepEqual(newlyCompleted.sort(), ['m_clean_400', 'm_coins_100', 'm_dist_1000', 'm_powerups_5']);
});

test('external public/questions.json contains all 313 PDF + 38 By School questions (351 total) and cycles without repeating early', () => {
  const rawJson = fs.readFileSync(path.resolve(process.cwd(), 'public/questions.json'), 'utf8');
  const parsed = validateQuestionBank(JSON.parse(rawJson));
  assert.equal(parsed.questions.length, 351);
  assert.equal(parsed.rewardRules.correctCoins, 15);
  assert.equal(parsed.rewardRules.participationCoins, 0);

  const used = new Set<string>();
  const seen = new Set<string>();
  for (let i = 0; i < parsed.questions.length; i++) {
    const q = selectNextQuestion(parsed, used);
    assert.equal(seen.has(q.id), false, `Duplicate question ${q.id} before full cycle`);
    seen.add(q.id);
  }
  assert.equal(seen.size, 351);

  // Next draw after exhausting all 351 reshuffles cleanly
  const nextCycleQ = selectNextQuestion(parsed, used);
  assert.ok(nextCycleQ.id.startsWith('q-'));
  assert.equal(used.size, 1);
});

test('checkpoint reward resolution awards 15 coins only on valid correct answer and 0 on wrong', () => {
  const rawJson = fs.readFileSync(path.resolve(process.cwd(), 'public/questions.json'), 'utf8');
  const parsed = validateQuestionBank(JSON.parse(rawJson));
  const q1 = parsed.questions[0]; // Q1: B (correctIndex 1)

  const ok = resolveCheckpointAttempt(q1, 1);
  assert.equal(ok.correct, true);
  assert.equal(ok.coinsAwarded, 15);
  assert.equal(ok.autoResumeMs, 2000);

  const wrong = resolveCheckpointAttempt(q1, 0);
  assert.equal(wrong.correct, false);
  assert.equal(wrong.coinsAwarded, 0);
  assert.equal(wrong.autoResumeMs, 3000);

  const none = resolveCheckpointAttempt(q1, null);
  assert.equal(none.correct, false);
  assert.equal(none.coinsAwarded, 0);
  assert.equal(none.autoResumeMs, 3000);
});

test('German voice selection prefers de-DE and never falls back to non-German languages', () => {
  const enOnly = [
    { lang: 'en-US', name: 'English US', localService: true },
    { lang: 'ar-EG', name: 'Arabic', localService: true },
  ];
  assert.equal(selectGermanVoice(enOnly), null);
  assert.equal(selectGermanVoice([]), null);

  const mixed = [
    { lang: 'en-US', name: 'English US', localService: true },
    { lang: 'de-AT', name: 'Austrian German', localService: true },
    { lang: 'de-DE', name: 'Google Deutsch', localService: false },
    { lang: 'de-DE', name: 'Anna', localService: true },
  ];
  const selected = selectGermanVoice(mixed);
  assert.equal(selected?.lang, 'de-DE');
  assert.equal(selected?.name, 'Anna');

  const regionalOnly = [
    { lang: 'fr-FR', name: 'French' },
    { lang: 'de-CH', name: 'Swiss German' },
  ];
  assert.equal(selectGermanVoice(regionalOnly)?.lang, 'de-CH');
});

test('buildCheckpointSpeechSegments preserves German characters and displayed answer order', () => {
  const segments = buildCheckpointSpeechSegments({
    id: 'q-test',
    category: 'Test',
    prompt: 'Ich will (__________) Fußball spielen – großartig!',
    options: ['über', 'für', 'gegen'],
    correctIndex: 0,
    explanation: '',
  });

  assert.deepEqual(segments, [
    'Ich will … Fußball spielen – großartig!',
    'A: über',
    'B: für',
    'C: gegen',
  ]);
});

test('GAME_TITLE and LESSONS match exact German branding and partition all 351 questions cleanly', () => {
  assert.equal(GAME_TITLE, 'Lauf und Lerne mit Malek!');
  assert.deepEqual(
    LESSONS.map((l) => `${l.moduleLabel}: ${l.title}`),
    [
      'Modul 4 – Lektion 1: Kannst du Inlineskaten?',
      'Modul 4 – Lektion 2: Wohin fährst du in Urlaub?',
      'Modul 4 – Lektion 3: Alles Gute zum Geburtstag!',
      'Modul 5 – Lektion 1: Krank, gesund, ungesund',
      'Schulaufgaben · W2 HW G6: By School',
    ],
  );

  const rawJson = fs.readFileSync(path.resolve(process.cwd(), 'public/questions.json'), 'utf8');
  const bank = validateQuestionBank(JSON.parse(rawJson));

  const counts = LESSONS.map((l) => getQuestionsForLesson(bank.questions, l.id).length);
  assert.deepEqual(counts, [116, 58, 59, 80, 38]);
  assert.equal(
    counts.reduce((acc, n) => acc + n, 0),
    351,
  );

  // Verify By School draws strictly from its 38 questions and reshuffles cleanly
  const schoolIds = new Set(getQuestionsForLesson(bank.questions, 'by_school').map((q) => q.id));
  const usedSchool = new Set<string>();
  const drawnSchool = new Set<string>();
  for (let i = 0; i < schoolIds.size; i++) {
    const q = selectNextQuestion(bank, usedSchool, Math.random, 'by_school');
    assert.equal(schoolIds.has(q.id), true, `Expected by_school question, got ${q.id}`);
    assert.equal(drawnSchool.has(q.id), false, `Repeated ${q.id} before completing by_school cycle`);
    drawnSchool.add(q.id);
  }
  assert.equal(drawnSchool.size, 38);

  const nextSchool = selectNextQuestion(bank, usedSchool, Math.random, 'by_school');
  assert.equal(schoolIds.has(nextSchool.id), true);
});

