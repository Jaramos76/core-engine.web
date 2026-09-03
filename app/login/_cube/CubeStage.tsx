"use client";

// The R3F scene that hosts the Rubik's Cube: camera, lighting, a locally
// baked environment for reflections (no network assets — CSP safe) and a soft
// contact shadow so the cube reads as a real object floating in space.

import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Suspense } from "react";

import RubiksCube, { type CubePhase } from "./RubiksCube";
import { ACCENT } from "./palette";

interface CubeStageProps {
  phase: CubePhase;
  onSolved?: () => void;
  onErrorComplete?: () => void;
  reducedMotion?: boolean;
}

export default function CubeStage(props: CubeStageProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [5, 4, 7.4], fov: 40 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[6, 9, 5]} intensity={1.15} />
      <directionalLight
        position={[-7, -3, -5]}
        intensity={0.4}
        color="#7f9bff"
      />
      <pointLight
        position={[0, 0.6, 6]}
        intensity={0.5}
        color={ACCENT}
        distance={20}
      />

      <Suspense fallback={null}>
        <RubiksCube {...props} />

        <Environment resolution={128} frames={1}>
          <Lightformer
            intensity={1.5}
            position={[0, 4, 2]}
            scale={[7, 3, 1]}
            color="#dfe6f2"
          />
          <Lightformer
            intensity={0.8}
            position={[-4, 1, 3]}
            scale={[3, 3, 1]}
            color={ACCENT}
          />
          <Lightformer
            intensity={0.55}
            position={[4, -1, -3]}
            scale={[4, 4, 1]}
            color="#3a49c9"
          />
        </Environment>
      </Suspense>

      <ContactShadows
        position={[0, -2.2, 0]}
        opacity={0.5}
        scale={16}
        blur={2.9}
        far={5}
        color="#05070a"
      />
    </Canvas>
  );
}
