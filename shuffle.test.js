import { describe, it, expect } from 'vitest';
import {
  parseInput,
  fisherYates,
  countSortedConsecutive,
  pickMinimalSortedConsecutive,
  pickHeadAfterShuffle,
  remainderAfterPick,
  shufflePickWithRemaining,
} from './src/js/shuffle.js';

/** 多重集合排序键（支持重复号码） */
function multisetKey(arr) {
  return [...arr].sort().join('\0');
}

function assertPartition(pool, picked, remaining, { allowDuplicateValues = false } = {}) {
  expect(picked.length + remaining.length).toBe(pool.length);
  expect(multisetKey([...picked, ...remaining])).toBe(multisetKey(pool));
  expect(remainderAfterPick(pool, picked)).toEqual(remaining);

  for (const v of picked) {
    expect(pool.includes(v), `已抽号「${v}」必须来自号码池`).toBe(true);
  }

  if (!allowDuplicateValues) {
    const seen = new Set();
    for (const v of picked) {
      expect(seen.has(v), `已抽号内不应有重复「${v}」`).toBe(false);
      seen.add(v);
      expect(remaining.includes(v), `已抽号「${v}」不应出现在剩余号中`).toBe(false);
    }
    for (const v of remaining) {
      expect(seen.has(v), `剩余号「${v}」不应与已抽号重复`).toBe(false);
      seen.add(v);
    }
    expect(seen.size).toBe(pool.length);
    expect(picked.length + remaining.length).toBe(pool.length);
  }
}

function assertAppInvariant(items, picked, remaining) {
  expect(picked.length + remaining.length).toBe(items.length);
  expect(multisetKey([...picked, ...remaining])).toBe(multisetKey(items));
}

function makeUniquePool(size) {
  return Array.from({ length: size }, (_, i) => String(i).padStart(4, '0'));
}

