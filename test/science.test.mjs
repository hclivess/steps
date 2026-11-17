// Every task a math or physics lesson sets must be solvable with the controls it offers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { throwRange, pendulumPeriod, hypotenuse, slope, coin, turning, die, sameFraction, roots, waysToSum, atLeastOnce,
  wavelength, waveAt, current, inSeries, inParallel, EARTH, circularSpeed, escapeSpeed, farSide, staysUp, isRound, orbitPath } from '../js/science.js';

test('fractions, the curve, the dice', () => {
  const same = [];
  for (let d = 1; d <= 12; d++) for (let n = 0; n <= d; n++) if (sameFraction(n, d, 3, 4) && d !== 4) same.push(`${n}/${d}`);
  console.log('other ways to write 3/4 with the sliders:', same.join(' '));
  assert.ok(same.length > 0);
  assert.deepEqual(roots(3, -4), [1, 5]);
  assert.deepEqual(roots(0, 1), []);
  let pairs = 0;
  for (let s = 2; s <= 12; s++) pairs += waysToSum(s);
  assert.equal(pairs, 36);
  const roll = die(11), counts = new Array(13).fill(0);
  for (let i = 0; i < 500; i++) counts[roll() + roll()] += 1;
  console.log('two dice, seed 11, 500 rolls, sums 2..12:', counts.slice(2).join(','));
  assert.equal(counts.slice(2).reduce((a, b) => a + b), 500);
  const need = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find((n) => atLeastOnce(1 / 6, n) > 0.5);
  console.log('rolls needed for a six to be more likely than not:', need, atLeastOnce(1 / 6, need).toFixed(4));
  assert.equal(need, 4);
});

test('waves and circuits: the tasks can be solved with the sliders', () => {
  const f = [];
  for (let v = 1; v <= 8; v += 0.5) if (Math.abs(wavelength(2, v) - 0.5) < 1e-9) f.push(v);
  assert.deepEqual(f, [4]);
  let peak = 0;
  for (let x = 0; x <= 4; x += 0.02) peak = Math.max(peak, Math.abs(waveAt(1, 0, x, 0) + waveAt(1, 0, x, 0, 180)));
  assert.ok(peak < 0.01);
  const pairs = [];
  for (let v = 1.5; v <= 12; v += 1.5) for (let r = 10; r <= 200; r += 10) if (Math.abs(current(v, r) - 0.1) < 1e-9) pairs.push(`${v}V/${r}Ω`);
  console.log('battery and lamp pairs that give 0.1 A:', pairs.join(' '));
  assert.ok(pairs.length > 0);
  assert.equal(inSeries(90, 90), 180);
  assert.equal(inParallel(90, 90), 45);
  assert.equal(current(9, inParallel(90, 90)) / current(9, inSeries(90, 90)), 4);
});

test('orbits: a round orbit and an escape are on the slider, the stepped path agrees with the formula', () => {
  const r = EARTH.R + 400e3, round = [], away = [];
  for (let i = 40; i <= 115; i++) {
    const v = i * 100, { end } = orbitPath(r, v), far = farSide(r, v);
    if (isRound(r, v)) round.push(i / 10);
    if (!isFinite(far)) away.push(i / 10);
    assert.equal(end === 'ground', !staysUp(r, v), `${v} m/s: ${end}`);
    if (end === 'round') assert.ok(isFinite(far) && far <= 3.1 * r, `${v} m/s`);
  }
  console.log('round at km/s:', round.join(','), ' never returns from:', away[0], ' circular', (circularSpeed(r) / 1000).toFixed(2), 'escape', (escapeSpeed(r) / 1000).toFixed(2));
  assert.ok(round.length >= 1 && round.length <= 2);
  assert.ok(away.length > 0);
  // a circle really closes: after one turn the stepped path is back at the start height
  const { points } = orbitPath(r, circularSpeed(r));
  const last = points[points.length - 1];
  assert.ok(Math.abs(Math.hypot(last.x, last.y) - r) / r < 1e-3);
});

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
