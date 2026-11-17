// Textbook formulas the math and physics lessons draw. Pure functions, tested in test/science.test.mjs.

export const G = 9.81;                       // standard gravity near the ground, m/s^2 (rounded from 9.80665)

// A throw from ground level with no air: how far it lands, how long it flies, where it is at time t.
export const rad = (deg) => (deg * Math.PI) / 180;
export const throwRange = (speed, deg) => (speed * speed * Math.sin(2 * rad(deg))) / G;
export const throwTime = (speed, deg) => (2 * speed * Math.sin(rad(deg))) / G;
export const throwAt = (speed, deg, t) => ({
  x: speed * Math.cos(rad(deg)) * t,
  y: speed * Math.sin(rad(deg)) * t - 0.5 * G * t * t,
});

// A pendulum swinging through a small angle: the time of one full swing. The mass is not in it.
export const pendulumPeriod = (length) => 2 * Math.PI * Math.sqrt(length / G);

// A lever: each side turns the beam with weight times distance from the pivot.
export const turning = (mass, distance) => mass * distance;

export const slope = (a, b) => (b.x === a.x ? null : (b.y - a.y) / (b.x - a.x));
export const hypotenuse = (a, b) => Math.sqrt(a * a + b * b);

// Seeded random numbers from 0 to 1, so a lesson shows the same flips and rolls every time it is opened.
export function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function coin(seed) { const r = random(seed); return () => r() < 0.5; }
export function die(seed) { const r = random(seed); return () => 1 + Math.floor(r() * 6); }

// Fractions: a/b and c/d are the same amount when a × d = b × c.
export const sameFraction = (a, b, c, d) => a * d === b * c;

// The curve y = (x - p)² + q: where it crosses the x axis (nowhere when q is above zero).
export const roots = (p, q) => (q > 0 ? [] : q === 0 ? [p] : [p - Math.sqrt(-q), p + Math.sqrt(-q)]);

// Two dice: how many of the 36 pairs give a sum. Repeated tries: the chance that it happens at least once.
export const waysToSum = (sum) => (sum < 2 || sum > 12 ? 0 : 6 - Math.abs(sum - 7));
export const atLeastOnce = (chance, tries) => 1 - Math.pow(1 - chance, tries);

// everyday numbers
export const solveLinear = (a, b, c, d) => (a === c ? null : (d - b) / (a - c));   // the x in  a·x + b = c·x + d
export const percentOf = (percent, whole) => (percent * whole) / 100;
export const changeBy = (value, percent) => (value * (100 + percent)) / 100;
export const scaleTo = (amount, from, to) => (amount * to) / from;                 // keep amount ÷ from the same
export const mirror = (p, axis) => (axis === 'upright' ? { x: -p.x, y: p.y } : { x: p.x, y: -p.y });

// Waves: speed = frequency × wavelength. The height of a wave travelling right, at place x and time t.
export const wavelength = (speed, frequency) => speed / frequency;
export const waveAt = (length, frequency, x, t, phaseDeg = 0) => Math.sin(2 * Math.PI * (x / length - frequency * t) + rad(phaseDeg));

// Circuits: Ohm's law, and two resistors in a row or side by side.
export const current = (volts, ohms) => volts / ohms;
export const inSeries = (a, b) => a + b;
export const inParallel = (a, b) => (a * b) / (a + b);

// Orbits around the Earth. GM = 3.986004418e14 m³/s² (the standard value), mean radius 6371 km.
export const EARTH = { GM: 3.986004418e14, R: 6.371e6 };
export const circularSpeed = (r) => Math.sqrt(EARTH.GM / r);
export const escapeSpeed = (r) => Math.sqrt((2 * EARTH.GM) / r);
// Launched sideways at distance r from the centre with speed v: the distance on the opposite side of the
// orbit (from energy and turning being kept). Infinity when it never comes back.
export function farSide(r, v) {
  const k = (2 * EARTH.GM) / (r * v * v) - 1;
  return k <= 0 ? Infinity : r / k;
}
export const staysUp = (r, v) => farSide(r, v) >= EARTH.R;
export const isRound = (r, v) => staysUp(r, v) && Math.abs(farSide(r, v) - r) / r < 0.03;
// The path itself, stepped with Newton's law of gravity (leapfrog, dt seconds a step), starting at the top
// (0, r) and moving right. Stops at the ground, after one full turn, or beyond `limit` from the centre.
export function orbitPath(r, v, { dt = 5, limit = 3.1 * r, every = 8 } = {}) {
  let x = 0, y = r, vx = v, vy = 0, swept = 0;
  const points = [{ x, y }];
  const pull = () => { const d = Math.hypot(x, y), a = -EARTH.GM / (d * d * d); return [a * x, a * y]; };
  let [ax, ay] = pull();
  for (let i = 1; i <= 60000; i++) {
    vx += ax * dt / 2; vy += ay * dt / 2;
    const px = x, py = y;
    x += vx * dt; y += vy * dt;
    [ax, ay] = pull();
    vx += ax * dt / 2; vy += ay * dt / 2;
    swept += Math.atan2(py * x - px * y, px * x + py * y);       // turning clockwise counts up
    const d = Math.hypot(x, y);
    const end = d < EARTH.R ? 'ground' : swept >= 2 * Math.PI ? 'round' : d > limit ? 'out' : '';
    if (i % every === 0 || end) points.push({ x, y });
    if (end) return { points, end };
  }
  return { points, end: 'out' };
}