/** 约 1200 项，含重复号码（001 出现 3 次等） */
function makeDuplicatePool() {
  const pool = makeUniquePool(1000);
  pool.push('0001', '0001', '0001');
  pool.push('0500', '0500');
  pool.push('0999', '0999', '0999', '0999');
  return pool;
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** 大池严格校验最少轮次 */
const STRICT_ROUNDS = 50;

function runStrictPickRound(pool, n, seed, { allowDuplicateValues = false } = {}) {
  const picked = pickMinimalSortedConsecutive(pool, n, seededRandom(seed));
  const remaining = remainderAfterPick(pool, picked);
  const expectedPickLen = Math.min(n, pool.length);
  expect(picked).toHaveLength(expectedPickLen);
  assertPartition(pool, picked, remaining, { allowDuplicateValues });
  return { picked, remaining };
}

describe('parseInput', () => {
  it('parses space-separated numbers', () => {
    expect(parseInput('000 002 003')).toEqual(['000', '002', '003']);
  });

  it('parses comma / Chinese comma separated numbers', () => {
    expect(parseInput('000,002，003;004')).toEqual(['000', '002', '003', '004']);
  });

  it('returns empty array for blank input', () => {
    expect(parseInput('   ')).toEqual([]);
  });
});

describe('countSortedConsecutive', () => {
  it('counts +1 pairs after numeric sort', () => {
    expect(countSortedConsecutive(['003', '004', '010'])).toBe(1);
    expect(countSortedConsecutive(['121', '122', '123'])).toBe(2);
    expect(countSortedConsecutive(['001', '010', '100'])).toBe(0);
  });

  it('treats 099 and 100 as consecutive', () => {
    expect(countSortedConsecutive(['099', '100'])).toBe(1);
  });
});

describe('fisherYates', () => {
  it('keeps the same multiset of values', () => {
    const src = ['000', '002', '003', '010'];
    const out = fisherYates([...src], () => 0);
    expect([...out].sort()).toEqual([...src].sort());
  });

  it('does not lose or duplicate elements', () => {
    const src = Array.from({ length: 20 }, (_, i) => String(i).padStart(3, '0'));
    const out = fisherYates([...src], () => 0.42);
    expect(out).toHaveLength(src.length);
    expect(new Set(out).size).toBe(src.length);
  });
});

describe('pickMinimalSortedConsecutive', () => {
  const pool = Array.from({ length: 30 }, (_, i) => String(i).padStart(3, '0'));

  it('returns n distinct items from pool', () => {
    const picked = pickMinimalSortedConsecutive(pool, 10, () => 0.33);
    expect(picked).toHaveLength(10);
    expect(new Set(picked).size).toBe(10);
    picked.forEach(v => expect(pool).toContain(v));
  });

  it('returns full pool when n >= pool length', () => {
    expect(pickMinimalSortedConsecutive(pool, 30)).toEqual(pool);
    expect(pickMinimalSortedConsecutive(pool, 50)).toEqual(pool);
  });

  it('does not exceed naive head-pick consecutive count on dense pool', () => {
    const n = 15;
    let betterOrEqual = 0;
    const trials = 30;
    for (let i = 0; i < trials; i++) {
      const rnd = () => (i * 0.017 + 0.13) % 1;
      const naive = pickHeadAfterShuffle(pool, n, rnd);
      const optimized = pickMinimalSortedConsecutive(pool, n, rnd);
      if (countSortedConsecutive(optimized) <= countSortedConsecutive(naive)) {
        betterOrEqual++;
      }
    }
    expect(betterOrEqual).toBeGreaterThan(trials * 0.8);
  });

  it('finds zero consecutive pairs on a sparse hand-picked pool', () => {
    const sparse = ['000', '010', '020', '030', '040', '050'];
    const picked = pickMinimalSortedConsecutive(sparse, 4, () => 0.5);
    expect(countSortedConsecutive(picked)).toBe(0);
  });
});

describe('remainderAfterPick', () => {
  it('剩余 = 乱序池 - 已抽取，多重集合一致', () => {
    const pool = ['000', '001', '001', '002', '010'];
    const picked = ['001', '010'];
    const remaining = remainderAfterPick(pool, picked);
    expect(remaining).toEqual(['000', '001', '002']);
    expect([...picked, ...remaining].sort()).toEqual([...pool].sort());
  });

  it('已抽取全部时剩余为空', () => {
    const pool = ['121', '122'];
    expect(remainderAfterPick(pool, pool)).toEqual([]);
  });

  it('与 pickMinimalSortedConsecutive 联用时不重叠', () => {
    const pool = Array.from({ length: 50 }, (_, i) => String(i).padStart(3, '0'));
    const picked = pickMinimalSortedConsecutive(pool, 12, () => 0.42);
    const remaining = remainderAfterPick(pool, picked);
    expect(picked).toHaveLength(12);
    expect(remaining).toHaveLength(38);
    assertPartition(pool, picked, remaining);
  });
});

describe('已抽号与剩余号 — 大池严格校验', { timeout: 120_000 }, () => {
  const uniquePool = makeUniquePool(1000);
  const duplicatePool = makeDuplicatePool();

  it(`唯一号码池 ≥1000：多种抽取数 × ${STRICT_ROUNDS} 轮分区正确`, () => {
    const pickCounts = [1, 2, 50, 499, 500, 999, 1000, 1500];
    for (const n of pickCounts) {
      for (let round = 0; round < STRICT_ROUNDS; round++) {
        runStrictPickRound(uniquePool, n, round + n * 997);
      }
    }
  });

  it(`含重复号码池 ≥1000：多种抽取数 × ${STRICT_ROUNDS} 轮多重集合分区正确`, () => {
    expect(duplicatePool.length).toBeGreaterThanOrEqual(1000);
    const pickCounts = [1, 100, 500, 999, 1000, 1200];
    for (const n of pickCounts) {
      for (let round = 0; round < STRICT_ROUNDS; round++) {
        runStrictPickRound(duplicatePool, n, round + n * 131, { allowDuplicateValues: true });
      }
    }
  });

  it(`全抽：两种池各 ${STRICT_ROUNDS} 轮剩余为空`, () => {
    for (const pool of [uniquePool, duplicatePool]) {
      for (let round = 0; round < STRICT_ROUNDS; round++) {
        const { picked, remaining } = runStrictPickRound(
          pool,
          pool.length,
          round + 9001,
          { allowDuplicateValues: pool !== uniquePool },
        );
        expect(remaining).toEqual([]);
        expect(multisetKey(picked)).toBe(multisetKey(pool));
      }
    }
  });

  it(`乱序后再抽取：${STRICT_ROUNDS} 轮已抽+剩余等于乱序池`, () => {
    for (let round = 0; round < STRICT_ROUNDS; round++) {
      const shuffled = fisherYates([...uniquePool], seededRandom(round));
      expect(shuffled).toHaveLength(uniquePool.length);
      expect(multisetKey(shuffled)).toBe(multisetKey(uniquePool));

      const n = 100 + (round * 37) % 400;
      runStrictPickRound(shuffled, n, round + 5000);
    }
  });

  it(`全流程压测：${STRICT_ROUNDS} 轮（乱序 → 抽取 → 校验）`, () => {
    for (let round = 0; round < STRICT_ROUNDS; round++) {
      const useDuplicate = round % 2 === 1;
      const pool = useDuplicate ? duplicatePool : uniquePool;
      const shuffled = fisherYates([...pool], seededRandom(round * 17 + 3));
      expect(multisetKey(shuffled)).toBe(multisetKey(pool));

      const n = 1 + ((round * 53) % Math.min(800, pool.length - 1));
      runStrictPickRound(shuffled, n, round + 12000, {
        allowDuplicateValues: useDuplicate,
      });
    }
  });
});

describe('已抽号与剩余号 — 应用全流程', { timeout: 120_000 }, () => {
  const text1000 = Array.from({ length: 1000 }, (_, i) => String(i).padStart(4, '0')).join(' ');

  it(`parseInput → 开抽：${STRICT_ROUNDS} 轮数量与无交集`, () => {
    const items = parseInput(text1000);
    expect(items.length).toBeGreaterThanOrEqual(1000);

    for (let round = 0; round < STRICT_ROUNDS; round++) {
      const n = 1 + ((round * 41) % 900);
      const { shuffled, picked, remaining } = shufflePickWithRemaining(
        items,
        n,
        seededRandom(round * 3 + 1),
        seededRandom(round * 7 + 2),
      );
      expect(shuffled).toHaveLength(items.length);
      assertPartition(shuffled, picked, remaining);
      assertAppInvariant(items, picked, remaining);
    }
  });

  it(`含重复号码输入：${STRICT_ROUNDS} 轮多重集合守恒`, () => {
    const dupText = `${text1000} 0001 0001 0500 0500 0999 0999 0999`;
    const items = parseInput(dupText);
    expect(items.length).toBeGreaterThanOrEqual(1000);

    for (let round = 0; round < STRICT_ROUNDS; round++) {
      const n = 50 + (round % 200);
      const { shuffled, picked, remaining } = shufflePickWithRemaining(
        items,
        n,
        seededRandom(round + 100),
        seededRandom(round + 200),
      );
      assertPartition(shuffled, picked, remaining, { allowDuplicateValues: true });
      assertAppInvariant(items, picked, remaining);
    }
  });

  it('修改抽取数后重抽：同一乱序池分区仍正确', () => {
    const items = parseInput(text1000);
    const rnd = seededRandom(2026);
    const shuffled = fisherYates([...items], rnd);

    for (let round = 0; round < STRICT_ROUNDS; round++) {
      const n = 10 + ((round * 17) % 400);
      const picked = pickMinimalSortedConsecutive(shuffled, n, seededRandom(round + 3000));
      const remaining = remainderAfterPick(shuffled, picked);
      assertPartition(shuffled, picked, remaining);
    }
  });
});