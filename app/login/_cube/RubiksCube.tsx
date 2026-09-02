"use client";

// The Core Engine Rubik's Cube — an actual animated 3D object whose behaviour
// is driven entirely by a single `phase` prop:
//
//   idle           scrambled, floating, rotating very slowly
//   authenticating idle motion stops, a faint decoding tremor runs
//   solving        queued quarter-turns replay the inverse of the scramble
//   success        cube is solved, stickers illuminate, a slow victory drift
//   error          one or two layers twitch the wrong way and settle
//
// All per-frame motion is imperative (refs + useFrame) so React never
// re-renders during animation. The logical state of the cube lives in the
// `rest` array; `useFrame` only ever interpolates on top of it.

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

import { buildCubies } from "./cubeModel";
import {
  AXIS_INDEX,
  buildScramble,
  invertSequence,
  quarterTurnQuaternion,
  type Axis,
  type Layer,
  type Move,
} from "./moveEngine";
import {
  BODY_COLOR,
  STICKER_EMISSIVE_IDLE,
  STICKER_EMISSIVE_SOLVED,
} from "./palette";

export type CubePhase =
  | "idle"
  | "authenticating"
  | "solving"
  | "success"
  | "error";

interface RubiksCubeProps {
  phase: CubePhase;
  onSolved?: () => void;
  onErrorComplete?: () => void;
  reducedMotion?: boolean;
  /** Start already solved (used as the Core Engine system emblem). */
  startSolved?: boolean;
}

const SCRAMBLE_LENGTH = 18;
const MOVE_MS_SOLVING = 125;
const MOVE_MS_REDUCED = 32;

interface RestTransform {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
}

interface ActiveMove {
  move: Move;
  elapsed: number;
  duration: number;
  indices: number[];
}

