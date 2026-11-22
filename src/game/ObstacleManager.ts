import * as THREE from 'three';
import { LANE_CENTERS } from './constants';
import { generateFairObstacleWave, getObstacleDimensions } from './rules';
import type { ObstacleBlueprint, ObstacleKind } from './types';
import type { WorldConfig, WorldTrainStyle } from './WorldConfiguration';
import type { WorldAssetBundle } from './WorldLoader';

export interface ActiveObstacle {
  active: boolean;
  kind: ObstacleKind;
  variant: number;
  mesh: THREE.Group;
  lane: number;
  x: number;
  z: number;
  length: number;
  height: number;
  bottomY: number;
  speed: number;
  passed: boolean;
}

export class ObstacleManager {
  private readonly parentScene: THREE.Scene;
  private readonly poolGroup = new THREE.Group();
  private obstacles: ActiveObstacle[] = [];
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];

  private currentConfig: WorldConfig | null = null;
  private currentAssets: WorldAssetBundle | null = null;

  constructor(scene: THREE.Scene) {
    this.parentScene = scene;
    this.poolGroup.name = 'obstacles_pool';
    this.parentScene.add(this.poolGroup);
  }

  private trackGeo<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  private trackMat<T extends THREE.Material>(m: T): T {
    this.materials.push(m);
    return m;
  }

  public rebuildForWorld(config: WorldConfig, assets: WorldAssetBundle): void {
    this.disposePool();
    this.currentConfig = config;
    this.currentAssets = assets;

    // Pre-warm pooled obstacles for zero-GC spawning
    const prewarm: Array<{ kind: ObstacleKind; count: number; variant?: number }> = [
      { kind: 'low_barrier', count: 8 },
      { kind: 'high_gantry', count: 6 },
      { kind: 'full_barricade', count: 6 },
      { kind: 'stationary_train', count: 4, variant: 0 },
      { kind: 'stationary_train', count: 3, variant: 1 },
      { kind: 'moving_train', count: 4, variant: 2 },
      { kind: 'train_with_ramp', count: 3, variant: 0 },
    ];

    for (const item of prewarm) {
      for (let i = 0; i < item.count; i++) {
        this.createPooledItem(item.kind, item.variant ?? i % 3);
      }
    }
  }

  private createPooledItem(kind: ObstacleKind, variant: number): ActiveObstacle {
    const cfg = this.currentConfig!;
    const assets = this.currentAssets!;
    const dims = getObstacleDimensions(kind);

    let mesh: THREE.Group;
    if (kind === 'low_barrier') {
      mesh = this.buildLowBarrier(cfg, assets);
    } else if (kind === 'high_gantry') {
      mesh = this.buildHighGantry(cfg, assets);
    } else if (kind === 'full_barricade') {
      mesh = this.buildFullBarricade(cfg, assets);
    } else {
      const style = cfg.trainStyles[variant % cfg.trainStyles.length];
      mesh = this.buildWorldTrain(
        cfg,
        style,
        dims.length,
        kind === 'train_with_ramp',
        kind === 'moving_train',
      );
    }

    mesh.visible = false;
    this.poolGroup.add(mesh);

    const item: ActiveObstacle = {
      active: false,
      kind,
      variant,
      mesh,
      lane: 1,
      x: 0,
      z: -999,
      length: dims.length,
      height: dims.height,
      bottomY: kind === 'high_gantry' ? 1.35 : 0,
      speed: 0,
      passed: false,
    };
    this.obstacles.push(item);
    return item;
  }

  private buildLowBarrier(cfg: WorldConfig, assets: WorldAssetBundle): THREE.Group {
    const group = new THREE.Group();
    const legMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65 }));
    const boardMat = this.trackMat(new THREE.MeshStandardMaterial({ map: assets.barrierTex, roughness: 0.48 }));
    const capMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: cfg.accentColor,
        emissive: cfg.id === 'futuristic_city' ? cfg.accentColor : 0x000000,
        emissiveIntensity: cfg.id === 'futuristic_city' ? 0.8 : 0,
        roughness: 0.3,
      }),
    );

    const board = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.35, 0.56, 0.24)), boardMat);
    board.position.y = 0.84;
    board.castShadow = true;
    group.add(board);

    for (const sx of [-0.88, 0.88]) {
      const leg = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.18, 0.96, 0.48)), legMat);
      leg.position.set(sx, 0.48, 0);
      leg.castShadow = true;
      const beacon = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.13, 8, 8)), capMat);
      beacon.position.set(sx, 1.18, 0);
      group.add(leg, beacon);
    }

    // World-specific thematic flair on barrier
    if (cfg.id === 'ancient_egypt') {
      const pyramidTop = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.24, 0.34, 4)), capMat);
      pyramidTop.rotation.y = Math.PI / 4;
      pyramidTop.position.set(0, 1.28, 0);
      group.add(pyramidTop);
    } else if (cfg.id === 'snow_adventure') {
      const snowCap = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(2.42, 0.14, 0.3)),
        this.trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })),
      );
      snowCap.position.y = 1.16;
      group.add(snowCap);
    }

    return group;
  }

  private buildHighGantry(cfg: WorldConfig, assets: WorldAssetBundle): THREE.Group {
    const group = new THREE.Group();
    const postMat = this.trackMat(new THREE.MeshStandardMaterial({ color: cfg.gantryColor, roughness: 0.5, metalness: 0.25 }));
    const signMat = this.trackMat(new THREE.MeshStandardMaterial({ map: assets.barrierTex, roughness: 0.42 }));
    const glowMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        color: cfg.id === 'futuristic_city' ? 0x22d3ee : cfg.accentColor,
      }),
    );

    for (const sx of [-1.25, 1.25]) {
      const post = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.14, 0.17, 3.6, 10)), postMat);
      post.position.set(sx, 1.8, 0);
      post.castShadow = true;
      group.add(post);
    }

    const beam = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.75, 1.2, 0.45)), postMat);
    beam.position.set(0, 2.55, 0);
    beam.castShadow = true;
    const face = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.5, 0.9, 0.5)), signMat);
    face.position.set(0, 2.55, 0);
    const arrowBar = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.1, 0.18, 0.54)), glowMat);
    arrowBar.position.set(0, 1.88, 0);
    group.add(beam, face, arrowBar);

    return group;
  }

  private buildFullBarricade(cfg: WorldConfig, assets: WorldAssetBundle): THREE.Group {
    const group = new THREE.Group();
    const wallMat = this.trackMat(new THREE.MeshStandardMaterial({ color: cfg.barricadeColor, roughness: 0.6 }));
    const stripeMat = this.trackMat(new THREE.MeshStandardMaterial({ map: assets.barrierTex, roughness: 0.5 }));
    const rimMat = this.trackMat(new THREE.MeshStandardMaterial({ color: cfg.accentColor, roughness: 0.35, metalness: 0.35 }));

    const base = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.45, 2.45, 0.9)), wallMat);
    base.position.y = 1.225;
    base.castShadow = true;
    const plaque = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.15, 1.3, 0.96)), stripeMat);
    plaque.position.y = 1.4;
    const crown = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.55, 0.25, 1.0)), rimMat);
    crown.position.y = 2.55;
    group.add(base, plaque, crown);
    return group;
  }

  private buildWorldTrain(
    cfg: WorldConfig,
    style: WorldTrainStyle,
    length: number,
    hasRamp: boolean,
    isMoving: boolean,
  ): THREE.Group {
    const group = new THREE.Group();
    const bodyLen = hasRamp ? length - 4.2 : length;
    const bodyZOffset = hasRamp ? -2.1 : 0;

    const bodyMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: style.bodyColor,
        roughness: style.isMaglev ? 0.22 : 0.36,
        metalness: style.isMaglev ? 0.65 : 0.2,
      }),
    );
    const roofMat = this.trackMat(new THREE.MeshStandardMaterial({ color: style.roofColor, roughness: 0.35 }));
    const stripeMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: style.stripeColor,
        emissive: style.isMaglev ? style.stripeColor : 0x000000,
        emissiveIntensity: style.isMaglev ? 0.75 : 0,
        roughness: 0.3,
      }),
    );
    const glassMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.12, metalness: 0.85 }));
    const glowMat = this.trackMat(new THREE.MeshBasicMaterial({ color: style.glowColor }));
    const wheelMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.6 }));

    // Train chassis / main body
    const hull = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.56, 3.1, bodyLen)), bodyMat);
    hull.position.set(0, 1.85, bodyZOffset);
    hull.castShadow = true;
    hull.receiveShadow = true;
    group.add(hull);

    // Roof arch
    const roof = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.26, 0.38, bodyLen - 0.5)), roofMat);
    roof.position.set(0, 3.55, bodyZOffset);
    group.add(roof);

    // Side livery stripe
    const stripe = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.64, 0.34, bodyLen - 0.1)), stripeMat);
    stripe.position.set(0, 1.35, bodyZOffset);
    group.add(stripe);

    // Windshield & Dual Headlights (facing +Z toward approaching player)
    const frontZ = bodyZOffset + bodyLen / 2;
    const windshield = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.05, 0.98, 0.14)), glassMat);
    windshield.position.set(0, 2.55, frontZ + 0.03);
    group.add(windshield);

    for (const hx of [-0.78, 0.78]) {
      const lamp = new THREE.Mesh(this.trackGeo(new THREE.CircleGeometry(0.22, 12)), glowMat);
      lamp.position.set(hx, 1.15, frontZ + 0.04);
      group.add(lamp);
    }

    if (isMoving) {
      const badge = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.1, 0.24, 0.1)), glowMat);
      badge.position.set(0, 3.25, frontZ + 0.04);
      group.add(badge);
    }

    // Side passenger windows
    const winCount = 4;
    for (let i = 0; i < winCount; i++) {
      const wz = bodyZOffset - bodyLen / 2 + 2.1 + i * ((bodyLen - 4.2) / Math.max(1, winCount - 1));
      const win = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.65, 0.72, 1.55)), glassMat);
      win.position.set(0, 2.38, wz);
      group.add(win);
    }

    // Bogies / hover pods
    if (!style.isMaglev) {
      const bogieGeo = this.trackGeo(new THREE.CylinderGeometry(0.32, 0.32, 2.4, 10));
      for (const bz of [bodyZOffset - bodyLen * 0.34, bodyZOffset + bodyLen * 0.34]) {
        const axle = new THREE.Mesh(bogieGeo, wheelMat);
        axle.rotation.z = Math.PI / 2;
        axle.position.set(0, 0.32, bz);
        group.add(axle);
      }
    } else {
      // Glowing maglev hover skirts
      const pad = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.3, 0.22, bodyLen - 0.6)), glowMat);
      pad.position.set(0, 0.26, bodyZOffset);
      group.add(pad);
    }

    // Egyptian / Snow / Jungle rooftop detail
    if (cfg.id === 'snow_adventure') {
      const snowLayer = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(2.15, 0.2, bodyLen - 0.8)),
        this.trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 })),
      );
      snowLayer.position.set(0, 3.82, bodyZOffset);
      group.add(snowLayer);
    }

    // Optional front climbable ramp
    if (hasRamp) {
      const rampMat = this.trackMat(new THREE.MeshStandardMaterial({ color: cfg.accentColor, roughness: 0.5 }));
      const ramp = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.35, 0.24, 5.4)), rampMat);
      ramp.rotation.x = Math.atan2(3.7, 4.2);
      ramp.position.set(0, 1.85, bodyZOffset + bodyLen / 2 + 2.1);
      ramp.castShadow = true;
      group.add(ramp);
    }

    return group;
  }

  public spawnWave(zStart: number, distance: number, waveIndex: number): ReturnType<typeof generateFairObstacleWave> {
    const wave = generateFairObstacleWave(distance, waveIndex);
    for (const bp of wave.obstacles) {
      this.activateObstacle(bp, zStart);
    }
    return wave;
  }

  private activateObstacle(bp: ObstacleBlueprint, zStart: number): void {
    const variant = bp.trainVariant ?? 0;
    let item = this.obstacles.find(
      (o) => !o.active && o.kind === bp.kind && (o.variant === variant || !bp.kind.includes('train')),
    );
    if (!item) {
      item = this.createPooledItem(bp.kind, variant);
    }

    item.active = true;
    item.lane = bp.lane;
    item.x = LANE_CENTERS[bp.lane];
    item.z = zStart - bp.zOffset;
    item.speed = bp.speed ?? 0;
    item.passed = false;
    item.mesh.position.set(item.x, 0, item.z);
    item.mesh.visible = true;
  }

  public update(dt: number, runSpeed: number, onPassed: () => void): ActiveObstacle[] {
    const activeList: ActiveObstacle[] = [];
    for (const obs of this.obstacles) {
      if (!obs.active) continue;
      obs.z += (runSpeed + obs.speed) * dt;
      obs.mesh.position.z = obs.z;

      if (!obs.passed && obs.z - obs.length / 2 > 1.2) {
        obs.passed = true;
        onPassed();
      }

      if (obs.z - obs.length / 2 > 22) {
        obs.active = false;
        obs.mesh.visible = false;
      } else {
        activeList.push(obs);
      }
    }
    return activeList;
  }

  public clearActive(): void {
    for (const obs of this.obstacles) {
      obs.active = false;
      obs.mesh.visible = false;
    }
  }

  private disposePool(): void {
    this.clearActive();
    for (const obs of this.obstacles) {
      this.poolGroup.remove(obs.mesh);
    }
    this.obstacles = [];
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.geometries = [];
    this.materials = [];
  }

  public dispose(): void {
    this.disposePool();
    this.parentScene.remove(this.poolGroup);
  }
}
