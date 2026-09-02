"use client";

// The Core Engine emblem — a small solved Rubik's Cube that idles in the top
// bar. Same component as the login cube, started already solved. Part of the
// visual language without dominating the screen.

import { Canvas } from "@react-three/fiber";
import RubiksCube from "@/app/login/_cube/RubiksCube";

export function SystemCube() {
  return (
    <span className="og-syscube" aria-hidden="true">
      <Canvas
        flat
        dpr={[1, 2]}
        camera={{ position: [3.4, 2.8, 4.1], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 6, 5]} intensity={1.1} />
        <directionalLight position={[-4, -2, -3]} intensity={0.3} color="#7f9bff" />
        <group scale={1.7}>
          <RubiksCube phase="idle" startSolved />
        </group>
      </Canvas>
    </span>
  );
}
