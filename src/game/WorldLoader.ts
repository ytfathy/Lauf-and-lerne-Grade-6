import * as THREE from 'three';
import type { WorldConfig } from './WorldConfiguration';

export interface WorldAssetBundle {
  skyTex: THREE.CanvasTexture;
  trackTex: THREE.CanvasTexture;
  trackBumpTex: THREE.CanvasTexture;
  platformTex: THREE.CanvasTexture;
  barrierTex: THREE.CanvasTexture;
  facadeTextures: THREE.CanvasTexture[];
  contactShadowTex: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

export class WorldLoader {
  public static loadWorldAssets(config: WorldConfig, maxAniso: number): WorldAssetBundle {
    const textures: THREE.Texture[] = [];
    const register = (t: THREE.CanvasTexture, isColor = true) => {
      if (isColor) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = maxAniso;
      textures.push(t);
      return t;
    };

    // 1. Rich Sky Dome Texture (gradient + clouds or stars/nebula + glowing sun/moon halo)
    const skyTex = register(this.createSkyTexture(config));

    // 2. Track Bed & Bump Relief
    const trackTex = register(this.createTrackTexture(config));
    const trackBumpTex = register(this.createBumpTexture(), false);

    // 3. Platform Paver Texture
    const platformTex = register(this.createPlatformTexture(config));

    // 4. World-Themed Barrier Chevron / Rune / Neon Texture
    const barrierTex = register(this.createBarrierTexture(config));

    // 5. World-Specific Architectural Facade Textures (3 variants)
    const facadeTextures = [
      register(this.createFacadeTexture(config, 0)),
      register(this.createFacadeTexture(config, 1)),
      register(this.createFacadeTexture(config, 2)),
    ];

    // 6. Soft Contact Shadow
    const contactShadowTex = register(this.createContactShadowTexture());

    return {
      skyTex,
      trackTex,
      trackBumpTex,
      platformTex,
      barrierTex,
      facadeTextures,
      contactShadowTex,
      dispose: () => {
        textures.forEach((t) => t.dispose());
      },
    };
  }

