import * as THREE from 'three';

export interface ArticulatedCharacterRig {
  root: THREE.Group;
  hipsGroup: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  leftShoe: THREE.Group;
  rightShoe: THREE.Group;
  jetpackGroup: THREE.Group;
  jetFlameLeft: THREE.Mesh;
  jetFlameRight: THREE.Mesh;
  hoverboardGroup: THREE.Group;
  shieldRing: THREE.Mesh;
  magnetRing: THREE.Mesh;
  hitFlashMaterials: THREE.MeshStandardMaterial[];
  dispose: () => void;
}

export type PoseState =
  | 'idle'
  | 'run'
  | 'jump'
  | 'slide'
  | 'hoverboard'
  | 'jetpack'
  | 'crash'
  | 'victory';

export class AnimationController {
  private idleTime = 0;

  public updatePose(
    rig: ArticulatedCharacterRig,
    state: PoseState,
    dt: number,
    runCycle: number,
    vx: number,
    squashX: number,
    squashY: number,
  ): void {
    this.idleTime += dt;

    rig.root.scale.set(squashX, squashY, squashX);

    if (state === 'idle' || state === 'victory') {
      const breath = Math.sin(this.idleTime * 2.4);
      const look = Math.sin(this.idleTime * 1.1) * 0.14;
      rig.hipsGroup.position.y = THREE.MathUtils.damp(rig.hipsGroup.position.y, 0.96 + breath * 0.022, 10, dt);
      rig.hipsGroup.rotation.set(0, Math.sin(this.idleTime * 0.9) * 0.08, 0);
      rig.torsoGroup.rotation.set(breath * 0.025, 0, 0);
      rig.headGroup.rotation.set(Math.sin(this.idleTime * 1.6) * 0.035, look, 0);

      // Note: -Z rotates left arm (-X) OUTWARD away from torso; +Z rotates right arm (+X) OUTWARD.
      const wave = state === 'victory' ? Math.sin(this.idleTime * 7) * 0.5 - 2.3 : 0.1 + breath * 0.04;
      rig.leftShoulder.rotation.set(0.08 + breath * 0.04, 0, -0.14);
      rig.leftElbow.rotation.set(-0.28, 0, 0);
      rig.rightShoulder.rotation.set(wave, 0, 0.14);
      rig.rightElbow.rotation.set(state === 'victory' ? -0.6 : -0.28, 0, 0);

      rig.leftHip.rotation.set(-0.04, 0, -0.04);
      rig.leftKnee.rotation.set(0.08, 0, 0);
      rig.leftShoe.rotation.set(0, 0, 0);
      rig.rightHip.rotation.set(0.04, 0, 0.04);
      rig.rightKnee.rotation.set(0.08, 0, 0);
      rig.rightShoe.rotation.set(0, 0, 0);
      return;
    }

    // Bank into lane switches
    const bank = THREE.MathUtils.clamp(-vx * 0.034, -0.36, 0.36);
    rig.root.rotation.z = THREE.MathUtils.damp(rig.root.rotation.z, bank, 16, dt);
    rig.root.rotation.y = THREE.MathUtils.damp(rig.root.rotation.y, bank * 0.42, 16, dt);

    if (state === 'crash') {
      rig.hipsGroup.position.y = THREE.MathUtils.damp(rig.hipsGroup.position.y, 0.42, 10, dt);
      rig.hipsGroup.rotation.x = THREE.MathUtils.damp(rig.hipsGroup.rotation.x, -1.25, 10, dt);
      rig.leftShoulder.rotation.set(-0.8, 0, -0.35);
      rig.rightShoulder.rotation.set(-0.6, 0, 0.35);
      rig.leftKnee.rotation.x = 0.6;
      rig.rightKnee.rotation.x = 0.4;
      return;
    }

    if (state === 'jetpack') {
      const flicker = 0.8 + Math.random() * 0.55;
      rig.jetFlameLeft.scale.set(1, flicker, 1);
      rig.jetFlameRight.scale.set(1, flicker, 1);
      rig.hipsGroup.position.y = THREE.MathUtils.damp(rig.hipsGroup.position.y, 1.0, 10, dt);
      rig.hipsGroup.rotation.set(-0.45, 0, 0);
      rig.torsoGroup.rotation.set(-0.15, 0, 0);
      rig.headGroup.rotation.set(0.35, 0, 0);
      rig.leftShoulder.rotation.set(-0.35, 0, -0.25);
      rig.rightShoulder.rotation.set(-0.35, 0, 0.25);
      rig.leftElbow.rotation.set(-0.4, 0, 0);
      rig.rightElbow.rotation.set(-0.4, 0, 0);
      rig.leftHip.rotation.set(0.25, 0, 0);
      rig.rightHip.rotation.set(0.35, 0, 0);
      rig.leftKnee.rotation.set(0.3, 0, 0);
      rig.rightKnee.rotation.set(0.45, 0, 0);
      return;
    }

    if (state === 'slide') {
      rig.hipsGroup.position.y = THREE.MathUtils.damp(rig.hipsGroup.position.y, 0.42, 18, dt);
      rig.hipsGroup.rotation.set(1.08, 0, 0);
      rig.torsoGroup.rotation.set(0.18, 0, 0);
      rig.headGroup.rotation.set(-0.65, 0, 0);
      rig.leftHip.rotation.set(-0.9, 0, -0.08);
      rig.leftKnee.rotation.set(0.15, 0, 0);
      rig.rightHip.rotation.set(-0.4, 0, 0.08);
      rig.rightKnee.rotation.set(1.1, 0, 0);
      rig.leftShoulder.rotation.set(0.65, 0, -0.35);
      rig.rightShoulder.rotation.set(-0.45, 0, 0.35);
      return;
    }

    if (state === 'jump') {
      rig.hipsGroup.position.y = THREE.MathUtils.damp(rig.hipsGroup.position.y, 1.0, 14, dt);
      rig.hipsGroup.rotation.set(-0.14, 0, 0);
      rig.torsoGroup.rotation.set(-0.08, 0, 0);
      rig.headGroup.rotation.set(0.08, 0, 0);
      rig.leftShoulder.rotation.set(-1.35, 0, -0.24);
      rig.leftElbow.rotation.set(-0.6, 0, 0);
      rig.rightShoulder.rotation.set(0.4, 0, 0.24);
      rig.rightElbow.rotation.set(-0.9, 0, 0);
      rig.leftHip.rotation.set(-0.75, 0, 0);
      rig.leftKnee.rotation.set(1.15, 0, 0);
      rig.leftShoe.rotation.set(0.35, 0, 0);
      rig.rightHip.rotation.set(0.35, 0, 0);
      rig.rightKnee.rotation.set(0.45, 0, 0);
      rig.rightShoe.rotation.set(-0.25, 0, 0);
      return;
    }

    if (state === 'hoverboard') {
      const floatY = Math.sin(this.idleTime * 6.5) * 0.05;
      rig.hipsGroup.position.y = THREE.MathUtils.damp(rig.hipsGroup.position.y, 1.05 + floatY, 12, dt);
      rig.hipsGroup.rotation.set(-0.06, 0.48, 0);
      rig.torsoGroup.rotation.set(0, -0.25, 0);
      rig.headGroup.rotation.set(0, -0.22, 0);
      rig.leftShoulder.rotation.set(0.1, 0, -0.65);
      rig.rightShoulder.rotation.set(-0.1, 0, 0.65);
      rig.leftElbow.rotation.set(-0.35, 0, 0);
      rig.rightElbow.rotation.set(-0.35, 0, 0);
      rig.leftHip.rotation.set(-0.22, 0, -0.06);
      rig.leftKnee.rotation.set(0.45, 0, 0);
      rig.rightHip.rotation.set(0.22, 0, 0.06);
      rig.rightKnee.rotation.set(0.45, 0, 0);
      return;
    }

    // Natural articulated running gait synced to distance!
    const s = Math.sin(runCycle);
    const c = Math.cos(runCycle);
    rig.hipsGroup.position.y = 0.96 + Math.abs(s) * 0.13;
    rig.hipsGroup.rotation.set(-0.16, s * 0.08, 0);
    rig.torsoGroup.rotation.set(-0.08, -s * 0.1, 0);
    rig.headGroup.rotation.set(0.12, s * 0.04, 0);

    // Opposite arm & leg swing with dynamic elbow & knee flexion
    rig.leftShoulder.rotation.set(s * 0.95, 0, -0.15);
    rig.leftElbow.rotation.set(-0.85 - Math.max(0, -s) * 0.45, 0, 0);
    rig.rightShoulder.rotation.set(-s * 0.95, 0, 0.15);
    rig.rightElbow.rotation.set(-0.85 - Math.max(0, s) * 0.45, 0, 0);

    rig.leftHip.rotation.set(-s * 0.98, 0, -0.03);
    rig.leftKnee.rotation.set(Math.max(0.08, (c + 0.5) * 0.85), 0, 0);
    rig.leftShoe.rotation.set(Math.max(-0.35, -c * 0.32), 0, 0);
    rig.rightHip.rotation.set(s * 0.98, 0, 0.03);
    rig.rightKnee.rotation.set(Math.max(0.08, (-c + 0.5) * 0.85), 0, 0);
    rig.rightShoe.rotation.set(Math.max(-0.35, c * 0.32), 0, 0);
  }
}
