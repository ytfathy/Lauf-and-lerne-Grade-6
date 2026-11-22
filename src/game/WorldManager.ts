import * as THREE from 'three';
import { WORLD_CONFIGS, type WorldConfig } from './WorldConfiguration';
import { WorldLoader, type WorldAssetBundle } from './WorldLoader';
import { EnvironmentRenderer } from './EnvironmentRenderer';
import { ObstacleManager } from './ObstacleManager';
import type { WorldId } from './types';

export class WorldManager {
  private readonly scene: THREE.Scene;
  private readonly maxAnisotropy: number;
  private readonly envRenderer: EnvironmentRenderer;
  private readonly obstacleManager: ObstacleManager;

  private readonly sunLight: THREE.DirectionalLight;
  private readonly hemiLight: THREE.HemisphereLight;
  private readonly rimLight: THREE.DirectionalLight;
  private readonly skyMesh: THREE.Mesh;
  private readonly skyMat: THREE.MeshBasicMaterial;

  private currentWorldId: WorldId = 'modern_cairo';
  private currentAssets: WorldAssetBundle | null = null;

  constructor(
    scene: THREE.Scene,
    maxAnisotropy: number,
    isSoftwareGl: boolean,
  ) {
    this.scene = scene;
    this.maxAnisotropy = maxAnisotropy;

    this.envRenderer = new EnvironmentRenderer(scene);
    this.obstacleManager = new ObstacleManager(scene);

    // 3-Point Warm/Cool Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0xb48a60, 1.0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5d6, 2.3);
    this.sunLight.position.set(16, 28, 18);
    if (!isSoftwareGl) {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(1024, 1024);
      this.sunLight.shadow.camera.near = 2;
      this.sunLight.shadow.camera.far = 90;
      this.sunLight.shadow.camera.left = -18;
      this.sunLight.shadow.camera.right = 18;
      this.sunLight.shadow.camera.top = 24;
      this.sunLight.shadow.camera.bottom = -20;
      this.sunLight.shadow.bias = -0.0005;
      this.sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
    this.rimLight.position.set(-14, 12, -20);
    this.scene.add(this.rimLight);

    // Sky Dome
    this.skyMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false });
    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(210, 24, 16), this.skyMat);
    this.scene.add(this.skyMesh);
  }

  public switchWorld(worldId: WorldId): WorldAssetBundle {
    const config = WORLD_CONFIGS[worldId] ?? WORLD_CONFIGS.modern_cairo;
    this.currentWorldId = config.id;

    // 1. Dispose old world bundle textures & environment geometry/materials
    if (this.currentAssets) {
      this.currentAssets.dispose();
      this.currentAssets = null;
    }

    // 2. Load new procedural textures & bump maps for the selected world
    const assets = WorldLoader.loadWorldAssets(config, this.maxAnisotropy);
    this.currentAssets = assets;

    // 3. Apply sky dome texture, fog, background, and 3-point lighting
    this.skyMat.map = assets.skyTex;
    this.skyMat.needsUpdate = true;

    const bgColor = new THREE.Color(config.fogColor);
    this.scene.background = bgColor;
    this.scene.fog = new THREE.FogExp2(config.fogColor, config.fogDensity);

    this.sunLight.color.setHex(config.sunColor);
    this.sunLight.intensity = config.sunIntensity;
    this.hemiLight.color.setHex(config.hemiSky);
    this.hemiLight.groundColor.setHex(config.hemiGround);
    this.hemiLight.intensity = config.hemiIntensity;
    this.rimLight.color.setHex(config.rimColor);

    // 4. Completely rebuild 3D track chunks, horizon vista, weather & props
    this.envRenderer.buildWorld(config, assets);

    // 5. Completely rebuild world-themed pooled obstacles & trains
    this.obstacleManager.rebuildForWorld(config, assets);

    return assets;
  }

  public getCurrentWorldId(): WorldId {
    return this.currentWorldId;
  }

  public getCurrentConfig(): WorldConfig {
    return WORLD_CONFIGS[this.currentWorldId];
  }

  public getCurrentAssets(): WorldAssetBundle | null {
    return this.currentAssets;
  }

  public getEnvironmentRenderer(): EnvironmentRenderer {
    return this.envRenderer;
  }

  public getObstacleManager(): ObstacleManager {
    return this.obstacleManager;
  }

  public update(dt: number, speed: number, timeElapsed: number): void {
    this.envRenderer.update(dt, speed, timeElapsed);
  }

  public dispose(): void {
    this.envRenderer.dispose();
    this.obstacleManager.dispose();
    if (this.currentAssets) {
      this.currentAssets.dispose();
      this.currentAssets = null;
    }
    this.skyMesh.geometry.dispose();
    this.skyMat.dispose();
  }
}
