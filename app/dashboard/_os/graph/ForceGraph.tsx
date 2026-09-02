"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

import { CATEGORY, AGENT_STATE_META, URGENCY_COLOR } from "@/lib/os/visual";
import type { AttentionItem, GraphData } from "@/lib/os/types";
import { NodeGeometry } from "./NodeGeometry";
import {
  buildSimBundle,
  resolveEndpoint,
  type SimBundle,
  type SimNode,
} from "./graphSim";

interface NodeHandles {
  group: THREE.Group | null;
  mesh: THREE.Mesh | null;
  halo: THREE.Mesh | null;
}

interface ForceGraphProps {
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

const DIM_EDGE = new THREE.Color("#15171b");
const LIVE_EDGE = new THREE.Color("#3a4550");
const HOT_EDGE = new THREE.Color("#5eead4");

function GraphNodeMesh({
  node,
  registry,
  onSelect,
  onHover,
  onOpen,
  onContextNode,
  showLabel,
}: {
  node: SimNode;
  registry: Map<string, NodeHandles>;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
  onContextNode: (id: string, x: number, y: number) => void;
  showLabel: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const visual = CATEGORY[node.category];

  useEffect(() => {
    registry.set(node.id, {
      group: groupRef.current,
      mesh: meshRef.current,
      halo: haloRef.current,
    });
    return () => {
      registry.delete(node.id);
    };
  }, [node.id, registry]);

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(node.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "";
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onOpen(node.id);
        }}
        onContextMenu={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          e.nativeEvent.preventDefault();
          onContextNode(node.id, e.nativeEvent.clientX, e.nativeEvent.clientY);
        }}
      >
        <NodeGeometry shape={visual.shape} />
        <meshStandardMaterial
          color={visual.color}
          emissive={visual.color}
          emissiveIntensity={0.28}
          roughness={0.4}
          metalness={0.1}
          transparent
        />
      </mesh>

      <mesh ref={haloRef} scale={1.42}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={visual.color}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {showLabel && (
        <Html
          center
          distanceFactor={46}
          position={[0, node.radius * 1.7 + 1.2, 0]}
          pointerEvents="none"
          className="og-label-holder"
        >
          <span className="og-label" data-cat={node.category}>
            {node.label}
          </span>
        </Html>
      )}
    </group>
  );
}

