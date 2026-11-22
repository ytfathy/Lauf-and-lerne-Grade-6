import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Check, Compass, Globe, Lock, RotateCw, Sparkles, X } from 'lucide-react';
import { WORLD_CONFIGS, WORLD_LIST, type WorldConfig } from '../game/WorldConfiguration';
import { GAME_TITLE } from '../game/constants';
import type { SaveData, WorldId } from '../game/types';
import { CoinIcon, GemIcon } from './GameIcons';

interface WorldSelectorProps {
  save: SaveData;
  onSelectOrUnlockWorld: (id: WorldId) => void;
  onClose: () => void;
}

function buildMiniDiorama(cfg: WorldConfig): THREE.Group {
  const group = new THREE.Group();

  // Base platform disc
  const baseGeo = new THREE.CylinderGeometry(3.4, 3.6, 0.35, 32);
  const baseMat = new THREE.MeshStandardMaterial({ color: cfg.groundColor, roughness: 0.85 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = -0.18;
  group.add(base);

  // Track strip & 2 rails
  const track = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.08, 6.2),
    new THREE.MeshStandardMaterial({ color: cfg.sleeperHex, roughness: 0.8 }),
  );
  track.position.y = 0.02;
  group.add(track);

  const railMat = new THREE.MeshStandardMaterial({
    color: cfg.railColor,
    emissive: cfg.railEmissive,
    emissiveIntensity: cfg.id === 'futuristic_city' ? 0.9 : 0.25,
    metalness: 0.8,
    roughness: 0.2,
  });
  for (const rx of [-0.55, 0.55]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 6.1), railMat);
    rail.position.set(rx, 0.09, 0);
    group.add(rail);
  }

  // Mini signature train
  const tStyle = cfg.trainStyles[0];
  const train = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 1.05, 2.8),
    new THREE.MeshStandardMaterial({
      color: tStyle.bodyColor,
      roughness: 0.3,
      metalness: tStyle.isMaglev ? 0.65 : 0.2,
    }),
  );
  hull.position.y = 0.68;
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.18, 2.82),
    new THREE.MeshStandardMaterial({
      color: tStyle.stripeColor,
      emissive: tStyle.isMaglev ? tStyle.stripeColor : 0x000000,
      emissiveIntensity: 0.7,
    }),
  );
  stripe.position.y = 0.5;
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.2, 2.5),
    new THREE.MeshStandardMaterial({ color: tStyle.roofColor, roughness: 0.35 }),
  );
  roof.position.y = 1.28;
  train.add(hull, stripe, roof);
  train.position.set(0, 0, 0.35);
  group.add(train);

  // World-specific signature landmarks around track
  if (cfg.id === 'ancient_egypt') {
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xe6b86a, roughness: 0.85 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.8 });
    const pyr = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 4), sandMat);
    pyr.rotation.y = Math.PI / 4;
    pyr.position.set(-1.7, 1.1, -1.3);
    const ob = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2.4, 4), sandMat);
    ob.rotation.y = Math.PI / 4;
    ob.position.set(1.75, 1.2, -0.6);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.45, 4), goldMat);
    tip.rotation.y = Math.PI / 4;
    tip.position.set(1.75, 2.6, -0.6);
    group.add(pyr, ob, tip);
  } else if (cfg.id === 'modern_cairo') {
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xe2d5be, roughness: 0.55 });
    const bMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.65 });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 3.2, 10), towerMat);
    tower.position.set(1.75, 1.6, -1.2);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.25, 0.4, 12), towerMat);
    crown.position.set(1.75, 3.3, -1.2);
    const bldg = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.1, 1.3), bMat);
    bldg.position.set(-1.85, 1.05, -0.9);
    group.add(tower, crown, bldg);
  } else if (cfg.id === 'tropical_jungle') {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.35 });
    for (const [tx, tz] of [[-1.8, -0.9], [1.85, -1.2]]) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 1.9, 8), trunkMat);
      trunk.position.set(tx, 0.95, tz);
      const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 1), leafMat);
      canopy.position.set(tx, 2.15, tz);
      group.add(trunk, canopy);
    }
    const cliff = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 1.2), new THREE.MeshStandardMaterial({ color: 0x57534e }));
    cliff.position.set(0, 1.2, -2.1);
    const falls = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.3, 0.15), waterMat);
    falls.position.set(0, 1.15, -1.46);
    group.add(cliff, falls);
  } else if (cfg.id === 'snow_adventure') {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.75 });
    const mtn = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.9, 6), rockMat);
    mtn.position.set(-1.6, 1.45, -1.3);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.3, 6), snowMat);
    cap.position.set(-1.6, 2.28, -1.3);
    const pine = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.8, 8), pineMat);
    pine.position.set(1.8, 1.0, -0.8);
    const pineCap = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.9, 8), snowMat);
    pineCap.position.set(1.8, 1.55, -0.8);
    group.add(mtn, cap, pine, pineCap);
  } else {
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.8 });
    const cyanMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const pinkMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.0, 1.1), darkMat);
    t1.position.set(-1.8, 1.5, -1.1);
    const n1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.2, 0.16), cyanMat);
    n1.position.set(-1.25, 1.6, -0.55);
    const t2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.5, 1.1), darkMat);
    t2.position.set(1.85, 1.25, -0.9);
    const n2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.7, 0.16), pinkMat);
    n2.position.set(1.3, 1.35, -0.35);
    const car = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.45), cyanMat);
    car.position.set(0.3, 2.6, -0.4);
    group.add(t1, n1, t2, n2, car);
  }

  return group;
}