  private static createSkyTexture(cfg: WorldConfig): THREE.CanvasTexture {
    const [canvas, ctx] = makeCanvas(512, 512);
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, cfg.skyTopHex);
    grad.addColorStop(0.52, cfg.skyMidHex);
    grad.addColorStop(1, cfg.skyHorizonHex);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    if (cfg.isNight) {
      // Stars & cyberpunk aurora streaks
      for (let i = 0; i < 160; i++) {
        const x = (i * 97) % 512;
        const y = (i * 53) % 260;
        ctx.fillStyle = i % 5 === 0 ? '#67e8f9' : '#ffffff';
        ctx.globalAlpha = 0.4 + (i % 6) * 0.1;
        ctx.fillRect(x, y, i % 4 === 0 ? 3 : 2, i % 4 === 0 ? 3 : 2);
      }
      ctx.globalAlpha = 1;
    } else {
      // Stylized soft clouds + bright sun disc
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      for (let i = 0; i < 9; i++) {
        const cx = ((i * 89) % 440) + 36;
        const cy = 95 + ((i * 47) % 130);
        ctx.beginPath();
        ctx.ellipse(cx, cy, 48, 16, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - 22, cy + 5, 28, 12, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 22, cy + 5, 30, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  private static createTrackTexture(cfg: WorldConfig): THREE.CanvasTexture {
    const [canvas, ctx] = makeCanvas(512, 512);
    ctx.fillStyle = cfg.trackBaseHex;
    ctx.fillRect(0, 0, 512, 512);

    // Surface grain / ballast / ice crystal / cyber circuit
    for (let i = 0; i < 2400; i++) {
      const x = (i * 73) % 512;
      const y = (i * 137) % 512;
      if (cfg.id === 'futuristic_city') {
        ctx.fillStyle = i % 6 === 0 ? '#0ea5e9' : '#0f172a';
      } else if (cfg.id === 'snow_adventure') {
        ctx.fillStyle = i % 3 === 0 ? '#ffffff' : '#cbd5e1';
      } else if (cfg.id === 'ancient_egypt') {
        ctx.fillStyle = i % 3 === 0 ? '#eab308' : '#854d0e';
      } else if (cfg.id === 'tropical_jungle') {
        ctx.fillStyle = i % 4 === 0 ? '#4d7c0f' : '#3f2e21';
      } else {
        ctx.fillStyle = i % 3 === 0 ? '#8c7f70' : '#574e44';
      }
      ctx.globalAlpha = 0.45;
      ctx.fillRect(x, y, 3, 3);
    }
    ctx.globalAlpha = 1;

    // Sleepers / cross-ties / cyber energy pads
    const sleeperCount = 8;
    const spacing = 512 / sleeperCount;
    for (let i = 0; i < sleeperCount; i++) {
      const y = i * spacing + 10;
      ctx.fillStyle = cfg.sleeperHex;
      ctx.fillRect(16, y, 480, 22);
      if (cfg.id === 'futuristic_city') {
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(28, y + 8, 456, 6);
      } else if (cfg.id === 'snow_adventure') {
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillRect(22, y + 2, 468, 7);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(22, y + 3, 468, 6);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 6);
    return tex;
  }

  private static createBumpTexture(): THREE.CanvasTexture {
    const [canvas, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) {
      const x = (i * 61) % 256;
      const y = (i * 113) % 256;
      const v = 90 + (i % 90);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 3, 3);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 6);
    return tex;
  }

  private static createPlatformTexture(cfg: WorldConfig): THREE.CanvasTexture {
    const [canvas, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = cfg.platformBaseHex;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = cfg.id === 'futuristic_city' ? 'rgba(56,189,248,0.35)' : 'rgba(0,0,0,0.14)';
    ctx.lineWidth = 2;
    for (let y = 0; y <= 256; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    for (let x = 0; x <= 256; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }

    // Safety edge / neon trim along track side
    ctx.fillStyle = cfg.platformTrimHex;
    ctx.fillRect(0, 0, 20, 256);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (let y = 0; y < 256; y += 18) {
      ctx.fillRect(4, y + 3, 5, 9);
      ctx.fillRect(11, y + 3, 5, 9);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 8);
    return tex;
  }

  private static createBarrierTexture(cfg: WorldConfig): THREE.CanvasTexture {
    const [canvas, ctx] = makeCanvas(256, 128);
    ctx.fillStyle = cfg.barrierSecondaryHex;
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = cfg.barrierPrimaryHex;
    for (let x = -128; x < 384; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 32, 0);
      ctx.lineTo(x + 96, 128);
      ctx.lineTo(x + 64, 128);
      ctx.closePath();
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  private static createFacadeTexture(cfg: WorldConfig, variant: number): THREE.CanvasTexture {
    const [canvas, ctx] = makeCanvas(256, 512);

    if (cfg.id === 'ancient_egypt') {
      const walls = ['#e7c697', '#d9a05b', '#e2b878'];
      ctx.fillStyle = walls[variant % 3];
      ctx.fillRect(0, 0, 256, 512);
      // Sandstone block courses & carved hieroglyph friezes
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 3;
      for (let y = 0; y < 512; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
      }
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(0, 20, 256, 22);
      ctx.fillStyle = '#f59e0b';
      for (let x = 16; x < 240; x += 36) {
        ctx.fillRect(x, 25, 16, 12);
      }
      // Arched temple alcoves
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 2; col++) {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(36 + col * 116, 80 + row * 105, 68, 72);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(44 + col * 116, 88 + row * 105, 52, 10);
        }
      }
    } else if (cfg.id === 'futuristic_city') {
      const walls = ['#0f172a', '#1e1b4b', '#172554'];
      const neons = ['#22d3ee', '#ec4899', '#a3e635'];
      ctx.fillStyle = walls[variant % 3];
      ctx.fillRect(0, 0, 256, 512);
      const neon = neons[variant % 3];
      // Vertical glowing cyber circuit strips & holographic grid windows
      ctx.fillStyle = neon;
      ctx.fillRect(10, 0, 6, 512);
      ctx.fillRect(240, 0, 6, 512);
      for (let row = 0; row < 12; row++) {
        for (let col = 0; col < 4; col++) {
          ctx.fillStyle = (row + col) % 4 === 0 ? neon : '#38bdf8';
          ctx.globalAlpha = (row + col) % 3 === 0 ? 0.9 : 0.35;
          ctx.fillRect(28 + col * 52, 24 + row * 40, 38, 18);
        }
      }
      ctx.globalAlpha = 1;
    } else if (cfg.id === 'snow_adventure') {
      const walls = ['#64748b', '#475569', '#94a3b8'];
      ctx.fillStyle = walls[variant % 3];
      ctx.fillRect(0, 0, 256, 512);
      // Warm cozy alpine chalet windows + frosted timber beams
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 256, 26);
      ctx.fillRect(0, 245, 256, 20);
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 3; col++) {
          ctx.fillStyle = '#334155';
          ctx.fillRect(26 + col * 74, 48 + row * 64, 48, 38);
          ctx.fillStyle = '#fde68a';
          ctx.fillRect(32 + col * 74, 54 + row * 64, 36, 26);
        }
      }
    } else if (cfg.id === 'tropical_jungle') {
      const walls = ['#57534e', '#44403c', '#78716c'];
      ctx.fillStyle = walls[variant % 3];
      ctx.fillRect(0, 0, 256, 512);
      // Overgrown mossy stone blocks
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 0, 256, 48);
      ctx.fillRect(0, 220, 256, 36);
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 3; col++) {
          ctx.fillStyle = '#292524';
          ctx.fillRect(24 + col * 74, 65 + row * 72, 50, 44);
          ctx.fillStyle = '#4ade80';
          ctx.fillRect(24 + col * 74, 65 + row * 72, 50, 10);
        }
      }
    } else {
      // Modern Cairo architectural apartment facades with ornate cornices & balconies
      const walls = ['#f3dec0', '#e2e8f0', '#fbd5c6'];
      const trims = ['#b45309', '#1d4ed8', '#be123c'];
      ctx.fillStyle = walls[variant % 3];
      ctx.fillRect(0, 0, 256, 512);
      ctx.fillStyle = trims[variant % 3];
      ctx.fillRect(0, 0, 256, 18);
      ctx.fillRect(0, 244, 256, 14);
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 4; col++) {
          const wx = 22 + col * 58;
          const wy = 32 + row * 50;
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(wx - 2, wy - 2, 38, 34);
          ctx.fillStyle = (row + col) % 3 === 0 ? '#fef08a' : '#60a5fa';
          ctx.fillRect(wx, wy, 34, 30);
          // Balcony rail line
          ctx.fillStyle = trims[variant % 3];
          ctx.fillRect(wx - 4, wy + 24, 42, 6);
        }
      }
    }

    return new THREE.CanvasTexture(canvas);
  }

  private static createContactShadowTexture(): THREE.CanvasTexture {
    const [canvas, ctx] = makeCanvas(128, 128);
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(8, 12, 24, 0.55)');
    grad.addColorStop(0.6, 'rgba(8, 12, 24, 0.22)');
    grad.addColorStop(1, 'rgba(8, 12, 24, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }
}
