export const SIZE = 5;

// Avalynn's original hand-tuned weights (from the web version's data.js),
// which deliberately boost J/K/Qu/X/Z above their true English frequency
// so rare letters show up as a regular feature of play, not a rare event.
const FREQ: Record<string, number> = {
  A: 6, B: 2, C: 2, D: 3, E: 11, F: 2, G: 2, H: 5, I: 6, J: 1, K: 1,
  L: 4, M: 2, N: 6, O: 7, P: 2, Qu: 1, R: 5, S: 6, T: 9, U: 3, V: 2,
  W: 3, X: 1, Y: 3, Z: 1,
};

const LETTER_POOL: string[] = (() => {
  const pool: string[] = [];
  for (const letter of Object.keys(FREQ)) {
    for (let i = 0; i < FREQ[letter]; i++) pool.push(letter);
  }
  return pool;
})();

function pickLetter(): string {
  return LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)];
}

// Special letters are capped at 1 per board, everything else at 2 — mirrors
// the original rejection-sampling cap so boards never feel degenerate.
const SPECIAL_LETTERS = new Set(["J", "K", "Qu", "V", "W", "X", "Z"]);

export function generateBoard(): string[] {
  const counts = new Map<string, number>();
  const board: string[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    let letter = "";
    let guard = 0;
    do {
      letter = pickLetter();
      guard++;
    } while (
      guard < 500 &&
      ((SPECIAL_LETTERS.has(letter) && (counts.get(letter) || 0) >= 1) ||
        (!SPECIAL_LETTERS.has(letter) && (counts.get(letter) || 0) >= 2))
    );
    counts.set(letter, (counts.get(letter) || 0) + 1);
    board.push(letter);
  }
  return board;
}

export function rc(index: number): [number, number] {
  return [Math.floor(index / SIZE), index % SIZE];
}

export function isAdjacent(a: number, b: number): boolean {
  const [r1, c1] = rc(a);
  const [r2, c2] = rc(b);
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
}

export function wordFromPath(board: string[], path: number[]): string {
  return path.map((i) => board[i]).join("").toLowerCase();
}

export function capitalize(w: string): string {
  return w ? w[0].toUpperCase() + w.slice(1) : w;
}

export function scoreForLength(n: number): number {
  if (n <= 4) return 1;
  if (n === 5) return 2;
  if (n === 6) return 3;
  if (n === 7) return 5;
  return 11;
}

export interface GameRecord {
  date: number;
  score: number;
  words: number;
  longest: string;
}

export function sessionScore(found: Map<string, number>): number {
  let total = 0;
  found.forEach((v) => (total += v));
  return total;
}

export function longestWord(found: Map<string, number>): string {
  let longest = "";
  found.forEach((_v, w) => {
    if (w.length > longest.length) longest = w;
  });
  return longest;
}
