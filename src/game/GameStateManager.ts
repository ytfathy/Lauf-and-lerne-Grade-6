import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AnimationController, type ArticulatedCharacterRig, type PoseState } from './AnimationController';
import { audioManager } from './AudioManager';
import { CoinManager } from './CoinManager';
import {
  CHARACTERS,
  GRAVITY,
  JETPACK_HEIGHT,
  JUMP_VELOCITY,
  LANE_CENTERS,
  SLIDE_DURATION,
  SUPER_SNEAKERS_JUMP_VELOCITY,
} from './constants';
import { PlayerController } from './PlayerController';
import {
  calculateRunScore,
  calculateSpeedAtDistance,
  checkCheckpointDue,
  evaluateObstacleCollision,
  getActiveMultiplier,
  getUpgradedPowerUpDuration,
  laneToX,
} from './rules';
import type {
  ActivePowerUps,
  GamePhase,
  HudSnapshot,
  LaneIndex,
  PowerUpType,
  RunMissionCounters,
  RunSummary,
  UpgradeLevels,
  WorldId,
} from './types';
import { WorldManager } from './WorldManager';

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onGameOver: (summary: RunSummary, missionCounters: RunMissionCounters) => void;
  onCheckpointDue: (distance: number) => void;
  onPhaseSync: (phase: GamePhase) => void;
}

interface BurstParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

const _dummy = new THREE.Object3D();
const _tempColor = new THREE.Color();

export class GameStateManager {
  private readonly container: HTMLElement;
  private readonly callbacks: EngineCallbacks;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly isSoftwareGl: boolean;
  private readonly pmremEnv: THREE.Texture;

  private readonly worldManager: WorldManager;
  private readonly coinManager: CoinManager;
  private readonly animController = new AnimationController();

  private playerRig: ArticulatedCharacterRig;
  private readonly playerShadow: THREE.Mesh;
  private readonly chaserGroup = new THREE.Group();
  private readonly guardRig: THREE.Group;
  private readonly dogRig: THREE.Group;
  private readonly checkpointGateGroup: THREE.Group;
  private checkpointBeaconL!: THREE.Mesh;
  private checkpointBeaconR!: THREE.Mesh;
  private readonly gateGeos: THREE.BufferGeometry[] = [];
  private readonly gateMats: THREE.Material[] = [];

  // Zero-GC particle burst pool
  private readonly particleMesh: THREE.InstancedMesh;
  private readonly particles: BurstParticle[] = [];

  // Game State
  private phase: GamePhase = 'title';
  private characterPreviewMode = false;
  private previewYaw = Math.PI * 0.92;
  private upgradeLevels: UpgradeLevels = {
    magnet: 1,
    jetpack: 1,
    sneakers: 1,
    multiplier: 1,
    hoverboard: 1,
  };

  // Player Physics
  private currentLane: LaneIndex = 1;
  private playerX = 0;
  private prevX = 0;
  private playerY = 0;
  private vy = 0;
  private grounded = true;
  private coyoteTimer = 0;
  private jumpBuffer = 0;
  private slideTimer = 0;
  private squashX = 1;
  private squashY = 1;
  private runCycle = 0;
  private stepGate = 0;
  private crashTimer = 0;
  private hitstopTimer = 0;
  private hitFlashTimer = 0;
  private trauma = 0;

  // Run Metrics
  private distance = 0;
  private speed = 20;
  private runCoins = 0;
  private checkpointCoins = 0;
  private runGems = 0;
  private totalCoins = 0;
  private bonusScore = 0;
  private obstaclesCleared = 0;
  private powerUpsCollected = 0;
  private checkpointsAnswered = 0;
  private checkpointsCorrect = 0;
  private jumpsThisRun = 0;
  private noCrashDistance = 0;
  private coinCombo = 0;
  private coinComboTimer = 0;

  private powerUps: ActivePowerUps = {
    magnet: 0,
    jetpack: 0,
    sneakers: 0,
    multiplier: 0,
    hoverboard: 0,
  };

  private nextWaveZ = -28;
  private waveIndex = 0;
  private checkpointsEnabled = true;
  private checkpointInterval = 250;
  private nextCheckpointDist = 250;
  private checkpointGraceTimer = 0;

  // Loop & Input
  private frameId = 0;
  private lastTime = performance.now();
  private timeElapsed = 0;
  private lastHudEmit = 0;
  private disposed = false;
  private suspended = false;

