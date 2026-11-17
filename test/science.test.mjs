// Every task a math or physics lesson sets must be solvable with the controls it offers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { throwRange, pendulumPeriod, hypotenuse, slope, coin, turning } from '../js/science.js';

test('throw: 45 degrees goes farthest, the target can be hit low and high', () => {
  const speed = 20;
  let best = 0;
  for (let a = 5; a <= 85; a++) if (throwRange(speed, a) > throwRange(speed, best)) best = a;
  assert.equal(best, 45);
  const hits = [];
  for (let a = 5; a <= 85; a++) if (Math.abs(throwRange(speed, a) - 30) <= 1.5) hits.push(a);
  console.log('angles that hit 30 m at 20 m/s:', hits.join(','), ' farthest:', throwRange(speed, 45).toFixed(1));
  assert.ok(hits.some((a) => a < 45) && hits.some((a) => a > 45));
});

test('pendulum: two seconds is reachable, mass plays no part', () => {
  const lengths = [];
  for (let cm = 20; cm <= 200; cm += 1) if (Math.abs(pendulumPeriod(cm / 100) - 2) < 0.02) lengths.push(cm);
  console.log('lengths (cm) with a 2.0 s swing:', lengths.join(','));
  assert.ok(lengths.length > 0);
  assert.equal(pendulumPeriod.length, 1);
});

test('lever, triangle, slope, coin', () => {
  assert.equal(turning(6, 2), turning(4, 3));
  assert.equal(hypotenuse(3, 4), 5);
  assert.equal(hypotenuse(5, 12), 13);
  assert.equal(slope({ x: 0, y: 0 }, { x: 2, y: 4 }), 2);
  const flip = coin(7);
  let heads = 0;
  const first10 = [];
  for (let i = 0; i < 1000; i++) { const hd = flip(); heads += hd; if (i < 10) first10.push(hd ? 'H' : 'T'); }
  console.log('coin seed 7: first ten', first10.join(''), ' heads in 1000:', heads);
  assert.ok(Math.abs(heads / 1000 - 0.5) < 0.05);
});
