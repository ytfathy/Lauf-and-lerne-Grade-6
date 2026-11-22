import * as THREE from 'three';
import { LANE_CENTERS } from './constants';
import type { WorldConfig } from './WorldConfiguration';
import type { WorldAssetBundle } from './WorldLoader';

export const CHUNK_LEN = 26;
export const CHUNK_COUNT = 8;

interface AnimatedProp {
  kind: 'waterfall' | 'flying_car' | 'torch_flame' | 'bird';
  mesh: THREE.Object3D;
  baseY: number;
  speed: number;
  phase: number;
  dir: number;
}

export class EnvironmentRenderer {
  private readonly parentScene: THREE.Scene;
  private worldGroup: THREE.Group | null = null;
  private chunks: THREE.Group[] = [];
  private horizonGroup: THREE.Group | null = null;
  private animatedProps: AnimatedProp[] = [];
  private weatherMesh: THREE.InstancedMesh | null = null;
  private weatherOffsets: Float32Array = new Float32Array(0);
  private weatherConfig: WorldConfig | null = null;

  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];

  private readonly dummy = new THREE.Object3D();
  private scrollDistance = 0;

  constructor(scene: THREE.Scene) {
    this.parentScene = scene;
  }

  private trackGeo<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  private trackMat<T extends THREE.Material>(m: T): T {
    this.materials.push(m);
    return m;
  }

  public buildWorld(config: WorldConfig, assets: WorldAssetBundle): void {
    this.dispose();

    const group = new THREE.Group();
    group.name = `world_${config.id}`;
    this.worldGroup = group;
    this.weatherConfig = config;
    this.scrollDistance = 0;

    // Shared chunk materials
    const groundMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: config.groundColor,
        roughness: 0.9,
        metalness: 0.04,
      }),
    );
    const trackMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: assets.trackTex,
        bumpMap: assets.trackBumpTex,
        bumpScale: 0.08,
        roughness: config.id === 'snow_adventure' ? 0.45 : 0.85,
        metalness: config.id === 'futuristic_city' ? 0.35 : 0.08,
      }),
    );
    const railMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: config.railColor,
        emissive: config.railEmissive,
        emissiveIntensity: config.id === 'futuristic_city' ? 0.9 : 0.35,
        roughness: 0.22,
        metalness: 0.85,
      }),
    );
    const platformMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: assets.platformTex,
        roughness: 0.72,
        metalness: config.platformMetalness,
      }),
    );

    // Shared chunk geometries
    const groundGeo = this.trackGeo(new THREE.PlaneGeometry(140, CHUNK_LEN));
    const trackGeo = this.trackGeo(new THREE.PlaneGeometry(11.4, CHUNK_LEN));
    const railGeo = this.trackGeo(new THREE.BoxGeometry(0.13, 0.09, CHUNK_LEN));
    const platformGeo = this.trackGeo(new THREE.BoxGeometry(4.2, 0.38, CHUNK_LEN));

    // World-specific prop materials & helpers
    const facadeMats = assets.facadeTextures.map((tex) =>
      this.trackMat(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0.1 })),
    );

    for (let i = 0; i < CHUNK_COUNT; i++) {
      const chunk = new THREE.Group();
      chunk.position.z = 14 - i * CHUNK_LEN;

      // Ground
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.05;
      ground.receiveShadow = true;
      chunk.add(ground);

      // Track bed
      const track = new THREE.Mesh(trackGeo, trackMat);
      track.rotation.x = -Math.PI / 2;
      track.position.y = 0;
      track.receiveShadow = true;
      chunk.add(track);

      // 6 steel/neon rails
      for (const lx of LANE_CENTERS) {
        for (const offset of [-0.85, 0.85]) {
          const rail = new THREE.Mesh(railGeo, railMat);
          rail.position.set(lx + offset, 0.045, 0);
          chunk.add(rail);
        }
      }

      // Left & right platforms
      for (const side of [-1, 1] as const) {
        const plat = new THREE.Mesh(platformGeo, platformMat);
        plat.position.set(side * 7.8, 0.18, 0);
        plat.receiveShadow = true;
        chunk.add(plat);
      }

      this.populateChunkProps(chunk, i, config, facadeMats);
      group.add(chunk);
      this.chunks.push(chunk);
    }

    // Horizon landmark vista
    this.horizonGroup = this.buildHorizonVista(config);
    group.add(this.horizonGroup);

    // Weather InstancedMesh
    this.buildWeatherSystem(config, group);

    this.parentScene.add(group);
  }

  private populateChunkProps(
    chunk: THREE.Group,
    idx: number,
    config: WorldConfig,
    facadeMats: THREE.MeshStandardMaterial[],
  ): void {
    if (config.id === 'ancient_egypt') {
      this.populateEgyptChunk(chunk, idx, facadeMats);
    } else if (config.id === 'modern_cairo') {
      this.populateCairoChunk(chunk, idx, facadeMats);
    } else if (config.id === 'tropical_jungle') {
      this.populateJungleChunk(chunk, idx, facadeMats);
    } else if (config.id === 'snow_adventure') {
      this.populateSnowChunk(chunk, idx, facadeMats);
    } else {
      this.populateFuturisticChunk(chunk, idx, facadeMats);
    }
  }

  private populateEgyptChunk(
    chunk: THREE.Group,
    idx: number,
    facadeMats: THREE.MeshStandardMaterial[],
  ): void {
    const stoneMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xe2b878, roughness: 0.86 }));
    const goldMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.85 }));
    const darkSandMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9 }));
    const flameMat = this.trackMat(new THREE.MeshBasicMaterial({ color: 0xff7b00 }));

    for (const side of [-1, 1] as const) {
      // Temple structures & colonnades
      const wallMat = facadeMats[(idx + (side > 0 ? 1 : 0)) % facadeMats.length];
      const temple = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(7.2, 10 + (idx % 3) * 2.5, 11)), wallMat);
      temple.position.set(side * 14.5, (10 + (idx % 3) * 2.5) / 2, -6);
      temple.castShadow = true;
      chunk.add(temple);

      // Obelisk on alternating chunks
      if ((idx + (side > 0 ? 1 : 0)) % 2 === 0) {
        const obGroup = new THREE.Group();
        const base = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.1, 1.4, 2.1)), darkSandMat);
        base.position.y = 0.7;
        const shaft = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.55, 0.9, 9.5, 4)), stoneMat);
        shaft.rotation.y = Math.PI / 4;
        shaft.position.y = 6.1;
        const tip = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.78, 1.4, 4)), goldMat);
        tip.rotation.y = Math.PI / 4;
        tip.position.y = 11.5;
        obGroup.add(base, shaft, tip);
        obGroup.position.set(side * 9.8, 0.35, 5);
        chunk.add(obGroup);
      } else {
        // Sandstone Sphinx / Guardian statue pedestal
        const statueGroup = new THREE.Group();
        const plinth = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.0, 1.2, 3.2)), stoneMat);
        plinth.position.y = 0.6;
        const body = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.4, 1.1, 2.4)), stoneMat);
        body.position.y = 1.75;
        const head = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.65, 12, 10)), stoneMat);
        head.position.set(0, 2.75, 0.6);
        const crown = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.7, 0.85, 0.9, 6)), goldMat);
        crown.position.set(0, 2.8, 0.6);
        statueGroup.add(plinth, body, head, crown);
        statueGroup.position.set(side * 9.5, 0.35, 5);
        chunk.add(statueGroup);
      }

      // Flaming braziers on track edges
      const brazier = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.45, 0.3, 1.3, 8)), darkSandMat);
      brazier.position.set(side * 6.3, 0.65, -2);
      const flame = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.32, 0.85, 7)), flameMat);
      flame.position.set(side * 6.3, 1.65, -2);
      chunk.add(brazier, flame);
      this.animatedProps.push({ kind: 'torch_flame', mesh: flame, baseY: 1.65, speed: 6, phase: idx + side, dir: 1 });

      // Palm tree + golden dunes
      const palm = this.createPalmTree();
      palm.position.set(side * 11.2, 0.35, -9);
      chunk.add(palm);

      const dune = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(8.5, 14, 10)), stoneMat);
      dune.scale.set(1.6, 0.38, 1.3);
      dune.position.set(side * 24, -0.5, (idx % 2 === 0 ? -4 : 4));
      chunk.add(dune);
    }

    // Overhead sandstone temple archway every 3rd chunk
    if (idx % 3 === 1) {
      const archGroup = new THREE.Group();
      for (const side of [-1, 1] as const) {
        const col = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.75, 0.9, 7.2, 10)), stoneMat);
        col.position.set(side * 6.8, 3.6, 0);
        archGroup.add(col);
      }
      const lintel = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(15.4, 1.35, 1.8)), stoneMat);
      lintel.position.y = 7.4;
      const goldTrim = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(15.6, 0.32, 1.9)), goldMat);
      goldTrim.position.y = 7.9;
      archGroup.add(lintel, goldTrim);
      chunk.add(archGroup);
    }
  }

  private populateCairoChunk(
    chunk: THREE.Group,
    idx: number,
    facadeMats: THREE.MeshStandardMaterial[],
  ): void {
    const trimMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.5 }));
    const lampMat = this.trackMat(new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    const roofMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.65 }));

    for (const side of [-1, 1] as const) {
      const h = 11 + ((idx * 3 + (side > 0 ? 2 : 0)) % 4) * 3.2;
      const mat = facadeMats[(idx + (side > 0 ? 1 : 0)) % facadeMats.length];
      const bldg = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(7.8, h, 11.5)), mat);
      bldg.position.set(side * 14.2, h / 2, -6);
      bldg.castShadow = true;
      chunk.add(bldg);

      // Rooftop cornice + warm awning
      const cornice = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(8.2, 0.55, 12.0)), roofMat);
      cornice.position.set(side * 14.2, h + 0.25, -6);
      chunk.add(cornice);

      const bldg2 = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(7.4, h * 0.82, 10.5)), facadeMats[(idx + 2) % facadeMats.length]);
      bldg2.position.set(side * 14.4, (h * 0.82) / 2, 7.2);
      chunk.add(bldg2);

      // Streetlamp
      const pole = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.12, 0.16, 4.6, 8)), trimMat);
      pole.position.set(side * 6.3, 2.65, 2);
      const lantern = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.32, 10, 8)), lampMat);
      lantern.position.set(side * 6.3, 5.05, 2);
      chunk.add(pole, lantern);

      // Palm tree along sidewalk
      const palm = this.createPalmTree();
      palm.position.set(side * 8.6, 0.35, -5);
      chunk.add(palm);
    }

    // Overpass city bridge every 3rd chunk
    if (idx % 3 === 2) {
      const bridgeDeck = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(22, 1.2, 3.8)), trimMat);
      bridgeDeck.position.set(0, 7.2, 0);
      const bridgeRail = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(22, 0.65, 0.25)), roofMat);
      bridgeRail.position.set(0, 8.0, 1.75);
      const bridgeRail2 = bridgeRail.clone();
      bridgeRail2.position.z = -1.75;
      chunk.add(bridgeDeck, bridgeRail, bridgeRail2);
    }
  }

  private populateJungleChunk(
    chunk: THREE.Group,
    idx: number,
    facadeMats: THREE.MeshStandardMaterial[],
  ): void {
    const barkMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 }));
    const leafMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.72 }));
    const brightLeafMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.65 }));
    const waterMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.85,
        roughness: 0.15,
      }),
    );
    const foamMat = this.trackMat(new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));

    for (const side of [-1, 1] as const) {
      // Giant Jungle Buttress Trees (4-part composite)
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.65, 1.25, 10.5, 9)), barkMat);
      trunk.position.y = 5.25;
      const c1 = new THREE.Mesh(this.trackGeo(new THREE.DodecahedronGeometry(3.4, 1)), leafMat);
      c1.position.set(0, 10.8, 0);
      const c2 = new THREE.Mesh(this.trackGeo(new THREE.DodecahedronGeometry(2.5, 1)), brightLeafMat);
      c2.position.set(side * -1.4, 9.6, 1.1);
      const c3 = new THREE.Mesh(this.trackGeo(new THREE.DodecahedronGeometry(2.2, 1)), leafMat);
      c3.position.set(side * 1.2, 11.8, -0.9);
      tree.add(trunk, c1, c2, c3);
      tree.position.set(side * 9.8, 0.35, -4);
      chunk.add(tree);

      // Mossy Jungle Temple Ruin or Cascading Waterfall
      if (idx % 2 === 0) {
        const cliff = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(7.2, 13, 12)), facadeMats[idx % facadeMats.length]);
        cliff.position.set(side * 16.5, 6.5, 3);
        chunk.add(cliff);

        const waterfall = new THREE.Mesh(this.trackGeo(new THREE.PlaneGeometry(3.4, 12.2)), waterMat);
        waterfall.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        waterfall.position.set(side * 12.82, 6.2, 3);
        const splash = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(2.1, 2.6, 0.45, 12)), foamMat);
        splash.position.set(side * 12.2, 0.35, 3);
        chunk.add(waterfall, splash);
        this.animatedProps.push({ kind: 'waterfall', mesh: waterfall, baseY: 6.2, speed: 5, phase: idx, dir: 1 });
      } else {
        const ruin = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(6.5, 7.5, 9)), facadeMats[(idx + 1) % facadeMats.length]);
        ruin.position.set(side * 14.5, 3.75, 4);
        chunk.add(ruin);
      }

      // Lush fern clusters along edge
      const fern = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(1.1, 1.4, 6)), brightLeafMat);
      fern.position.set(side * 6.5, 0.7, 7);
      chunk.add(fern);
    }

    // Wooden rope bridge overhead every 3rd chunk
    if (idx % 3 === 1) {
      const bridge = new THREE.Group();
      const plank = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(19, 0.5, 2.6)), barkMat);
      plank.position.y = 6.6;
      const railL = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(19, 0.25, 0.2)), barkMat);
      railL.position.set(0, 7.6, 1.15);
      const railR = railL.clone();
      railR.position.z = -1.15;
      bridge.add(plank, railL, railR);
      chunk.add(bridge);
    }

    // Tropical soaring bird on alternating chunks
    if (idx % 2 === 1) {
      const bird = new THREE.Group();
      const bodyMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 }));
      const wingMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 }));
      const body = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.32, 8, 8)), bodyMat);
      body.scale.set(1, 0.8, 1.6);
      const wings = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.7, 0.08, 0.42)), wingMat);
      bird.add(body, wings);
      bird.position.set(idx % 4 === 1 ? -4 : 4, 8.2, 0);
      chunk.add(bird);
      this.animatedProps.push({ kind: 'bird', mesh: bird, baseY: 8.2, speed: 3.2, phase: idx, dir: idx % 4 === 1 ? 1 : -1 });
    }
  }

  private populateSnowChunk(
    chunk: THREE.Group,
    idx: number,
    facadeMats: THREE.MeshStandardMaterial[],
  ): void {
    const snowMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 }));
    const pineMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.78 }));
    const trunkMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 }));
    const iceMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x0284c7,
        emissiveIntensity: 0.25,
        roughness: 0.14,
        metalness: 0.2,
        transparent: true,
        opacity: 0.84,
      }),
    );

    for (const side of [-1, 1] as const) {
      // Snow-covered pine tree (composite 5 parts)
      const pine = new THREE.Group();
      const trunk = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.32, 0.45, 2.2, 8)), trunkMat);
      trunk.position.y = 1.1;
      const t1 = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(2.1, 3.0, 8)), pineMat);
      t1.position.y = 3.2;
      const s1 = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(1.75, 1.4, 8)), snowMat);
      s1.position.y = 4.2;
      const t2 = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(1.5, 2.5, 8)), pineMat);
      t2.position.y = 5.4;
      const s2 = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(1.15, 1.3, 8)), snowMat);
      s2.position.y = 6.3;
      pine.add(trunk, t1, s1, t2, s2);
      pine.position.set(side * 9.0, 0.35, -7);
      chunk.add(pine);

      // Alpine lodge or jagged ice glacier spire
      if (idx % 2 === 0) {
        const chalet = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(7.2, 8.5, 10)), facadeMats[idx % facadeMats.length]);
        chalet.position.set(side * 14.8, 4.25, 4);
        const snowRoof = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(5.6, 3.2, 4)), snowMat);
        snowRoof.rotation.y = Math.PI / 4;
        snowRoof.position.set(side * 14.8, 10.1, 4);
        chunk.add(chalet, snowRoof);
      } else {
        const spire = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(2.6, 11.5, 5)), iceMat);
        spire.position.set(side * 13.5, 5.5, 4);
        const mound = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(3.8, 10, 8)), snowMat);
        mound.scale.set(1.2, 0.45, 1.2);
        mound.position.set(side * 11.5, 0.2, 8);
        chunk.add(spire, mound);
      }
    }

    // Crystalline Ice Tunnel Arch spanning the tracks every 2nd chunk
    if (idx % 2 === 1) {
      const tunnel = new THREE.Group();
      for (const side of [-1, 1] as const) {
        const pillar = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.6, 6.8, 4.5)), iceMat);
        pillar.position.set(side * 6.5, 3.4, 0);
        tunnel.add(pillar);
      }
      const arch = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(14.6, 1.5, 4.5)), iceMat);
      arch.position.y = 7.2;
      const snowCap = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(15.0, 0.7, 4.7)), snowMat);
      snowCap.position.y = 8.1;
      tunnel.add(arch, snowCap);
      chunk.add(tunnel);
    }
  }

  private populateFuturisticChunk(
    chunk: THREE.Group,
    idx: number,
    facadeMats: THREE.MeshStandardMaterial[],
  ): void {
    const cyanNeonMat = this.trackMat(new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
    const pinkNeonMat = this.trackMat(new THREE.MeshBasicMaterial({ color: 0xf472b6 }));
    const frameMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.85 }));

    for (const side of [-1, 1] as const) {
      const h = 15 + ((idx * 5 + (side > 0 ? 3 : 0)) % 5) * 3.5;
      const tower = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(8.0, h, 11.5)),
        facadeMats[(idx + (side > 0 ? 1 : 0)) % facadeMats.length],
      );
      tower.position.set(side * 14.5, h / 2, -5);
      chunk.add(tower);

      // Glowing neon spine & antenna
      const neonMat = (idx + (side > 0 ? 1 : 0)) % 2 === 0 ? cyanNeonMat : pinkNeonMat;
      const spine = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.45, h + 2.5, 0.45)), neonMat);
      spine.position.set(side * 10.4, (h + 2.5) / 2, -5);
      chunk.add(spine);

      // Sleek glowing maglev trackside pylon
      const pylon = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.45, 3.8, 0.45)), frameMat);
      pylon.position.set(side * 6.2, 1.9, 4);
      const pylonGlow = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.55, 0.85, 0.55)), neonMat);
      pylonGlow.position.set(side * 6.2, 3.9, 4);
      chunk.add(pylon, pylonGlow);
    }

    // Overhead holographic billboard archway every 2nd chunk
    if (idx % 2 === 0) {
      const holoArch = new THREE.Group();
      for (const side of [-1, 1] as const) {
        const post = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.5, 7.6, 0.5)), frameMat);
        post.position.set(side * 6.8, 3.8, 0);
        holoArch.add(post);
      }
      const screen = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(13.2, 1.8, 0.3)),
        idx % 4 === 0 ? cyanNeonMat : pinkNeonMat,
      );
      screen.position.y = 7.4;
      holoArch.add(screen);
      chunk.add(holoArch);
    }

    // Flying cyberpunk vehicle cruising overhead
    if (idx % 2 === 1) {
      const cruiser = new THREE.Group();
      const hull = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(2.6, 0.65, 1.15)), frameMat);
      const canopy = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.3, 0.45, 0.95)), cyanNeonMat);
      canopy.position.set(0.15, 0.4, 0);
      const thruster = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.3, 0.35, 0.9)), pinkNeonMat);
      thruster.position.set(-1.35, 0, 0);
      cruiser.add(hull, canopy, thruster);
      const y = 8.5 + (idx % 3) * 1.8;
      cruiser.position.set(-12, y, 0);
      chunk.add(cruiser);
      this.animatedProps.push({
        kind: 'flying_car',
        mesh: cruiser,
        baseY: y,
        speed: 14 + (idx % 3) * 4,
        phase: idx * 2.1,
        dir: idx % 4 === 1 ? 1 : -1,
      });
    }
  }

  private createPalmTree(): THREE.Group {
    const group = new THREE.Group();
    const trunkMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.9 }));
    const frondMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.72 }));

    const trunk = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.24, 0.42, 6.2, 8)), trunkMat);
    trunk.position.y = 3.1;
    trunk.rotation.z = 0.06;
    group.add(trunk);

    for (let i = 0; i < 6; i++) {
      const frond = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.55, 3.0, 5)), frondMat);
      const angle = (i / 6) * Math.PI * 2;
      frond.position.set(Math.cos(angle) * 1.1 - 0.15, 6.1, Math.sin(angle) * 1.1);
      frond.rotation.z = -Math.PI * 0.38;
      frond.rotation.y = -angle;
      group.add(frond);
    }
    return group;
  }

  private buildHorizonVista(config: WorldConfig): THREE.Group {
    const vista = new THREE.Group();
    vista.position.set(0, 0, -135);

    const sunMat = this.trackMat(new THREE.MeshBasicMaterial({ color: config.sunOrMoonHex }));
    const sunDisc = new THREE.Mesh(this.trackGeo(new THREE.CircleGeometry(15, 28)), sunMat);
    sunDisc.position.set(0, 44, -18);
    vista.add(sunDisc);

    if (config.id === 'ancient_egypt') {
      const pyrMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xe6b86a, roughness: 0.88 }));
      const pyrShadeMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xd49a48, roughness: 0.9 }));
      const p1 = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(34, 46, 4)), pyrMat);
      p1.rotation.y = Math.PI / 4;
      p1.position.set(-34, 23, 0);
      const p2 = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(28, 38, 4)), pyrShadeMat);
      p2.rotation.y = Math.PI / 4;
      p2.position.set(36, 19, -4);
      const p3 = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(20, 26, 4)), pyrMat);
      p3.rotation.y = Math.PI / 4;
      p3.position.set(4, 13, -10);
      vista.add(p1, p2, p3);
    } else if (config.id === 'modern_cairo') {
      const towerMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xe2d5be, roughness: 0.6 }));
      const shaft = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(2.6, 4.0, 56, 12)), towerMat);
      shaft.position.set(22, 28, 0);
      const crown = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(5.6, 3.0, 7, 14)), towerMat);
      crown.position.set(22, 57, 0);
      vista.add(shaft, crown);
      // Distant skyline towers
      const skyMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 }));
      for (const [bx, bh] of [[-42, 34], [-26, 42], [-10, 28], [42, 36]]) {
        const b = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(11, bh, 11)), skyMat);
        b.position.set(bx, bh / 2, -6);
        vista.add(b);
      }
    } else if (config.id === 'tropical_jungle') {
      const mtnMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.9 }));
      const stoneMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85 }));
      const peakL = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(34, 44, 7)), mtnMat);
      peakL.position.set(-34, 22, 0);
      const peakR = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(30, 40, 7)), mtnMat);
      peakR.position.set(36, 20, -4);
      // Giant stepped jungle ziggurat temple center
      for (let tier = 0; tier < 4; tier++) {
        const w = 24 - tier * 5;
        const step = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(w, 6, w)), stoneMat);
        step.position.set(0, 3 + tier * 6, -6);
        vista.add(step);
      }
      vista.add(peakL, peakR);
    } else if (config.id === 'snow_adventure') {
      const rockMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.88 }));
      const capMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 }));
      for (const [mx, mh, mr] of [[-40, 52, 30], [-14, 42, 24], [18, 56, 32], [44, 44, 26]]) {
        const mtn = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(mr, mh, 6)), rockMat);
        mtn.position.set(mx, mh / 2, 0);
        const cap = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(mr * 0.45, mh * 0.44, 6)), capMat);
        cap.position.set(mx, mh * 0.78, 0);
        vista.add(mtn, cap);
      }
    } else {
      // Futuristic City Megatowers & Neon Orbital Ring
      const cyberMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.7 }));
      const cyanMat = this.trackMat(new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
      const pinkMat = this.trackMat(new THREE.MeshBasicMaterial({ color: 0xf472b6 }));
      const horizonTowers: Array<[number, number, boolean]> = [
        [-40, 52, true],
        [-22, 64, false],
        [24, 60, true],
        [42, 48, false],
      ];
      for (const [tx, th, isCyan] of horizonTowers) {
        const t = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(12, th, 12)), cyberMat);
        t.position.set(tx, th / 2, 0);
        const neon = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.2, th + 6, 1.2)), isCyan ? cyanMat : pinkMat);
        neon.position.set(tx, (th + 6) / 2, 6.1);
        vista.add(t, neon);
      }
      const ring = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(22, 0.55, 8, 42)), cyanMat);
      ring.rotation.x = Math.PI * 0.36;
      ring.position.set(0, 44, -14);
      vista.add(ring);
    }

    return vista;
  }

  private buildWeatherSystem(config: WorldConfig, parent: THREE.Group): void {
    const count = config.weatherCount;
    const isStreak = config.weatherType === 'neon_rain';
    const geo = this.trackGeo(
      isStreak
        ? new THREE.BoxGeometry(0.06, 0.95, 0.06)
        : new THREE.OctahedronGeometry(config.weatherType === 'snowstorm' ? 0.16 : 0.12, 0),
    );
    const mat = this.trackMat(
      new THREE.MeshBasicMaterial({
        color: config.weatherColor,
        transparent: true,
        opacity: config.weatherType === 'sunbeams' ? 0.45 : 0.78,
      }),
    );

    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.frustumCulled = false;
    const offsets = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      offsets[i * 3] = (Math.random() - 0.5) * 38;
      offsets[i * 3 + 1] = 0.6 + Math.random() * 14;
      offsets[i * 3 + 2] = 6 - Math.random() * 95;
    }
    this.weatherMesh = mesh;
    this.weatherOffsets = offsets;
    parent.add(mesh);
  }

  public update(dt: number, speed: number, timeElapsed: number): void {
    if (!this.worldGroup) return;

    this.scrollDistance += speed * dt;
    const totalSpan = CHUNK_LEN * CHUNK_COUNT;
    for (const chunk of this.chunks) {
      chunk.position.z += speed * dt;
      if (chunk.position.z > CHUNK_LEN + 6) {
        chunk.position.z -= totalSpan;
      }
    }

    // Animate world-specific props
    for (const prop of this.animatedProps) {
      if (prop.kind === 'torch_flame') {
        const flicker = 0.8 + Math.sin(timeElapsed * 14 + prop.phase) * 0.25;
        prop.mesh.scale.set(1, flicker, 1);
      } else if (prop.kind === 'waterfall') {
        prop.mesh.position.y = prop.baseY + Math.sin(timeElapsed * 8 + prop.phase) * 0.12;
      } else if (prop.kind === 'bird') {
        const xSpan = Math.sin(timeElapsed * 0.7 + prop.phase) * 9 * prop.dir;
        prop.mesh.position.x = xSpan;
        prop.mesh.position.y = prop.baseY + Math.sin(timeElapsed * prop.speed + prop.phase) * 0.65;
      } else if (prop.kind === 'flying_car') {
        let x = prop.mesh.position.x + prop.dir * prop.speed * dt;
        if (x > 26) x = -26;
        if (x < -26) x = 26;
        prop.mesh.position.x = x;
        prop.mesh.position.y = prop.baseY + Math.sin(timeElapsed * 2.5 + prop.phase) * 0.35;
        prop.mesh.rotation.y = prop.dir > 0 ? 0 : Math.PI;
      }
    }

    // Update weather InstancedMesh
    if (this.weatherMesh && this.weatherConfig) {
      const count = this.weatherConfig.weatherCount;
      const type = this.weatherConfig.weatherType;
      for (let i = 0; i < count; i++) {
        let x = this.weatherOffsets[i * 3];
        let y = this.weatherOffsets[i * 3 + 1];
        let z = this.weatherOffsets[i * 3 + 2];

        if (type === 'sandstorm') {
          x += 12 * dt;
          z += speed * 0.5 * dt;
          y += Math.sin(timeElapsed * 3 + i) * 0.6 * dt;
        } else if (type === 'snowstorm') {
          y -= 4.2 * dt;
          x += Math.sin(timeElapsed * 1.8 + i) * 2.2 * dt;
          z += speed * 0.35 * dt;
        } else if (type === 'neon_rain') {
          y -= 24 * dt;
          z += speed * 0.25 * dt;
        } else if (type === 'fireflies') {
          x += Math.sin(timeElapsed * 1.5 + i * 0.7) * 1.4 * dt;
          y += Math.cos(timeElapsed * 2.1 + i) * 1.1 * dt;
          z += speed * 0.25 * dt;
        } else {
          // sunbeams
          y += Math.sin(timeElapsed + i) * 0.4 * dt;
          z += speed * 0.2 * dt;
        }

        if (x > 20) x = -20;
        if (x < -20) x = 20;
        if (y < 0.3) y = 14;
        if (y > 15) y = 0.6;
        if (z > 10) z = -88;

        this.weatherOffsets[i * 3] = x;
        this.weatherOffsets[i * 3 + 1] = y;
        this.weatherOffsets[i * 3 + 2] = z;

        this.dummy.position.set(x, y, z);
        const s = type === 'fireflies' ? 0.7 + Math.sin(timeElapsed * 5 + i) * 0.4 : 1;
        this.dummy.scale.setScalar(s);
        this.dummy.updateMatrix();
        this.weatherMesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.weatherMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose(): void {
    if (this.worldGroup) {
      this.parentScene.remove(this.worldGroup);
      this.worldGroup = null;
    }
    this.chunks = [];
    this.horizonGroup = null;
    this.animatedProps = [];
    this.weatherMesh = null;
    this.weatherConfig = null;
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.geometries = [];
    this.materials = [];
  }
}