interface ErrorWobble {
  elapsed: number;
  duration: number;
  amp: number;
  groups: { axis: Axis; layer: Layer; dir: 1 | -1; indices: number[] }[];
}

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export default function RubiksCube({
  phase,
  onSolved,
  onErrorComplete,
  reducedMotion = false,
  startSolved = false,
}: RubiksCubeProps) {
  const cubies = useMemo(() => buildCubies(), []);
  const { size } = useThree();

  const cubeGroup = useRef<THREE.Group>(null);
  const cubieRefs = useRef<(THREE.Group | null)[]>([]);

  // Logical, committed transform of every cubie.
  const rest = useRef<RestTransform[]>(
    cubies.map((c) => ({
      pos: new THREE.Vector3(...c.home),
      quat: new THREE.Quaternion(),
    })),
  );

  const queue = useRef<Move[]>([]);
  const active = useRef<ActiveMove | null>(null);
  const errorWobble = useRef<ErrorWobble | null>(null);
  const solveSequence = useRef<Move[]>([]);
  const solveReported = useRef(false);
  const moveDuration = useRef(MOVE_MS_SOLVING);

  const phaseRef = useRef<CubePhase>(phase);
  const clock = useRef(0);
  const emissive = useRef({ current: STICKER_EMISSIVE_IDLE, target: STICKER_EMISSIVE_IDLE });
  const spin = useRef({ current: 0.22, target: 0.22 });
  const baseScale = useRef(1);

  // --- cube maths -----------------------------------------------------------

  const layerIndices = (move: Move) => {
    const axis = AXIS_INDEX[move.axis];
    const out: number[] = [];
    rest.current.forEach((t, i) => {
      if (Math.round(t.pos.getComponent(axis)) === move.layer) out.push(i);
    });
    return out;
  };

  const commit = (move: Move) => {
    const dq = quarterTurnQuaternion(move.axis, (move.dir * Math.PI) / 2);
    layerIndices(move).forEach((i) => {
      const t = rest.current[i];
      t.pos.applyQuaternion(dq);
      t.pos.set(
        Math.round(t.pos.x),
        Math.round(t.pos.y),
        Math.round(t.pos.z),
      );
      t.quat.premultiply(dq).normalize();
    });
  };

  const writeResting = (i: number) => {
    const group = cubieRefs.current[i];
    if (!group) return;
    group.position.copy(rest.current[i].pos);
    group.quaternion.copy(rest.current[i].quat);
  };

  const scrambleNow = () => {
    cubies.forEach((c, i) => {
      rest.current[i].pos.set(...c.home);
      rest.current[i].quat.identity();
    });
    if (!startSolved) {
      const scramble = buildScramble(SCRAMBLE_LENGTH);
      scramble.forEach(commit);
      solveSequence.current = invertSequence(scramble);
    } else {
      solveSequence.current = [];
    }
    solveReported.current = false;
    queue.current = [];
    active.current = null;
    cubies.forEach((_, i) => writeResting(i));
  };

  // --- lifecycle -----------------------------------------------------------

  useLayoutEffect(() => {
    cubeGroup.current?.rotation.set(0.32, 0.6, 0);
    scrambleNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
    moveDuration.current = reducedMotion ? MOVE_MS_REDUCED : MOVE_MS_SOLVING;

    switch (phase) {
      case "idle":
        queue.current = [];
        active.current = null;
        errorWobble.current = null;
        emissive.current.target = STICKER_EMISSIVE_IDLE;
        spin.current.target = reducedMotion ? 0 : 0.22;
        break;

      case "authenticating":
        emissive.current.target = 0.13;
        spin.current.target = 0;
        break;

      case "solving":
        solveReported.current = false;
        queue.current = [...solveSequence.current];
        emissive.current.target = 0.18;
        spin.current.target = 0;
        break;

      case "success":
        queue.current = [];
        emissive.current.target = STICKER_EMISSIVE_SOLVED;
        spin.current.target = reducedMotion ? 0 : 0.16;
        break;

      case "error": {
        const faces: { axis: Axis; layer: Layer }[] = [
          { axis: "y", layer: 1 },
          { axis: "x", layer: 1 },
          { axis: "z", layer: 1 },
          { axis: "y", layer: -1 },
        ];
        const shuffled = faces.sort(() => Math.random() - 0.5);
        const pick = shuffled.slice(0, 1 + Math.floor(Math.random() * 2));
        errorWobble.current = {
          elapsed: 0,
          duration: 620,
          amp: 0.26,
          groups: pick.map((f) => ({
            axis: f.axis,
            layer: f.layer,
            dir: Math.random() < 0.5 ? 1 : -1,
            indices: layerIndices({ axis: f.axis, layer: f.layer, dir: 1 }),
          })),
        };
        emissive.current.target = STICKER_EMISSIVE_IDLE;
        spin.current.target = 0;
        break;
      }
    }
  }, [phase, reducedMotion]);

  // --- per-frame ----------------------------------------------------------

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    clock.current += dt;
    const p = phaseRef.current;

    // Responsive scale — keep the cube framed with margin on any viewport.
    const target = THREE.MathUtils.clamp(
      Math.min(size.width * 0.62, size.height * 0.82) / 480,
      0.5,
      0.92,
    );
    baseScale.current = THREE.MathUtils.damp(baseScale.current, target, 4, dt);

    // Smoothed drivers.
    spin.current.current = THREE.MathUtils.damp(
      spin.current.current,
      spin.current.target,
      3,
      dt,
    );
    emissive.current.current = THREE.MathUtils.damp(
      emissive.current.current,
      emissive.current.target,
      4,
      dt,
    );

    const group = cubeGroup.current;
    if (group) {
      group.rotation.y += spin.current.current * dt;

      const bobAmp = p === "idle" ? 0.06 : p === "success" ? 0.03 : 0.015;
      const bob =
        -0.1 + (reducedMotion ? 0 : Math.sin(clock.current * 0.9) * bobAmp);
      group.position.y = THREE.MathUtils.damp(group.position.y, bob, 5, dt);

      const tremor =
        p === "authenticating" && !reducedMotion
          ? Math.sin(clock.current * 44) * 0.006
          : 0;
      group.rotation.z = THREE.MathUtils.damp(
        group.rotation.z,
        tremor,
        8,
        dt,
      );
      group.rotation.x = THREE.MathUtils.damp(
        group.rotation.x,
        reducedMotion ? 0.32 : 0.32 + Math.sin(clock.current * 0.4) * 0.05,
        2,
        dt,
      );

      const pop = p === "success" ? 1.035 : 1;
      const s = THREE.MathUtils.damp(
        group.scale.x,
        baseScale.current * pop,
        5,
        dt,
      );
      group.scale.setScalar(s);
    }

    // Sticker illumination.
    if (group) {
      group.traverse((obj) => {
        if (
          (obj as THREE.Mesh).isMesh &&
          obj.userData.sticker &&
          !Array.isArray((obj as THREE.Mesh).material)
        ) {
          const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = emissive.current.current;
        }
      });
    }

    // Failed-auth wobble takes over the moving layers, never commits.
    const wobble = errorWobble.current;
    if (wobble) {
      wobble.elapsed += dt * 1000;
      const t = wobble.elapsed / wobble.duration;
      if (t >= 1) {
        wobble.groups.forEach((g) => g.indices.forEach(writeResting));
        errorWobble.current = null;
        onErrorComplete?.();
      } else {
        const swing = Math.sin(t * Math.PI) * wobble.amp;
        wobble.groups.forEach((g) => {
          const dq = quarterTurnQuaternion(g.axis, g.dir * swing);
          g.indices.forEach((i) => {
            const c = cubieRefs.current[i];
            if (!c) return;
            c.position.copy(rest.current[i].pos).applyQuaternion(dq);
            c.quaternion.copy(rest.current[i].quat).premultiply(dq);
          });
        });
      }
      return;
    }

    // Move queue.
    if (!active.current && queue.current.length > 0) {
      const move = queue.current.shift() as Move;
      active.current = {
        move,
        elapsed: 0,
        duration: moveDuration.current,
        indices: layerIndices(move),
      };
    }

    const current = active.current;
    if (current) {
      current.elapsed += dt * 1000;
      const t = Math.min(current.elapsed / current.duration, 1);
      const angle =
        easeInOutCubic(t) * current.move.dir * (Math.PI / 2);
      const dq = quarterTurnQuaternion(current.move.axis, angle);

      current.indices.forEach((i) => {
        const c = cubieRefs.current[i];
        if (!c) return;
        c.position.copy(rest.current[i].pos).applyQuaternion(dq);
        c.quaternion.copy(rest.current[i].quat).premultiply(dq);
      });

      if (t >= 1) {
        commit(current.move);
        current.indices.forEach(writeResting);
        active.current = null;

        if (
          queue.current.length === 0 &&
          phaseRef.current === "solving" &&
          !solveReported.current
        ) {
          solveReported.current = true;
          onSolved?.();
        }
      }
    }
  });

  // --- render (once) ----------------------------------------------------

  return (
    <group ref={cubeGroup}>
      {cubies.map((cubie, i) => (
        <group
          key={cubie.id}
          ref={(el) => {
            cubieRefs.current[i] = el;
          }}
        >
          <RoundedBox args={[0.96, 0.96, 0.96]} radius={0.12} smoothness={5}>
            <meshStandardMaterial
              color={BODY_COLOR}
              metalness={0.55}
              roughness={0.32}
              envMapIntensity={0.7}
            />
          </RoundedBox>

          {cubie.stickers.map((sticker) => (
            <RoundedBox
              key={sticker.face}
              args={[0.78, 0.78, 0.04]}
              radius={0.05}
              smoothness={4}
              position={sticker.position}
              rotation={sticker.rotation}
              userData={{ sticker: true }}
            >
              <meshStandardMaterial
                color={sticker.color}
                emissive={sticker.color}
                emissiveIntensity={STICKER_EMISSIVE_IDLE}
                metalness={0.25}
                roughness={0.28}
                envMapIntensity={0.5}
              />
            </RoundedBox>
          ))}
        </group>
      ))}
    </group>
  );
}