  private touchStartX = 0;
  private touchStartY = 0;
  private dragActive = false;
  private dragLastX = 0;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight),
      0.2,
      260,
    );
    this.camera.position.set(0, 2.05, 7.1);
    this.camera.lookAt(0, 0.65, -8);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.pmremEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.pmremEnv;
    this.scene.environmentIntensity = 0.42;
    pmrem.dispose();

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.worldManager = new WorldManager(this.scene, maxAniso, this.isSoftwareGl);
    const initialAssets = this.worldManager.switchWorld('modern_cairo');

    this.coinManager = new CoinManager(this.scene, initialAssets.contactShadowTex);

    // Character Rig
    this.playerRig = PlayerController.buildCharacterRig(CHARACTERS[0]);
    this.playerRig.root.position.set(0, 0, 1.2);
    this.playerRig.root.rotation.y = this.previewYaw;
    this.scene.add(this.playerRig.root);

    this.playerShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.65, 16),
      new THREE.MeshBasicMaterial({
        map: initialAssets.contactShadowTex,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    this.playerShadow.rotation.x = -Math.PI / 2;
    this.playerShadow.position.y = 0.025;
    this.scene.add(this.playerShadow);

    // Chasers (The Guard & The Dog)
    this.guardRig = this.buildGuardChaser();
    this.dogRig = this.buildDogChaser();
    this.chaserGroup.add(this.guardRig, this.dogRig);
    this.chaserGroup.visible = false;
    this.scene.add(this.chaserGroup);

    // 3D Track Checkpoint Archway
    this.checkpointGateGroup = this.buildCheckpointGate();
    this.checkpointGateGroup.visible = false;
    this.scene.add(this.checkpointGateGroup);

    // Pooled Burst Particles
    const pGeo = new THREE.OctahedronGeometry(0.16, 0);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, 120);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < 120; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
        color: new THREE.Color(0xfacc15),
      });
    }
    this.scene.add(this.particleMesh);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.emitHud(true);
    this.startLoop();
  }

  private buildGuardChaser(): THREE.Group {
    const g = new THREE.Group();
    const uniform = new THREE.MeshPhysicalMaterial({ color: 0x1e40af, roughness: 0.55, sheen: 0.45 });
    const pants = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.68, sheen: 0.2 });
    const skin = new THREE.MeshPhysicalMaterial({ color: 0xf6c6a0, roughness: 0.44, sheen: 0.4 });
    const capMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.3, clearcoat: 0.35 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.22, metalness: 0.8 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x29180d, roughness: 0.65 });
    const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xfb7185, transparent: true, opacity: 0.35 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.36, 8, 16), uniform);
    torso.position.y = 1.02;
    torso.scale.set(1.18, 1.0, 1.05);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.048, 8, 18), capMat);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.76;
    belt.scale.set(1.16, 1.06, 1);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.06), goldMat);
    buckle.position.set(0, 0.76, -0.34);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 20, 18), skin);
    head.position.y = 1.62;
    head.scale.set(1.04, 1.0, 0.98);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skin);
    nose.position.set(0, 1.6, -0.31);
    const stache = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.16, 4, 8), hairMat);
    stache.rotation.z = Math.PI / 2;
    stache.position.set(0, 1.53, -0.29);

    for (const sx of [-1, 1]) {
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 8), eyeWhite);
      sclera.position.set(sx * 0.105, 1.67, -0.26);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), capMat);
      pupil.position.set(sx * 0.105, 1.67, -0.3);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), eyeWhite);
      glint.position.set(sx * 0.105 + 0.012, 1.682, -0.315);
      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.08, 4, 6), hairMat);
      brow.rotation.z = Math.PI / 2 + sx * 0.25;
      brow.position.set(sx * 0.105, 1.75, -0.27);
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), blushMat);
      cheek.position.set(sx * 0.17, 1.57, -0.25);
      g.add(sclera, pupil, glint, brow, cheek);
    }

    const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.28, 0.18, 16), uniform);
    hatCrown.position.y = 1.89;
    const hatVisor = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 14, 1, false, -Math.PI * 0.4, Math.PI * 0.8), capMat);
    hatVisor.position.set(0, 1.81, -0.21);
    hatVisor.rotation.y = Math.PI;
    const badge = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), goldMat);
    badge.position.set(0, 1.9, -0.31);

    const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.36, 6, 10), pants);
    legL.position.set(-0.16, 0.36, 0);
    const legR = legL.clone();
    legR.position.x = 0.16;
    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.098, 0.32, 6, 10), uniform);
    armL.position.set(-0.46, 1.0, 0);
    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), skin);
    handL.position.set(-0.46, 0.72, 0);
    const armR = armL.clone();
    armR.position.x = 0.46;
    const handR = handL.clone();
    handR.position.x = 0.46;

    g.add(torso, belt, buckle, head, nose, stache, hatCrown, hatVisor, badge, legL, legR, armL, armR, handL, handR);
    g.scale.setScalar(0.84);
    g.position.set(-0.65, 0, 0);
    return g;
  }

  private buildDogChaser(): THREE.Group {
    const g = new THREE.Group();
    const fur = new THREE.MeshPhysicalMaterial({ color: 0xd97706, roughness: 0.65, sheen: 0.55 });
    const darkFur = new THREE.MeshPhysicalMaterial({ color: 0x451a03, roughness: 0.68, sheen: 0.4 });
    const collar = new THREE.MeshPhysicalMaterial({ color: 0xef4444, roughness: 0.35, clearcoat: 0.4 });
    const tag = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });
    const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const darkMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.46, 8, 14), fur);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.44;
    const saddle = new THREE.Mesh(new THREE.CapsuleGeometry(0.225, 0.22, 6, 12), darkFur);
    saddle.rotation.x = Math.PI / 2;
    saddle.position.set(0, 0.48, 0.02);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), fur);
    head.position.set(0, 0.68, -0.36);
    const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.12, 6, 10), fur);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 0.61, -0.54);
    const dogNose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), darkMat);
    dogNose.position.set(0, 0.64, -0.65);

    for (const sx of [-1, 1]) {
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), eyeWhite);
      sclera.position.set(sx * 0.095, 0.72, -0.53);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), darkMat);
      pupil.position.set(sx * 0.095, 0.72, -0.56);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), eyeWhite);
      glint.position.set(sx * 0.095 + 0.012, 0.732, -0.58);
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.18, 10), darkFur);
      ear.position.set(sx * 0.13, 0.9, -0.34);
      ear.rotation.z = -sx * 0.18;
      g.add(sclera, pupil, glint, ear);
    }

    const neck = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.04, 10, 16), collar);
    neck.rotation.x = Math.PI / 2;
    neck.position.set(0, 0.56, -0.26);
    const tagMesh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), tag);
    tagMesh.position.set(0, 0.49, -0.42);
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.24, 6, 8), darkFur);
    tail.rotation.x = 0.7;
    tail.position.set(0, 0.6, 0.36);

    for (const [lx, lz] of [[-0.13, -0.22], [0.13, -0.22], [-0.13, 0.22], [0.13, 0.22]]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.26, 6, 8), fur);
      leg.position.set(lx, 0.19, lz);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), darkFur);
      paw.position.set(lx, 0.05, lz - 0.02);
      g.add(leg, paw);
    }

    g.add(body, saddle, head, snout, dogNose, neck, tagMesh, tail);
    g.scale.setScalar(0.86);
    g.position.set(0.62, 0, 0.35);
    return g;
  }

  private buildCheckpointGate(): THREE.Group {
    const g = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x0f3b8c,
      roughness: 0.32,
      metalness: 0.45,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.75,
    });
    const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.9,
      roughness: 0.15,
      metalness: 0.3,
    });
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.65,
      metalness: 0.3,
    });
    const stripMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.85,
    });
    this.gateMats.push(pillarMat, goldMat, cyanGlowMat, beaconMat, baseMat, stripMat);

    const pillarGeo = new THREE.CylinderGeometry(0.24, 0.3, 4.9, 12);
    const baseGeo = new THREE.BoxGeometry(0.95, 0.45, 0.95);
    const beaconGeo = new THREE.OctahedronGeometry(0.42, 0);
    const beamGeo = new THREE.BoxGeometry(10.8, 0.56, 0.56);
    const bannerGeo = new THREE.BoxGeometry(5.6, 0.92, 0.64);
    const trimGeo = new THREE.BoxGeometry(5.85, 0.14, 0.7);
    const floorStripGeo = new THREE.BoxGeometry(9.8, 0.04, 0.45);
    this.gateGeos.push(pillarGeo, baseGeo, beaconGeo, beamGeo, bannerGeo, trimGeo, floorStripGeo);

    for (const sx of [-5.1, 5.1]) {
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.set(sx, 0.225, 0);
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(sx, 2.55, 0);
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(sx, 5.4, 0);
      if (sx < 0) this.checkpointBeaconL = beacon;
      else this.checkpointBeaconR = beacon;
      g.add(base, pillar, beacon);
    }

    const beam = new THREE.Mesh(beamGeo, pillarMat);
    beam.position.set(0, 4.78, 0);
    const banner = new THREE.Mesh(bannerGeo, goldMat);
    banner.position.set(0, 4.82, 0);
    const topTrim = new THREE.Mesh(trimGeo, cyanGlowMat);
    topTrim.position.set(0, 5.32, 0);
    const botTrim = new THREE.Mesh(trimGeo, cyanGlowMat);
    botTrim.position.set(0, 4.32, 0);
    const floorStrip = new THREE.Mesh(floorStripGeo, stripMat);
    floorStrip.position.set(0, 0.03, 0);

    g.add(beam, banner, topTrim, botTrim, floorStrip);
    return g;
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('blur', this.handleWindowBlur);
    const dom = this.renderer.domElement;
    dom.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    dom.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    dom.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
  }

  private unbindEvents(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('blur', this.handleWindowBlur);
    const dom = this.renderer.domElement;
    dom.removeEventListener('touchstart', this.handleTouchStart);
    dom.removeEventListener('touchend', this.handleTouchEnd);
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
  }

  private handleResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleWindowBlur = () => {
    this.dragActive = false;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.phase === 'playing') {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        this.shiftLane(-1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        this.shiftLane(1);
      } else if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') {
        e.preventDefault();
        this.jumpBuffer = 0.14;
        this.tryConsumeJump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        this.triggerSlide();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        this.pauseGame(false);
      }
    } else if (this.phase === 'paused' && (e.code === 'KeyP' || e.code === 'Escape')) {
      e.preventDefault();
      this.resumeGame();
    }
  };

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 0) return;
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (this.phase !== 'playing' || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    const dy = e.changedTouches[0].clientY - this.touchStartY;
    if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.shiftLane(dx > 0 ? 1 : -1);
    } else if (dy < 0) {
      this.jumpBuffer = 0.14;
      this.tryConsumeJump();
    } else {
      this.triggerSlide();
    }
  };

  private handlePointerDown = (e: PointerEvent) => {
    if (this.phase === 'title' && this.characterPreviewMode) {
      this.dragActive = true;
      this.dragLastX = e.clientX;
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.dragActive) return;
    const dx = e.clientX - this.dragLastX;
    this.dragLastX = e.clientX;
    this.previewYaw += dx * 0.012;
  };

  private handlePointerUp = () => {
    this.dragActive = false;
  };

  public setCharacter(characterId: string): void {
    const def = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
    this.scene.remove(this.playerRig.root);
    this.playerRig.dispose();
    this.playerRig = PlayerController.buildCharacterRig(def);
    this.playerRig.root.position.set(this.playerX, this.playerY, this.phase === 'title' ? 1.2 : 0);
    this.playerRig.root.rotation.y = this.phase === 'title' ? this.previewYaw : 0;
    this.scene.add(this.playerRig.root);
    this.renderer.render(this.scene, this.camera);
  }

  public setWorld(worldId: WorldId): void {
    if (this.worldManager.getCurrentWorldId() === worldId) return;
    const assets = this.worldManager.switchWorld(worldId);
    this.coinManager.updateShadowTexture(assets.contactShadowTex);
    const shadowMat = this.playerShadow.material as THREE.MeshBasicMaterial;
    shadowMat.map = assets.contactShadowTex;
    shadowMat.needsUpdate = true;
    audioManager.setWorld(worldId);
    this.emitHud(true);
    this.renderer.render(this.scene, this.camera);
  }

  public setCharacterPreview(enabled: boolean): void {
    this.characterPreviewMode = enabled;
    if (!enabled) {
      this.previewYaw = Math.PI * 0.92;
    }
  }

  public rotateCharacterPreview(delta: number): void {
    this.previewYaw += delta;
  }

  public setTotalCoins(coins: number): void {
    this.totalCoins = coins;
    this.emitHud(true);
  }

  public setUpgradeLevels(levels: UpgradeLevels): void {
    this.upgradeLevels = { ...levels };
  }

  public setCheckpointConfig(enabled: boolean, intervalMeters: number): void {
    this.checkpointsEnabled = enabled;
    this.checkpointInterval = Math.max(25, intervalMeters);
    if (this.distance === 0) {
      this.nextCheckpointDist = this.checkpointInterval;
    }
    this.emitHud(true);
  }

  public activateHoverboardFromReserve(): void {
    if (this.phase !== 'playing' || this.powerUps.hoverboard > 0) return;
    this.powerUps.hoverboard = getUpgradedPowerUpDuration('hoverboard', this.upgradeLevels);
    audioManager.playPowerUp();
    this.spawnBurst(this.playerX, this.playerY + 1, 0, 14, 0x06b6d4);
    this.emitHud(true);
  }

  public startRun(): void {
    audioManager.unlock();
    audioManager.setWorld(this.worldManager.getCurrentWorldId());
    audioManager.startMusic();

    this.characterPreviewMode = false;
    this.worldManager.getObstacleManager().clearActive();
    this.coinManager.clearActive();

    this.currentLane = 1;
    this.playerX = 0;
    this.prevX = 0;
    this.playerY = 0;
    this.vy = 0;
    this.grounded = true;
    this.coyoteTimer = 0;
    this.jumpBuffer = 0;
    this.slideTimer = 0;
    this.squashX = 1;
    this.squashY = 1;
    this.runCycle = 0;
    this.crashTimer = 0;
    this.hitstopTimer = 0;
    this.hitFlashTimer = 0;
    this.trauma = 0;

    this.distance = 0;
    this.speed = calculateSpeedAtDistance(0);
    this.runCoins = 0;
    this.checkpointCoins = 0;
    this.runGems = 0;
    this.bonusScore = 0;
    this.obstaclesCleared = 0;
    this.powerUpsCollected = 0;
    this.checkpointsAnswered = 0;
    this.checkpointsCorrect = 0;
    this.jumpsThisRun = 0;
    this.noCrashDistance = 0;
    this.coinCombo = 0;
    this.coinComboTimer = 0;
    this.checkpointGraceTimer = 0;

    this.powerUps = { magnet: 0, jetpack: 0, sneakers: 0, multiplier: 0, hoverboard: 0 };
    this.nextWaveZ = -28;
    this.waveIndex = 0;
    this.nextCheckpointDist = this.checkpointInterval;
    this.checkpointGateGroup.visible = false;

    this.playerRig.root.position.set(0, 0, 0);
    this.playerRig.root.rotation.set(0, 0, 0);
    this.playerRig.hipsGroup.rotation.set(0, 0, 0);

    for (let i = 0; i < 4; i++) {
      this.spawnNextWave();
    }

    this.phase = 'playing';
    this.callbacks.onPhaseSync('playing');
    this.emitHud(true);
  }

  public pauseGame(forCheckpoint = false): void {
    if (this.phase !== 'playing') return;
    this.phase = forCheckpoint ? 'checkpoint' : 'paused';
    audioManager.stopMusic();
    this.callbacks.onPhaseSync(this.phase);
  }

  public resumeGame(): void {
    if (this.phase !== 'paused' && this.phase !== 'checkpoint') return;
    const wasCheckpoint = this.phase === 'checkpoint';
    this.phase = 'playing';
    this.lastTime = performance.now();
    if (wasCheckpoint) {
      this.checkpointGraceTimer = 1.25;
    }
    audioManager.startMusic();
    this.callbacks.onPhaseSync('playing');
    this.emitHud(true);
  }

  public returnToTitle(): void {
    audioManager.stopMusic();
    this.worldManager.getObstacleManager().clearActive();
    this.coinManager.clearActive();
    this.checkpointGateGroup.visible = false;
    this.phase = 'title';
    this.characterPreviewMode = false;
    this.previewYaw = Math.PI * 0.92;
    this.playerX = 0;
    this.playerY = 0;
    this.playerRig.root.position.set(0, 0, 1.2);
    this.playerRig.root.rotation.set(0, this.previewYaw, 0);
    this.playerRig.hipsGroup.rotation.set(0, 0, 0);
    this.playerRig.jetpackGroup.visible = false;
    this.playerRig.hoverboardGroup.visible = false;
    this.playerRig.shieldRing.visible = false;
    this.playerRig.magnetRing.visible = false;
    this.chaserGroup.visible = false;
    this.camera.position.set(0, 2.05, 7.1);
    this.camera.lookAt(0, 0.65, -8);
    this.callbacks.onPhaseSync('title');
    this.emitHud(true);
  }

  public applyCheckpointReward(
    coinsAwarded: number,
    scoreBonus: number,
    grantShield: boolean,
    correct: boolean,
  ): void {
    this.checkpointsAnswered++;
    if (correct) this.checkpointsCorrect++;
    this.runCoins += coinsAwarded;
    this.checkpointCoins += coinsAwarded;
    this.totalCoins += coinsAwarded;
    this.bonusScore += scoreBonus;
    if (grantShield) {
      this.powerUps.hoverboard = Math.max(
        this.powerUps.hoverboard,
        getUpgradedPowerUpDuration('hoverboard', this.upgradeLevels),
      );
    }
    this.nextCheckpointDist += this.checkpointInterval;
    this.checkpointGateGroup.visible = false;
    this.emitHud(true);
  }

  private shiftLane(dir: -1 | 1): void {
    const next = Math.max(0, Math.min(2, this.currentLane + dir)) as LaneIndex;
    if (next !== this.currentLane) {
      this.currentLane = next;
      audioManager.playLaneSwitch();
    }
  }

  private tryConsumeJump(): void {
    if (this.jumpBuffer <= 0) return;
    if (this.powerUps.jetpack > 0) return;
    if (this.grounded || this.coyoteTimer > 0) {
      this.jumpBuffer = 0;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.slideTimer = 0;
      this.vy = this.powerUps.sneakers > 0 ? SUPER_SNEAKERS_JUMP_VELOCITY : JUMP_VELOCITY;
      this.squashX = 0.82;
      this.squashY = 1.2;
      this.jumpsThisRun++;
      audioManager.playJump();
      this.spawnBurst(this.playerX, 0.15, 0, 6, 0xe2e8f0);
    }
  }

  private triggerSlide(): void {
    if (this.powerUps.jetpack > 0) return;
    if (!this.grounded && this.vy > -18) {
      this.vy = -28; // Fast slam down into slide
    }
    this.slideTimer = SLIDE_DURATION;
    this.squashX = 1.18;
    this.squashY = 0.78;
    audioManager.playSlide();
  }

  private spawnNextWave(): void {
    const wave = this.worldManager.getObstacleManager().spawnWave(this.nextWaveZ, this.distance, this.waveIndex);
    this.coinManager.spawnBatch(this.nextWaveZ, wave.coins, wave.powerUps);
    this.nextWaveZ -= wave.chunkLength;
    this.waveIndex++;
  }

  private spawnBurst(x: number, y: number, z: number, count: number, hexColor: number): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.4;
      p.y = y + (Math.random() - 0.5) * 0.4;
      p.z = z + (Math.random() - 0.5) * 0.4;
      p.vx = (Math.random() - 0.5) * 5.5;
      p.vy = 2.0 + Math.random() * 4.5;
      p.vz = (Math.random() - 0.5) * 4.5;
      p.maxLife = 0.32 + Math.random() * 0.25;
      p.life = p.maxLife;
      p.color.setHex(hexColor);
      spawned++;
      if (spawned >= count) break;
    }
  }

  public setSuspended(suspended: boolean): void {
    if (this.suspended === suspended) return;
    this.suspended = suspended;
    if (suspended) {
      cancelAnimationFrame(this.frameId);
      window.clearTimeout(this.frameId);
    } else if (!this.disposed) {
      this.lastTime = performance.now();
      this.startLoop();
    }
  }

  private startLoop(): void {
    if (this.suspended || this.disposed) return;
    const tick = () => {
      if (this.disposed || this.suspended) return;
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      this.stepFrame(dt, now);
      this.renderer.render(this.scene, this.camera);

      if (this.suspended || this.disposed) return;
      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private stepFrame(dt: number, now: number): void {
    this.timeElapsed += dt;

    // Update burst particles regardless of hitstop
    this.updateParticles(dt);

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
      const flashMix = this.hitFlashTimer > 0 ? 0.45 : 0;
      for (const m of this.playerRig.hitFlashMaterials) {
        m.emissive.setHex(flashMix > 0 ? 0xffffff : 0x000000);
        m.emissiveIntensity = flashMix;
      }
    }

    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * 2.4);
    }

    if (this.phase === 'title') {
      this.worldManager.update(dt, 5.2, this.timeElapsed);
      this.playerRig.root.position.set(0, 0, 1.2);
      this.playerRig.root.rotation.y = THREE.MathUtils.damp(
        this.playerRig.root.rotation.y,
        this.previewYaw,
        10,
        dt,
      );
      this.playerRig.root.rotation.z = 0;
      this.animController.updatePose(this.playerRig, 'idle', dt, 0, 0, 1, 1);
      this.playerShadow.position.set(0, 0.025, 1.2);

      // Smoothly frame either Main Menu Centerpiece (full body above PLAY button) or Character Showcase
      const targetCamX = this.characterPreviewMode ? -0.45 : 0;
      const targetCamY = this.characterPreviewMode ? 1.56 : 1.95;
      const targetCamZ = this.characterPreviewMode ? 4.35 : 6.6;
      const lookX = this.characterPreviewMode ? -0.45 : 0;
      const lookY = this.characterPreviewMode ? 1.12 : 0.72;

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 8, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 8, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 8, dt);
      this.camera.lookAt(lookX, lookY, -8);
      return;
    }

    if (this.phase === 'paused' || this.phase === 'checkpoint') {
      return;
    }

    if (this.phase === 'gameover') {
      this.crashTimer += dt;
      this.animController.updatePose(this.playerRig, 'crash', dt, 0, 0, 1, 1);
      this.camera.lookAt(this.playerX * 0.4, 1.2, -4);
      return;
    }

    // Active Playing Loop
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }

    this.distance += this.speed * dt;
    this.noCrashDistance += this.speed * dt;
    this.speed = calculateSpeedAtDistance(this.distance);
    if (this.checkpointGraceTimer > 0) {
      this.checkpointGraceTimer = Math.max(0, this.checkpointGraceTimer - dt);
    }

    if (this.coinComboTimer > 0) {
      this.coinComboTimer -= dt;
      if (this.coinComboTimer <= 0) this.coinCombo = 0;
    }

    // Power-up countdowns
    (Object.keys(this.powerUps) as PowerUpType[]).forEach((k) => {
      if (this.powerUps[k] > 0) {
        this.powerUps[k] = Math.max(0, this.powerUps[k] - dt);
      }
    });

    // Lateral lane damping
    const targetX = laneToX(this.currentLane);
    this.prevX = this.playerX;
    this.playerX = THREE.MathUtils.damp(this.playerX, targetX, 16, dt);
    const vx = (this.playerX - this.prevX) / Math.max(dt, 0.001);

    // Vertical physics (Jetpack vs Normal Gravity)
    let supportFloorY = 0;
    const isJetpack = this.powerUps.jetpack > 0;

    if (isJetpack) {
      this.playerY = THREE.MathUtils.damp(this.playerY, JETPACK_HEIGHT, 6, dt);
      this.vy = 0;
      this.grounded = false;
      this.slideTimer = 0;
    } else {
      if (this.grounded) {
        this.coyoteTimer = 0.1;
      } else {
        this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
      }

      if (this.jumpBuffer > 0) {
        this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
        this.tryConsumeJump();
      }

      this.vy += GRAVITY * dt;
      this.playerY += this.vy * dt;
    }

    // Slide timer
    if (this.slideTimer > 0) {
      this.slideTimer = Math.max(0, this.slideTimer - dt);
    }

    // Scroll world & spawn waves
    this.worldManager.update(dt, this.speed, this.timeElapsed);
    this.nextWaveZ += this.speed * dt;
    while (this.nextWaveZ > -140) {
      this.spawnNextWave();
    }

    // Update obstacles & evaluate collisions
    const activeObstacles = this.worldManager
      .getObstacleManager()
      .update(dt, this.speed, () => {
        this.obstaclesCleared++;
      });

    const playerHeight = this.slideTimer > 0 ? 0.85 : 1.9;
    if (!isJetpack) {
      for (const obs of activeObstacles) {
        const halfW = obs.kind.includes('train') ? 1.26 : 1.12;
        const outcome = evaluateObstacleCollision(
          {
            x: this.playerX,
            y: this.playerY,
            height: playerHeight,
            z: 0,
            halfWidth: 0.4,
            halfDepth: 0.4,
          },
          {
            x: obs.x,
            z: obs.z,
            halfWidth: halfW,
            halfDepth: obs.length / 2,
            bottomY: obs.bottomY,
            topY: obs.height,
            kind: obs.kind,
          },
        );

        if (outcome.type === 'land_on_top') {
          supportFloorY = Math.max(supportFloorY, outcome.topY);
        } else if (outcome.type === 'crash') {
          if (this.checkpointGraceTimer > 0) {
            // Brief safe clearance window immediately after resuming from a checkpoint
            obs.active = false;
            obs.mesh.visible = false;
          } else if (this.powerUps.hoverboard > 0) {
            // Shield absorbs the crash!
            this.powerUps.hoverboard = 0;
            this.noCrashDistance = 0;
            this.hitstopTimer = 0.05;
            this.hitFlashTimer = 0.08;
            this.trauma = 0.65;
            obs.active = false;
            obs.mesh.visible = false;
            audioManager.playShieldSave();
            this.spawnBurst(this.playerX, this.playerY + 1, 0, 22, 0x38bdf8);
          } else {
            this.triggerGameOver();
            return;
          }
        }
      }

      if (this.playerY <= supportFloorY) {
        if (!this.grounded && this.vy < -6) {
          this.squashX = 1.2;
          this.squashY = 0.8;
          this.spawnBurst(this.playerX, supportFloorY + 0.08, 0, 5, 0xe2e8f0);
        }
        this.playerY = supportFloorY;
        this.vy = 0;
        this.grounded = true;
      } else {
        this.grounded = false;
      }
    }

    // Collectibles
    this.coinManager.update(
      dt,
      this.speed,
      this.timeElapsed,
      this.playerX,
      this.playerY,
      0,
      this.powerUps.magnet > 0,
      (isGem, cx, cy, cz) => {
        const mult = getActiveMultiplier(this.powerUps);
        if (isGem) {
          this.runGems += 1;
          audioManager.playGem();
          this.spawnBurst(cx, cy, cz, 12, 0x38bdf8);
        } else {
          this.runCoins += mult;
          this.coinCombo++;
          this.coinComboTimer = 0.65;
          audioManager.playCoin(this.coinCombo);
          this.spawnBurst(cx, cy, cz, 7, 0xfacc15);
        }
      },
      (type, px, py, pz) => {
        this.powerUps[type] = getUpgradedPowerUpDuration(type, this.upgradeLevels);
        this.powerUpsCollected++;
        audioManager.playPowerUp();
        this.spawnBurst(px, py, pz, 16, 0x22c55e);
      },
    );

    // Squash & stretch recovery
    this.squashX = THREE.MathUtils.damp(this.squashX, 1, 14, dt);
    this.squashY = THREE.MathUtils.damp(this.squashY, 1, 14, dt);

    // Pose & Rig attachments
    this.runCycle += this.speed * dt * 0.42;
    if (this.grounded && this.slideTimer <= 0) {
      const gate = Math.floor(this.runCycle / Math.PI);
      if (gate !== this.stepGate) {
        this.stepGate = gate;
        audioManager.playStep();
      }
    }

    let pose: PoseState = 'run';
    if (isJetpack) pose = 'jetpack';
    else if (this.slideTimer > 0) pose = 'slide';
    else if (!this.grounded) pose = 'jump';
    else if (this.powerUps.hoverboard > 0) pose = 'hoverboard';

    this.playerRig.jetpackGroup.visible = isJetpack;
    this.playerRig.hoverboardGroup.visible = this.powerUps.hoverboard > 0 && !isJetpack;
    this.playerRig.shieldRing.visible = this.powerUps.hoverboard > 0;
    this.playerRig.magnetRing.visible = this.powerUps.magnet > 0;
    this.playerRig.shieldRing.rotation.z = this.timeElapsed * 2.5;
    this.playerRig.magnetRing.rotation.z = -this.timeElapsed * 3.2;

    this.playerRig.root.position.set(this.playerX, this.playerY, 0);
    this.animController.updatePose(
      this.playerRig,
      pose,
      dt,
      this.runCycle,
      vx,
      this.squashX,
      this.squashY,
    );

    this.playerShadow.position.set(this.playerX, supportFloorY + 0.025, 0);
    this.playerShadow.visible = !isJetpack;

    // Guard & Dog chasers appear briefly behind player at start of run
    if (this.distance < 35) {
      this.chaserGroup.visible = true;
      const cz = 3.2 + (this.distance / 35) * 4.5;
      this.chaserGroup.position.set(this.playerX - 0.75, 0, cz);
    } else {
      this.chaserGroup.visible = false;
    }

    // Dynamic Gameplay Camera with trauma shake & subtle speed FOV kick
    const shake = this.trauma * this.trauma * 0.45;
    const shakeX = (Math.random() - 0.5) * shake;
    const shakeY = (Math.random() - 0.5) * shake;
    const targetFov = 60 + Math.max(0, this.speed - 20) * 0.35 + (isJetpack ? 6 : 0);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
    this.camera.updateProjectionMatrix();

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.playerX * 0.62, 10, dt) + shakeX;
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, 4.9 + this.playerY * 0.48, 8, dt) + shakeY;
    this.camera.position.z = 8.4;
    this.camera.lookAt(this.playerX * 0.42, 1.85 + this.playerY * 0.5, -16);

    // Position 3D Checkpoint Gate on the track as player approaches
    const distToGate = this.nextCheckpointDist - this.distance;
    if (this.checkpointsEnabled && distToGate <= 135 && distToGate >= -6) {
      this.checkpointGateGroup.visible = true;
      this.checkpointGateGroup.position.z = -distToGate;
      this.checkpointBeaconL.rotation.y += dt * 3.2;
      this.checkpointBeaconR.rotation.y -= dt * 3.2;
    } else {
      this.checkpointGateGroup.visible = false;
    }

    // Educational Checkpoint Trigger
    if (checkCheckpointDue(this.distance, this.nextCheckpointDist, this.checkpointsEnabled)) {
      this.pauseGame(true);
      audioManager.playCheckpoint();
      this.spawnBurst(this.playerX, this.playerY + 1.4, 0, 14, 0xfacc15);
      this.callbacks.onCheckpointDue(Math.round(this.distance));
      return;
    }

    if (now - this.lastHudEmit >= 95) {
      this.lastHudEmit = now;
      this.emitHud(false);
    }
  }

  private updateParticles(dt: number): void {
    let anyChanged = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) {
        _dummy.position.set(0, -100, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      anyChanged = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _dummy.position.set(0, -100, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      p.vy -= 14 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.scale.setScalar(Math.max(0.05, p.life / p.maxLife));
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      _tempColor.copy(p.color);
      this.particleMesh.setColorAt(i, _tempColor);
    }
    if (anyChanged || this.timeElapsed < 0.2) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) {
        this.particleMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  private triggerGameOver(): void {
    this.phase = 'gameover';
    this.hitstopTimer = 0.055;
    this.hitFlashTimer = 0.09;
    this.trauma = 0.9;
    audioManager.stopMusic();
    audioManager.playCrash();
    this.spawnBurst(this.playerX, this.playerY + 1, 0, 26, 0xef4444);

    const dist = Math.round(this.distance);
    const score = calculateRunScore(dist, this.runCoins, this.bonusScore);
    const worldCfg = this.worldManager.getCurrentConfig();

    const summary: RunSummary = {
      score,
      distance: dist,
      coinsCollected: this.runCoins,
      pendingCoinsToBank: Math.max(0, this.runCoins - this.checkpointCoins),
      gemsCollected: this.runGems,
      bestScore: score,
      isNewBest: false,
      obstaclesCleared: this.obstaclesCleared,
      powerUpsCollected: this.powerUpsCollected,
      checkpointsAnswered: this.checkpointsAnswered,
      checkpointsCorrect: this.checkpointsCorrect,
      worldName: worldCfg.name,
    };

    const missionCounters: RunMissionCounters = {
      coins: this.runCoins,
      distance: dist,
      jumps: this.jumpsThisRun,
      powerUps: this.powerUpsCollected,
      noCrashDistance: Math.round(this.noCrashDistance),
    };

    this.callbacks.onPhaseSync('gameover');
    this.callbacks.onGameOver(summary, missionCounters);
  }

  private emitHud(force: boolean): void {
    if (!force && this.phase !== 'playing') return;
    const cfg = this.worldManager.getCurrentConfig();
    this.callbacks.onHudUpdate({
      score: calculateRunScore(this.distance, this.runCoins, this.bonusScore),
      distance: Math.round(this.distance),
      runCoins: this.runCoins,
      runGems: this.runGems,
      totalCoins: this.totalCoins,
      speed: Math.round(this.speed),
      multiplier: getActiveMultiplier(this.powerUps),
      powerUps: { ...this.powerUps },
      nextCheckpointDist: Math.round(this.nextCheckpointDist),
      checkpointsEnabled: this.checkpointsEnabled,
      shieldActive: this.powerUps.hoverboard > 0,
      hitFlash: this.hitFlashTimer,
      activeWorldId: cfg.id,
      activeWorldName: cfg.name,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    audioManager.stopMusic();
    this.unbindEvents();

    this.worldManager.dispose();
    this.coinManager.dispose();
    this.playerRig.dispose();
    this.playerShadow.geometry.dispose();
    (this.playerShadow.material as THREE.Material).dispose();
    for (const g of this.gateGeos) g.dispose();
    for (const m of this.gateMats) m.dispose();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.pmremEnv.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
