import * as THREE from 'three';
import { LANE_CENTERS } from './constants';
import type { CoinBlueprint, PowerUpBlueprint, PowerUpType } from './types';

export interface ActiveCoin {
  active: boolean;
  isGem: boolean;
  mesh: THREE.Group;
  shadow: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  magnetized: boolean;
}

export interface ActivePowerUp {
  active: boolean;
  type: PowerUpType;
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
}

export class CoinManager {
  private readonly parentScene: THREE.Scene;
  private readonly group = new THREE.Group();
  private coins: ActiveCoin[] = [];
  private powerUps: ActivePowerUp[] = [];
  private sharedGeo: THREE.BufferGeometry[] = [];
  private sharedMat: THREE.Material[] = [];

  private readonly shadowGeo: THREE.CircleGeometry;
  private readonly shadowMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene, contactShadowTex: THREE.Texture) {
    this.parentScene = scene;
    this.group.name = 'collectibles_pool';
    this.parentScene.add(this.group);

    this.shadowGeo = new THREE.CircleGeometry(0.45, 14);
    this.shadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });

    // Pre-warm coin & gem pool
    for (let i = 0; i < 90; i++) this.createCoinItem(false);
    for (let i = 0; i < 14; i++) this.createCoinItem(true);

    // Pre-warm 5 unique 3D power-up models
    const types: PowerUpType[] = ['magnet', 'jetpack', 'sneakers', 'multiplier', 'hoverboard'];
    for (const t of types) {
      for (let i = 0; i < 3; i++) this.createPowerUpItem(t);
    }
  }

  public updateShadowTexture(tex: THREE.Texture): void {
    this.shadowMat.map = tex;
    this.shadowMat.needsUpdate = true;
  }

  private createCoinItem(isGem: boolean): ActiveCoin {
    const mesh = isGem ? this.buildGemMesh() : this.buildCoinMesh();
    mesh.visible = false;
    const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    shadow.visible = false;
    this.group.add(mesh, shadow);

    const item: ActiveCoin = { active: false, isGem, mesh, shadow, x: 0, y: 0.75, z: -999, magnetized: false };
    this.coins.push(item);
    return item;
  }

  private buildCoinMesh(): THREE.Group {
    const g = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xca8a04,
      emissiveIntensity: 0.25,
      roughness: 0.22,
      metalness: 0.85,
    });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3, metalness: 0.6 });
    const discGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.11, 18);
    const barGeo = new THREE.BoxGeometry(0.16, 0.34, 0.14);
    this.sharedGeo.push(discGeo, barGeo);
    this.sharedMat.push(goldMat, innerMat);

    const disc = new THREE.Mesh(discGeo, goldMat);
    disc.rotation.x = Math.PI / 2;
    const emblem = new THREE.Mesh(barGeo, innerMat);
    g.add(disc, emblem);
    return g;
  }

  private buildGemMesh(): THREE.Group {
    const g = new THREE.Group();
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      roughness: 0.12,
      metalness: 0.35,
    });
    const geo = new THREE.OctahedronGeometry(0.45, 0);
    this.sharedGeo.push(geo);
    this.sharedMat.push(gemMat);
    const crystal = new THREE.Mesh(geo, gemMat);
    crystal.scale.set(0.9, 1.28, 0.9);
    g.add(crystal);
    return g;
  }

  private createPowerUpItem(type: PowerUpType): ActivePowerUp {
    const mesh = this.buildPowerUpMesh(type);
    mesh.visible = false;
    this.group.add(mesh);
    const item: ActivePowerUp = { active: false, type, mesh, x: 0, y: 1.05, z: -999 };
    this.powerUps.push(item);
    return item;
  }

  private buildPowerUpMesh(type: PowerUpType): THREE.Group {
    const g = new THREE.Group();
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 });
    const auraGeo = new THREE.TorusGeometry(0.68, 0.055, 8, 24);
    this.sharedGeo.push(auraGeo);
    this.sharedMat.push(glowMat);
    const aura = new THREE.Mesh(auraGeo, glowMat);
    g.add(aura);

    if (type === 'magnet') {
      const red = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25, metalness: 0.45 });
      const silver = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 });
      const uGeo = new THREE.TorusGeometry(0.32, 0.1, 10, 18, Math.PI);
      const tipGeo = new THREE.BoxGeometry(0.2, 0.22, 0.2);
      this.sharedGeo.push(uGeo, tipGeo);
      this.sharedMat.push(red, silver);
      const u = new THREE.Mesh(uGeo, red);
      u.rotation.z = Math.PI;
      u.position.y = 0.08;
      const tL = new THREE.Mesh(tipGeo, silver);
      tL.position.set(-0.32, 0.18, 0);
      const tR = new THREE.Mesh(tipGeo, silver);
      tR.position.set(0.32, 0.18, 0);
      g.add(u, tL, tR);
    } else if (type === 'jetpack') {
      const bodyM = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3, metalness: 0.55 });
      const flameM = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const cylGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.58, 12);
      const coneGeo = new THREE.ConeGeometry(0.12, 0.3, 8);
      this.sharedGeo.push(cylGeo, coneGeo);
      this.sharedMat.push(bodyM, flameM);
      const l = new THREE.Mesh(cylGeo, bodyM);
      l.position.x = -0.17;
      const r = new THREE.Mesh(cylGeo, bodyM);
      r.position.x = 0.17;
      const f = new THREE.Mesh(coneGeo, flameM);
      f.rotation.x = Math.PI;
      f.position.y = -0.38;
      g.add(l, r, f);
    } else if (type === 'sneakers') {
      const blueM = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.35 });
      const soleM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
      const bGeo = new THREE.BoxGeometry(0.42, 0.26, 0.72);
      const sGeo = new THREE.BoxGeometry(0.46, 0.1, 0.76);
      this.sharedGeo.push(bGeo, sGeo);
      this.sharedMat.push(blueM, soleM);
      const shoe = new THREE.Mesh(bGeo, blueM);
      const sole = new THREE.Mesh(sGeo, soleM);
      sole.position.y = -0.16;
      g.add(shoe, sole);
    } else if (type === 'multiplier') {
      const starM = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xeab308,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.75,
      });
      const oGeo = new THREE.OctahedronGeometry(0.38, 0);
      this.sharedGeo.push(oGeo);
      this.sharedMat.push(starM);
      const s1 = new THREE.Mesh(oGeo, starM);
      const s2 = new THREE.Mesh(oGeo, starM);
      s2.rotation.y = Math.PI / 4;
      s2.scale.setScalar(0.82);
      g.add(s1, s2);
    } else {
      // Hoverboard
      const deckM = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.6, roughness: 0.25 });
      const dGeo = new THREE.BoxGeometry(0.48, 0.11, 0.95);
      this.sharedGeo.push(dGeo);
      this.sharedMat.push(deckM);
      const board = new THREE.Mesh(dGeo, deckM);
      board.rotation.x = 0.25;
      board.rotation.z = 0.32;
      g.add(board);
    }
    return g;
  }

  public spawnBatch(zStart: number, coins: CoinBlueprint[], powerUps: PowerUpBlueprint[]): void {
    for (const bp of coins) {
      const isGem = Boolean(bp.isGem);
      let item = this.coins.find((c) => !c.active && c.isGem === isGem);
      if (!item) item = this.createCoinItem(isGem);
      item.active = true;
      item.magnetized = false;
      item.x = LANE_CENTERS[bp.lane];
      item.y = bp.y;
      item.z = zStart - bp.zOffset;
      item.mesh.position.set(item.x, item.y, item.z);
      item.mesh.visible = true;
      item.shadow.position.set(item.x, 0.02, item.z);
      item.shadow.visible = item.y < 3.2;
    }

    for (const p of powerUps) {
      let item = this.powerUps.find((pu) => !pu.active && pu.type === p.type);
      if (!item) item = this.createPowerUpItem(p.type);
      item.active = true;
      item.x = LANE_CENTERS[p.lane];
      item.y = p.y;
      item.z = zStart - p.zOffset;
      item.mesh.position.set(item.x, item.y, item.z);
      item.mesh.visible = true;
    }
  }

  public update(
    dt: number,
    runSpeed: number,
    timeElapsed: number,
    playerX: number,
    playerY: number,
    playerZ: number,
    magnetActive: boolean,
    onCollectCoin: (isGem: boolean, x: number, y: number, z: number) => void,
    onCollectPowerUp: (type: PowerUpType, x: number, y: number, z: number) => void,
  ): void {
    const spin = timeElapsed * 3.4;

    for (const c of this.coins) {
      if (!c.active) continue;
      c.z += runSpeed * dt;

      if (magnetActive) {
        const dz = playerZ - c.z;
        const dx = playerX - c.x;
        const distSq = dx * dx + dz * dz;
        if (distSq < 18 * 18) {
          c.magnetized = true;
        }
      }

      if (c.magnetized) {
        const pull = Math.min(1, dt * 14);
        c.x += (playerX - c.x) * pull;
        c.y += (playerY + 1.0 - c.y) * pull;
        c.z += (playerZ - c.z) * pull;
      }

      c.mesh.position.set(c.x, c.y + Math.sin(timeElapsed * 4 + c.z * 0.25) * 0.1, c.z);
      c.mesh.rotation.y = spin + c.z * 0.2;
      c.shadow.position.set(c.x, 0.02, c.z);

      const hitX = Math.abs(c.x - playerX) < 0.95;
      const hitY = Math.abs(c.y - (playerY + 0.9)) < 1.35;
      const hitZ = Math.abs(c.z - playerZ) < 1.15;

      if (hitX && hitY && hitZ) {
        c.active = false;
        c.mesh.visible = false;
        c.shadow.visible = false;
        onCollectCoin(c.isGem, c.x, c.y, c.z);
      } else if (c.z > 18) {
        c.active = false;
        c.mesh.visible = false;
        c.shadow.visible = false;
      }
    }

    for (const p of this.powerUps) {
      if (!p.active) continue;
      p.z += runSpeed * dt;
      p.mesh.position.set(p.x, p.y + Math.sin(timeElapsed * 3.8 + p.z) * 0.16, p.z);
      p.mesh.rotation.y = spin * 0.85;

      if (
        Math.abs(p.x - playerX) < 1.05 &&
        Math.abs(p.y - (playerY + 0.9)) < 1.45 &&
        Math.abs(p.z - playerZ) < 1.2
      ) {
        p.active = false;
        p.mesh.visible = false;
        onCollectPowerUp(p.type, p.x, p.y, p.z);
      } else if (p.z > 18) {
        p.active = false;
        p.mesh.visible = false;
      }
    }
  }

  public clearActive(): void {
    for (const c of this.coins) {
      c.active = false;
      c.mesh.visible = false;
      c.shadow.visible = false;
    }
    for (const p of this.powerUps) {
      p.active = false;
      p.mesh.visible = false;
    }
  }

  public dispose(): void {
    this.clearActive();
    this.parentScene.remove(this.group);
    this.shadowGeo.dispose();
    this.shadowMat.dispose();
    for (const g of this.sharedGeo) g.dispose();
    for (const m of this.sharedMat) m.dispose();
    this.sharedGeo = [];
    this.sharedMat = [];
  }
}