export function WorldSelector({ save, onSelectOrUnlockWorld, onClose }: WorldSelectorProps) {
  const [previewWorldId, setPreviewWorldId] = useState<WorldId>(save.selectedWorldId);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const yawRef = useRef<number>(0.45);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const dioramaRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const requestRenderRef = useRef<() => void>(() => {});

  const previewCfg = WORLD_CONFIGS[previewWorldId];
  const owned = save.unlockedWorlds.includes(previewWorldId);
  const isActive = save.selectedWorldId === previewWorldId;
  const canAfford = save.totalCoins >= previewCfg.unlockCost;

  // Lightweight single-canvas 3D World Diorama previewer
  useEffect(() => {
    const mount = stageRef.current;
    if (!mount) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const w = mount.clientWidth || 420;
    const h = mount.clientHeight || 240;
    const renderer = new THREE.WebGLRenderer({ antialias: !isSoftwareGl, alpha: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    camera.position.set(0, 3.6, 7.6);
    camera.lookAt(0, 1.0, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 1.25);
    const sun = new THREE.DirectionalLight(0xfff5d6, 2.0);
    sun.position.set(5, 9, 7);
    scene.add(hemi, sun);

    let disposed = false;
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;

    const renderFrame = () => {
      if (disposed) return;
      if (dioramaRef.current) {
        dioramaRef.current.rotation.y = yawRef.current;
      }
      renderer.render(scene, camera);
    };

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        renderFrame();
        if (isSoftwareGl) {
          const gl = renderer.getContext() as WebGL2RenderingContext;
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl.flush();
          const poll = () => {
            if (disposed) {
              if (sync) gl.deleteSync(sync);
              return;
            }
            const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
            if (state === gl.UNSIGNALED) {
              frameId = window.setTimeout(poll, 5);
            } else {
              if (sync) gl.deleteSync(sync);
              frameId = window.setTimeout(() => {
                renderBusy = false;
                if (renderDirty) requestRender();
              }, 60);
            }
          };
          frameId = window.setTimeout(poll, 5);
        } else {
          renderBusy = false;
          if (renderDirty) requestRender();
        }
      });
    };
    requestRenderRef.current = requestRender;

    const onResize = () => {
      if (!mount || disposed) return;
      const nw = mount.clientWidth || 420;
      const nh = Math.max(180, mount.clientHeight || 240);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      requestRender();
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      if (dioramaRef.current) {
        scene.remove(dioramaRef.current);
        dioramaRef.current.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, []);

  // Swap mini 3D diorama whenever user selects a different world card
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (dioramaRef.current) {
      scene.remove(dioramaRef.current);
      dioramaRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }
    const cfg = WORLD_CONFIGS[previewWorldId];
    scene.background = new THREE.Color(cfg.fogColor);
    const diorama = buildMiniDiorama(cfg);
    dioramaRef.current = diorama;
    scene.add(diorama);
    requestRenderRef.current();
  }, [previewWorldId]);

  const rotateDiorama = (delta: number) => {
    yawRef.current += delta;
    requestRenderRef.current();
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#040f2c]/88 p-3 sm:p-6"
      role="dialog"
      aria-label="World Selection"
    >
      <div className="w-full max-w-5xl bg-[#092864] border-4 border-sky-400 rounded-3xl p-4 sm:p-6 shadow-2xl max-h-[94vh] overflow-y-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 leading-none mb-0.5">
                {GAME_TITLE}
              </div>
              <h2 className="text-2xl font-black text-white leading-tight">Explore 5 Worlds</h2>
              <p className="text-xs sm:text-sm text-sky-200">
                Inspect each 3D world environment, landmarks, and railway atmosphere
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-[#061842] border-2 border-sky-400/60 rounded-2xl px-3 py-1.5">
              <div className="flex items-center gap-1 pr-2 border-r border-sky-400/30">
                <CoinIcon className="w-4 h-4" />
                <span className="tabular-nums font-black text-yellow-300">{save.totalCoins}</span>
              </div>
              <div className="flex items-center gap-1">
                <GemIcon className="w-4 h-4" />
                <span className="tabular-nums font-black text-sky-300">{save.totalGems}</span>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close Worlds"
              onClick={onClose}
              className="w-11 h-11 rounded-2xl bg-rose-600 hover:bg-rose-500 border-2 border-rose-300 flex items-center justify-center text-white shadow cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Grid: Left 3D Live World Preview | Right 5 World Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Interactive 3D Diorama Preview Panel */}
          <div className="lg:col-span-5 bg-[#061842] border-2 border-sky-400/60 rounded-2xl p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300">
                  <Compass className="w-4 h-4" />
                  <span>{previewCfg.shortTag}</span>
                </span>
                <button
                  type="button"
                  aria-label="Rotate World Diorama"
                  onClick={() => rotateDiorama(0.85)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-700 hover:bg-sky-600 border border-sky-300/60 text-xs font-bold text-white cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate 3D</span>
                </button>
              </div>

              <div
                ref={stageRef}
                data-testid="world-preview-canvas"
                onPointerDown={(e) => {
                  draggingRef.current = true;
                  lastXRef.current = e.clientX;
                }}
                onPointerMove={(e) => {
                  if (!draggingRef.current) return;
                  const dx = e.clientX - lastXRef.current;
                  lastXRef.current = e.clientX;
                  rotateDiorama(dx * 0.015);
                }}
                onPointerUp={() => {
                  draggingRef.current = false;
                }}
                onPointerLeave={() => {
                  draggingRef.current = false;
                }}
                className="w-full h-52 sm:h-60 rounded-2xl overflow-hidden border-2 border-sky-300/60 cursor-grab active:cursor-grabbing shadow-inner mb-3"
              />

              <h3 className="text-2xl font-black text-white mb-1">{previewCfg.name}</h3>
              <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed mb-3">
                {previewCfg.description}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {previewCfg.atmosphereTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg bg-sky-900/90 border border-sky-400/40 text-[11px] font-extrabold text-sky-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={!owned && !canAfford}
              onClick={() => {
                onSelectOrUnlockWorld(previewWorldId);
              }}
              className={`w-full py-3.5 rounded-2xl font-black text-base border-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                isActive
                  ? 'bg-emerald-600 border-emerald-300 text-white'
                  : owned
                  ? 'bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 border-amber-200 text-slate-950 shadow-[0_4px_0_#92400e]'
                  : 'bg-gradient-to-b from-sky-400 to-sky-600 border-sky-200 text-white'
              }`}
            >
              {isActive ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Active World · Ready to Run</span>
                </>
              ) : owned ? (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Select &amp; Enter {previewCfg.name}</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Unlock for {previewCfg.unlockCost} Coins</span>
                </>
              )}
            </button>
          </div>

          {/* 5 Visual World Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
            {WORLD_LIST.map((w, idx) => {
              const wOwned = save.unlockedWorlds.includes(w.id);
              const wSelected = save.selectedWorldId === w.id;
              const wPreviewing = previewWorldId === w.id;
              const isFullSpan = idx === WORLD_LIST.length - 1;
              return (
                <button
                  key={w.id}
                  type="button"
                  data-world-card={w.id}
                  onClick={() => {
                    setPreviewWorldId(w.id);
                    if (wOwned) {
                      onSelectOrUnlockWorld(w.id);
                    }
                  }}
                  className={`text-left rounded-2xl border-2 p-3.5 transition-all cursor-pointer flex flex-col gap-2.5 ${
                    isFullSpan ? 'sm:col-span-2' : ''
                  } ${
                    wPreviewing
                      ? 'bg-sky-700/85 border-amber-300 shadow-lg'
                      : 'bg-[#061842] hover:bg-sky-900/70 border-sky-500/40'
                  }`}
                >
                  <div
                    className="w-full h-16 rounded-xl border border-white/40 relative overflow-hidden flex items-end p-2.5"
                    style={{ background: w.previewGradient }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-black text-base text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                        {w.name}
                      </span>
                      {wSelected ? (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase">
                          Active
                        </span>
                      ) : !wOwned ? (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-900/85 text-amber-300 text-[10px] font-black">
                          {w.unlockCost}c
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                      {w.shortTag}
                    </div>
                    <p className="text-xs text-sky-100/85 line-clamp-2 mt-0.5">{w.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
