import * as THREE from 'three';
import type { CharacterDef } from './types';
import type { ArticulatedCharacterRig } from './AnimationController';

function createFabricWeaveTexture(tintHex: number, contrast = 0.08): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const base = new THREE.Color(tintHex);
  const r = Math.round(base.r * 255);
  const g = Math.round(base.g * 255);
  const b = Math.round(base.b * 255);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, size, size);

  const delta = Math.round(255 * contrast);
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const checker = ((x + y) / 2) % 2 === 0 ? 1 : -1;
      const nr = Math.max(0, Math.min(255, r + checker * delta));
      const ng = Math.max(0, Math.min(255, g + checker * delta));
      const nb = Math.max(0, Math.min(255, b + checker * delta));
      ctx.fillStyle = `rgb(${nr},${ng},${nb})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addDaisyFlower(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  scale: number,
  rotY = 0,
  petalMat: THREE.Material,
  centerMat: THREE.Material,
): void {
  const flower = new THREE.Group();
  flower.position.set(x, y, z);
  flower.rotation.y = rotY;
  flower.scale.setScalar(scale);

  const petalGeo = new THREE.SphereGeometry(0.036, 10, 8);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Mesh(petalGeo, petalMat);
    p.position.set(Math.cos(a) * 0.048, Math.sin(a) * 0.048, 0);
    p.scale.set(1, 1, 0.55);
    flower.add(p);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), centerMat);
  core.position.z = 0.012;
  core.scale.set(1, 1, 0.65);
  flower.add(core);
  parent.add(flower);
}

function addSunglasses(
  parent: THREE.Object3D,
  y: number,
  z: number,
  rotX: number,
  frameMat: THREE.Material,
  lensMat: THREE.Material,
  shineMat: THREE.Material,
): void {
  const glasses = new THREE.Group();
  glasses.position.set(0, y, z);
  glasses.rotation.x = rotX;

  for (const sx of [-1, 1]) {
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.016, 10, 20), frameMat);
    frame.position.set(sx * 0.115, 0, 0);
    frame.scale.set(1.12, 0.86, 1);

    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 10), lensMat);
    lens.position.set(sx * 0.115, 0, -0.005);
    lens.scale.set(1.08, 0.82, 0.28);

    const glint = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.014, 0.01), shineMat);
    glint.position.set(sx * 0.115 - 0.02, 0.025, -0.026);
    glint.rotation.z = 0.45;

    const temple = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.2, 4, 8), frameMat);
    temple.rotation.x = Math.PI / 2;
    temple.position.set(sx * 0.21, 0.005, 0.11);

    glasses.add(frame, lens, glint, temple);
  }

  const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.055, 4, 8), frameMat);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, 0.015, 0);
  glasses.add(bridge);
  parent.add(glasses);
}

export class PlayerController {
  public static buildCharacterRig(def: CharacterDef): ArticulatedCharacterRig {
    const root = new THREE.Group();
    const hipsGroup = new THREE.Group();
    hipsGroup.position.y = 0.96;
    root.add(hipsGroup);

    const texturesToDispose: THREE.Texture[] = [];
    const hitFlashMaterials: THREE.MeshStandardMaterial[] = [];
    const track = <T extends THREE.MeshStandardMaterial>(m: T): T => {
      hitFlashMaterials.push(m);
      return m;
    };

    const jacketTex = createFabricWeaveTexture(def.jacketColor, 0.055);
    const pantsTex = createFabricWeaveTexture(def.pantsColor, 0.05);
    if (jacketTex) texturesToDispose.push(jacketTex);
    if (pantsTex) texturesToDispose.push(pantsTex);

    const jacketMat = track(
      new THREE.MeshPhysicalMaterial({
        color: jacketTex ? 0xffffff : def.jacketColor,
        map: jacketTex ?? null,
        roughness: 0.72,
        metalness: 0.02,
        sheen: 0.24,
        sheenRoughness: 0.85,
        sheenColor: new THREE.Color(def.jacketColor).lerp(new THREE.Color(0xffffff), 0.35),
      }),
    );
    const shirtMat = track(
      new THREE.MeshPhysicalMaterial({
        color: def.shirtColor,
        roughness: 0.62,
        sheen: 0.16,
        sheenColor: new THREE.Color(0xffffff),
      }),
    );
    const pantsMat = track(
      new THREE.MeshPhysicalMaterial({
        color: pantsTex ? 0xffffff : def.pantsColor,
        map: pantsTex ?? null,
        roughness: 0.76,
        sheen: 0.16,
        sheenRoughness: 0.88,
      }),
    );
    const skinMat = track(
      new THREE.MeshPhysicalMaterial({
        color: def.skinColor,
        roughness: 0.46,
        metalness: 0.0,
        sheen: 0.26,
        sheenRoughness: 0.7,
        sheenColor: new THREE.Color(0xffb894),
      }),
    );
    const accentMat = track(
      new THREE.MeshPhysicalMaterial({
        color: def.accentColor,
        roughness: 0.34,
        metalness: 0.14,
        clearcoat: 0.22,
      }),
    );
    const hairMat = track(
      new THREE.MeshPhysicalMaterial({
        color: def.hairColor,
        roughness: 0.56,
        sheen: 0.32,
        sheenRoughness: 0.6,
        sheenColor: new THREE.Color(def.hairColor).lerp(new THREE.Color(0xfff1e6), 0.4),
      }),
    );
    const shoeMat = track(
      new THREE.MeshPhysicalMaterial({
        color: def.shoeColor,
        roughness: 0.3,
        metalness: 0.06,
        clearcoat: 0.45,
        clearcoatRoughness: 0.24,
      }),
    );
    const whiteMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.38,
        clearcoat: 0.18,
      }),
    );
    const packMat = track(
      new THREE.MeshPhysicalMaterial({
        color: def.backpackColor,
        roughness: 0.58,
        sheen: 0.2,
      }),
    );
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.22, metalness: 0.8 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });

    const isSturdy = def.bodyBuild === 'sturdy';
    const torsoW = isSturdy ? 1.24 : 1.02;
    const torsoD = isSturdy ? 1.12 : 0.84;
    const shoulderX = isSturdy ? 0.41 : 0.34;
    const hipX = isSturdy ? 0.185 : 0.155;

    // Rounded Pixar Pelvis / Shorts Waistband
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.295, 18, 14), pantsMat);
    pelvis.scale.set(torsoW * 0.96, 0.58, torsoD * 0.92);
    pelvis.castShadow = true;
    hipsGroup.add(pelvis);

    // Torso Group (rotates independently at waist)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 0.08;
    hipsGroup.add(torsoGroup);

    // Soft Rounded Pixar Torso Jacket / Hoodie
    const torsoCore = new THREE.Mesh(new THREE.CapsuleGeometry(0.275, 0.34, 8, 18), jacketMat);
    torsoCore.position.y = 0.34;
    torsoCore.scale.set(torsoW, 1.0, torsoD);
    torsoCore.castShadow = true;
    torsoGroup.add(torsoCore);

    // Flush Ribbed Hem / Waistband
    const waistTrim = new THREE.Mesh(
      new THREE.TorusGeometry(0.245, 0.036, 10, 20),
      def.outfitStyle === 'varsity' ? accentMat : jacketMat,
    );
    waistTrim.rotation.x = Math.PI / 2;
    waistTrim.position.y = 0.1;
    waistTrim.scale.set(torsoW * 0.98, torsoD * 1.0, 1);
    torsoGroup.add(waistTrim);

    // Neckline Collar
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.048, 10, 20),
      def.outfitStyle === 'varsity' ? whiteMat : jacketMat,
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.66, 0);
    torsoGroup.add(collar);

    // Outfit Style Details (-Z is forward!)
    if (def.outfitStyle === 'varsity') {
      // Crisp white inner tee panel & chest 'M' crest
      const shirtFront = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.34, 6, 12), shirtMat);
      shirtFront.position.set(0, 0.35, -0.205 * torsoD);
      shirtFront.scale.set(1.0, 1.0, 0.32);
      torsoGroup.add(shirtFront);

      const badgeBg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 14), accentMat);
      badgeBg.rotation.x = Math.PI / 2;
      badgeBg.position.set(0.15, 0.45, -0.23 * torsoD);
      torsoGroup.add(badgeBg);
    } else if (def.outfitStyle === 'zipper_jacket') {
      // Crisp white inner tee + metallic silver zipper seam + raised collar
      const shirtFront = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.32, 6, 12), shirtMat);
      shirtFront.position.set(0, 0.36, -0.21 * torsoD);
      shirtFront.scale.set(0.95, 1.0, 0.3);
      const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.48, 0.025), silverMat);
      zipper.position.set(0, 0.33, -0.245 * torsoD);
      const pull = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.05, 0.03), silverMat);
      pull.position.set(0, 0.56, -0.258 * torsoD);
      torsoGroup.add(shirtFront, zipper, pull);
    } else {
      // Cozy Hoodie: Kangaroo front pocket + white drawstrings + folded back hood
      const pocket = new THREE.Mesh(
        new THREE.BoxGeometry(0.32 * torsoW, 0.16, 0.06),
        jacketMat,
      );
      pocket.position.set(0, 0.21, -0.25 * torsoD);
      const pocketTrim = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.012, 0.28 * torsoW, 4, 8),
        shirtMat,
      );
      pocketTrim.rotation.z = Math.PI / 2;
      pocketTrim.position.set(0, 0.29, -0.27 * torsoD);
      torsoGroup.add(pocket, pocketTrim);

      for (const sx of [-0.06, 0.06]) {
        const string = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.16, 4, 8), whiteMat);
        string.position.set(sx, 0.55, -0.245 * torsoD);
        string.rotation.z = sx * 0.6;
        torsoGroup.add(string);
      }
    }

    // Back Hood Roll (on hoodies and zip jackets)
    if (def.outfitStyle !== 'varsity') {
      const backHood = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.075, 10, 18, Math.PI * 1.25), jacketMat);
      backHood.position.set(0, 0.66, 0.09);
      backHood.rotation.set(Math.PI * 0.42, 0, Math.PI * 0.875);
      torsoGroup.add(backHood);
    }

    // Sculpted Rounded Backpack (+Z back) with Straps & Signature Emblem
    const packGroup = new THREE.Group();
    packGroup.position.set(0, 0.36, 0.24 * torsoD + 0.08);
    const packBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.16, 8, 16), packMat);
    packBody.scale.set(isSturdy ? 1.15 : 1.0, 1.05, 0.68);
    packBody.castShadow = true;
    const packPocket = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.06, 6, 12), packMat);
    packPocket.position.set(0, -0.07, 0.11);
    packPocket.scale.set(1.15, 0.9, 0.65);
    const packZip = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.016, 6, 14, Math.PI), accentMat);
    packZip.position.set(0, 0.09, 0.1);
    const packHandle = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 6, 12, Math.PI), packMat);
    packHandle.position.set(0, 0.26, 0);
    packGroup.add(packBody, packPocket, packZip, packHandle);

    // Backpack Shoulder Straps wrapping torso front
    for (const sx of [-0.15 * torsoW, 0.15 * torsoW]) {
      const strap = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.028, 6, 16, Math.PI * 1.05),
        packMat,
      );
      strap.rotation.y = Math.PI / 2;
      strap.rotation.z = -Math.PI * 0.45;
      strap.position.set(sx, 0.42, 0.02);
      strap.scale.set(1.15 * torsoD, 1.1, 1);
      torsoGroup.add(strap);
    }

    // Signature Emblem on Backpack (+Z outward)
    if (def.backpackEmblem === 'flower') {
      addDaisyFlower(packGroup, 0, -0.05, 0.195, 1.35, 0, whiteMat, accentMat);
    } else if (def.backpackEmblem === 'cross') {
      for (const rot of [Math.PI / 4, -Math.PI / 4]) {
        const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.14, 4, 8), accentMat);
        bar.position.set(0, -0.05, 0.195);
        bar.rotation.z = rot;
        packGroup.add(bar);
      }
    } else {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), accentMat);
      star.scale.set(1, 1, 0.45);
      star.position.set(0, -0.05, 0.195);
      packGroup.add(star);
    }
    torsoGroup.add(packGroup);

    // Short Soft Neck + Pixar Stylized Head Group
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.14, 14), skinMat);
    neck.position.y = 0.72;
    torsoGroup.add(neck);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.78, 0);
    torsoGroup.add(headGroup);

    // Appealing Pixar Cranium + Plump Rounded Lower Cheeks / Jaw
    const headScale = isSturdy ? 1.1 : 1.05;
    const headVisual = new THREE.Group();
    headVisual.scale.setScalar(headScale);
    headGroup.add(headVisual);

    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.355, 28, 22), skinMat);
    cranium.position.y = 0.31;
    cranium.scale.set(1.0, 1.03, 0.98);
    cranium.castShadow = true;
    const jawCheeks = new THREE.Mesh(new THREE.SphereGeometry(0.315, 24, 18), skinMat);
    jawCheeks.position.set(0, 0.21, -0.035);
    jawCheeks.scale.set(1.05, 0.84, 0.98);
    headVisual.add(cranium, jawCheeks);

    // Soft Rounded Ears
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), skinMat);
      ear.position.set(sx * 0.34, 0.27, 0.02);
      ear.scale.set(0.55, 1.0, 0.82);
      headVisual.add(ear);
      if (def.longHair) {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), whiteMat);
        stud.position.set(sx * 0.35, 0.215, -0.01);
        headVisual.add(stud);
      }
    }

    // Large Expressive Pixar Cartoon Eyes (-Z Forward)
    const eyeWhiteMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.14, clearcoat: 0.7 });
    const irisMat = new THREE.MeshStandardMaterial({ color: 0x5c2f14, roughness: 0.18 });
    const irisGlossMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lashMat = new THREE.MeshStandardMaterial({ color: 0x22120a, roughness: 0.4 });
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xf46078, transparent: true, opacity: 0.26 });

    for (const sx of [-1, 1]) {
      const eyeGroup = new THREE.Group();
      eyeGroup.name = 'eyeGroup';
      eyeGroup.position.set(sx * 0.118, 0.31, -0.295);
      eyeGroup.rotation.y = -sx * 0.12;

      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.084, 16, 14), eyeWhiteMat);
      sclera.scale.set(0.95, 1.18, 0.58);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 12), irisMat);
      iris.position.set(-sx * 0.005, -0.002, -0.026);
      iris.scale.set(0.96, 1.12, 0.56);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), darkMat);
      pupil.position.set(-sx * 0.005, -0.002, -0.048);
      pupil.scale.set(0.96, 1.12, 0.45);

      // Dual Pixar Catchlights
      const glintMain = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), irisGlossMat);
      glintMain.position.set(-sx * 0.005 + 0.022, 0.022, -0.058);
      const glintSub = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 6), irisGlossMat);
      glintSub.position.set(-sx * 0.005 - 0.018, -0.02, -0.056);

      // Curved Upper Eyelid & Eyelashes
      const lashArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.08, def.hasEyelashes ? 0.013 : 0.009, 8, 16, Math.PI * 0.92),
        lashMat,
      );
      lashArc.position.set(0, 0.014, -0.014);
      lashArc.rotation.z = Math.PI * 0.04;
      lashArc.scale.set(1.0, 1.15, 0.75);

      if (def.hasEyelashes) {
        const wing = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.028, 4, 6), lashMat);
        wing.position.set(sx * 0.076, 0.044, -0.012);
        wing.rotation.z = sx * 0.72;
        eyeGroup.add(wing);
      }

      eyeGroup.add(sclera, iris, pupil, glintMain, glintSub, lashArc);
      headVisual.add(eyeGroup);

      // Expressive Curved Pixar Eyebrows
      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.092, 4, 8), lashMat);
      brow.position.set(sx * 0.122, 0.435, -0.312);
      brow.rotation.z = Math.PI / 2 - sx * 0.14;
      brow.rotation.y = -sx * 0.16;
      headVisual.add(brow);

      // Subtle Warm Rosy Cheeks
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 10), blushMat);
      cheek.position.set(sx * 0.2, 0.215, -0.282);
      cheek.scale.set(1.2, 0.72, 0.36);
      headVisual.add(cheek);
    }

    // Soft Cute Pixar Button Nose + Friendly Grin & Rounded Teeth
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.044, 14, 12), skinMat);
    nose.position.set(0, 0.242, -0.354);
    nose.scale.set(1.08, 0.86, 0.94);

    const lipMat = new THREE.MeshStandardMaterial({ color: 0xc2695b, roughness: 0.44 });
    const innerMouthMat = new THREE.MeshBasicMaterial({ color: 0x6b1717 });

    const smileCurve = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.0085, 8, 18, Math.PI * 0.92), lipMat);
    smileCurve.position.set(0, 0.166, -0.328);
    smileCurve.rotation.z = Math.PI * 1.04;
    const smileBg = new THREE.Mesh(new THREE.SphereGeometry(0.054, 12, 8), innerMouthMat);
    smileBg.position.set(0, 0.15, -0.314);
    smileBg.scale.set(1.26, 0.56, 0.34);
    const teeth = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.072, 4, 8), eyeWhiteMat);
    teeth.rotation.z = Math.PI / 2;
    teeth.position.set(0, 0.158, -0.326);
    teeth.scale.set(0.75, 1.0, 0.42);
    headVisual.add(nose, smileBg, teeth, smileCurve);

    // Hair, Hijabs, Caps & Glasses
    if (def.headwear === 'hijab_pink' || def.headwear === 'hijab_white') {
      const hijabMainMat = hairMat;
      const hijabTrimMat = def.headwear === 'hijab_white' ? jacketMat : whiteMat;

      // Positioned well behind face plane (z = +0.135, scale.z = 0.84 -> front Z = -0.20)
      // so the entire face window stays 100% open & unobstructed!
      const hoodOuter = new THREE.Mesh(new THREE.SphereGeometry(0.395, 26, 20), hijabMainMat);
      hoodOuter.position.set(0, 0.325, 0.135);
      hoodOuter.scale.set(1.03, 1.04, 0.84);

      const hoodTopCrown = new THREE.Mesh(new THREE.SphereGeometry(0.37, 22, 16), hijabMainMat);
      hoodTopCrown.position.set(0, 0.39, 0.03);
      hoodTopCrown.scale.set(0.98, 0.9, 0.78);

      // Soft Layered Front Scarf Ring Framing Forehead, Cheeks & Chin
      const faceWrap = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.058, 14, 28), hijabMainMat);
      faceWrap.position.set(0, 0.285, -0.155);
      faceWrap.rotation.x = -0.16;
      faceWrap.scale.set(0.96, 1.12, 0.85);

      // Subtle inner headband fold along top forehead edge
      const innerBand = new THREE.Mesh(
        new THREE.TorusGeometry(0.275, 0.022, 8, 22, Math.PI * 0.92),
        hijabTrimMat,
      );
      innerBand.position.set(0, 0.305, -0.195);
      innerBand.rotation.z = Math.PI * 0.04;

      // Neck & Collarbone Scarf Drape (neatly below chin!)
      const neckWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.37, 0.28, 18), hijabMainMat);
      neckWrap.position.set(0, -0.01, 0.04);
      const chestDrape = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 10, 20), hijabMainMat);
      chestDrape.rotation.x = Math.PI / 2 - 0.18;
      chestDrape.position.set(0, -0.06, -0.02);
      chestDrape.scale.set(1.02, 0.95, 1.0);

      headVisual.add(hoodOuter, hoodTopCrown, faceWrap, innerBand, neckWrap, chestDrape);

      // Neso's Stylish Sunglasses Resting on Hijab Crown
      if (def.headwear === 'hijab_pink') {
        const glassFrameMat = new THREE.MeshPhysicalMaterial({ color: 0x1e293b, roughness: 0.2, clearcoat: 0.8 });
        const glassLensMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.4, clearcoat: 1.0 });
        addSunglasses(headVisual, 0.68, -0.12, -0.36, glassFrameMat, glassLensMat, eyeWhiteMat);
      }
    } else {
      // Plush Pixar Stylized Hair Volume
      const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(0.372, 22, 18), hairMat);
      hairCrown.position.set(0, 0.365, 0.08);
      hairCrown.scale.set(1.02, 1.0, 1.0);
      headVisual.add(hairCrown);

      // Tousled Front Swooping Curls & Sideburns (kept above eyebrow line y >= 0.49!)
      const curls: Array<[number, number, number, number, number, number]> = [
        [-0.17, 0.59, -0.15, 0.13, 1.1, 0.85],
        [0.0, 0.64, -0.17, 0.145, 1.15, 0.88],
        [0.18, 0.58, -0.14, 0.125, 1.05, 0.85],
        [-0.27, 0.46, -0.04, 0.125, 0.92, 1.05],
        [0.27, 0.46, -0.04, 0.125, 0.92, 1.05],
        [0.0, 0.56, 0.14, 0.17, 1.1, 1.0],
        [-0.22, 0.29, 0.16, 0.15, 0.9, 1.1],
        [0.22, 0.29, 0.16, 0.15, 0.9, 1.1],
      ];
      for (const [cx, cy, cz, cr, sx, sy] of curls) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(cr, 12, 10), hairMat);
        puff.position.set(cx, cy, cz);
        puff.scale.set(sx, sy, 1);
        headVisual.add(puff);
      }

      // Laila's Long Cascading Wavy Locks Over Shoulders & Back
      if (def.longHair) {
        const backCascade = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.42, 8, 16), hairMat);
        backCascade.position.set(0, 0.05, 0.22);
        backCascade.scale.set(1.25, 1.05, 0.68);
        headVisual.add(backCascade);

        for (const sx of [-1, 1]) {
          for (let seg = 0; seg < 4; seg++) {
            const waveX = sx * (0.28 + (seg % 2) * 0.035);
            const waveY = 0.22 - seg * 0.145;
            const waveZ = 0.04 - seg * 0.02;
            const r = 0.115 - seg * 0.01;
            const lock = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), hairMat);
            lock.position.set(waveX, waveY, waveZ);
            lock.scale.set(0.88, 1.28, 0.92);
            headVisual.add(lock);
          }
        }
      }

      // Baseball Cap (Front or Backwards) — Positioned cleanly ABOVE brow line!
      if (def.headwear === 'cap_front' || def.headwear === 'cap_back') {
        const capColorMat = def.headwear === 'cap_back' ? accentMat : jacketMat;
        const capDome = new THREE.Mesh(
          new THREE.SphereGeometry(0.375, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.45),
          capColorMat,
        );
        capDome.position.set(0, 0.40, 0.035);
        capDome.rotation.x = def.headwear === 'cap_back' ? 0.22 : -0.1;
        capDome.scale.set(1.01, 0.94, 1.02);

        const capBtn = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), capColorMat);
        capBtn.position.set(0, 0.745, 0.06);

        const brimDir = def.headwear === 'cap_front' ? -1 : 1;
        const brim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.27, 0.04, 18, 1, false, -Math.PI * 0.42, Math.PI * 0.84),
          capColorMat,
        );
        brim.position.set(0, def.headwear === 'cap_front' ? 0.51 : 0.45, brimDir * 0.28);
        brim.rotation.y = def.headwear === 'cap_front' ? Math.PI : 0;
        brim.rotation.x = def.headwear === 'cap_front' ? -0.14 : 0.18;
        brim.scale.set(1.06, 1, 1.15);

        headVisual.add(capDome, capBtn, brim);

        // Laila's Daisy Emblem on Cap Front
        if (def.capFlower) {
          addDaisyFlower(headVisual, 0, 0.625, -0.305, 1.0, Math.PI, whiteMat, accentMat);
        }

        // Yousef's Sunglasses Resting Cleanly on Backwards Cap Crown + Front Hair Tufts
        if (def.sunglassesOnCap) {
          for (const [fx, fy, fz, fr] of [
            [-0.12, 0.53, -0.25, 0.085],
            [0.02, 0.56, -0.27, 0.105],
            [0.14, 0.52, -0.24, 0.08],
          ] as Array<[number, number, number, number]>) {
            const tuft = new THREE.Mesh(new THREE.SphereGeometry(fr, 10, 8), hairMat);
            tuft.position.set(fx, fy, fz);
            headVisual.add(tuft);
          }
          const glassFrameMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.2, clearcoat: 0.8 });
          const glassLensMat = new THREE.MeshPhysicalMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.5, clearcoat: 1.0 });
          addSunglasses(headVisual, 0.68, -0.16, -0.45, glassFrameMat, glassLensMat, eyeWhiteMat);
        }
      }

      // Aser's Round Pixar Smart Glasses
      if (def.headwear === 'glasses') {
        const rimMat = new THREE.MeshPhysicalMaterial({ color: 0x1e293b, roughness: 0.25, metalness: 0.6, clearcoat: 0.5 });
        const lensMat = new THREE.MeshPhysicalMaterial({
          color: 0xe0f2fe,
          transparent: true,
          opacity: 0.25,
          roughness: 0.08,
          clearcoat: 1.0,
        });
        addSunglasses(headVisual, 0.31, -0.36, 0, rimMat, lensMat, eyeWhiteMat);
      }
    }

    // Malek's Padded Collar Headphones
    if (def.hasHeadphones) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.032, 10, 20, Math.PI), whiteMat);
      band.position.set(0, 0.67, 0.02);
      band.rotation.x = Math.PI * 0.38;
      for (const sx of [-1, 1]) {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.055, 14), whiteMat);
        cup.rotation.z = -sx * Math.PI * 0.42;
        cup.position.set(sx * 0.225, 0.66, -0.145);
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.06, 14), jacketMat);
        pad.rotation.z = -sx * Math.PI * 0.42;
        pad.position.set(sx * 0.21, 0.66, -0.145);
        torsoGroup.add(cup, pad);
      }
      torsoGroup.add(band);
    }

    // Articulated 2-Segment Cartoon Arms (Varsity White Sleeves or Matching Jacket Sleeves)
    const sleeveMat = def.outfitStyle === 'varsity' ? whiteMat : jacketMat;
    const armRadius = isSturdy ? 0.105 : 0.086;
    const makeArm = (side: -1 | 1) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * shoulderX, 0.57, 0);
      const shoulderPuff = new THREE.Mesh(new THREE.SphereGeometry(armRadius * 1.02, 12, 10), sleeveMat);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(armRadius, 0.18, 6, 12), sleeveMat);
      upper.position.y = -0.14;
      upper.castShadow = true;
      shoulder.add(shoulderPuff, upper);

      const elbow = new THREE.Group();
      elbow.position.y = -0.28;
      const fore = new THREE.Mesh(new THREE.CapsuleGeometry(armRadius * 0.9, 0.16, 6, 12), sleeveMat);
      fore.position.y = -0.11;
      const cuff = new THREE.Mesh(
        new THREE.TorusGeometry(armRadius * 0.88, 0.024, 8, 14),
        def.outfitStyle === 'varsity' ? jacketMat : whiteMat,
      );
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.22;

      // Pixar Rounded Hand + Thumb Mitten
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.088, 12, 12), skinMat);
      hand.position.y = -0.295;
      hand.scale.set(0.95, 1.12, 0.85);
      const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.038, 4, 8), skinMat);
      thumb.position.set(-side * 0.065, -0.275, -0.045);
      thumb.rotation.z = side * 0.55;

      // Optional Smartwatch (Neso)
      if (side === -1 && def.hasWristwatch) {
        const watchBand = new THREE.Mesh(new THREE.TorusGeometry(armRadius * 0.84, 0.016, 6, 14), whiteMat);
        watchBand.rotation.x = Math.PI / 2;
        watchBand.position.y = -0.235;
        const watchFace = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.022, 0.052), darkMat);
        watchFace.position.set(0, -0.235, -armRadius * 0.85);
        elbow.add(watchBand, watchFace);
      }

      elbow.add(fore, cuff, hand, thumb);
      shoulder.add(elbow);
      torsoGroup.add(shoulder);
      return { shoulder, elbow };
    };
    const leftArmRig = makeArm(-1);
    const rightArmRig = makeArm(1);

    // Articulated 2-Segment Cargo Legs + Chunky Stylized Pixar Sneakers
    const legRadius = isSturdy ? 0.132 : 0.114;
    const makeLeg = (side: -1 | 1) => {
      const hip = new THREE.Group();
      hip.position.set(side * hipX, -0.05, 0);
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(legRadius, 0.24, 6, 12), pantsMat);
      thigh.position.y = -0.18;
      thigh.castShadow = true;

      // Cargo Pocket on Outer Thigh
      const cargoPocket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.14), pantsMat);
      cargoPocket.position.set(side * (legRadius + 0.015), -0.19, 0);
      hip.add(thigh, cargoPocket);

      const knee = new THREE.Group();
      knee.position.y = -0.38;
      // Full Cargo Trousers (Neso, Laila, Yousef, Aser, Salma) vs Athletic Shorts + Shin (Malek)
      const hasFullPants = def.outfitStyle !== 'varsity';
      const shin = new THREE.Mesh(
        new THREE.CapsuleGeometry(hasFullPants ? legRadius * 0.92 : 0.088, 0.22, 6, 12),
        hasFullPants ? pantsMat : skinMat,
      );
      shin.position.y = -0.14;
      const cuffOrSock = new THREE.Mesh(
        new THREE.TorusGeometry(hasFullPants ? legRadius * 0.92 : 0.09, 0.024, 8, 14),
        hasFullPants ? pantsMat : whiteMat,
      );
      cuffOrSock.rotation.x = Math.PI / 2;
      cuffOrSock.position.y = -0.27;

      // Chunky Rounded Pixar High-Top Sneaker
      const shoe = new THREE.Group();
      shoe.position.set(0, -0.39, -0.04);
      const shoeUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.118, 0.16, 6, 14), shoeMat);
      shoeUpper.rotation.x = Math.PI / 2;
      shoeUpper.position.set(0, 0.02, -0.01);
      shoeUpper.scale.set(1.0, 1.0, 0.85);
      shoeUpper.castShadow = true;

      const ankleCollar = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.032, 8, 14), whiteMat);
      ankleCollar.rotation.x = Math.PI / 2;
      ankleCollar.position.set(0, 0.095, 0.05);

      const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.118, 12, 10), whiteMat);
      toeCap.position.set(0, -0.015, -0.145);
      toeCap.scale.set(1.0, 0.72, 1.15);

      const sole = new THREE.Mesh(new THREE.CapsuleGeometry(0.128, 0.2, 6, 12), whiteMat);
      sole.rotation.x = Math.PI / 2;
      sole.position.set(0, -0.068, -0.03);
      sole.scale.set(1.02, 1.02, 0.42);

      // Crisp White Sneaker Laces
      for (const lz of [-0.03, -0.075]) {
        const lace = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.1, 4, 6), whiteMat);
        lace.rotation.z = Math.PI / 2;
        lace.position.set(0, 0.09, lz);
        shoe.add(lace);
      }

      shoe.add(shoeUpper, ankleCollar, toeCap, sole);
      knee.add(shin, cuffOrSock, shoe);
      hip.add(knee);
      hipsGroup.add(hip);
      return { hip, knee, shoe };
    };
    const leftLegRig = makeLeg(-1);
    const rightLegRig = makeLeg(1);

    // Attachable Jetpack (+Z back)
    const jetpackGroup = new THREE.Group();
    jetpackGroup.position.set(0, 0.36, 0.44);
    jetpackGroup.visible = false;
    const jetMat = new THREE.MeshPhysicalMaterial({ color: 0x16a34a, roughness: 0.28, metalness: 0.45, clearcoat: 0.4 });
    const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.8 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff7b00 });
    const tankL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.56, 12), jetMat);
    tankL.position.x = -0.14;
    const tankR = tankL.clone();
    tankR.position.x = 0.14;
    const coneL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.14, 10), nozzleMat);
    coneL.position.set(-0.14, -0.32, 0);
    const coneR = coneL.clone();
    coneR.position.x = 0.14;
    const jetFlameLeft = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.55, 8), flameMat);
    jetFlameLeft.rotation.x = Math.PI;
    jetFlameLeft.position.set(-0.14, -0.62, 0);
    const jetFlameRight = jetFlameLeft.clone();
    jetFlameRight.position.x = 0.14;
    jetpackGroup.add(tankL, tankR, coneL, coneR, jetFlameLeft, jetFlameRight);
    torsoGroup.add(jetpackGroup);

    // Attachable Hoverboard
    const hoverboardGroup = new THREE.Group();
    hoverboardGroup.position.set(0, -0.88, 0);
    hoverboardGroup.visible = false;
    const deckMat = new THREE.MeshPhysicalMaterial({ color: 0x7c3aed, roughness: 0.22, metalness: 0.45, clearcoat: 0.6 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.75 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 1.55), deckMat);
    const deckRim = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.05, 1.6), rimMat);
    hoverboardGroup.add(deckRim, deck);
    hipsGroup.add(hoverboardGroup);

    const shieldRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.06, 10, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    shieldRing.rotation.x = Math.PI / 2;
    shieldRing.position.y = 0.25;
    shieldRing.visible = false;
    hipsGroup.add(shieldRing);

    const magnetRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.04, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.45, depthWrite: false }),
    );
    magnetRing.rotation.x = Math.PI / 2;
    magnetRing.position.y = 0.65;
    magnetRing.visible = false;
    hipsGroup.add(magnetRing);

    const dispose = () => {
      for (const tex of texturesToDispose) tex.dispose();
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    };

    return {
      root,
      hipsGroup,
      torsoGroup,
      headGroup,
      leftShoulder: leftArmRig.shoulder,
      leftElbow: leftArmRig.elbow,
      rightShoulder: rightArmRig.shoulder,
      rightElbow: rightArmRig.elbow,
      leftHip: leftLegRig.hip,
      leftKnee: leftLegRig.knee,
      rightHip: rightLegRig.hip,
      rightKnee: rightLegRig.knee,
      leftShoe: leftLegRig.shoe,
      rightShoe: rightLegRig.shoe,
      jetpackGroup,
      jetFlameLeft,
      jetFlameRight,
      hoverboardGroup,
      shieldRing,
      magnetRing,
      hitFlashMaterials,
      dispose,
    };
  }
}
