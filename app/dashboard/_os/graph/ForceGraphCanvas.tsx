"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import type { AttentionItem, GraphData } from "@/lib/os/types";
import { ForceGraph } from "./ForceGraph";

export interface ForceGraphCanvasProps {
  graph: GraphData;
  selectedId: string | null;
  hoveredId: string | null;
  visibleIds: Set<string> | null;
  focusIds: Set<string> | null;
  attention: Map<string, AttentionItem>;
  attentionEmphasis: boolean;
  search: string;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
  onContextNode: (id: string, x: number, y: number) => void;
}

export default function ForceGraphCanvas(props: ForceGraphCanvasProps) {
  return (
    <Canvas
      flat
      dpr={[1, 1.75]}
      camera={{ position: [0, 18, 128], fov: 55, near: 0.1, far: 700 }}
      gl={{ antialias: true }}
      onPointerMissed={() => props.onSelect(null)}
    >
      <color attach="background" args={["#0a0b0d"]} />
      <fog attach="fog" args={["#0a0b0d", 120, 320]} />

      <ambientLight intensity={0.72} />
      <pointLight position={[60, 70, 60]} intensity={0.7} />
      <pointLight position={[-70, -35, 20]} intensity={0.35} color="#5eead4" />
      <pointLight position={[20, -60, -50]} intensity={0.22} color="#b79cff" />

      <ForceGraph {...props} />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        panSpeed={0.7}
        minDistance={12}
        maxDistance={320}
      />
    </Canvas>
  );
}