export function ForceGraph(props: ForceGraphProps) {
  const {
    graph,
    selectedId,
    hoveredId,
    visibleIds,
    focusIds,
    attention,
    attentionEmphasis,
    search,
    onSelect,
    onHover,
    onOpen,
    onContextNode,
  } = props;

  const bundleRef = useRef<SimBundle | null>(null);
  if (!bundleRef.current || bundleRef.current.key !== graph) {
    bundleRef.current = buildSimBundle(graph);
  }
  const bundle = bundleRef.current;

  const registryRef = useRef<Map<string, NodeHandles>>(new Map());
  const edgeGeoRef = useRef<THREE.BufferGeometry>(null);
  const scratch = useRef(new THREE.Vector3());
  const flyRef = useRef<{ target: THREE.Vector3; distance: number } | null>(null);
  const colorKeyRef = useRef("");

  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as
    | (THREE.EventDispatcher & {
        target: THREE.Vector3;
        update: () => void;
      })
    | null;

  const edgeArrays = useMemo(() => {
    const count = bundle.links.length;
    return {
      positions: new Float32Array(count * 6),
      colors: new Float32Array(count * 6),
    };
  }, [bundle]);

  // Which nodes get a DOM label — keep it a small set (LOD).
  const labelIds = useMemo(() => {
    const set = new Set<string>();
    const smallVisible = visibleIds && visibleIds.size <= 20;
    for (const n of bundle.nodes) {
      const visible = !visibleIds || visibleIds.has(n.id);
      if (!visible) continue;
      if (
        n.category === "project" ||
        n.id === selectedId ||
        n.id === hoveredId ||
        smallVisible ||
        (focusIds && focusIds.size <= 12 && focusIds.has(n.id))
      ) {
        set.add(n.id);
      }
    }
    return set;
  }, [bundle, visibleIds, focusIds, selectedId, hoveredId]);

  // Fly the camera to frame the current focus / selection / filter. On the
  // wide "whole network" view we leave the camera where the operator put it.
  useEffect(() => {
    const targets: SimNode[] = [];
    if (focusIds) {
      for (const n of bundle.nodes) if (focusIds.has(n.id)) targets.push(n);
    } else if (visibleIds) {
      for (const n of bundle.nodes) if (visibleIds.has(n.id)) targets.push(n);
    } else {
      flyRef.current = null;
      return;
    }
    if (targets.length < 2) {
      flyRef.current = {
        target: targets[0]
          ? new THREE.Vector3(targets[0].x ?? 0, targets[0].y ?? 0, targets[0].z ?? 0)
          : new THREE.Vector3(0, 0, 0),
        distance: 46,
      };
      return;
    }
    const c = new THREE.Vector3();
    for (const n of targets) c.add(new THREE.Vector3(n.x ?? 0, n.y ?? 0, n.z ?? 0));
    c.multiplyScalar(1 / targets.length);
    let maxD = 0;
    for (const n of targets) {
      maxD = Math.max(
        maxD,
        c.distanceTo(new THREE.Vector3(n.x ?? 0, n.y ?? 0, n.z ?? 0)),
      );
    }
    flyRef.current = {
      target: c,
      distance: THREE.MathUtils.clamp(maxD * 2.4 + 10, 22, 120),
    };
  }, [bundle, focusIds, visibleIds]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = performance.now() / 1000;
    const sim = bundle.sim;
    const settling = sim.alpha() > 0.01;
    if (settling) sim.tick();

    const lowerSearch = search.trim().toLowerCase();

    // --- nodes ---
    for (const node of bundle.nodes) {
      const h = registryRef.current.get(node.id);
      if (!h?.group || !h.mesh) continue;

      const visible = !visibleIds || visibleIds.has(node.id);
      const isSel = node.id === selectedId;
      const inFocus = focusIds?.has(node.id) ?? false;
      const isHover = node.id === hoveredId;
      const att = attention.get(node.id);
      const searchHit = lowerSearch
        ? node.label.toLowerCase().includes(lowerSearch)
        : false;
      const dimmed =
        !visible ||
        (!!selectedId && !isSel && !inFocus) ||
        (!!lowerSearch && !searchHit);

      h.group.position.lerp(
        scratch.current.set(node.x ?? 0, node.y ?? 0, node.z ?? 0),
        settling ? 0.5 : 0.18,
      );

      const agentActive =
        node.category === "agent" &&
        AGENT_STATE_META[
          (node.entity as { state: keyof typeof AGENT_STATE_META }).state
        ].active;

      const emphasis = attentionEmphasis && att ? 1 + att.score * 0.5 : 1;
      const targetScale =
        node.radius *
        (isSel ? 1.55 : isHover ? 1.25 : 1) *
        (att ? 1 + att.score * 0.3 : 1) *
        emphasis;
      const cur = h.group.scale.x;
      h.group.scale.setScalar(cur + (targetScale - cur) * Math.min(1, dt * 9));

      const mat = h.mesh.material as THREE.MeshStandardMaterial;
      let emissive = dimmed ? 0.05 : 0.26;
      if (isSel) emissive = 1.1;
      else if (isHover) emissive = 0.75;
      else if (att) emissive += att.score * 0.5;
      if (agentActive && !dimmed) {
        emissive += 0.18 + Math.sin(t * 3 + node.index! * 1.3) * 0.12;
      }
      mat.emissiveIntensity += (emissive - mat.emissiveIntensity) * Math.min(1, dt * 10);
      const targetOpacity = !visible ? 0 : dimmed ? 0.16 : 1;
      mat.opacity += (targetOpacity - mat.opacity) * Math.min(1, dt * 8);
      h.group.visible = mat.opacity > 0.02;

      if (h.halo) {
        const halo = h.halo.material as THREE.MeshBasicMaterial;
        let haloTarget = 0;
        if (isSel) haloTarget = 0.28;
        else if (att && !dimmed) haloTarget = 0.05 + att.score * 0.2;
        else if (agentActive && !dimmed)
          haloTarget = 0.05 + Math.abs(Math.sin(t * 2 + node.index!)) * 0.06;
        halo.opacity += (haloTarget - halo.opacity) * Math.min(1, dt * 6);
        if (att) halo.color.set(URGENCY_COLOR[att.urgency]);
      }
    }

    // --- edges ---
    const geo = edgeGeoRef.current;
    if (geo) {
      const pos = edgeArrays.positions;
      const col = edgeArrays.colors;
      const colorKey = `${selectedId}|${[...(focusIds ?? [])].join(",")}|${
        visibleIds ? [...visibleIds].join(",") : "all"
      }|${lowerSearch}`;
      const recolor = colorKey !== colorKeyRef.current;
      if (recolor) colorKeyRef.current = colorKey;

      for (let i = 0; i < bundle.links.length; i += 1) {
        const link = bundle.links[i];
        const s = resolveEndpoint(link.source, bundle.byId);
        const e = resolveEndpoint(link.target, bundle.byId);
        if (!s || !e) continue;
        const o = i * 6;
        pos[o] = s.x ?? 0;
        pos[o + 1] = s.y ?? 0;
        pos[o + 2] = s.z ?? 0;
        pos[o + 3] = e.x ?? 0;
        pos[o + 4] = e.y ?? 0;
        pos[o + 5] = e.z ?? 0;

        if (recolor) {
          const sVis = !visibleIds || visibleIds.has(s.id);
          const eVis = !visibleIds || visibleIds.has(e.id);
          let c = DIM_EDGE;
          if (!sVis || !eVis) c = DIM_EDGE;
          else if (
            selectedId &&
            (s.id === selectedId || e.id === selectedId)
          )
            c = HOT_EDGE;
          else if (focusIds && focusIds.has(s.id) && focusIds.has(e.id))
            c = LIVE_EDGE;
          else if (!selectedId && !focusIds) c = LIVE_EDGE;
          col[o] = c.r;
          col[o + 1] = c.g;
          col[o + 2] = c.b;
          col[o + 3] = c.r;
          col[o + 4] = c.g;
          col[o + 5] = c.b;
        }
      }
      geo.attributes.position.needsUpdate = true;
      if (recolor && geo.attributes.color) geo.attributes.color.needsUpdate = true;
    }

    // --- camera fly-to ---
    const fly = flyRef.current;
    if (fly && controls) {
      controls.target.lerp(fly.target, 0.055);
      const dir = camera.position.clone().sub(controls.target);
      const curDist = dir.length();
      dir.normalize();
      const nextDist = curDist + (fly.distance - curDist) * 0.055;
      camera.position.copy(controls.target).addScaledVector(dir, nextDist);
      controls.update();
      if (
        controls.target.distanceTo(fly.target) < 0.4 &&
        Math.abs(curDist - fly.distance) < 0.6
      ) {
        flyRef.current = null;
      }
    }
  });

  return (
    <group>
      <lineSegments frustumCulled={false}>
        <bufferGeometry ref={edgeGeoRef}>
          <bufferAttribute
            attach="attributes-position"
            args={[edgeArrays.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[edgeArrays.colors, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.6} />
      </lineSegments>

      {bundle.nodes.map((node) => (
        <GraphNodeMesh
          key={node.id}
          node={node}
          registry={registryRef.current}
          onSelect={onSelect}
          onHover={onHover}
          onOpen={onOpen}
          onContextNode={onContextNode}
          showLabel={labelIds.has(node.id)}
        />
      ))}
    </group>
  );
}
