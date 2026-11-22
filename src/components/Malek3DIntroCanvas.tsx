import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AnimationController } from '../game/AnimationController';
import { CHARACTERS } from '../game/constants';
import { PlayerController } from '../game/PlayerController';

interface Malek3DIntroCanvasProps {
  className?: string;
  variant?: 'hero' | 'lessons';
}

function createContactShadowTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.06,
    size / 2,
    size / 2,
    size * 0.48,
  );
  grad.addColorStop(0, 'rgba(6, 20, 56, 0.52)');
  grad.addColorStop(0.55, 'rgba(6, 20, 56, 0.24)');
  grad.addColorStop(1, 'rgba(6, 20, 56, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Malek3DIntroCanvas({
  className = '',
  variant = 'hero',
}: Malek3DIntroCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = Math.max(120, container.clientWidth || 420);
    const height = Math.max(120, container.clientHeight || 560);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setSize(width, height);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 30);
    camera.position.set(0.06, 1.42, 4.65);
    camera.lookAt(0, 1.3, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const pmremTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = pmremTex;
    scene.environmentIntensity = 0.65;
    pmrem.dispose();

    // Warm Sunny Key + Cool Sky Fill + Golden Back Rim Light
    const hemi = new THREE.HemisphereLight(0xc7e6ff, 0x3f2e21, 1.1);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff4d6, 2.15);
    keyLight.position.set(2.8, 4.8, 3.8);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 14;
      keyLight.shadow.camera.left = -2;
      keyLight.shadow.camera.right = 2;
      keyLight.shadow.camera.top = 3;
      keyLight.shadow.camera.bottom = -1;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xfde68a, 1.15);
    rimLight.position.set(-2.6, 3.2, -3.2);
    scene.add(rimLight);

    // Exact In-Game Malek 3D Character Rig
    const malekDef = CHARACTERS.find((c) => c.id === 'malek') ?? CHARACTERS[0];
    const rig = PlayerController.buildCharacterRig(malekDef);
    // -Z is character forward; rotating PI + 0.34 faces viewer & angles warmly toward menu buttons on the right
    const baseYaw = Math.PI + 0.34;
    rig.root.rotation.y = baseYaw;
    scene.add(rig.root);

    const eyeGroups: THREE.Object3D[] = [];
    rig.headGroup.traverse((child) => {
      if (child.name === 'eyeGroup') {
        eyeGroups.push(child);
      }
    });

    // Soft Grounded Contact Shadow Under Sneakers
    const shadowTex = createContactShadowTexture();
    const contactShadowGeo = new THREE.CircleGeometry(0.68, 24);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex ?? undefined,
      color: shadowTex ? 0xffffff : 0x061438,
      transparent: true,
      opacity: shadowTex ? 0.72 : 0.32,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.015;
    scene.add(contactShadow);

    const animController = new AnimationController();
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;

    const resizeToContainer = () => {
      if (disposed) return;
      const w = Math.max(120, container.clientWidth);
      const h = Math.max(120, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };

    const resizeObserver = new ResizeObserver(resizeToContainer);
    resizeObserver.observe(container);
    window.addEventListener('resize', resizeToContainer);

    const stepAndRender = () => {
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      elapsed += dt;

      // Natural cheerful hero idle + friendly periodic wave on the right arm
      const cycle = elapsed % 5.2;
      const isWaving = variant === 'hero' ? cycle > 1.0 && cycle < 2.5 : cycle > 0.6 && cycle < 2.2;
      animController.updatePose(
        rig,
        isWaving ? 'victory' : 'idle',
        dt,
        0,
        0,
        1,
        1,
      );

      // Gentle friendly 3/4 turn sway
      rig.root.rotation.y = baseYaw + Math.sin(elapsed * 1.15) * 0.09;

      // Natural periodic 3D eye blink every ~3.4s
      const blinkPhase = elapsed % 3.4;
      let eyeScaleY = 1;
      if (blinkPhase > 3.24) {
        const t = (blinkPhase - 3.24) / 0.16;
        eyeScaleY = 1 - Math.sin(t * Math.PI) * 0.88;
      }
      for (const eg of eyeGroups) {
        eg.scale.y = Math.max(0.1, eyeScaleY);
      }

      renderer.render(scene, camera);
    };

    const afterDraw = (cb: () => void) => {
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
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      stepAndRender();
      if (disposed) return;
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    // Render immediate first frame cleanly
    stepAndRender();
    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeToContainer);
      rig.dispose();
      contactShadowGeo.dispose();
      contactShadowMat.dispose();
      if (shadowTex) shadowTex.dispose();
      pmremTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [variant]);

  return (
    <div
      ref={mountRef}
      role="img"
      aria-label="Malek 3D Charakter"
      data-testid="malek-3d-intro"
      className={`relative w-full h-full pointer-events-none select-none ${className}`}
    />
  );
}
