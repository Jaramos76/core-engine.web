// Static description of the 26 visible cubies (the hidden core is omitted).
//
// Each cubie knows its solved "home" cell and which of its faces carry a
// coloured sticker. Sticker colour is fixed to the cubie at build time and
// simply travels with it as the cubie rotates — exactly like a physical cube.

import { FACE_COLORS, type FaceKey } from "./palette";

export interface StickerDef {
  face: FaceKey;
  /** Local offset of the sticker tile from the cubie centre. */
  position: [number, number, number];
  /** Euler rotation (radians) so the tile faces outward. */
  rotation: [number, number, number];
  color: string;
}

export interface CubieDef {
  id: number;
  home: [number, number, number];
  stickers: StickerDef[];
}

const HALF = 0.5;

// Which axis/sign each face points along, and how to orient a flat tile there.
const FACE_LAYOUT: Record<
  FaceKey,
  { axis: 0 | 1 | 2; sign: -1 | 1; rotation: [number, number, number] }
> = {
  px: { axis: 0, sign: 1, rotation: [0, Math.PI / 2, 0] },
  nx: { axis: 0, sign: -1, rotation: [0, -Math.PI / 2, 0] },
  py: { axis: 1, sign: 1, rotation: [-Math.PI / 2, 0, 0] },
  ny: { axis: 1, sign: -1, rotation: [Math.PI / 2, 0, 0] },
  pz: { axis: 2, sign: 1, rotation: [0, 0, 0] },
  nz: { axis: 2, sign: -1, rotation: [0, Math.PI, 0] },
};

export function buildCubies(): CubieDef[] {
  const cubies: CubieDef[] = [];
  let id = 0;

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue; // hidden core

        const cell: [number, number, number] = [x, y, z];
        const stickers: StickerDef[] = [];

        (Object.keys(FACE_LAYOUT) as FaceKey[]).forEach((face) => {
          const { axis, sign, rotation } = FACE_LAYOUT[face];
          if (cell[axis] !== sign) return; // face is interior — no sticker

          const position: [number, number, number] = [0, 0, 0];
          position[axis] = sign * (HALF + 0.001);

          stickers.push({
            face,
            position,
            rotation,
            color: FACE_COLORS[face],
          });
        });

        cubies.push({ id: id++, home: cell, stickers });
      }
    }
  }

  return cubies;
}
