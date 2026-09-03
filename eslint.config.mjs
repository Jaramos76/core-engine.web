import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [".next/**", "node_modules/**", "out/**"],
  },
  {
    // React Three Fiber drives an imperative WebGL renderer from inside
    // `useFrame` — reading/mutating refs and typed arrays every frame is the
    // intended model, not a bug. The React Compiler lint rules cannot see the
    // frame-loop boundary, so they are disabled for the 3D scene code only.
    // The rest of the codebase keeps them enforced.
    files: [
      "app/dashboard/_os/graph/**/*.{ts,tsx}",
      "app/login/_cube/**/*.{ts,tsx}",
    ],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
    },
  },
];

export default eslintConfig;
