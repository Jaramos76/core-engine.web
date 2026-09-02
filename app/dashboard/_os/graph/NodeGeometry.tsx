import type { NodeShape } from "@/lib/os/visual";

// Unit-sized geometry per node shape. Actual node size is applied via the
// parent group's scale so it can animate without rebuilding geometry.
export function NodeGeometry({ shape }: { shape: NodeShape }) {
  switch (shape) {
    case "icosahedron":
      return <icosahedronGeometry args={[1, 0]} />;
    case "octahedron":
      return <octahedronGeometry args={[1, 0]} />;
    case "tetrahedron":
      return <tetrahedronGeometry args={[1, 0]} />;
    case "dodecahedron":
      return <dodecahedronGeometry args={[1, 0]} />;
    case "box":
      return <boxGeometry args={[1.5, 1.5, 1.5]} />;
    case "cone":
      return <coneGeometry args={[1, 1.8, 6]} />;
    case "torus":
      return <torusGeometry args={[0.8, 0.34, 10, 20]} />;
    case "cylinder":
      return <cylinderGeometry args={[0.9, 0.9, 1.4, 14]} />;
    case "ring":
      return <torusGeometry args={[0.95, 0.16, 8, 24]} />;
    case "sphere":
    default:
      return <sphereGeometry args={[1, 20, 20]} />;
  }
}
