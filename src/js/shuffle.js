/** @typedef {() => number} RandomFn */

export function toNum(v) {
  return parseInt(v, 10);
}

export function parseInput(text) {
  if (!text.trim()) return [];
  return text.trim().split(/[,，;；\s]+/).filter(Boolean);
}

/**
 * Fisher-Yates shuffle (in-place). Returns the same array reference.
 * @param {string[]} arr
 * @param {RandomFn} [random]
 */
export function fisherYates(arr, random = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Count pairs that are numerically consecutive after sorting. */
export function countSortedConsecutive(nums) {
  const sorted = nums.map(toNum).filter(n => !isNaN(n)).sort((a, b) => a - b);
  let c = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === 1) c++;
  }
  return c;
}

/**
 * Pick n items from pool; minimize consecutive pairs when picked set is sorted.
 * Display order follows position in pool (not sorted).
 * @param {string[]} pool
 * @param {number} n
 * @param {RandomFn} [random]
 */
export function pickMinimalSortedConsecutive(pool, n, random = Math.random) {
  if (n >= pool.length) return [...pool];
  let best = pool.slice(0, n);
  let bestScore = countSortedConsecutive(best);
  const attempts = Math.min(150, Math.max(60, pool.length * 2));
  for (let t = 0; t < attempts; t++) {
    const order = fisherYates([...Array(pool.length).keys()], random);
    const idx = order.slice(0, n).sort((a, b) => a - b);
    const candidate = idx.map(i => pool[i]);
    const score = countSortedConsecutive(candidate);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
      if (score === 0) break;
    }
  }
  return best;
}

/** Naive baseline: first n after one shuffle (for tests / comparison). */
export function pickHeadAfterShuffle(pool, n, random = Math.random) {
  const shuffled = fisherYates([...pool], random);
  return shuffled.slice(0, n);
}

/**
 * 从 pool 中移除 picked（按出现次数逐一扣除，支持重复号码）。
 * 返回的剩余列表与 picked 无交集（多重集合意义下）。
 */
export function remainderAfterPick(pool, picked) {
  const rest = [...pool];
  for (const v of picked) {
    const i = rest.indexOf(v);
    if (i !== -1) rest.splice(i, 1);
  }
  return rest;
}
