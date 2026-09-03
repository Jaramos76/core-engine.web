// Rubik's Cube move model.
//
// A move is a quarter-turn of one face layer about a world axis that passes
// through the cube centre. Scrambling applies a random sequence; solving
// replays the inverse of that sequence in reverse, which is guaranteed to
// return the cube to its solved state without needing a real solver. Visually
// it reads exactly like a cube being solved layer by layer.

import * as THREE from "three";

export type Axis = "x" | "y" | "z";
export type Layer = -1 | 1;
export type Direction = 1 | -1;

export interface Move {
  axis: Axis;
  layer: Layer;
  /** Sign of the quarter turn (radians = dir * PI/2). */
  dir: Direction;
}

export const AXIS_INDEX: Record<Axis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 };

export const AXIS_VECTOR: Record<Axis, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

const AXES: Axis[] = ["x", "y", "z"];
const LAYERS: Layer[] = [-1, 1];

function randomMove(): Move {
  return {
    axis: AXES[Math.floor(Math.random() * AXES.length)],
    layer: LAYERS[Math.floor(Math.random() * LAYERS.length)],
    dir: Math.random() < 0.5 ? 1 : -1,
  };
}

/**
 * Build a scramble of `count` quarter-turns. Consecutive turns of the same
 * face are avoided so no move is visually wasted.
 */
export function buildScramble(count: number): Move[] {
  const moves: Move[] = [];
  let previous: Move | null = null;

  while (moves.length < count) {
    const move = randomMove();
    if (
      previous &&
      previous.axis === move.axis &&
      previous.layer === move.layer
    ) {
      continue;
    }
    moves.push(move);
    previous = move;
  }
  return moves;
}

/** The sequence that undoes `moves`, ordered for a natural-looking solve. */
export function invertSequence(moves: Move[]): Move[] {
  return [...moves]
    .reverse()
    .map((move) => ({ ...move, dir: (move.dir * -1) as Direction }));
}

export function quarterTurnQuaternion(
  axis: Axis,
  radians: number,
): THREE.Quaternion {
  return new THREE.Quaternion().setFromAxisAngle(AXIS_VECTOR[axis], radians);
}
