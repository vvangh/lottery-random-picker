import { describe, it, expect } from 'vitest';
import {
  parseInput,
  fisherYates,
  countSortedConsecutive,
  pickMinimalSortedConsecutive,
  pickHeadAfterShuffle,
} from './shuffle.js';

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
