import type { NodeShape } from "@/lib/os/visual";

// Compact 2D echo of a node's 3D shape, for nav and inspector headers.
export function Glyph({
  shape,
  color,
  size = 14,
}: {
  shape: NodeShape;
  color: string;
  size?: number;
}) {
  const s = size;
  const c = s / 2;
  const common = { fill: color };
  let node: React.ReactNode;

  switch (shape) {
    case "box":
      node = <rect x={s * 0.18} y={s * 0.18} width={s * 0.64} height={s * 0.64} rx={s * 0.1} {...common} />;
      break;
    case "sphere":
      node = <circle cx={c} cy={c} r={s * 0.34} {...common} />;
      break;
    case "octahedron":
      node = <polygon points={`${c},${s * 0.12} ${s * 0.88},${c} ${c},${s * 0.88} ${s * 0.12},${c}`} {...common} />;
      break;
    case "tetrahedron":
    case "cone":
      node = <polygon points={`${c},${s * 0.14} ${s * 0.86},${s * 0.84} ${s * 0.14},${s * 0.84}`} {...common} />;
      break;
    case "dodecahedron":
    case "icosahedron":
      node = (
        <polygon
          points={`${c},${s * 0.1} ${s * 0.87},${s * 0.37} ${s * 0.71},${s * 0.9} ${s * 0.29},${s * 0.9} ${s * 0.13},${s * 0.37}`}
          {...common}
        />
      );
      break;
    case "torus":
    case "ring":
      node = (
        <>
          <circle cx={c} cy={c} r={s * 0.36} fill="none" stroke={color} strokeWidth={s * 0.16} />
        </>
      );
      break;
    default:
      node = <circle cx={c} cy={c} r={s * 0.32} {...common} />;
  }

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden="true">
      {node}
    </svg>
  );
}
