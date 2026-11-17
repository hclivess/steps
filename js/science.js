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

// A fair coin from a seeded generator, so a lesson shows the same flips every time it is opened.
export function coin(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 < 0.5;
  };
}
